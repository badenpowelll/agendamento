import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createBooking, getAvailability, rescheduleAppointment, transitionAppointment } from "@/domain/booking";
import { SlotUnavailableError, DomainError } from "@/domain/errors";
import { makeCustomer, makeTenant, NOW, resetDb, SLOT } from "../helpers";

beforeEach(resetDb);

describe("reserva sem conflito", () => {
  it("20 clientes tentando o mesmo horário ao mesmo tempo: só 1 consegue", async () => {
    const { tenant, service, professional } = await makeTenant("milly");
    const customers = await Promise.all(Array.from({ length: 20 }, (_, i) => makeCustomer(tenant.id, `Cliente ${i}`)));
    const results = await Promise.allSettled(
      customers.map((c, i) =>
        createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: SLOT, customerId: c.id, idempotencyKey: `k${i}`, now: NOW }, { type: "CUSTOMER" }),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(rejected).toHaveLength(19);
    for (const r of rejected) expect(r.reason).toBeInstanceOf(SlotUnavailableError);
    expect(await prisma.appointment.count()).toBe(1);
  });

  it("horários sobrepostos parcialmente também são recusados pelo banco", async () => {
    const { tenant, service, professional } = await makeTenant("milly");
    const a = await makeCustomer(tenant.id, "A");
    const b = await makeCustomer(tenant.id, "B");
    await createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: SLOT, customerId: a.id, idempotencyKey: "a", now: NOW }, { type: "CUSTOMER" });
    // 10:30 local invade 10:00-11:15 (60 min + 15 de preparo), mesmo como encaixe
    const overlap = new Date(SLOT.getTime() + 30 * 60_000);
    await expect(
      createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: overlap, customerId: b.id, idempotencyKey: "b", now: NOW, allowOutsideHours: true }, { type: "STAFF" }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it("com duas profissionais, a segunda cliente fica com a outra profissional", async () => {
    const { tenant, service } = await makeTenant("milly", { professionals: 2 });
    const [a, b, c] = await Promise.all(["A", "B", "C"].map((n) => makeCustomer(tenant.id, n)));
    const r1 = await createBooking(tenant.id, { serviceId: service.id, startAt: SLOT, customerId: a.id, idempotencyKey: "a", now: NOW }, { type: "CUSTOMER" });
    const r2 = await createBooking(tenant.id, { serviceId: service.id, startAt: SLOT, customerId: b.id, idempotencyKey: "b", now: NOW }, { type: "CUSTOMER" });
    expect(r1.appointment.professionalId).not.toBe(r2.appointment.professionalId);
    await expect(createBooking(tenant.id, { serviceId: service.id, startAt: SLOT, customerId: c.id, idempotencyKey: "c", now: NOW }, { type: "CUSTOMER" })).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it("idempotência: o mesmo clique enviado duas vezes cria uma única reserva", async () => {
    const { tenant, service, professional } = await makeTenant("milly");
    const c = await makeCustomer(tenant.id);
    const input = { serviceId: service.id, professionalId: professional.id, startAt: SLOT, customerId: c.id, idempotencyKey: "same", now: NOW };
    const [r1, r2] = await Promise.all([createBooking(tenant.id, input, { type: "CUSTOMER" }), createBooking(tenant.id, input, { type: "CUSTOMER" })]);
    expect(r1.appointment.id).toBe(r2.appointment.id);
    expect(await prisma.appointment.count()).toBe(1);
    expect(await prisma.outboxMessage.count({ where: { template: "booking_confirmation" } })).toBe(1);
  });

  it("horário fora do expediente ou no passado é recusado", async () => {
    const { tenant, service, professional } = await makeTenant("milly");
    const c = await makeCustomer(tenant.id);
    const night = new Date("2026-11-12T23:00:00Z"); // 20:00 local
    await expect(createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: night, customerId: c.id, idempotencyKey: "n", now: NOW }, { type: "CUSTOMER" })).rejects.toBeInstanceOf(SlotUnavailableError);
    const past = new Date("2026-11-09T13:00:00Z");
    await expect(createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: past, customerId: c.id, idempotencyKey: "p", now: NOW }, { type: "CUSTOMER" })).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it("bloqueio (folga/feriado) remove os horários", async () => {
    const { tenant, service } = await makeTenant("milly");
    await prisma.timeOff.create({ data: { tenantId: tenant.id, professionalId: null, startAt: new Date("2026-11-12T03:00:00Z"), endAt: new Date("2026-11-13T03:00:00Z"), reason: "Feriado" } });
    expect(await getAvailability(tenant.id, { serviceId: service.id, date: "2026-11-12", now: NOW })).toEqual([]);
  });
});

