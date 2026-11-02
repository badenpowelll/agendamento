import { createHash, randomBytes } from "node:crypto";
import type { StaffRole, StaffUser } from "@prisma/client";
import { prisma } from "@/lib/db";
import { forTenant } from "@/lib/tenant-db";
import { generateTempPassword, hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { DomainError } from "./errors";

export const SESSION_HOURS = 12;
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const normEmail = (e: string) => e.trim().toLowerCase();
// Hash fixo para gastar o mesmo tempo quando o e-mail não existe (evita descobrir contas pelo tempo de resposta)
let dummyHash: Promise<string> | null = null;

export type LoginResult = { ok: true; staff: StaffUser } | { ok: false; error: string };

/** Valida e-mail e senha da equipe, com bloqueio temporário após tentativas erradas. */
export async function authenticateStaff(tenantId: string, email: string, password: string, now = new Date()): Promise<LoginResult> {
  const generic = { ok: false as const, error: "E-mail ou senha incorretos." };
  const db = forTenant(tenantId);
  const staff = await db.staffUser.findFirst({ where: { email: normEmail(email) } });
  if (!staff) {
    dummyHash ??= hashPassword("senha-inexistente-123");
    await verifyPassword(password, await dummyHash);
    return generic;
  }
  if (staff.lockedUntil && staff.lockedUntil > now) {
    return { ok: false, error: `Muitas tentativas. Tente de novo em alguns minutos ou peça à gestora para redefinir sua senha.` };
  }
  const valid = await verifyPassword(password, staff.passwordHash);
  if (!valid) {
    const failed = staff.failedLogins + 1;
    await db.staffUser.update({
      where: { id: staff.id },
      data: { failedLogins: failed >= MAX_FAILED_LOGINS ? 0 : failed, lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : null },
    });
    return generic;
  }
  if (!staff.active) return { ok: false, error: "Seu acesso está desativado. Fale com a gestora." };
  const updated = await db.staffUser.update({ where: { id: staff.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: now } });
  return { ok: true, staff: updated };
}

/** Cria sessão e devolve o token (vai só no cookie; no banco fica o hash). */
export async function createStaffSession(staff: Pick<StaffUser, "id" | "tenantId">, userAgent?: string | null, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 3600_000);
  await forTenant(staff.tenantId).staffSession.create({ data: { staffUserId: staff.id, tokenHash: sha256(token), expiresAt, userAgent: userAgent?.slice(0, 200) ?? null } as never });
  return { token, expiresAt };
}

/** Sessão válida → usuária ativa do estabelecimento informado; caso contrário null. */
export async function findStaffBySession(token: string | undefined, tenantId: string, now = new Date()) {
  if (!token) return null;
  const s = await prisma.staffSession.findUnique({ where: { tokenHash: sha256(token) }, include: { staffUser: true } });
  if (!s || s.tenantId !== tenantId || s.expiresAt <= now || !s.staffUser.active || s.staffUser.tenantId !== tenantId) return null;
  return s.staffUser;
}

export async function destroyStaffSession(token: string | undefined) {
  if (token) await prisma.staffSession.deleteMany({ where: { tokenHash: sha256(token) } });
}

export async function changeOwnPassword(staff: StaffUser, current: string, next: string) {
  if (!(await verifyPassword(current, staff.passwordHash))) throw new DomainError("PASSWORD", "Senha atual incorreta.");
  const problem = passwordProblem(next);
  if (problem) throw new DomainError("PASSWORD", problem);
  if (current === next) throw new DomainError("PASSWORD", "A nova senha precisa ser diferente da atual.");
  const db = forTenant(staff.tenantId);
  await db.staffUser.update({ where: { id: staff.id }, data: { passwordHash: await hashPassword(next), mustChangePassword: false } });
}

// ---------- Gestão da equipe (licenças) ----------

export async function activeSeatsInUse(tenantId: string) {
  return forTenant(tenantId).staffUser.count({ where: { active: true, role: { not: "OWNER" } } });
}

async function assertSeatAvailable(tenantId: string) {
  const t = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  if (t.staffSeatLimit != null && (await activeSeatsInUse(tenantId)) >= t.staffSeatLimit) {
    throw new DomainError("SEATS", `Todas as ${t.staffSeatLimit} licenças de colaboradoras estão em uso. Desative uma ou contrate mais licenças.`);
  }
}

function assertCanManage(actor: Pick<StaffUser, "role">, targetRole: StaffRole) {
  if (actor.role === "STAFF") throw new DomainError("FORBIDDEN", "Sem permissão.");
  if (targetRole === "OWNER" && actor.role !== "OWNER") throw new DomainError("FORBIDDEN", "Só a gestora pode cadastrar outra gestora.");
}

/** Cria colaboradora com senha provisória (mostrada uma única vez à gestora). */
export async function createStaffUser(tenantId: string, actor: Pick<StaffUser, "role">, input: { name: string; email: string; role: StaffRole; professionalId?: string | null }) {
  assertCanManage(actor, input.role);
  const email = normEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DomainError("EMAIL", "E-mail inválido.");
  if (input.name.trim().length < 2) throw new DomainError("NAME", "Informe o nome.");
  const db = forTenant(tenantId);
  if (await db.staffUser.findFirst({ where: { email } })) throw new DomainError("EMAIL", "Já existe um acesso com este e-mail.");
  if (input.role !== "OWNER") await assertSeatAvailable(tenantId);
  const tempPassword = generateTempPassword();
  const staff = await db.staffUser.create({
    data: { name: input.name.trim(), email, role: input.role, passwordHash: await hashPassword(tempPassword), mustChangePassword: true, active: true, professionalId: input.professionalId || null } as never,
  });
  return { staff, tempPassword };
}

/** Libera ou bloqueia a licença. Bloquear encerra as sessões abertas. */
export async function setStaffActive(tenantId: string, actor: Pick<StaffUser, "id" | "role">, staffId: string, active: boolean) {
  const db = forTenant(tenantId);
  const target = await db.staffUser.findFirst({ where: { id: staffId } });
  if (!target) throw new DomainError("NOT_FOUND", "Acesso não encontrado.");
  if (target.id === actor.id) throw new DomainError("SELF", "Você não pode desativar o seu próprio acesso.");
  assertCanManage(actor, target.role);
  if (active && !target.active && target.role !== "OWNER") await assertSeatAvailable(tenantId);
  await db.staffUser.update({ where: { id: target.id }, data: { active } });
  if (!active) await db.staffSession.deleteMany({ where: { staffUserId: target.id } });
}

export async function resetStaffPassword(tenantId: string, actor: Pick<StaffUser, "id" | "role">, staffId: string) {
  const db = forTenant(tenantId);
  const target = await db.staffUser.findFirst({ where: { id: staffId } });
  if (!target) throw new DomainError("NOT_FOUND", "Acesso não encontrado.");
  assertCanManage(actor, target.role);
  const tempPassword = generateTempPassword();
  await db.staffUser.update({ where: { id: target.id }, data: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true, failedLogins: 0, lockedUntil: null } });
  await db.staffSession.deleteMany({ where: { staffUserId: target.id } });
  return tempPassword;
}

export async function setStaffRole(tenantId: string, actor: Pick<StaffUser, "id" | "role">, staffId: string, role: StaffRole) {
  if (actor.role !== "OWNER") throw new DomainError("FORBIDDEN", "Só a gestora pode mudar papéis.");
  if (staffId === actor.id) throw new DomainError("SELF", "Você não pode mudar o seu próprio papel.");
  await forTenant(tenantId).staffUser.updateMany({ where: { id: staffId }, data: { role } });
}
