import type { Appointment, Channel, Customer, Tenant } from "@prisma/client";
import { addMinutes, formatDateTime, formatTime, localDateMinutesToInstant, toLocalDate } from "@/lib/time";
import { env } from "@/lib/env";
import { createActionToken } from "@/lib/tokens";
import type { SiteContent } from "@/lib/site-content";
import { formatBRL } from "@/lib/money";

export type TemplateName =
  | "booking_confirmation"
  | "reminder_24h"
  | "reminder_day"
  | "booking_cancelled"
  | "admin_new_booking"
  | "admin_cancelled";

export interface PlannedMessage {
  template: TemplateName;
  channel: Channel;
  recipient: string;
  sendAfter: Date;
  dedupeKey: string;
  appointmentId: string;
}

/** Horário local (minutos) do lembrete "no dia". */
export const DAY_REMINDER_LOCAL_MIN = 7 * 60 + 30;

function customerChannels(c: Pick<Customer, "email" | "allowEmail" | "phone" | "phoneVerifiedAt" | "allowWhatsapp">) {
  const out: { channel: Channel; recipient: string }[] = [];
  if (c.email && c.allowEmail) out.push({ channel: "EMAIL", recipient: c.email });
  if (env.whatsappEnabled && c.phone && c.phoneVerifiedAt && c.allowWhatsapp) out.push({ channel: "WHATSAPP", recipient: c.phone });
  return out;
}

/**
 * Decide quais mensagens uma reserva nova gera e quando.
 * Função pura e testável. A chave de deduplicação impede envio em dobro.
 */
export function planBookingMessages(
  appt: Pick<Appointment, "id" | "startAt">,
  customer: Pick<Customer, "email" | "allowEmail" | "phone" | "phoneVerifiedAt" | "allowWhatsapp">,
  tenant: Pick<Tenant, "timezone" | "notificationEmail">,
  now: Date,
): PlannedMessage[] {
  const out: PlannedMessage[] = [];
  const channels = customerChannels(customer);
  const r24 = addMinutes(appt.startAt, -24 * 60);
  const day = localDateMinutesToInstant(toLocalDate(appt.startAt, tenant.timezone), DAY_REMINDER_LOCAL_MIN, tenant.timezone);

  for (const { channel, recipient } of channels) {
    const base = { channel, recipient, appointmentId: appt.id };
    out.push({ ...base, template: "booking_confirmation", sendAfter: now, dedupeKey: `${appt.id}:booking_confirmation:${channel}` });
    // Lembrete de 24h só faz sentido se ainda houver pelo menos 1h até ele
    if (r24.getTime() - now.getTime() >= 60 * 60_000) {
      out.push({ ...base, template: "reminder_24h", sendAfter: r24, dedupeKey: `${appt.id}:reminder_24h:${channel}` });
    }
    // Lembrete do dia: às 07:30 locais, se for no futuro e pelo menos 1h antes do horário
    if (day > now && appt.startAt.getTime() - day.getTime() >= 60 * 60_000) {
      out.push({ ...base, template: "reminder_day", sendAfter: day, dedupeKey: `${appt.id}:reminder_day:${channel}` });
    }
  }
  if (tenant.notificationEmail) {
    out.push({
      template: "admin_new_booking",
      channel: "EMAIL",
      recipient: tenant.notificationEmail,
      sendAfter: now,
      dedupeKey: `${appt.id}:admin_new_booking`,
      appointmentId: appt.id,
    });
  }
  return out;
}

export function planCancellationMessages(
  appt: Pick<Appointment, "id">,
  customer: Pick<Customer, "email" | "allowEmail" | "phone" | "phoneVerifiedAt" | "allowWhatsapp">,
  tenant: Pick<Tenant, "notificationEmail">,
  now: Date,
  notifyCustomer: boolean,
): PlannedMessage[] {
  const out: PlannedMessage[] = [];
  if (notifyCustomer) {
    for (const { channel, recipient } of customerChannels(customer)) {
      out.push({ template: "booking_cancelled", channel, recipient, sendAfter: now, appointmentId: appt.id, dedupeKey: `${appt.id}:booking_cancelled:${channel}` });
    }
  }
  if (tenant.notificationEmail) {
    out.push({ template: "admin_cancelled", channel: "EMAIL", recipient: tenant.notificationEmail, sendAfter: now, appointmentId: appt.id, dedupeKey: `${appt.id}:admin_cancelled` });
  }
  return out;
}

