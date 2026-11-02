import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/staff-session";
import { forTenant } from "@/lib/tenant-db";
import { minutesToHHMM } from "@/lib/time";
import { saveProfessional } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin-form";
import { Card, Field, Input, Notice, PageTitle, Textarea } from "@/components/ui";

const WEEK = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default async function Profissional({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const { ok } = await searchParams;
  const ctx = await requireStaff("ADMIN");
  const db = forTenant(ctx.tenant.id);
  const p = await db.professional.findFirst({ where: { id }, include: { services: true, workingHours: { orderBy: { startMin: "asc" } } } });
  if (!p) notFound();
  const services = await db.service.findMany({ orderBy: { name: "asc" } });
  const has = new Set(p.services.map((s) => s.serviceId));
  return (
    <div className="space-y-6">
      <PageTitle title={p.name} subtitle="Serviços e horários de trabalho" />
      {ok && <Notice tone="success">Profissional criada. Agora marque os serviços e os horários.</Notice>}
      <Card>
        <AdminForm action={saveProfessional}>
          <input type="hidden" name="id" value={p.id} />
          <Field label="Nome"><Input name="name" defaultValue={p.name} required /></Field>
          <Field label="Apresentação (opcional)"><Textarea name="bio" defaultValue={p.bio ?? ""} rows={2} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p.active} className="accent-brand" /> Ativa (recebe agendamentos)</label>
          <fieldset className="rounded-xl border border-line p-4">
            <legend className="px-1 text-sm font-medium">Serviços que realiza</legend>
            {services.length === 0 ? <p className="text-sm text-muted">Cadastre serviços primeiro.</p> : (
              <div className="grid gap-2 sm:grid-cols-2">
                {services.map((s) => <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="serviceIds" value={s.id} defaultChecked={has.has(s.id)} className="accent-brand" /> {s.name}</label>)}
              </div>
            )}
          </fieldset>
          <fieldset className="rounded-xl border border-line p-4">
            <legend className="px-1 text-sm font-medium">Horário de trabalho</legend>
            <p className="mb-3 text-xs text-muted">Até duas faixas por dia (ex.: 08:00–12:00 e 13:00–18:00). Deixe em branco nos dias de folga.</p>
            <div className="space-y-2">
              {WEEK.map((name, d) => {
                const w = p.workingHours.filter((h) => h.weekday === d);
                return (
                  <div key={d} className="grid grid-cols-[5.5rem_1fr] items-center gap-2 text-sm sm:grid-cols-[6rem_1fr_1fr]">
                    <span>{name}</span>
                    {[1, 2].map((n) => (
                      <span key={n} className="col-start-2 flex items-center gap-1 sm:col-start-auto">
                        <Input aria-label={`${name} faixa ${n} início`} type="time" name={`h${d}_${n}_start`} defaultValue={w[n - 1] ? minutesToHHMM(w[n - 1].startMin) : ""} className="py-1.5" />
                        <span className="text-muted">–</span>
                        <Input aria-label={`${name} faixa ${n} fim`} type="time" name={`h${d}_${n}_end`} defaultValue={w[n - 1] ? minutesToHHMM(w[n - 1].endMin) : ""} className="py-1.5" />
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </fieldset>
        </AdminForm>
      </Card>
    </div>
  );
}
