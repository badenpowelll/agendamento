import type { AppointmentStatus } from "@prisma/client";
import { forTenant } from "@/lib/tenant-db";
import { prisma } from "@/lib/db";
import { addDays, dayRange, localDateMinutesToInstant, toLocalDate, weekdayOf } from "@/lib/time";

const OCCUPYING: AppointmentStatus[] = ["PENDING", "CONFIRMED", "RECONFIRMED", "CHECKED_IN", "IN_SERVICE", "COMPLETED", "NO_SHOW"];
const minutes = (a: Date, b: Date) => Math.max(0, (b.getTime() - a.getTime()) / 60_000);
const overlapMin = (a0: Date, a1: Date, b0: Date, b1: Date) => minutes(new Date(Math.max(a0.getTime(), b0.getTime())), new Date(Math.min(a1.getTime(), b1.getTime())));

export interface DayCapacity {
  date: string;
  availableMin: number;
  bookedMin: number;
}

/** Minutos de agenda disponíveis (expediente − bloqueios) e ocupados por dia, no período [from, to). */
export async function capacityByDay(tenantId: string, from: string, to: string, professionalId?: string): Promise<DayCapacity[]> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const tz = tenant.timezone;
  const db = forTenant(tenantId);
  const start = dayRange(from, tz).start;
  const end = dayRange(to, tz).start;
  const pros = await db.professional.findMany({ where: { active: true, ...(professionalId ? { id: professionalId } : {}) }, include: { workingHours: true } });
  const [offs, appts] = await Promise.all([
    db.timeOff.findMany({ where: { startAt: { lt: end }, endAt: { gt: start } } }),
    db.appointment.findMany({ where: { startAt: { gte: start, lt: end }, status: { in: OCCUPYING }, ...(professionalId ? { professionalId } : {}) }, select: { startAt: true, endAt: true } }),
  ]);
  const out: DayCapacity[] = [];
  for (let d = from; d < to; d = addDays(d, 1)) {
    const wd = weekdayOf(d, tz);
    let available = 0;
    for (const p of pros) {
      for (const w of p.workingHours.filter((h) => h.weekday === wd)) {
        const ws = localDateMinutesToInstant(d, w.startMin, tz);
        const we = localDateMinutesToInstant(d, w.endMin, tz);
        const blocked = offs.filter((o) => o.professionalId === null || o.professionalId === p.id).reduce((s, o) => s + overlapMin(ws, we, o.startAt, o.endAt), 0);
        available += Math.max(0, minutes(ws, we) - blocked);
      }
    }
    const booked = appts.filter((a) => toLocalDate(a.startAt, tz) === d).reduce((s, a) => s + minutes(a.startAt, a.endAt), 0);
    out.push({ date: d, availableMin: Math.round(available), bookedMin: Math.round(booked) });
  }
  return out;
}

export interface PeriodReport {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  upcoming: number;
  attendanceRate: number | null; // concluídos / (concluídos + faltas)
  cancellationRate: number | null; // cancelados / total
  completedValueCents: number; // valor dos atendimentos concluídos (não é recebimento)
  upcomingValueCents: number; // previsto
  lostValueCents: number; // cancelamentos + faltas (receita potencial não realizada, estimada)
  avgTicketCents: number | null;
  occupancy: number | null;
  newCustomers: number;
  bySource: { source: string; count: number }[];
  byService: { name: string; completed: number; valueCents: number; cancelled: number }[];
  byProfessional: { name: string; completed: number; valueCents: number; noShow: number }[];
}