// ---------- Renderização (no momento do envio, com dados atuais) ----------

export interface RenderContext {
  tenant: Pick<Tenant, "name" | "timezone">;
  site: SiteContent;
  appointment: Pick<Appointment, "id" | "startAt" | "serviceName" | "priceCents" | "status">;
  professionalName: string;
  customerName: string;
}

export interface RenderedMessage {
  subject: string;
  text: string;
  html: string;
  whatsappParams: string[];
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function manageLink(appointmentId: string, startAt: Date) {
  const token = createActionToken(appointmentId, "manage", addMinutes(startAt, 24 * 60));
  return `${env.appUrl}/a/${token}`;
}

export function renderMessage(template: TemplateName, ctx: RenderContext): RenderedMessage {
  const { tenant, site, appointment: a } = ctx;
  const brand = site.brand.displayName || tenant.name;
  const when = formatDateTime(a.startAt, tenant.timezone);
  const time = formatTime(a.startAt, tenant.timezone);
  const link = manageLink(a.id, a.startAt);
  const firstName = ctx.customerName.split(" ")[0] || ctx.customerName;
  const place = [site.contact.address, site.contact.mapsUrl].filter(Boolean).join("\n");
  const details = [`Serviço: ${a.serviceName}`, `Quando: ${when}`, `Profissional: ${ctx.professionalName}`, `Valor: ${formatBRL(a.priceCents)}`];

  let subject: string;
  let lines: string[];
  switch (template) {
    case "booking_confirmation":
      subject = `${brand}: horário confirmado`;
      lines = [`Olá, ${firstName}! Seu horário está confirmado.`, "", ...details, ...(place ? ["", `Onde: ${place}`] : []), "", `Para reconfirmar, reagendar ou cancelar: ${link}`];
      break;
    case "reminder_24h":
      subject = `${brand}: lembrete do seu horário amanhã às ${time}`;
      lines = [`Olá, ${firstName}! Lembrete do seu atendimento.`, "", ...details, "", `Confirme sua presença ou reagende aqui: ${link}`];
      break;
    case "reminder_day":
      subject = `${brand}: hoje às ${time}`;
      lines = [`Olá, ${firstName}! Seu atendimento é hoje às ${time}.`, "", ...details, ...(place ? ["", `Onde: ${place}`] : []), "", `Precisa mudar? ${link}`];
      break;
    case "booking_cancelled":
      subject = `${brand}: agendamento cancelado`;
      lines = [`Olá, ${firstName}. Seu agendamento foi cancelado.`, "", ...details, "", `Para marcar um novo horário: ${env.appUrl}/agendar`];
      break;
    case "admin_new_booking":
      subject = `Nova reserva: ${a.serviceName} — ${when}`;
      lines = [`Nova reserva de ${ctx.customerName}.`, "", ...details, "", `Agenda: ${env.appUrl}/admin/agenda`];
      break;
    case "admin_cancelled":
      subject = `Cancelamento: ${a.serviceName} — ${when}`;
      lines = [`${ctx.customerName} teve a reserva cancelada. O horário foi liberado.`, "", ...details, "", `Agenda: ${env.appUrl}/admin/agenda`];
      break;
  }
  const text = lines.join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#222">${lines
    .map((l) => (l ? `<p style="margin:0 0 4px">${esc(l).replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>')}</p>` : "<br>"))
    .join("")}<p style="margin-top:16px;color:#777;font-size:12px">${esc(brand)}. Você recebe esta mensagem porque tem um agendamento conosco. Para parar de receber, ajuste suas preferências em ${esc(env.appUrl)}/minha-conta.</p></div>`;
  return { subject, text, html, whatsappParams: [firstName, a.serviceName, when, link] };
}

/** Mensagens que não fazem mais sentido se a reserva mudou de estado. */
export function shouldSkip(template: TemplateName, status: Appointment["status"]): boolean {
  const reminders: TemplateName[] = ["booking_confirmation", "reminder_24h", "reminder_day", "admin_new_booking"];
  if (reminders.includes(template)) return !["PENDING", "CONFIRMED", "RECONFIRMED"].includes(status);
  if (template === "booking_cancelled" || template === "admin_cancelled") return status !== "CANCELLED";
  return false;
}
