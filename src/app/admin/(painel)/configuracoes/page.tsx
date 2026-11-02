import { requireStaff } from "@/lib/staff-session";
import { saveSettings } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin-form";
import { Card, Field, Input, PageTitle } from "@/components/ui";

export default async function Configuracoes() {
  const ctx = await requireStaff("OWNER");
  const t = ctx.tenant;
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
    </div>
  );
}