/** Indicadores do período [from, to) em datas locais. Valores em centavos, a partir do preço congelado na reserva. */
export async function periodReport(tenantId: string, from: string, to: string): Promise<PeriodReport> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const db = forTenant(tenantId);
  const start = dayRange(from, tenant.timezone).start;
  const end = dayRange(to, tenant.timezone).start;
  const [appts, newCustomers, cap] = await Promise.all([
    db.appointment.findMany({ where: { startAt: { gte: start, lt: end }, status: { not: "RESCHEDULED" } }, include: { professional: { select: { name: true } } } }),
    db.customer.count({ where: { createdAt: { gte: start, lt: end } } }),
    capacityByDay(tenantId, from, to),
  ]);
  const by = (s: AppointmentStatus[]) => appts.filter((a) => s.includes(a.status));
  const sum = (xs: { priceCents: number | null }[]) => xs.reduce((s, a) => s + (a.priceCents ?? 0), 0);
  const completed = by(["COMPLETED"]);
  const cancelled = by(["CANCELLED"]);
  const noShow = by(["NO_SHOW"]);
  const upcoming = by(["PENDING", "CONFIRMED", "RECONFIRMED", "CHECKED_IN", "IN_SERVICE"]);
  const available = cap.reduce((s, d) => s + d.availableMin, 0);
  const booked = cap.reduce((s, d) => s + d.bookedMin, 0);

  const group = <K extends string>(key: (a: (typeof appts)[number]) => K) => {
    const m = new Map<K, typeof appts>();
    for (const a of appts) m.set(key(a), [...(m.get(key(a)) ?? []), a]);
    return m;
  };
  return {
    total: appts.length,
    completed: completed.length,
    cancelled: cancelled.length,
    noShow: noShow.length,
    upcoming: upcoming.length,
    attendanceRate: completed.length + noShow.length ? completed.length / (completed.length + noShow.length) : null,
    cancellationRate: appts.length ? cancelled.length / appts.length : null,
    completedValueCents: sum(completed),
    upcomingValueCents: sum(upcoming),
    lostValueCents: sum(cancelled) + sum(noShow),
    avgTicketCents: completed.length ? Math.round(sum(completed) / completed.length) : null,
    occupancy: available ? booked / available : null,
    newCustomers,
    bySource: [...group((a) => a.source).entries()].map(([source, xs]) => ({ source, count: xs.length })),
    byService: [...group((a) => a.serviceName).entries()]
      .map(([name, xs]) => ({ name, completed: xs.filter((a) => a.status === "COMPLETED").length, valueCents: sum(xs.filter((a) => a.status === "COMPLETED")), cancelled: xs.filter((a) => a.status === "CANCELLED").length }))
      .sort((a, b) => b.valueCents - a.valueCents || b.completed - a.completed),
    byProfessional: [...group((a) => a.professional.name).entries()]
      .map(([name, xs]) => ({ name, completed: xs.filter((a) => a.status === "COMPLETED").length, valueCents: sum(xs.filter((a) => a.status === "COMPLETED")), noShow: xs.filter((a) => a.status === "NO_SHOW").length }))
      .sort((a, b) => b.valueCents - a.valueCents),
  };
}

/** Automações ativas na Etapa 1 e suas estatísticas de execução (a partir da fila de mensagens). */
export const BUILTIN_AUTOMATIONS = [
  { template: "booking_confirmation", name: "Confirmação da reserva", trigger: "Reserva criada", wait: "Imediato", recipient: "Cliente" },
  { template: "admin_new_booking", name: "Aviso de nova reserva", trigger: "Reserva criada", wait: "Imediato", recipient: "Administração" },
  { template: "reminder_24h", name: "Lembrete 24h antes", trigger: "24h antes do atendimento", wait: "Até 24h antes", recipient: "Cliente" },
  { template: "reminder_day", name: "Lembrete no dia", trigger: "Dia do atendimento", wait: "07:30 do dia", recipient: "Cliente" },
  { template: "booking_cancelled", name: "Aviso de cancelamento", trigger: "Cancelamento", wait: "Imediato", recipient: "Cliente" },
  { template: "admin_cancelled", name: "Vaga liberada", trigger: "Cancelamento", wait: "Imediato", recipient: "Administração" },
] as const;

export async function automationStats(tenantId: string) {
  const db = forTenant(tenantId);
  const now = new Date();
  return Promise.all(
    BUILTIN_AUTOMATIONS.map(async (a) => {
      const [sent, failed, last, next] = await Promise.all([
        db.outboxMessage.count({ where: { template: a.template, status: "SENT" } }),
        db.outboxMessage.count({ where: { template: a.template, status: "DEAD" } }),
        db.outboxMessage.findFirst({ where: { template: a.template, status: "SENT" }, orderBy: { sentAt: "desc" }, select: { sentAt: true } }),
        db.outboxMessage.findFirst({ where: { template: a.template, status: { in: ["PENDING", "FAILED"] }, sendAfter: { gte: new Date(now.getTime() - 3600_000) } }, orderBy: { sendAfter: "asc" }, select: { sendAfter: true } }),
      ]);
      return { ...a, sent, failed, lastRun: last?.sentAt ?? null, nextRun: next?.sendAfter ?? null };
    }),
  );
}
