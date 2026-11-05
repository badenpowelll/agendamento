import type { PrismaClient } from "@prisma/client";

/**
 * Libera o acesso de teste (teste@teste.com) uma única vez: senha provisória nova, desbloqueio
 * e troca obrigatória no primeiro acesso. Só o hash fica aqui; a senha foi entregue ao Baden em 05/11/2026.
 */
const VERSION = "teste-2026-11-05";
const EMAIL = "teste@teste.com";
const HASH = "scrypt$16384$8$1$0VB9sEsp3k44M0aaGOYQcg$GiWCLIjwU9v0r6FNiOWksTQJauY6gkSG4OM7-NWEVUStrVBe5g2WeKX8ZNA1y6v9wweBk89zpuL4MkLl1yTHKg";

export async function applyStaffReset(prisma: PrismaClient, tenantId: string): Promise<boolean> {
  if (await prisma.auditLog.findFirst({ where: { tenantId, action: "seed.staff_reset", entityId: VERSION } })) return false;
  const data = { passwordHash: HASH, mustChangePassword: true, active: true, failedLogins: 0, lockedUntil: null };
  const existing = await prisma.staffUser.findFirst({ where: { tenantId, email: EMAIL } });
  if (existing) await prisma.staffUser.update({ where: { id: existing.id }, data });
  else await prisma.staffUser.create({ data: { tenantId, email: EMAIL, name: "Teste", role: "OWNER", ...data } });
  await prisma.auditLog.create({ data: { tenantId, action: "seed.staff_reset", entity: "StaffUser", entityId: VERSION } });
  return true;
}
