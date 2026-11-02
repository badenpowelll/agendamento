import { requireStaff } from "@/lib/staff-session";
import { forTenant } from "@/lib/tenant-db";
import { formatDateTime } from "@/lib/time";
import { activeSeatsInUse } from "@/domain/staff";
import { CreateStaffForm, StaffRowControls } from "@/components/staff-controls";
import { Badge, Card, PageTitle } from "@/components/ui";

const ROLE = { OWNER: "Gestora", ADMIN: "Administradora", STAFF: "Colaboradora" } as const;

export default async function Equipe() {
  const ctx = await requireStaff("ADMIN");
  const db = forTenant(ctx.tenant.id);
  const [staff, pros, inUse] = await Promise.all([
    db.staffUser.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    db.professional.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    activeSeatsInUse(ctx.tenant.id),
  ]);
  const limit = ctx.tenant.staffSeatLimit;
  const isOwner = ctx.role === "OWNER";
  return (
    <div className="space-y-6">
      <PageTitle title="Equipe" subtitle={`Licenças de colaboradoras em uso: ${inUse}${limit != null ? ` de ${limit}` : ""}. A gestora não ocupa licença.`} />
      <Card>
        <h2 className="mb-3 font-display text-lg">Novo acesso</h2>
        <CreateStaffForm isOwner={isOwner} professionals={pros} />
      </Card>
      <Card className="divide-y divide-line p-0">
        {staff.map((s) => (
          <div key={s.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 text-sm">
            <div>
              <p className="font-medium">{s.name} <span className="font-normal text-muted">{s.email}</span></p>
              <p className="mt-1 flex flex-wrap gap-1.5">
                <Badge tone="brand">{ROLE[s.role]}</Badge>
                {s.active ? <Badge tone="good">Ativa</Badge> : <Badge tone="bad">Desativada</Badge>}
                {s.mustChangePassword && <Badge tone="warn">Aguardando primeiro acesso</Badge>}
              </p>
              <p className="mt-1 text-xs text-muted">Último acesso: {s.lastLoginAt ? formatDateTime(s.lastLoginAt, ctx.tenant.timezone, { dateStyle: "short" }) : "nunca"}</p>
            </div>
            <StaffRowControls id={s.id} active={s.active} role={s.role} isOwner={isOwner} isSelf={s.id === ctx.staff.id} />
          </div>
        ))}
      </Card>
    </div>
  );
}
