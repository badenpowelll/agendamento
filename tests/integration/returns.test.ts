import { beforeEach, describe, expect, it } from "vitest";
import { createBooking, transitionAppointment } from "@/domain/booking";
import { returnList } from "@/domain/returns";
import { prisma } from "@/lib/db";
import { makeCustomer, makeTenant, NOW, resetDb, SLOT } from "../helpers";

beforeEach(resetDb);
const DAY = 86_400_000;

describe("retornos", () => {
  it("aparece 2 dias antes de completar 30 dias; some quem já tem horário marcado", async () => {
    const { tenant, service, professional } = await makeTenant("milly");
    const [ana, bia] = await Promise.all([makeCustomer(tenant.id, "Ana"), makeCustomer(tenant.id, "Bia")]);
    const book = (customerId: string, start: Date, key: string) =>
      createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: start, customerId, idempotencyKey: key, now: NOW }, { type: "CUSTOMER" });
    const a = (await book(ana.id, SLOT, "a")).appointment;
    for (const s of ["CHECKED_IN", "IN_SERVICE", "COMPLETED"] as const) await transitionAppointment(tenant.id, a.id, s, { type: "STAFF" }, { now: NOW });
    const b = (await book(bia.id, new Date(SLOT.getTime() + 2 * 3600_000), "b")).appointment;
    for (const s of ["CHECKED_IN", "IN_SERVICE", "COMPLETED"] as const) await transitionAppointment(tenant.id, b.id, s, { type: "STAFF" }, { now: NOW });
    // Bia já marcou o próximo horário
    await book(bia.id, new Date(SLOT.getTime() + 35 * DAY), "b2");

    expect((await returnList(tenant.id, new Date(SLOT.getTime() + 27 * DAY))).due).toHaveLength(0);
    const soon = await returnList(tenant.id, new Date(SLOT.getTime() + 27 * DAY));
    expect(soon.soon.map((r) => r.name)).toEqual(["Ana"]);

    const day28 = await returnList(tenant.id, new Date(SLOT.getTime() + 28 * DAY + 60_000));
    expect(day28.due.map((r) => r.name)).toEqual(["Ana"]);
    expect(day28.due[0].contactedAt).toBeNull();

    await prisma.auditLog.create({ data: { tenantId: tenant.id, action: "customer.return_contacted", entity: "Customer", entityId: ana.id, createdAt: new Date(SLOT.getTime() + 28 * DAY + 120_000) } });
    const after = await returnList(tenant.id, new Date(SLOT.getTime() + 28 * DAY + 180_000));
    expect(after.due[0]?.contactedAt).not.toBeNull();
  });
});
