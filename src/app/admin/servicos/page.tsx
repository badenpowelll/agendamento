import { requireStaff } from "@/lib/context";
import { forTenant } from "@/lib/tenant-db";
import { formatBRL } from "@/lib/money";
import { saveService } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin-form";
import { Badge, Card, EmptyState, Field, Input, PageTitle, Textarea } from "@/components/ui";
import type { Service } from "@prisma/client";

function ServiceFields({ s }: { s?: Service }) {
  return (
    <>
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Nome"><Input name="name" defaultValue={s?.name} required /></Field>
      <Field label="Descrição (opcional)"><Textarea name="description" defaultValue={s?.description ?? ""} rows={2} /></Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Preço (R$)" hint="Vazio = sob consulta"><Input name="price" inputMode="decimal" defaultValue={s?.priceCents != null ? (s.priceCents / 100).toFixed(2).replace(".", ",") : ""} /></Field>
        <Field label="Duração (min)"><Input name="durationMin" type="number" min={5} defaultValue={s?.durationMin ?? ""} required /></Field>
        <Field label="Preparo após (min)"><Input name="bufferMin" type="number" min={0} defaultValue={s?.bufferMin ?? 0} /></Field>
        <Field label="Ordem"><Input name="sortOrder" type="number" min={0} defaultValue={s?.sortOrder ?? 0} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={s?.active ?? true} className="accent-brand" /> Ativo (aparece no site)</label>
    </>
  );
}

export default async function Servicos() {
  const ctx = await requireStaff("ADMIN");
  const services = await forTenant(ctx.tenant.id).service.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return (
    <div className="space-y-6">
      <PageTitle title="Serviços" subtitle="Preço, duração e intervalo de preparo usados na agenda e no site." />
      <Card>
        <h2 className="mb-3 font-display text-lg">Novo serviço</h2>
        <AdminForm action={saveService} submit="Adicionar"><ServiceFields /></AdminForm>
      </Card>
      {services.length === 0 ? <EmptyState>Nenhum serviço cadastrado.</EmptyState> : services.map((s) => (
        <details key={s.id} className="rounded-2xl border border-line bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4">
            <span className="font-medium">{s.name}</span>
            <span className="flex items-center gap-2 text-sm text-muted">{formatBRL(s.priceCents)} · {s.durationMin} min {!s.active && <Badge>inativo</Badge>}</span>
          </summary>
          <div className="border-t border-line p-5"><AdminForm action={saveService}><ServiceFields s={s} /></AdminForm></div>
        </details>
      ))}
    </div>
  );
}
