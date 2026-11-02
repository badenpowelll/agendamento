import Link from "next/link";
import { requireStaff } from "@/lib/context";
import { forTenant } from "@/lib/tenant-db";
import { formatPhoneBR } from "@/lib/phone";
import { Card, EmptyState, Input, PageTitle } from "@/components/ui";

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const ctx = await requireStaff();
  const term = q.trim();
  const digits = term.replace(/\D/g, "");
  const customers = await forTenant(ctx.tenant.id).customer.findMany({
    where: term ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }, ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : [])] } : {},
    include: { _count: { select: { appointments: true } } },
    orderBy: { name: "asc" },
    take: 100,
  });
  return (
    <div className="space-y-4">
      <PageTitle title="Clientes" />
      <form><Input name="q" defaultValue={q} placeholder="Buscar por nome, e-mail ou telefone" aria-label="Buscar cliente" /></form>
      {customers.length === 0 ? <EmptyState>Nenhuma cliente encontrada.</EmptyState> : (
        <Card className="divide-y divide-line p-0">
          {customers.map((c) => (
            <Link key={c.id} href={`/admin/clientes/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-cream">
              <span className="font-medium">{c.name}</span>
              <span className="text-muted">{formatPhoneBR(c.phone)} · {c._count.appointments} agendamentos</span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
