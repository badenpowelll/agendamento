import Link from "next/link";
import { requireStaff } from "@/lib/context";
import { forTenant } from "@/lib/tenant-db";
import { saveProfessional } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin-form";
import { Badge, Card, EmptyState, Field, Input, PageTitle } from "@/components/ui";

export default async function Profissionais() {
  const ctx = await requireStaff("ADMIN");
  const pros = await forTenant(ctx.tenant.id).professional.findMany({ include: { _count: { select: { services: true, workingHours: true } } }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <PageTitle title="Profissionais" subtitle="Quem atende, quais serviços faz e em que horários." />
      <Card>
        <h2 className="mb-3 font-display text-lg">Nova profissional</h2>
        <AdminForm action={saveProfessional} submit="Adicionar e configurar horários">
          <Field label="Nome"><Input name="name" required /></Field>
          <input type="hidden" name="active" value="on" />
        </AdminForm>
      </Card>
      {pros.length === 0 ? <EmptyState>Nenhuma profissional cadastrada.</EmptyState> : (
        <Card className="divide-y divide-line p-0">
          {pros.map((p) => (
            <Link key={p.id} href={`/admin/profissionais/${p.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-cream">
              <span className="font-medium">{p.name}</span>
              <span className="flex items-center gap-2 text-sm text-muted">
                {p._count.services} serviços · {p._count.workingHours} janelas de horário
                {p._count.workingHours === 0 && <Badge tone="warn">sem horários</Badge>}
                {!p.active && <Badge>inativa</Badge>}
              </span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
