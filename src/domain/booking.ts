import type { ActorType, Appointment, AppointmentStatus } from "@prisma/client";
import { forTenant, isOverlapViolation, isUniqueViolation, type TenantDb, type TenantTx } from "@/lib/tenant-db";
import { prisma } from "@/lib/db";
import { addDays, addMinutes, dayRange, isIsoDate, toLocalDate, weekdayOf } from "@/lib/time";
import { computeSlots, type Interval } from "./availability";
import { ACTIVE_STATUSES, canTransition, UPCOMING_STATUSES } from "./appointment-state";
import { DomainError, SlotUnavailableError } from "./errors";
import { planBookingMessages, planCancellationMessages, type PlannedMessage } from "./messages";

export interface Actor {
  type: ActorType;
  userId?: string | null;
}

async function loadTenant(tenantId: string) {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!t || !t.active) throw new DomainError("TENANT_NOT_FOUND", "Estabelecimento indisponível.");
  return t;
}

export interface AvailabilityQuery {
  serviceId: string;
  professionalId?: string | null;
  date: string; // YYYY-MM-DD local
  now?: Date;
  /** Reserva a ignorar no cálculo (usada no reagendamento). */
  ignoreAppointmentId?: string;
}

export interface AvailableSlot {
  startAt: Date;
  professionalIds: string[];
}

/** Horários disponíveis para um serviço em um dia (uma ou todas as profissionais habilitadas). */
export async function getAvailability(tenantId: string, q: AvailabilityQuery, db: TenantDb | TenantTx = forTenant(tenantId)): Promise<AvailableSlot[]> {
  if (!isIsoDate(q.date)) throw new DomainError("INVALID_DATE", "Data inválida.");
  const tenant = await loadTenant(tenantId);
  const now = q.now ?? new Date();
  const today = toLocalDate(now, tenant.timezone);
  if (q.date < today || q.date > addDays(today, tenant.maxDaysAhead)) return [];

  const service = await db.service.findFirst({ where: { id: q.serviceId, active: true } });
  if (!service) throw new DomainError("SERVICE_NOT_FOUND", "Serviço não encontrado.");

  const links = await db.professionalService.findMany({
    where: { serviceId: service.id, ...(q.professionalId ? { professionalId: q.professionalId } : {}), professional: { active: true } },
    select: { professionalId: true },
  });
  const proIds = links.map((l) => l.professionalId);
  if (proIds.length === 0) return [];

  const { start, end } = dayRange(q.date, tenant.timezone);
  const weekday = weekdayOf(q.date, tenant.timezone);
  const [hours, offs, appts] = await Promise.all([
    db.workingHours.findMany({ where: { professionalId: { in: proIds }, weekday } }),
    db.timeOff.findMany({
      where: { startAt: { lt: end }, endAt: { gt: start }, OR: [{ professionalId: null }, { professionalId: { in: proIds } }] },
    }),
    db.appointment.findMany({
      where: {
        professionalId: { in: proIds },
        status: { notIn: ["CANCELLED", "RESCHEDULED"] },
        startAt: { lt: end },
        blockEndAt: { gt: start },
        ...(q.ignoreAppointmentId ? { id: { not: q.ignoreAppointmentId } } : {}),
      },
      select: { professionalId: true, startAt: true, blockEndAt: true },
    }),
  ]);

  const byStart = new Map<number, string[]>();
  for (const pid of proIds) {
    const busy: Interval[] = [
      ...offs.filter((o) => o.professionalId === null || o.professionalId === pid).map((o) => ({ start: o.startAt, end: o.endAt })),
      ...appts.filter((a) => a.professionalId === pid).map((a) => ({ start: a.startAt, end: a.blockEndAt })),
    ];
    const slots = computeSlots({
      date: q.date,
      timezone: tenant.timezone,
      windows: hours.filter((h) => h.professionalId === pid),
      busy,
      durationMin: service.durationMin,
      bufferMin: service.bufferMin,
      stepMin: tenant.slotStepMinutes,
      now,
      minLeadMinutes: tenant.minLeadMinutes,
    });
    for (const s of slots) byStart.set(s.getTime(), [...(byStart.get(s.getTime()) ?? []), pid]);
  }
  return [...byStart.entries()].sort(([a], [b]) => a - b).map(([t, ids]) => ({ startAt: new Date(t), professionalIds: ids }));
}

