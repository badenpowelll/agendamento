import type { OutboxMessage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendEmail, ProviderError } from "@/lib/providers/email";
import { sendWhatsappTemplate } from "@/lib/providers/whatsapp";
import { parseSiteContent } from "@/lib/site-content";
import { renderMessage, shouldSkip, type TemplateName } from "./messages";

export const MAX_ATTEMPTS = 5;
/** Espera crescente entre tentativas: 2, 4, 8, 16 minutos. */
export const backoffMinutes = (attempts: number) => Math.min(2 ** attempts, 60);

export interface Senders {
  email: typeof sendEmail;
  whatsapp: typeof sendWhatsappTemplate;
}
const defaultSenders: Senders = { email: sendEmail, whatsapp: sendWhatsappTemplate };

/**
 * Reserva um lote de mensagens prontas para envio com FOR UPDATE SKIP LOCKED,
 * permitindo vários workers em paralelo sem enviar a mesma mensagem duas vezes.
 * Mensagens presas em SENDING por mais de 10 minutos voltam para a fila.
 */
async function claimBatch(limit: number, now: Date): Promise<OutboxMessage[]> {
  return prisma.$queryRaw<OutboxMessage[]>`
    UPDATE "OutboxMessage" SET status = 'SENDING', "lockedAt" = ${now}, attempts = attempts + 1, "updatedAt" = ${now}
    WHERE id IN (
      SELECT id FROM "OutboxMessage"
      WHERE (status IN ('PENDING', 'FAILED') AND "sendAfter" <= ${now})
         OR (status = 'SENDING' AND "lockedAt" < ${new Date(now.getTime() - 10 * 60_000)})
      ORDER BY "sendAfter"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *`;
}

async function deliver(msg: OutboxMessage, senders: Senders): Promise<{ skipped: true } | { providerId: string }> {
  const appt = msg.appointmentId
    ? await prisma.appointment.findFirst({
        where: { id: msg.appointmentId, tenantId: msg.tenantId },
        include: { customer: true, professional: true, tenant: { include: { siteContent: true } } },
      })
    : null;
  if (!appt) return { skipped: true };
  const template = msg.template as TemplateName;
  if (shouldSkip(template, appt.status)) return { skipped: true };
  // Respeita mudanças de preferência feitas depois do agendamento
  const isCustomerMsg = !template.startsWith("admin_");
  if (isCustomerMsg && msg.channel === "EMAIL" && !appt.customer.allowEmail) return { skipped: true };
  if (isCustomerMsg && msg.channel === "WHATSAPP" && !appt.customer.allowWhatsapp) return { skipped: true };

  const rendered = renderMessage(template, {
    tenant: appt.tenant,
    site: parseSiteContent(appt.tenant.siteContent?.data),
    appointment: appt,
    professionalName: appt.professional.name,
    customerName: appt.customer.name,
  });
  if (msg.channel === "EMAIL") {
    return senders.email({ to: msg.recipient, subject: rendered.subject, html: rendered.html, text: rendered.text, idempotencyKey: msg.id });
  }
  return senders.whatsapp({ to: msg.recipient, template, params: rendered.whatsappParams });
}

export interface ProcessResult {
  claimed: number;
  sent: number;
  skipped: number;
  failed: number;
  dead: number;
}

/** Processa a fila uma vez. Chamado pelo cron (/api/cron/outbox) ou pelo script `npm run worker`. */
export async function processOutbox(opts: { limit?: number; now?: Date; senders?: Senders } = {}): Promise<ProcessResult> {
  const now = opts.now ?? new Date();
  const senders = opts.senders ?? defaultSenders;
  const batch = await claimBatch(opts.limit ?? 50, now);
  const res: ProcessResult = { claimed: batch.length, sent: 0, skipped: 0, failed: 0, dead: 0 };
  for (const msg of batch) {
    try {
      const r = await deliver(msg, senders);
      if ("skipped" in r) {
        await prisma.outboxMessage.update({ where: { id: msg.id }, data: { status: "CANCELLED", lockedAt: null } });
        res.skipped++;
      } else {
        await prisma.outboxMessage.update({ where: { id: msg.id }, data: { status: "SENT", sentAt: new Date(), providerId: r.providerId, lockedAt: null, lastError: null } });
        res.sent++;
      }
    } catch (e) {
      const retryable = !(e instanceof ProviderError) || e.retryable;
      const dead = !retryable || msg.attempts >= MAX_ATTEMPTS;
      await prisma.outboxMessage.update({
        where: { id: msg.id },
        data: {
          status: dead ? "DEAD" : "FAILED",
          lastError: (e instanceof Error ? e.message : String(e)).slice(0, 1000),
          lockedAt: null,
          sendAfter: dead ? msg.sendAfter : new Date(now.getTime() + backoffMinutes(msg.attempts) * 60_000),
        },
      });
      if (dead) res.dead++;
      else res.failed++;
    }
  }
  return res;
}

/** Reprocessamento seguro de uma mensagem da fila de erros (ação manual no painel). */
export async function retryDeadMessage(tenantId: string, id: string) {
  const r = await prisma.outboxMessage.updateMany({
    where: { id, tenantId, status: "DEAD" },
    data: { status: "PENDING", attempts: 0, sendAfter: new Date(), lastError: null },
  });
  return r.count === 1;
}
