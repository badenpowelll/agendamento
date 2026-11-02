import { requireStaff } from "@/lib/staff-session";
import { addDays, toLocalDate } from "@/lib/time";
import { formatBRL } from "@/lib/money";
import { capacityByDay, periodReport } from "@/domain/metrics";
import { Badge, Card, PageTitle } from "@/components/ui";
import { Stat, pct } from "@/components/stat";

const fmtDay = (d: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const hours = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`;

export default async function InteligenciaReceita() {
  const ctx = await requireStaff("ADMIN");
  const today = toLocalDate(new Date(), ctx.tenant.timezone);
  const [next, last30] = await Promise.all([capacityByDay(ctx.tenant.id, today, addDays(today, 14)), periodReport(ctx.tenant.id, addDays(today, -30), today)]);
  const avail = next.reduce((s, d) => s + d.availableMin, 0);
  const booked = next.reduce((s, d) => s + d.bookedMin, 0);
  const low = next.filter((d) => d.availableMin > 0 && d.bookedMin / d.availableMin < 0.4);
  return (
    <div className="space-y-6">
      <PageTitle title="Inteligência de Receita" subtitle="Ocupação dos próximos 14 dias e o que deixou de acontecer nos últimos 30." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ocupação — próximos 14 dias" value={pct(avail ? booked / avail : null)} />
        <Stat label="Horas livres — próximos 14 dias" value={hours(Math.max(0, avail - booked))} hint="Expediente sem reserva" />
        <Stat label="Receita potencial não realizada" value={formatBRL(last30.lostValueCents)} hint="Cancelamentos e faltas, 30 dias (estimativa)" />
        <Stat label="Taxa de comparecimento" value={pct(last30.attendanceRate)} hint="Últimos 30 dias" />
      </div>
      <Card>
        <h2 className="mb-3 font-display text-lg">Ocupação por dia</h2>
        <ul className="space-y-2 text-sm">
          {next.map((d) => {
            const r = d.availableMin ? d.bookedMin / d.availableMin : null;
            return (
              <li key={d.date} className="grid grid-cols-[6.5rem_1fr_5rem] items-center gap-3">
                <span className="capitalize text-muted">{fmtDay(d.date)}</span>
                <span className="h-3 overflow-hidden rounded-full bg-cream" aria-hidden>
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.min(100, Math.round((r ?? 0) * 100))}%` }} />
                </span>
                <span className="text-right tabular-nums">{r == null ? "fechado" : pct(r)}</span>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-2 font-display text-lg">Alertas de baixa ocupação</h2>
        {low.length === 0 ? <p className="text-sm text-muted">Nenhum dia abaixo de 40% nos próximos 14 dias.</p> : (
          <ul className="space-y-1 text-sm">{low.map((d) => <li key={d.date}><Badge tone="warn">{pct(d.bookedMin / d.availableMin)}</Badge> <span className="capitalize">{fmtDay(d.date)}</span>: {hours(d.availableMin - d.bookedMin)} livres. Boa data para divulgar horários.</li>)}</ul>
        )}
      </Card>
      <p className="text-xs text-muted">Etapa 4 acrescenta: oferta automática de vagas canceladas para a lista de espera, receita efetivamente recuperada e sugestões de campanha.</p>
    </div>
  );
}
