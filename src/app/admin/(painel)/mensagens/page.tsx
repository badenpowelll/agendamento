import Link from "next/link";
import type { OutboxStatus } from "@prisma/client";
import { requireStaff } from "@/lib/staff-session";
import { forTenant } from "@/lib/tenant-db";
import { formatDateTime } from "@/lib/time";
import { RetryButton } from "@/components/retry-button";
import { Badge, Card, EmptyState, PageTitle, cx } from "@/components/ui";

const LABEL: Record<OutboxStatus, string> = { PENDING: "Agendada", SENDING: "Enviando", SENT: "Enviada", FAILED: "Nova tentativa", DEAD: "Falhou", CANCELLED: "Cancelada" };
const TEMPLATE: Record<string, string> = { booking_confirmation: "Confirmação", reminder_24h: "Lembrete 24h", reminder_day: "Lembrete do dia", booking_cancelled: "Cancelamento", admin_new_booking: "Aviso: nova reserva", admin_cancelled: "Aviso: cancelamento", deposit_confirmed: "Sinal recebido" };

export default async function Mensagens({ searchParams }: { searchParams: Promise<{ status?: OutboxStatus }> }) {
  const { status } = await searchParams;
  const ctx = await requireStaff("ADMIN");
  const db = forTenant(ctx.tenant.id);
  const [msgs, counts] = await Promise.all([
    db.outboxMessage.findMany({ where: status ? { status } : {}, orderBy: { sendAfter: "desc" }, take: 100 }),
    db.outboxMessage.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: OutboxStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  return (
    <div className="space-y-4">
      <PageTitle title="Mensagens" subtitle="Confirmações e lembretes automáticos. Mensagens que falham 5 vezes ficam em “Falhou” para revisão." />
      <div className="flex flex-wrap gap-1 text-sm">
        <Link href="/admin/mensagens" className={cx("rounded-full px-3 py-1", !status ? "bg-ink text-white" : "border border-line bg-white")}>Todas</Link>
        {(Object.keys(LABEL) as OutboxStatus[]).map((s) => <Link key={s} href={`/admin/mensagens?status=${s}`} className={cx("rounded-full px-3 py-1", status === s ? "bg-ink text-white" : "border border-line bg-white")}>{LABEL[s]} ({count(s)})</Link>)}
      </div>
      {msgs.length === 0 ? <EmptyState>Nenhuma mensagem.</EmptyState> : (
        <Card className="divide-y divide-line p-0">
          {msgs.map((m) => (
            <div key={m.id} className="px-5 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span><b>{TEMPLATE[m.template] ?? m.template}</b> · {m.channel === "EMAIL" ? "E-mail" : "WhatsApp"} · {m.recipient}</span>
                <span className="flex items-center gap-2"><Badge tone={m.status === "SENT" ? "good" : m.status === "DEAD" ? "bad" : m.status === "FAILED" ? "warn" : "neutral"}>{LABEL[m.status]}</Badge>{m.status === "DEAD" && <RetryButton id={m.id} />}</span>
              </div>
              <p className="text-xs text-muted">{m.status === "SENT" && m.sentAt ? `Enviada ${formatDateTime(m.sentAt, ctx.tenant.timezone, { dateStyle: "short" })}` : `Programada para ${formatDateTime(m.sendAfter, ctx.tenant.timezone, { dateStyle: "short" })}`} · tentativas: {m.attempts}{m.lastError ? ` · erro: ${m.lastError.slice(0, 160)}` : ""}</p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
