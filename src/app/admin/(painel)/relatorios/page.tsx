import Link from "next/link";
import { requireStaff } from "@/lib/staff-session";
import { addDays, toLocalDate } from "@/lib/time";
import { formatBRL } from "@/lib/money";
import { periodReport } from "@/domain/metrics";
import { Card, EmptyState, PageTitle, cx } from "@/components/ui";
import { Stat, pct } from "@/components/stat";

const monthStart = (d: string) => `${d.slice(0, 8)}01`;
const nextMonth = (m: string) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 10); };
const prevMonth = (m: string) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 10); };
const label = (m: string) => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}T12:00:00Z`));

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const ctx = await requireStaff("ADMIN");
  const today = toLocalDate(new Date(), ctx.tenant.timezone);
  const from = mes && /^\d{4}-\d{2}$/.test(mes) ? `${mes}-01` : monthStart(today);
  const to = nextMonth(from);
  const r = await periodReport(ctx.tenant.id, from, to);
  const nav = (d: string) => `/admin/relatorios?mes=${d.slice(0, 7)}`;
  return (
    <div className="space-y-6">
      <PageTitle title="Relatórios" subtitle="Valores calculados pelo preço de cada reserva. Não são recebimentos: o financeiro chega na Etapa 2." />
      <div className="flex items-center gap-2 text-sm">
        <Link className="rounded-full border border-line bg-white px-3 py-1.5" href={nav(prevMonth(from))}>←</Link>
        <span className="px-2 font-medium first-letter:uppercase">{label(from)}</span>
        <Link className={cx("rounded-full border border-line bg-white px-3 py-1.5", to > addDays(today, 31) && "pointer-events-none opacity-40")} href={nav(to)}>→</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Agendamentos" value={String(r.total)} hint={`${r.upcoming} ainda por acontecer`} />
        <Stat label="Concluídos" value={String(r.completed)} />
        <Stat label="Comparecimento" value={pct(r.attendanceRate)} hint={`${r.noShow} faltas`} />
        <Stat label="Cancelamento" value={pct(r.cancellationRate)} hint={`${r.cancelled} cancelados`} />
        <Stat label="Ocupação da agenda" value={pct(r.occupancy)} hint="Horas reservadas ÷ horas de expediente" />
        <Stat label="Atendimentos concluídos" value={formatBRL(r.completedValueCents)} hint="Valor de tabela" />
        <Stat label="Ticket médio" value={r.avgTicketCents == null ? "—" : formatBRL(r.avgTicketCents)} />
        <Stat label="Clientes novas" value={String(r.newCustomers)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-0">
          <h2 className="px-5 pt-4 font-display text-lg">Por procedimento</h2>
          {r.byService.length === 0 ? <div className="p-5"><EmptyState>Sem dados no período.</EmptyState></div> : (
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-xs text-muted"><tr><th className="px-5 py-2 font-normal">Serviço</th><th className="px-2 font-normal">Concluídos</th><th className="px-2 font-normal">Cancelados</th><th className="px-5 text-right font-normal">Valor</th></tr></thead>
              <tbody className="divide-y divide-line">{r.byService.map((s) => <tr key={s.name}><td className="px-5 py-2">{s.name}</td><td className="px-2">{s.completed}</td><td className="px-2">{s.cancelled}</td><td className="px-5 text-right tabular-nums">{formatBRL(s.valueCents)}</td></tr>)}</tbody>
            </table>
          )}
        </Card>
        <Card className="p-0">
          <h2 className="px-5 pt-4 font-display text-lg">Por profissional</h2>
          {r.byProfessional.length === 0 ? <div className="p-5"><EmptyState>Sem dados no período.</EmptyState></div> : (
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-xs text-muted"><tr><th className="px-5 py-2 font-normal">Profissional</th><th className="px-2 font-normal">Concluídos</th><th className="px-2 font-normal">Faltas</th><th className="px-5 text-right font-normal">Valor</th></tr></thead>
              <tbody className="divide-y divide-line">{r.byProfessional.map((s) => <tr key={s.name}><td className="px-5 py-2">{s.name}</td><td className="px-2">{s.completed}</td><td className="px-2">{s.noShow}</td><td className="px-5 text-right tabular-nums">{formatBRL(s.valueCents)}</td></tr>)}</tbody>
            </table>
          )}
          <p className="px-5 pb-4 pt-3 text-xs text-muted">Origem: {r.bySource.map((s) => `${s.source === "admin" ? "equipe" : "site"} ${s.count}`).join(" · ") || "—"}</p>
        </Card>
      </div>
    </div>
  );
}
