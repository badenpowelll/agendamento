import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { forTenant } from "@/lib/tenant-db";
import { createBooking, getAvailability, transitionAppointment } from "@/domain/booking";
import { DomainError } from "@/domain/errors";
import { makeCustomer, makeTenant, NOW, resetDb, SLOT } from "../helpers";

beforeEach(resetDb);

describe("isolamento entre estabelecimentos", () => {
  it("leituras só enxergam o próprio estabelecimento", async () => {
    const a = await makeTenant("a");
    const b = await makeTenant("b");
    await makeCustomer(a.tenant.id, "Ana");
    await makeCustomer(b.tenant.id, "Bia");
    const dbA = forTenant(a.tenant.id);
    expect((await dbA.customer.findMany()).map((c) => c.name)).toEqual(["Ana"]);
    expect(await dbA.service.count()).toBe(1);
    expect(await dbA.service.findUnique({ where: { id: b.service.id } })).toBeNull();
  });

  it("não é possível alterar ou apagar dados de outro estabelecimento", async () => {
    const a = await makeTenant("a");
    const b = await makeTenant("b");
    const dbA = forTenant(a.tenant.id);
    const upd = await dbA.service.updateMany({ where: { id: b.service.id }, data: { name: "invadido" } });
    expect(upd.count).toBe(0);
    await expect(dbA.service.update({ where: { id: b.service.id }, data: { name: "invadido" } })).rejects.toThrow();
    const del = await dbA.service.deleteMany({});
    expect(del.count).toBe(1);
    expect(await prisma.service.count({ where: { tenantId: b.tenant.id } })).toBe(1);
  });

  it("criação sempre grava o estabelecimento da sessão, mesmo que outro seja enviado", async () => {
    const a = await makeTenant("a");
    const b = await makeTenant("b");
    const s = await forTenant(a.tenant.id).service.create({ data: { tenantId: b.tenant.id, name: "x", durationMin: 30 } as never });
    expect(s.tenantId).toBe(a.tenant.id);
  });

  it("não é possível mover registro para outro estabelecimento", async () => {
    const a = await makeTenant("a");
    const b = await makeTenant("b");
    const s = await forTenant(a.tenant.id).service.update({ where: { id: a.service.id }, data: { tenantId: b.tenant.id } as never });
    expect(s.tenantId).toBe(a.tenant.id);
  });

  it("reserva com serviço, cliente ou agendamento de outro estabelecimento é recusada", async () => {
    const a = await makeTenant("a");
    const b = await makeTenant("b");
    const cb = await makeCustomer(b.tenant.id, "Bia");
    const ca = await makeCustomer(a.tenant.id, "Ana");
    await expect(createBooking(a.tenant.id, { serviceId: b.service.id, startAt: SLOT, customerId: ca.id, idempotencyKey: "x", now: NOW }, { type: "CUSTOMER" })).rejects.toBeInstanceOf(DomainError);
    await expect(createBooking(a.tenant.id, { serviceId: a.service.id, startAt: SLOT, customerId: cb.id, idempotencyKey: "y", now: NOW }, { type: "CUSTOMER" })).rejects.toBeInstanceOf(DomainError);
    const { appointment } = await createBooking(b.tenant.id, { serviceId: b.service.id, startAt: SLOT, customerId: cb.id, idempotencyKey: "z", now: NOW }, { type: "CUSTOMER" });
    await expect(transitionAppointment(a.tenant.id, appointment.id, "CANCELLED", { type: "STAFF" }, { now: NOW })).rejects.toBeInstanceOf(DomainError);
    await expect(getAvailability(a.tenant.id, { serviceId: b.service.id, date: "2026-11-12", now: NOW })).rejects.toBeInstanceOf(DomainError);
  });

  it("agendas de estabelecimentos diferentes não interferem entre si", async () => {
    const a = await makeTenant("a");
    const b = await makeTenant("b");
    const ca = await makeCustomer(a.tenant.id, "Ana");
    const cb = await makeCustomer(b.tenant.id, "Bia");
    await createBooking(a.tenant.id, { serviceId: a.service.id, startAt: SLOT, customerId: ca.id, idempotencyKey: "k", now: NOW }, { type: "CUSTOMER" });
    const r = await createBooking(b.tenant.id, { serviceId: b.service.id, startAt: SLOT, customerId: cb.id, idempotencyKey: "k", now: NOW }, { type: "CUSTOMER" });
    expect(r.created).toBe(true);
  });
});
