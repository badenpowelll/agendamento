import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createBooking, transitionAppointment } from "@/domain/booking";
import { processOutbox, MAX_ATTEMPTS } from "@/domain/outbox";
import { ProviderError } from "@/lib/providers/email";
import { makeCustomer, makeTenant, NOW, resetDb, SLOT } from "../helpers";

beforeEach(resetDb);

async function setup() {
  const { tenant, service, professional } = await makeTenant("milly");
  const c = await makeCustomer(tenant.id, "Ana");
  const { appointment } = await createBooking(tenant.id, { serviceId: service.id, professionalId: professional.id, startAt: SLOT, customerId: c.id, idempotencyKey: "a", now: NOW }, { type: "CUSTOMER" });
  return { tenant, appointment };
}

const okSenders = () => ({ email: vi.fn(async () => ({ providerId: "p" })), whatsapp: vi.fn(async () => ({ providerId: "w" })) });

describe("fila de mensagens", () => {
  it("envia só o que já venceu e marca como enviado", async () => {
    await setup();
    const senders = okSenders();
    const r = await processOutbox({ now: NOW, senders });
    expect(r.sent).toBe(2); // confirmação + aviso à administração
    expect(senders.email).toHaveBeenCalledTimes(2);
    expect(await prisma.outboxMessage.count({ where: { status: "PENDING" } })).toBe(2); // lembretes futuros
    const again = await processOutbox({ now: NOW, senders });
    expect(again.claimed).toBe(0);
  });

  it("dois workers em paralelo não enviam a mesma mensagem duas vezes", async () => {
    await setup();
    const senders = okSenders();
    const later = new Date(SLOT.getTime() - 60 * 60_000);
    await Promise.all([processOutbox({ now: later, senders }), processOutbox({ now: later, senders }), processOutbox({ now: later, senders })]);
    expect(senders.email).toHaveBeenCalledTimes(4);
    expect(await prisma.outboxMessage.count({ where: { status: "SENT" } })).toBe(4);
  });

  it("falha temporária: tenta de novo com espera e vai para a fila de erros após o limite", async () => {
    await setup();
    const failing = { email: vi.fn(async () => { throw new ProviderError("timeout", true); }), whatsapp: vi.fn() };
    let now = NOW;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await processOutbox({ now, senders: failing as never });
      now = new Date(now.getTime() + 2 * 3600_000);
      if (now > new Date(SLOT.getTime() - 25 * 3600_000)) break;
    }
    const conf = await prisma.outboxMessage.findFirstOrThrow({ where: { template: "booking_confirmation" } });
    expect(conf.status).toBe("DEAD");
    expect(conf.attempts).toBe(MAX_ATTEMPTS);
    expect(conf.lastError).toContain("timeout");
  });

  it("erro definitivo (configuração) vai direto para a fila de erros", async () => {
    await setup();
    const failing = { email: vi.fn(async () => { throw new ProviderError("sem chave", false); }), whatsapp: vi.fn() };
    const r = await processOutbox({ now: NOW, senders: failing as never });
    expect(r.dead).toBe(2);
  });

  it("lembrete de reserva cancelada não é enviado", async () => {
    const { tenant, appointment } = await setup();
    await processOutbox({ now: NOW, senders: okSenders() });
    await transitionAppointment(tenant.id, appointment.id, "CANCELLED", { type: "STAFF" }, { now: NOW });
    const senders = okSenders();
    await processOutbox({ now: new Date(SLOT.getTime() - 60_000), senders });
    const calls = senders.email.mock.calls as unknown as [{ subject: string }][];
    expect(calls.map((c) => c[0].subject).join(" ")).not.toMatch(/lembrete|hoje/i);
    expect(calls.length).toBe(2); // cancelamento para a cliente + aviso à administração
  });

  it("cliente que desligou o e-mail depois de agendar não recebe o lembrete", async () => {
    const { appointment } = await setup();
    await prisma.customer.update({ where: { id: appointment.customerId }, data: { allowEmail: false } });
    const senders = okSenders();
    await processOutbox({ now: new Date(SLOT.getTime() - 60_000), senders });
    expect(senders.email).toHaveBeenCalledTimes(1); // só o aviso à administração
  });
});
