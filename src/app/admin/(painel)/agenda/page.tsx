import Link from "next/link";
import { randomUUID } from "node:crypto";
import { requireStaff } from "@/lib/staff-session";
import { forTenant } from "@/lib/tenant-db";
import { addDays, dayRange, formatTime, isIsoDate, toLocalDate, weekdayOf } from "@/lib/time";
import { STATUS_LABEL } from "@/domain/appointment-state";
import { createTimeOff, setHolidayClosing, staffBook } from "@/app/actions/admin";
import { holidaysInRange, loadHolidayRule } from "@/domain/holidays";
import { HolidayToggle } from "@/components/holiday-toggle";
import { AdminForm } from "@/components/admin-form";
import { StatusControl } from "@/components/status-control";
import { DeleteTimeOffButton } from "@/components/delete-timeoff-button";
import { Badge, Card, EmptyState, Field, Input, PageTitle, Select, cx } from "@/components/ui";

type View = "dia" | "semana" | "mes";
const fmtDay = (d: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

export default async function Agenda({ searchParams }: { searchParams: Promise<{ data?: string; visao?: View; profissional?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireStaff();
  const tz = ctx.tenant.timezone;
  const db = forTenant(ctx.tenant.id);
  const today = toLocalDate(new Date(), tz);
  const date = sp.data && isIsoDate(sp.data) ? sp.data : today;
  const view: View = sp.visao === "semana" || sp.visao === "mes" ? sp.visao : "dia";

  let from = date, to = addDays(date, 1);
  if (view === "semana") { from = addDays(date, -weekdayOf(date, tz)); to = addDays(from, 7); }
  if (view === "mes") { from = `${date.slice(0, 8)}01`; const [y, m] = date.split("-").map(Number); to = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10); }
  const range = { start: dayRange(from, tz).start, end: dayRange(to, tz).start };

  const [appts, offs, pros, services, customers] = await Promise.all([
    db.appointment.findMany({
      where: { startAt: { gte: range.start, lt: range.end }, status: { notIn: ["RESCHEDULED"] }, ...(sp.profissional ? { professionalId: sp.profissional } : {}) },
      include: { customer: true, professional: true },
      orderBy: { startAt: "asc" },
    }),
    db.timeOff.findMany({ where: { startAt: { lt: range.end }, endAt: { gt: range.start } }, include: { professional: true }, orderBy: { startAt: "asc" } }),
    db.professional.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.service.findMany({ where: { active: true, durationMin: { gte: 5 } }, orderBy: { name: "asc" } }),
    db.customer.findMany({ orderBy: { name: "asc" }, take: 500, select: { id: true, name: true, phone: true } }),
  ]);

  const [holidays, upcoming, holidayRule] = await Promise.all([
    holidaysInRange(ctx.tenant.id, from, addDays(to, -1), db),
    holidaysInRange(ctx.tenant.id, today, addDays(today, 120), db),
    loadHolidayRule(ctx.tenant.id, db),
  ]);
  const fmtLong = (d: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  const holidayBanner = (d: string) => {
    const h = holidays.get(d);
    if (!h) return null;
    return (
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose/60 bg-blush/70 px-4 py-2 text-sm">
        <span><b>Feriado nacional:</b> {h.name} · {h.closed ? "agenda online fechada (encaixe pela equipe continua possível)" : "atendimento normal"}</span>
        {ctx.role !== "STAFF" && <HolidayToggle date={d} closed={h.closed} />}
      </div>
    );
  };

  const step = view === "dia" ? 1 : view === "semana" ? 7 : 30;
  const qs = (d: string, v: View = view) => `/admin/agenda?data=${d}&visao=${v}${sp.profissional ? `&profissional=${sp.profissional}` : ""}`;
  const days: string[] = [];
  for (let d = from; d < to; d = addDays(d, 1)) days.push(d);
  const byDay = new Map<string, typeof appts>();
  for (const a of appts) { const k = toLocalDate(a.startAt, tz); byDay.set(k, [...(byDay.get(k) ?? []), a]); }

  const row = (a: (typeof appts)[number]) => (
    <div key={a.id} className={cx("flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm", a.status === "CANCELLED" && "opacity-50")}>
      <div>
        <p><b>{formatTime(a.startAt, tz)}–{formatTime(a.endAt, tz)}</b> · {a.customer.name}</p>
        <p className="text-muted">{a.serviceName} · {a.professional.name}{a.source === "admin" ? " · pela equipe" : ""}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={a.status === "CANCELLED" || a.status === "NO_SHOW" ? "bad" : a.status === "RECONFIRMED" || a.status === "COMPLETED" ? "good" : "brand"}>{STATUS_LABEL[a.status]}</Badge>
        <StatusControl id={a.id} status={a.status} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageTitle title="Agenda" />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link className="rounded-full border border-line bg-white px-3 py-1.5" href={qs(addDays(date, -step))}>←</Link>
        <Link className="rounded-full border border-line bg-white px-3 py-1.5" href={qs(today)}>Hoje</Link>
        <Link className="rounded-full border border-line bg-white px-3 py-1.5" href={qs(addDays(date, step))}>→</Link>
        <span className="px-2 font-medium">{view === "mes" ? date.slice(0, 7) : view === "semana" ? `${fmtDay(from)} a ${fmtDay(addDays(to, -1))}` : fmtDay(date)}</span>
        <span className="ml-auto flex gap-1">
          {(["dia", "semana", "mes"] as View[]).map((v) => (
            <Link key={v} href={qs(date, v)} className={cx("rounded-full px-3 py-1.5", v === view ? "bg-brand text-white" : "border border-line bg-white")}>{v === "mes" ? "Mês" : v[0].toUpperCase() + v.slice(1)}</Link>
          ))}
        </span>
      </div>
      {pros.length > 1 && (
        <div className="flex flex-wrap gap-1 text-sm">
          <Link href={`/admin/agenda?data=${date}&visao=${view}`} className={cx("rounded-full px-3 py-1", !sp.profissional ? "bg-ink text-white" : "border border-line bg-white")}>Todas</Link>
          {pros.map((p) => <Link key={p.id} href={`/admin/agenda?data=${date}&visao=${view}&profissional=${p.id}`} className={cx("rounded-full px-3 py-1", sp.profissional === p.id ? "bg-ink text-white" : "border border-line bg-white")}>{p.name}</Link>)}
        </div>
      )}

      {view === "mes" ? (
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((w) => <div key={w} className="py-1 text-muted">{w}</div>)}
          {Array.from({ length: weekdayOf(from, tz) }).map((_, i) => <div key={`e${i}`} />)}
          {days.map((d) => {
            const n = (byDay.get(d) ?? []).filter((a) => a.status !== "CANCELLED").length;
            const h = holidays.get(d);
            return (
              <Link key={d} href={qs(d, "dia")} title={h ? `${h.name}${h.closed ? " (fechado)" : " (aberto)"}` : undefined}
                className={cx("rounded-lg border p-2", h?.closed ? "border-rose/60 bg-blush/70" : "bg-white", d === today ? "border-brand" : !h?.closed && "border-line")}>
                <span className="block font-medium">{Number(d.slice(8))}</span>
                <span className={cx("block", n ? "text-brand" : "text-muted/50")}>{n || "·"}</span>
                {h && <span className="block truncate text-[10px] leading-tight text-brand/70">{h.name}</span>}
              </Link>
            );
          })}
        </div>
      ) : (
        days.map((d) => (
          <section key={d}>
            {view === "semana" && <h2 className="mb-1 text-sm font-medium capitalize"><Link href={qs(d, "dia")}>{fmtDay(d)}</Link></h2>}
            {holidayBanner(d)}
            {(byDay.get(d) ?? []).length === 0 ? <EmptyState>Sem atendimentos.</EmptyState> : <Card className="divide-y divide-line p-0">{byDay.get(d)!.map(row)}</Card>}
          </section>
        ))
      )}

      {offs.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-lg">Bloqueios no período</h2>
          <Card className="divide-y divide-line p-0 text-sm">
            {offs.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-4 py-2">
                <span>{fmtDay(toLocalDate(o.startAt, tz))} {formatTime(o.startAt, tz)} até {fmtDay(toLocalDate(o.endAt, tz))} {formatTime(o.endAt, tz)} · {o.professional?.name ?? "Todas"}{o.reason ? ` · ${o.reason}` : ""}</span>
                <DeleteTimeOffButton id={o.id} />
              </div>
            ))}
          </Card>
        </section>
      )}

      <Card>
        <h2 className="mb-1 font-display text-lg">Feriados nacionais</h2>
        <p className="mb-3 text-xs text-muted">Lista oficial consultada na BrasilAPI (se a consulta falhar, usamos o calendário calculado). Nos feriados fechados, o site não oferece horários; a equipe ainda pode fazer encaixe.</p>
        {ctx.role !== "STAFF" && (
          <AdminForm action={setHolidayClosing} submit="Salvar">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="closeNational" defaultChecked={holidayRule.closeNational} className="accent-brand" /> Fechar a agenda online nos feriados nacionais</label>
          </AdminForm>
        )}
        {upcoming.size === 0 ? <p className="mt-3 text-sm text-muted">Nenhum feriado nacional nos próximos 120 dias.</p> : (
          <div className="mt-3 divide-y divide-line text-sm">
            {[...upcoming.values()].map((h) => (
              <div key={h.date} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span><Link className="inline-block hover:underline first-letter:uppercase" href={qs(h.date, "dia")}>{fmtLong(h.date)}</Link> · {h.name}</span>
                <span className="flex items-center gap-3">
                  <Badge tone={h.closed ? "bad" : "good"}>{h.closed ? "Fechado" : "Aberto"}</Badge>
                  {ctx.role !== "STAFF" && holidayRule.closeNational && <HolidayToggle date={h.date} closed={h.closed} />}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg">Novo agendamento pela equipe</h2>
          <AdminForm action={staffBook} submit="Agendar">
            <input type="hidden" name="idempotencyKey" value={randomUUID()} />
            <Field label="Cliente">
              <Select name="customerId" defaultValue="">
                <option value="">Nova cliente (preencher abaixo)</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome (nova cliente)"><Input name="newName" /></Field>
              <Field label="WhatsApp (nova cliente)"><Input name="newPhone" inputMode="tel" /></Field>
            </div>
            <Field label="Serviço"><Select name="serviceId" required>{services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.durationMin} min)</option>)}</Select></Field>
            <Field label="Profissional"><Select name="professionalId"><option value="">Qualquer disponível</option>{pros.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data"><Input type="date" name="date" defaultValue={date} required /></Field>
              <Field label="Horário"><Input type="time" name="time" required step={300} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="encaixe" className="accent-brand" /> Encaixe autorizado (permite fora do expediente; nunca sobre outra reserva)</label>
            <Field label="Observações"><Input name="notes" /></Field>
          </AdminForm>
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-lg">Bloquear horário (folga, feriado, férias)</h2>
          <AdminForm action={createTimeOff} submit="Bloquear">
            <Field label="Profissional"><Select name="professionalId"><option value="">Todas (estabelecimento fechado)</option>{pros.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="De"><Input type="date" name="date" defaultValue={date} required /></Field>
              <Field label="Até"><Input type="date" name="endDate" defaultValue={date} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allDay" defaultChecked className="accent-brand" /> Dia inteiro</label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Início (se não for o dia todo)"><Input type="time" name="start" /></Field>
              <Field label="Fim"><Input type="time" name="end" /></Field>
            </div>
            <Field label="Motivo"><Input name="reason" placeholder="Ex.: feriado" /></Field>
          </AdminForm>
        </Card>
      </div>
    </div>
  );
}
