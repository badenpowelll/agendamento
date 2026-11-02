import { forTenant } from "@/lib/tenant-db";

export async function audit(tenantId: string, actorUserId: string | null, action: string, entity: string, entityId?: string | null, data?: unknown) {
  await forTenant(tenantId).auditLog.create({
    data: { actorUserId, action, entity, entityId: entityId ?? null, data: (data ?? undefined) as never } as never,
  });
}