describe("cancelamento e reagendamento", () => {
  it("cancelar libera o horário, cancela lembretes e avisa a administração", async () => {
    const { tenant, service, professional } = await makeTenant("milly");
    const a = await makeCustomer(tenant.id, "A");
    const b = await makeCustomer(tenant.id, "B");
    const { appointment } = await createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: SLOT, customerId: a.id, idempotencyKey: "a", now: NOW }, { type: "CUSTOMER" });
    await transitionAppointment(tenant.id, appointment.id, "CANCELLED", { type: "CUSTOMER" }, { now: NOW, enforcePolicy: true });
    expect(await prisma.outboxMessage.count({ where: { appointmentId: appointment.id, template: "reminder_24h", status: "CANCELLED" } })).toBe(1);
    expect(await prisma.outboxMessage.count({ where: { appointmentId: appointment.id, template: "admin_cancelled" } })).toBe(1);
    const again = await createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: SLOT, customerId: b.id, idempotencyKey: "b", now: NOW }, { type: "CUSTOMER" });
    expect(again.created).toBe(true);
    const events = await prisma.appointmentEvent.findMany({ where: { appointmentId: appointment.id }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => e.toStatus)).toEqual(["CONFIRMED", "CANCELLED"]);
  });

  it("cliente não cancela pelo site em cima da hora", async () => {
    const { tenant, service, professional } = await makeTenant("milly");
    const a = await makeCustomer(tenant.id, "A");
    const { appointment } = await createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: SLOT, customerId: a.id, idempotencyKey: "a", now: NOW }, { type: "CUSTOMER" });
    const late = new Date(SLOT.getTime() - 2 * 3600_000);
    await expect(transitionAppointment(tenant.id, appointment.id, "CANCELLED", { type: "CUSTOMER" }, { now: late, enforcePolicy: true })).rejects.toBeInstanceOf(DomainError);
  });

  it("reagendar para um horário que sobrepõe o antigo funciona e é atômico", async () => {
    const { tenant, service, professional } = await makeTenant("milly");
    const a = await makeCustomer(tenant.id, "A");
    const { appointment } = await createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: SLOT, customerId: a.id, idempotencyKey: "a", now: NOW }, { type: "CUSTOMER" });
    const newStart = new Date(SLOT.getTime() + 30 * 60_000);
    const moved = await rescheduleAppointment(tenant.id, appointment.id, { startAt: newStart, idempotencyKey: "r1", now: NOW }, { type: "CUSTOMER" });
    expect(moved.rescheduledFromId).toBe(appointment.id);
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } })).status).toBe("RESCHEDULED");
  });

  it("reagendar para horário ocupado não altera nada", async () => {
    const { tenant, service, professional } = await makeTenant("milly");
    const a = await makeCustomer(tenant.id, "A");
    const b = await makeCustomer(tenant.id, "B");
    const { appointment } = await createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: SLOT, customerId: a.id, idempotencyKey: "a", now: NOW }, { type: "CUSTOMER" });
    const other = new Date(SLOT.getTime() + 3 * 3600_000);
    await createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: other, customerId: b.id, idempotencyKey: "b", now: NOW }, { type: "CUSTOMER" });
    await expect(rescheduleAppointment(tenant.id, appointment.id, { startAt: other, idempotencyKey: "r", now: NOW }, { type: "CUSTOMER" })).rejects.toBeInstanceOf(SlotUnavailableError);
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } })).status).toBe("CONFIRMED");
  });

  it("duas mudanças de estado simultâneas: só uma vale", async () => {
    const { tenant, service, professional } = await makeTenant("milly");
    const a = await makeCustomer(tenant.id, "A");
    const { appointment } = await createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: SLOT, customerId: a.id, idempotencyKey: "a", now: NOW }, { type: "CUSTOMER" });
    const rs = await Promise.allSettled([
      transitionAppointment(tenant.id, appointment.id, "CANCELLED", { type: "STAFF" }, { now: NOW }),
      transitionAppointment(tenant.id, appointment.id, "CHECKED_IN", { type: "STAFF" }, { now: NOW }),
    ]);
    expect(rs.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.appointmentEvent.count({ where: { appointmentId: appointment.id } })).toBe(2);
  });
});

describe("sinal pendente", () => {
  it("reserva com sinal nasce 'aguardando sinal', segue assim ao reagendar e a equipe confirma", async () => {
    const { tenant, service, professional } = await makeTenant("milly");
    const c = await makeCustomer(tenant.id);
    const { appointment } = await createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: SLOT, customerId: c.id, idempotencyKey: "p1", now: NOW, initialStatus: "PENDING" }, { type: "CUSTOMER" });
    expect(appointment.status).toBe("PENDING");
    const moved = await rescheduleAppointment(tenant.id, appointment.id, { startAt: new Date(SLOT.getTime() + 2 * 3600_000), idempotencyKey: "p2", now: NOW }, { type: "CUSTOMER" });
    expect(moved.status).toBe("PENDING");
    const ok = await transitionAppointment(tenant.id, moved.id, "CONFIRMED", { type: "STAFF" }, { now: NOW });
    expect(ok.status).toBe("CONFIRMED");
  });

  it("serviço sem duração definida não pode ser agendado", async () => {
    const { tenant, service, professional } = await makeTenant("milly");
    await prisma.service.update({ where: { id: service.id }, data: { durationMin: 0 } });
    const c = await makeCustomer(tenant.id);
    await expect(createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: SLOT, customerId: c.id, idempotencyKey: "z", now: NOW }, { type: "CUSTOMER" })).rejects.toBeInstanceOf(DomainError);
  });
});
