import { requireStaff } from "@/lib/context";
import { forTenant } from "@/lib/tenant-db";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { Card, EmptyState, PageTitle } from "@/components/ui";

export default async function Auditoria() {
  const ctx = await requireStaff("ADMIN");
  const logs = await forTenant(ctx.tenant.id).auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const users = await prisma.user.findMany({ where: { id: { in: [...new Set(logs.map((l) => l.actorUserId).filter(Boolean) as string[])] } }, select: { id: true, email: true } });
  const who = (id: string | null) => users.find((u) => u.id === id)?.email ?? "sistema";
  return (
    <div className="space-y-4">
      <PageTitle title="Auditoria" subtitle="Últimas 200 ações administrativas." />
      {logs.length === 0 ? <EmptyState>Nenhum registro.</EmptyState> : (
        <Card className="divide-y divide-line p-0 text-sm">
          {logs.map((l) => (
            <div key={l.id} className="px-5 py-2.5">
              <span className="text-muted">{formatDateTime(l.createdAt, ctx.tenant.timezone, { dateStyle: "short", timeStyle: "medium" })}</span> · <b>{l.action}</b> · {who(l.actorUserId)}{l.entityId ? ` · ${l.entity} ${l.entityId.slice(-6)}` : ""}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