export interface BookingInput {
  serviceId: string;
  professionalId?: string | null;
  startAt: Date;
  customerId: string;
  idempotencyKey: string;
  source?: "site" | "admin";
  notes?: string | null;
  /** Encaixe autorizado pela equipe: ignora horário de trabalho e antecedência, mas nunca o conflito. */
  allowOutsideHours?: boolean;
  now?: Date;
}

async function enqueue(tx: TenantTx, msgs: PlannedMessage[]) {
  if (msgs.length === 0) return;
  await tx.outboxMessage.createMany({
    // tenantId é injetado pelo cliente restrito ao estabelecimento
    data: msgs.map((m) => ({ ...m, payload: {} })) as never,
    skipDuplicates: true,
  });
}

async function chooseProfessional(tenantId: string, input: BookingInput, db: TenantDb | TenantTx, ignoreAppointmentId?: string) {
  const tenant = await loadTenant(tenantId);
  const date = toLocalDate(input.startAt, tenant.timezone);
  if (input.allowOutsideHours) {
    if (!input.professionalId) throw new DomainError("PROFESSIONAL_REQUIRED", "Escolha a profissional para o encaixe.");
    const link = await db.professionalService.findFirst({ where: { professionalId: input.professionalId, serviceId: input.serviceId } });
    if (!link) throw new DomainError("PROFESSIONAL_SERVICE", "Esta profissional não realiza este serviço.");
    return { tenant, professionalId: input.professionalId };
  }
  const slots = await getAvailability(tenantId, { serviceId: input.serviceId, professionalId: input.professionalId, date, now: input.now, ignoreAppointmentId }, db);
  const slot = slots.find((s) => s.startAt.getTime() === input.startAt.getTime());
  if (!slot) throw new SlotUnavailableError();
  return { tenant, professionalId: input.professionalId ?? slot.professionalIds[0] };
}

/**
 * Cria uma reserva.
 * Garantias: (1) idempotente pela chave; (2) sem sobreposição, garantido pelo PostgreSQL
 * (appointment_no_overlap) mesmo com requisições simultâneas; (3) mensagens enfileiradas na mesma transação.
 */
