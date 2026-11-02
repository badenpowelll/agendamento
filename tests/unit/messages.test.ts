import { describe, expect, it } from "vitest";
import { planBookingMessages, renderMessage } from "@/domain/messages";
import { EMPTY_SITE_CONTENT } from "@/lib/site-content";
import { createActionToken, verifyActionToken } from "@/lib/tokens";

const customer = { email: "a@b.test", allowEmail: true, phone: null, phoneVerifiedAt: null, allowWhatsapp: false };
const tenant = { timezone: "America/Fortaleza", notificationEmail: "admin@x.test" };

describe("planBookingMessages", () => {
  it("agenda confirmação, lembrete de 24h, lembrete do dia e aviso à administração", () => {
    const msgs = planBookingMessages({ id: "a1", startAt: new Date("2026-11-12T13:00:00Z") }, customer, tenant, new Date("2026-11-10T12:00:00Z"));
    expect(msgs.map((m) => m.template).sort()).toEqual(["admin_new_booking", "booking_confirmation", "reminder_24h", "reminder_day"]);
    expect(msgs.find((m) => m.template === "reminder_24h")!.sendAfter.toISOString()).toBe("2026-11-11T13:00:00.000Z");
    expect(msgs.find((m) => m.template === "reminder_day")!.sendAfter.toISOString()).toBe("2026-11-12T10:30:00.000Z"); // 07:30 local
    expect(new Set(msgs.map((m) => m.dedupeKey)).size).toBe(msgs.length);
  });
  it("reserva para daqui a 3h não gera lembrete de 24h", () => {
    const msgs = planBookingMessages({ id: "a1", startAt: new Date("2026-11-10T15:00:00Z") }, customer, tenant, new Date("2026-11-10T12:00:00Z"));
    expect(msgs.map((m) => m.template)).not.toContain("reminder_24h");
    expect(msgs.map((m) => m.template)).not.toContain("reminder_day");
  });
  it("sem consentimento de e-mail, nada vai para a cliente", () => {
    const msgs = planBookingMessages({ id: "a1", startAt: new Date("2026-11-12T13:00:00Z") }, { ...customer, allowEmail: false }, tenant, new Date("2026-11-10T12:00:00Z"));
    expect(msgs.map((m) => m.template)).toEqual(["admin_new_booking"]);
  });
  it("WhatsApp exige número verificado mesmo com o canal ativo", () => {
    process.env.WHATSAPP_ENABLED = "true";
    const msgs = planBookingMessages({ id: "a1", startAt: new Date("2026-11-12T13:00:00Z") }, { ...customer, phone: "+5584999999999", allowWhatsapp: true }, tenant, new Date("2026-11-10T12:00:00Z"));
    expect(msgs.some((m) => m.channel === "WHATSAPP")).toBe(false);
    delete process.env.WHATSAPP_ENABLED;
  });
});

describe("renderMessage", () => {
  it("escapa HTML e inclui o link de gestão", () => {
    const r = renderMessage("booking_confirmation", {
      tenant: { name: "Milly", timezone: "America/Fortaleza" },
      site: EMPTY_SITE_CONTENT,
      appointment: { id: "a1", startAt: new Date("2026-11-12T13:00:00Z"), serviceName: "<b>x</b>", priceCents: null, status: "CONFIRMED" },
      professionalName: "P",
      customerName: "Ana Souza",
    });
    expect(r.html).not.toContain("<b>x</b>");
    expect(r.text).toContain("http://localhost:3000/a/");
    expect(r.text).toContain("Olá, Ana!");
  });
});

describe("tokens de ação", () => {
  it("valida assinatura e expiração", () => {
    const t = createActionToken("appt1", "manage", new Date(Date.now() + 60_000));
    expect(verifyActionToken(t)?.appointmentId).toBe("appt1");
    expect(verifyActionToken(t.slice(0, -2) + "xx")).toBeNull();
    expect(verifyActionToken(createActionToken("appt1", "manage", new Date(Date.now() - 1000)))).toBeNull();
  });
});
