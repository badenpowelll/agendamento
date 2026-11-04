import { describe, expect, it } from "vitest";
import { depositCents, depositRequired } from "@/lib/deposit";
import { renderMessage } from "@/domain/messages";
import { EMPTY_SITE_CONTENT, parseSiteContent } from "@/lib/site-content";

const site = parseSiteContent({ ...EMPTY_SITE_CONTENT, payment: { pixKey: "+5584999627357", pixName: "Clubfit", depositPercent: 30, depositHours: 24, methods: "", note: "" } });

describe("sinal via Pix", () => {
  it("calcula 30% arredondando para cima no centavo", () => {
    expect(depositCents(7500, 30)).toBe(2250);
    expect(depositCents(5500, 30)).toBe(1650);
    expect(depositCents(1, 30)).toBe(1);
    expect(depositCents(null, 30)).toBeNull();
    expect(depositCents(5000, 0)).toBeNull();
  });

  it("só exige sinal com percentual e chave preenchidos; conteúdo antigo sem pagamento continua válido", () => {
    expect(depositRequired(site)).toBe(true);
    expect(depositRequired(EMPTY_SITE_CONTENT)).toBe(false);
    expect(parseSiteContent({ brand: { displayName: "X" } }).payment.depositPercent).toBe(0);
  });

  it("mensagem da reserva pendente traz a chave Pix e o valor do sinal", () => {
    const base = { tenant: { name: "Milly", timezone: "America/Fortaleza" }, site, professionalName: "P", customerName: "Ana" };
    const pend = renderMessage("booking_confirmation", { ...base, appointment: { id: "a1", startAt: new Date("2026-11-12T13:00:00Z"), serviceName: "Virilha completa", priceCents: 7500, status: "PENDING" } });
    expect(pend.subject).toContain("falta o sinal");
    expect(pend.text).toContain("+5584999627357");
    expect(pend.text).toContain("Clubfit");
    expect(pend.text).toMatch(/R\$\s?22,50/);
    const conf = renderMessage("booking_confirmation", { ...base, appointment: { id: "a1", startAt: new Date("2026-11-12T13:00:00Z"), serviceName: "Buço", priceCents: 2000, status: "CONFIRMED" } });
    expect(conf.text).not.toContain("Pix");
  });
});