export async function createBooking(tenantId: string, input: BookingInput, actor: Actor): Promise<{ appointment: Appointment; created: boolean }> {
  const db = forTenant(tenantId);
  const existing = await db.appointment.findFirst({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return { appointment: existing, created: false };

  const customer = await db.customer.findFirst({ where: { id: input.customerId } });
  if (!customer) throw new DomainError("CUSTOMER_NOT_FOUND", "Cadastro da cliente não encontrado.");
  const service = await db.service.findFirst({ where: { id: input.serviceId, active: true } });
  if (!service) throw new DomainError("SERVICE_NOT_FOUND", "Serviço não encontrado.");
  const { tenant, professionalId } = await chooseProfessional(tenantId, input, db);
  const now = input.now ?? new Date();

  try {
    const appointment = await db.$transaction(async (tx) => {
      const appt = await tx.appointment.create({
        data: {
          professionalId,
          customerId: customer.id,
          serviceId: service.id,
          serviceName: service.name,
          priceCents: service.priceCents,
          startAt: input.startAt,
          endAt: addMinutes(input.startAt, service.durationMin),
          blockEndAt: addMinutes(input.startAt, service.durationMin + service.bufferMin),
          status: "CONFIRMED",
          idempotencyKey: input.idempotencyKey,
          source: input.source ?? "site",
          notes: input.notes ?? null,
        } as never,
      });
      await tx.appointmentEvent.create({
        data: { appointmentId: appt.id, toStatus: appt.status, actorType: actor.type, actorUserId: actor.userId ?? null, note: input.allowOutsideHours ? "Encaixe autorizado" : null } as never,
      });
      await enqueue(tx, planBookingMessages(appt, customer, tenant, now));
      return appt;
    });
    return { appointment, created: true };
  } catch (e) {
    if (isOverlapViolation(e)) throw new SlotUnavailableError();
    if (isUniqueViolation(e)) {
      const again = await db.appointment.findFirst({ where: { idempotencyKey: input.idempotencyKey } });
      if (again) return { appointment: again, created: false };
    }
    throw e;
  }
}

export interface TransitionOptions {
  note?: string;
  now?: Date;
  /** Para cancelamento pela cliente: verifica antecedência mínima. */
  enforcePolicy?: boolean;
}

/** Muda o estado de uma reserva respeitando a máquina de estados, com histórico e efeitos colaterais. */
export async function transitionAppointment(
  tenantId: string,
  appointmentId: string,
  to: AppointmentStatus,
  actor: Actor,
  opts: TransitionOptions = {},
): Promise<Appointment> {
  const db = forTenant(tenantId);
  const tenant = await loadTenant(tenantId);
  const appt = await db.appointment.findFirst({ where: { id: appointmentId }, include: { customer: true } });
  if (!appt) throw new DomainError("NOT_FOUND", "Agendamento não encontrado.");
  if (appt.status === to) return appt;
  if (!canTransition(appt.status, to, actor.type)) {
    throw new DomainError("INVALID_TRANSITION", "Esta ação não é permitida para o estado atual do agendamento.");
  }
  const now = opts.now ?? new Date();
  if (opts.enforcePolicy && to === "CANCELLED" && appt.startAt.getTime() - now.getTime() < tenant.cancelMinHours * 3600_000) {
    throw new DomainError("POLICY", `Cancelamentos pelo site precisam de ${tenant.cancelMinHours}h de antecedência. Fale com a equipe pelo WhatsApp.`);
  }

  return db.$transaction(async (tx) => {
    // Atualização condicional: se outra pessoa mudou o estado no meio tempo, nada acontece.
    const r = await tx.appointment.updateMany({
      where: { id: appt.id, status: appt.status },
      data: { status: to, ...(to === "CANCELLED" ? { cancelReason: opts.note ?? null } : {}) },
    });
    if (r.count !== 1) throw new DomainError("CONFLICT", "O agendamento foi alterado por outra pessoa. Atualize a página.");
    await tx.appointmentEvent.create({
      data: { appointmentId: appt.id, fromStatus: appt.status, toStatus: to, actorType: actor.type, actorUserId: actor.userId ?? null, note: opts.note ?? null } as never,
    });
    if (!UPCOMING_STATUSES.includes(to)) {
      // Lembretes pendentes deixam de fazer sentido
      await tx.outboxMessage.updateMany({ where: { appointmentId: appt.id, status: { in: ["PENDING", "FAILED"] } }, data: { status: "CANCELLED" } });
    }
    if (to === "CANCELLED") {
      await enqueue(tx, planCancellationMessages(appt, appt.customer, tenant, now, true));
    }
    return tx.appointment.findFirstOrThrow({ where: { id: appt.id } });
  });
}

/**
 * Reagenda: na mesma transação marca a reserva antiga como RESCHEDULED e cria a nova.
 * Se o novo horário estiver ocupado, nada muda.
 */
export async function rescheduleAppointment(
  tenantId: string,
  appointmentId: string,
  input: { startAt: Date; professionalId?: string | null; idempotencyKey: string; now?: Date; enforcePolicy?: boolean; allowOutsideHours?: boolean },
  actor: Actor,
): Promise<Appointment> {
  const db = forTenant(tenantId);
  const old = await db.appointment.findFirst({ where: { id: appointmentId }, include: { customer: true } });
  if (!old) throw new DomainError("NOT_FOUND", "Agendamento não encontrado.");
  const done = await db.appointment.findFirst({ where: { idempotencyKey: input.idempotencyKey } });
  if (done) return done;
  if (!UPCOMING_STATUSES.includes(old.status)) throw new DomainError("INVALID_TRANSITION", "Este agendamento não pode mais ser reagendado.");
  const now = input.now ?? new Date();
  const tenant = await loadTenant(tenantId);
  if (input.enforcePolicy && old.startAt.getTime() - now.getTime() < tenant.cancelMinHours * 3600_000) {
    throw new DomainError("POLICY", `Reagendamentos pelo site precisam de ${tenant.cancelMinHours}h de antecedência. Fale com a equipe pelo WhatsApp.`);
  }
  const service = await db.service.findFirst({ where: { id: old.serviceId } });
  if (!service) throw new DomainError("SERVICE_NOT_FOUND", "Serviço não encontrado.");
  const { professionalId } = await chooseProfessional(
    tenantId,
    { serviceId: old.serviceId, professionalId: input.professionalId ?? null, startAt: input.startAt, customerId: old.customerId, idempotencyKey: input.idempotencyKey, now, allowOutsideHours: input.allowOutsideHours },
    db,
    old.id,
  );

  try {
    return await db.$transaction(async (tx) => {
      const r = await tx.appointment.updateMany({ where: { id: old.id, status: old.status }, data: { status: "RESCHEDULED" } });
      if (r.count !== 1) throw new DomainError("CONFLICT", "O agendamento foi alterado por outra pessoa. Atualize a página.");
      await tx.appointmentEvent.create({ data: { appointmentId: old.id, fromStatus: old.status, toStatus: "RESCHEDULED", actorType: actor.type, actorUserId: actor.userId ?? null } as never });
      await tx.outboxMessage.updateMany({ where: { appointmentId: old.id, status: { in: ["PENDING", "FAILED"] } }, data: { status: "CANCELLED" } });
      const appt = await tx.appointment.create({
        data: {
          professionalId,
          customerId: old.customerId,
          serviceId: old.serviceId,
          serviceName: service.name,
          priceCents: service.priceCents,
          startAt: input.startAt,
          endAt: addMinutes(input.startAt, service.durationMin),
          blockEndAt: addMinutes(input.startAt, service.durationMin + service.bufferMin),
          status: "CONFIRMED",
          idempotencyKey: input.idempotencyKey,
          source: old.source,
          notes: old.notes,
          rescheduledFromId: old.id,
        } as never,
      });
      await tx.appointmentEvent.create({ data: { appointmentId: appt.id, toStatus: "CONFIRMED", actorType: actor.type, actorUserId: actor.userId ?? null, note: "Reagendamento" } as never });
      await enqueue(tx, planBookingMessages(appt, old.customer, tenant, now));
      return appt;
    });
  } catch (e) {
    if (isOverlapViolation(e)) throw new SlotUnavailableError();
    throw e;
  }
}

/** Reservas próximas que receberam o lembrete de 24h e ainda não foram reconfirmadas. */
export async function findUnconfirmed(tenantId: string, now = new Date()) {
  const db = forTenant(tenantId);
  const sent = await db.outboxMessage.findMany({
    where: { template: "reminder_24h", status: "SENT", appointmentId: { not: null } },
    select: { appointmentId: true },
  });
  const ids = [...new Set(sent.map((s) => s.appointmentId!))];
  if (ids.length === 0) return [];
  return db.appointment.findMany({
    where: { id: { in: ids }, status: "CONFIRMED", startAt: { gt: now } },
    include: { customer: true, professional: true },
    orderBy: { startAt: "asc" },
  });
}

export { ACTIVE_STATUSES };
