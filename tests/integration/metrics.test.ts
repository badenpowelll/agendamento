import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createBooking, transitionAppointment } from "@/domain/booking";
import { capacityByDay, periodReport } from "@/domain/metrics";
import { makeCustomer, makeTenant, NOW, resetDb, SLOT } from "../helpers";

beforeEach(resetDb);

describe("indicadores", () => {
  it("ocupação, comparecimento, cancelamento e valores separados por situação", async () => {
    const { tenant, service, professional } = await makeTenant("milly"); // 08–18h = 600 min/dia, serviço 60 min, R$ 100
    const cs = await Promise.all(["A", "B", "C"].map((n) => makeCustomer(tenant.id, n)));
    const book = (i: number, h: number) => createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: new Date(SLOT.getTime() + h * 3600_000), customerId: cs[i].id, idempotencyKey: `k${i}`, now: NOW }, { type: "CUSTOMER" });
    const a = (await book(0, 0)).appointment;
    const b = (await book(1, 2)).appointment;
    const c = (await book(2, 4)).appointment;
    for (const s of ["CHECKED_IN", "IN_SERVICE", "COMPLETED"] as const) await transitionAppointment(tenant.id, a.id, s, { type: "STAFF" }, { now: NOW });
    await transitionAppointment(tenant.id, b.id, "NO_SHOW", { type: "STAFF" }, { now: NOW });
    await transitionAppointment(tenant.id, c.id, "CANCELLED", { type: "STAFF" }, { now: NOW });

    const cap = await capacityByDay(tenant.id, "2026-11-12", "2026-11-13");
    expect(cap[0]).toEqual({ date: "2026-11-12", availableMin: 600, bookedMin: 120 }); // concluído + falta ocupam a agenda

    const r = await periodReport(tenant.id, "2026-11-12", "2026-11-13");
    expect(r).toMatchObject({ total: 3, completed: 1, noShow: 1, cancelled: 1, completedValueCents: 10000, lostValueCents: 20000, avgTicketCents: 10000, attendanceRate: 0.5 });
    expect(r.occupancy).toBeCloseTo(0.2);
  });

  it("bloqueio reduz a capacidade", async () => {
    const { tenant } = await makeTenant("milly");
    await prisma.timeOff.create({ data: { tenantId: tenant.id, startAt: new Date("2026-11-12T11:00:00Z"), endAt: new Date("2026-11-12T13:00:00Z") } });
    const cap = await capacityByDay(tenant.id, "2026-11-12", "2026-11-13");
    expect(cap[0].availableMin).toBe(480);
  });
});
