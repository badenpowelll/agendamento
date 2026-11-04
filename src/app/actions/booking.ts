"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { processOutbox } from "@/domain/outbox";
import { headers } from "next/headers";
import { z } from "zod";
import { getContext } from "@/lib/context";
import { forTenant } from "@/lib/tenant-db";
import { rateLimit } from "@/lib/rate-limit";
import { verifyActionToken } from "@/lib/tokens";
import { createBooking, rescheduleAppointment, transitionAppointment } from "@/domain/booking";
import { DomainError } from "@/domain/errors";
import { getSite } from "@/lib/site";
import { depositRequired } from "@/lib/deposit";

/** Envia já as mensagens imediatas (confirmação), sem esperar o próximo ciclo do cron. */
const flushSoon = () => after(() => processOutbox({ limit: 10 }).catch((e) => console.error("[outbox]", e)));

export type BookingResult = { ok: true; appointmentId: string } | { ok: false; error: string; code?: "LOGIN" | "PROFILE" | "SLOT" };

const bookingSchema = z.object({
  serviceId: z.string().min(1).max(40),
  professionalId: z.string().max(40).nullable(),
  startAt: z.string().datetime(),
  idempotencyKey: z.string().uuid(),
  rescheduleId: z.string().max(40).nullable().optional(),
});

async function clientKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function bookAction(input: z.infer<typeof bookingSchema>): Promise<BookingResult> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const ctx = await getContext();
  if (!ctx.user) return { ok: false, error: "Entre com sua conta Google para concluir.", code: "LOGIN" };
  if (!ctx.customer?.profileComplete) return { ok: false, error: "Complete seu cadastro para concluir.", code: "PROFILE" };
  if (!rateLimit(`book:${ctx.user.id}`, 10, 60_000) || !rateLimit(`book-ip:${await clientKey()}`, 30, 60_000)) {
    return { ok: false, error: "Muitas tentativas. Aguarde um minuto." };
  }
  const { serviceId, professionalId, startAt, idempotencyKey, rescheduleId } = parsed.data;
  try {
    if (rescheduleId) {
      const db = forTenant(ctx.tenant.id);
      const own = await db.appointment.findFirst({ where: { id: rescheduleId, customerId: ctx.customer.id } });
      if (!own) return { ok: false, error: "Agendamento não encontrado." };
      const appt = await rescheduleAppointment(ctx.tenant.id, own.id, { startAt: new Date(startAt), professionalId, idempotencyKey, enforcePolicy: true }, { type: "CUSTOMER", userId: ctx.user.id });
      revalidatePath("/minha-conta");
      flushSoon();
      return { ok: true, appointmentId: appt.id };
    }
    const { appointment } = await createBooking(
      ctx.tenant.id,
      { serviceId, professionalId, startAt: new Date(startAt), customerId: ctx.customer.id, idempotencyKey, source: "site", initialStatus: depositRequired(await getSite()) ? "PENDING" : "CONFIRMED" },
      { type: "CUSTOMER", userId: ctx.user.id },
    );
    revalidatePath("/minha-conta");
    flushSoon();
    return { ok: true, appointmentId: appointment.id };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: e.message, code: e.code === "SLOT_UNAVAILABLE" ? "SLOT" : undefined };
    console.error(e);
    return { ok: false, error: "Não foi possível concluir agora. Tente novamente." };
  }
}

export type SimpleResult = { ok: boolean; message: string };

/** Ações da cliente logada sobre a própria reserva. */
export async function customerAction(appointmentId: string, action: "reconfirm" | "cancel"): Promise<SimpleResult> {
  const ctx = await getContext();
  if (!ctx.user || !ctx.customer) return { ok: false, message: "Entre novamente." };
  const own = await forTenant(ctx.tenant.id).appointment.findFirst({ where: { id: appointmentId, customerId: ctx.customer.id } });
  if (!own) return { ok: false, message: "Agendamento não encontrado." };
  return runCustomerTransition(ctx.tenant.id, own.id, action, ctx.user.id);
}

/** Ações a partir do link recebido por mensagem (sem login). */
export async function tokenAction(token: string, action: "reconfirm" | "cancel"): Promise<SimpleResult> {
  const v = verifyActionToken(token);
  if (!v) return { ok: false, message: "Link inválido ou expirado." };
  if (!rateLimit(`token:${await clientKey()}`, 20, 60_000)) return { ok: false, message: "Muitas tentativas. Aguarde um minuto." };
  const ctx = await getContext();
  return runCustomerTransition(ctx.tenant.id, v.appointmentId, action, null);
}

async function runCustomerTransition(tenantId: string, id: string, action: "reconfirm" | "cancel", userId: string | null): Promise<SimpleResult> {
  try {
    await transitionAppointment(tenantId, id, action === "reconfirm" ? "RECONFIRMED" : "CANCELLED", { type: "CUSTOMER", userId }, { enforcePolicy: true, note: action === "cancel" ? "Cancelado pela cliente" : undefined });
    revalidatePath("/minha-conta");
    flushSoon();
    return { ok: true, message: action === "reconfirm" ? "Presença confirmada. Até logo!" : "Agendamento cancelado. O horário foi liberado." };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Não foi possível concluir agora." };
  }
}
