import type { AppointmentStatus } from "@prisma/client";
import { forTenant } from "@/lib/tenant-db";
import { UPCOMING_STATUSES } from "./appointment-state";

/** Retorno sugerido: 30 dias após o último atendimento; aviso 2 dias antes. */
export const RETURN_DAYS = 30;
export const NOTICE_DAYS_BEFORE = 2;
const DAY = 86_400_000;
/** Depois disso a cliente sai da lista de retorno (vira "inativa"). */
const MAX_OVERDUE_DAYS = 60;
const ATTENDED: AppointmentStatus[] = ["COMPLETED", "IN_SERVICE", "CHECKED_IN", "CONFIRMED", "RECONFIRMED"];

export interface ReturnItem {
  customerId: string;
  name: string;
  phone: string | null;
  allowMarketing: boolean;
  lastAt: Date;
  lastService: string;
  returnAt: Date; // último atendimento + 30 dias
  noticeAt: Date; // returnAt - 2 dias
  contactedAt: Date | null; // último "avisada" registrado depois do último atendimento
}

/**
 * Clientes cujo último atendimento já passou e que não têm reserva futura.
 * due: aviso já venceu (a partir do dia 28); soon: aviso nos próximos 7 dias.
 */
export async function returnList(tenantId: string, now = new Date()): Promise<{ due: ReturnItem[]; soon: ReturnItem[] }> {
  const db = forTenant(tenantId);
  const since = new Date(now.getTime() - (RETURN_DAYS + MAX_OVERDUE_DAYS) * DAY);
  const [past, upcoming] = await Promise.all([
    db.appointment.findMany({
      where: { startAt: { gte: since, lt: now }, status: { in: ATTENDED } },
      orderBy: { startAt: "desc" },
      select: { customerId: true, startAt: true, service: { select: { name: true } }, customer: { select: { name: true, phone: true, allowMarketing: true } } },
    }),
    db.appointment.findMany({ where: { startAt: { gte: now }, status: { in: UPCOMING_STATUSES } }, select: { customerId: true } }),
  ]);
  const hasUpcoming = new Set(upcoming.map((a) => a.customerId));
  const last = new Map<string, (typeof past)[number]>();
  for (const a of past) if (!last.has(a.customerId) && !hasUpcoming.has(a.customerId)) last.set(a.customerId, a);

  const ids = [...last.keys()];
  const contacts = ids.length
    ? await db.auditLog.findMany({ where: { action: "customer.return_contacted", entityId: { in: ids } }, orderBy: { createdAt: "desc" }, select: { entityId: true, createdAt: true } })
    : [];
  const lastContact = new Map<string, Date>();
  for (const c of contacts) if (c.entityId && !lastContact.has(c.entityId)) lastContact.set(c.entityId, c.createdAt);

  const due: ReturnItem[] = [];
  const soon: ReturnItem[] = [];
  for (const [customerId, a] of last) {
    const returnAt = new Date(a.startAt.getTime() + RETURN_DAYS * DAY);
    const noticeAt = new Date(returnAt.getTime() - NOTICE_DAYS_BEFORE * DAY);
    const contacted = lastContact.get(customerId);
    const item: ReturnItem = {
      customerId,
      name: a.customer.name,
      phone: a.customer.phone,
      allowMarketing: a.customer.allowMarketing,
      lastAt: a.startAt,
      lastService: a.service.name,
      returnAt,
      noticeAt,
      contactedAt: contacted && contacted > a.startAt ? contacted : null,
    };
    if (noticeAt <= now) {
      if (now.getTime() - returnAt.getTime() <= MAX_OVERDUE_DAYS * DAY) due.push(item);
    } else if (noticeAt.getTime() - now.getTime() <= 7 * DAY) soon.push(item);
  }
  const byNotice = (x: ReturnItem, y: ReturnItem) => x.noticeAt.getTime() - y.noticeAt.getTime();
  return { due: due.sort(byNotice), soon: soon.sort(byNotice) };
}

export function returnMessage(firstName: string, businessName: string, bookingUrl: string, visitWord = "depilação", placeWord: "na" | "no" = "na"): string {
  return `Oi, ${firstName}! Tudo bem? Já está chegando a hora da sua próxima ${visitWord || "visita"} aqui ${placeWord} ${businessName}. Quer agendar? É só escolher o melhor horário: ${bookingUrl}`;
}
