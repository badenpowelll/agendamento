import Link from "next/link";
import { requireStaff } from "@/lib/staff-session";
import { forTenant } from "@/lib/tenant-db";
import { getSite } from "@/lib/site";
import { dayRange, formatDateTime, formatTime, toLocalDate } from "@/lib/time";
import { formatBRL } from "@/lib/money";
import { STATUS_LABEL } from "@/domain/appointment-state";
import { findUnconfirmed } from "@/domain/booking";
import { Badge, Card, EmptyState, PageTitle } from "@/components/ui";

export default async function Overview() {
  const ctx = await requireStaff();
  const db = forTenant(ctx.tenant.id);
  const tz = ctx.tenant.timezone;
  const today = toLocalDate(new Date(), tz);
  const { start, end } = dayRange(today, tz);
  const [todayAppts, unconfirmed, dead, services, hours, site] = await Promise.all([
    db.appointment.findMany({ where: { startAt: { gte: start, lt: end }, status: { notIn: ["CANCELLED", "RESCHEDULED"] } }, include: { customer: true, professional: true }, orderBy: { startAt: "asc" } }),
    findUnconfirmed(ctx.tenant.id),
    db.outboxMessage.count({ where: { status: "DEAD" } }),
    db.service.count({ where: { active: true } }),
    db.workingHours.count(),
    getSite(),
  ]);
  const expected = todayAppts.reduce((s, a) => s + (a.priceCents ?? 0), 0);

  const setup = [
    { done: services > 0, label: "Cadastrar serviços com preço e duração", href: "/admin/servicos" },
    { done: hours > 0, label: "Cadastrar profissionais e horários de trabalho", href: "/admin/profissionais" },
    { done: !!site.contact.address && !!site.contact.whatsapp, label: "Endereço e WhatsApp no site", href: "/admin/site" },
    { done: !!site.policies.privacy && !!site.policies.terms, label: "Política de privacidade e termos", href: "/admin/site" },
    { done: !!ctx.tenant.notificationEmail, label: "E-mail para avisos de novas reservas", href: "/admin/configuracoes" },
  ];
  const pending = setup.filter((s) => !s.done);

  return (
    <div className="space-y-6">
      <PageTitle title="Visão geral" subtitle={formatDateTime(new Date(), tz, { timeStyle: undefined })} />
      {pending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <h2 className="font-medium">Antes de divulgar o link de agendamento</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {pending.map((s) => <li key={s.label}>○ <Link className="underline" href={s.href}>{s.label}</Link></li>)}
          </ul>
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><p className="text-sm text-muted">Atendimentos hoje</p><p className="mt-1 text-3xl font-semibold">{todayAppts.length}</p></Card>
        <Card><p className="text-sm text-muted">Previsto hoje (não é recebido)</p><p className="mt-1 text-3xl font-semibold">{formatBRL(expected)}</p></Card>
        <Card><p className="text-sm text-muted">Mensagens com falha</p><p className="mt-1 text-3xl font-semibold">{dead > 0 ? <Link className="text-red-700 underline" href="/admin/mensagens?status=DEAD">{dead}</Link> : 0}</p></Card>
      </div>

      <section>
        <h2 className="mb-2 font-display text-xl">Sem resposta ao lembrete</h2>
        {unconfirmed.length === 0 ? <EmptyState>Nenhuma cliente pendente de reconfirmação.</EmptyState> : (
          <Card className="divide-y divide-line p-0">
            {unconfirmed.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span><b>{a.customer.name}</b> · {a.serviceName} · {formatDateTime(a.startAt, tz, { dateStyle: "short" })}</span>
                <span className="flex gap-2">
                  {a.customer.phone && <a className="text-brand underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${a.customer.phone.replace(/\D/g, "")}`}>WhatsApp</a>}
                  <Link className="text-brand underline" href={`/admin/agenda?data=${toLocalDate(a.startAt, tz)}`}>Agenda</Link>
                </span>
              </div>
            ))}
          </Card>
        )}
        <p className="mt-2 text-xs text-muted">O sistema não cancela automaticamente. Entre em contato ou ajuste a reserva na agenda.</p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-xl">Hoje</h2>
        {todayAppts.length === 0 ? <EmptyState>Nenhum atendimento hoje.</EmptyState> : (
          <Card className="divide-y divide-line p-0">
            {todayAppts.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm">
                <span><b>{formatTime(a.startAt, tz)}</b> · {a.customer.name} · {a.serviceName} · {a.professional.name}</span>
                <Badge tone={a.status === "RECONFIRMED" || a.status === "COMPLETED" ? "good" : "brand"}>{STATUS_LABEL[a.status]}</Badge>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
