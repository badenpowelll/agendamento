import { requireStaff } from "@/lib/context";
import { forTenant } from "@/lib/tenant-db";
import { saveSettings } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin-form";
import { RoleSelect } from "@/components/role-select";
import { Card, Field, Input, PageTitle } from "@/components/ui";

export default async function Configuracoes({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = "" } = await searchParams;
  const ctx = await requireStaff("OWNER");
  const t = ctx.tenant;
  const members = await forTenant(t.id).membership.findMany({ where: email.trim() ? { user: { email: { equals: email.trim(), mode: "insensitive" } } } : { role: { not: "CLIENT" } }, include: { user: { select: { email: true, name: true } } }, orderBy: { createdAt: "asc" } });
  return (
    <div className="space-y-6">
      <PageTitle title="Configurações" />
      <Card>
        <h2 className="mb-3 font-display text-lg">Regras de agendamento</h2>
        <AdminForm action={saveSettings}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do estabelecimento"><Input name="name" defaultValue={t.name} required /></Field>
            <Field label="Fuso horário" hint="Ex.: America/Fortaleza"><Input name="timezone" defaultValue={t.timezone} required /></Field>
            <Field label="Antecedência mínima para agendar (min)"><Input type="number" name="minLeadMinutes" defaultValue={t.minLeadMinutes} min={0} /></Field>
            <Field label="Antecedência mínima para cancelar/reagendar pelo site (horas)"><Input type="number" name="cancelMinHours" defaultValue={t.cancelMinHours} min={0} /></Field>
            <Field label="Intervalo entre horários oferecidos (min)"><Input type="number" name="slotStepMinutes" defaultValue={t.slotStepMinutes} min={5} /></Field>
            <Field label="Agenda aberta por quantos dias"><Input type="number" name="maxDaysAhead" defaultValue={t.maxDaysAhead} min={1} /></Field>
            <Field label="E-mail para avisos de novas reservas e cancelamentos"><Input type="email" name="notificationEmail" defaultValue={t.notificationEmail ?? ""} /></Field>
          </div>
        </AdminForm>
      </Card>
      <Card>
        <h2 className="mb-1 font-display text-lg">Equipe</h2>
        <p className="mb-3 text-xs text-muted">Para dar acesso ao painel: a pessoa entra no site com o Google uma vez; depois busque o e-mail dela aqui e mude o papel. E-mails em ADMIN_EMAILS viram proprietárias automaticamente.</p>
        <form className="mb-3 flex gap-2"><Input name="email" type="email" defaultValue={email} placeholder="Buscar por e-mail" aria-label="Buscar usuário por e-mail" /></form>
        {email && members.length === 0 && <p className="text-sm text-muted">Nenhum usuário com este e-mail entrou no site ainda.</p>}
        <div className="divide-y divide-line text-sm">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2"><span>{m.user.name ?? m.user.email} <span className="text-muted">{m.user.email}</span></span><RoleSelect id={m.id} role={m.role} disabled={m.userId === ctx.user.id} /></div>
          ))}
        </div>
      </Card>
    </div>
  );
}
