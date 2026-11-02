import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { authenticateStaff, changeOwnPassword, createStaffSession, createStaffUser, findStaffBySession, MAX_FAILED_LOGINS, resetStaffPassword, setStaffActive } from "@/domain/staff";
import { DomainError } from "@/domain/errors";
import { makeTenant, resetDb } from "../helpers";

beforeEach(resetDb);
const OWNER = { role: "OWNER" as const };

async function gestora(tenantId: string) {
  const { staff, tempPassword } = await createStaffUser(tenantId, OWNER, { name: "Gestora", email: "Gestora@Teste.com", role: "OWNER" });
  return { staff, tempPassword };
}

describe("acesso da equipe (e-mail e senha)", () => {
  it("gestora entra com a senha provisória e precisa trocá-la", async () => {
    const { tenant } = await makeTenant("milly");
    const { tempPassword } = await gestora(tenant.id);
    const r = await authenticateStaff(tenant.id, "gestora@teste.com", tempPassword);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.staff.mustChangePassword).toBe(true);
    await changeOwnPassword(r.staff, tempPassword, "NovaSenha2026");
    expect((await authenticateStaff(tenant.id, "gestora@teste.com", "NovaSenha2026")).ok).toBe(true);
    expect((await authenticateStaff(tenant.id, "gestora@teste.com", tempPassword)).ok).toBe(false);
  });

  it("bloqueia após tentativas erradas, mesmo com a senha certa depois", async () => {
    const { tenant } = await makeTenant("milly");
    const { tempPassword } = await gestora(tenant.id);
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await authenticateStaff(tenant.id, "gestora@teste.com", "errada123456");
    const r = await authenticateStaff(tenant.id, "gestora@teste.com", tempPassword);
    expect(r.ok).toBe(false);
    const later = new Date(Date.now() + 16 * 60_000);
    expect((await authenticateStaff(tenant.id, "gestora@teste.com", tempPassword, later)).ok).toBe(true);
  });

  it("sessão vale só no próprio estabelecimento e cai quando o acesso é desativado", async () => {
    const a = await makeTenant("a");
    const b = await makeTenant("b");
    const { staff: owner } = await gestora(a.tenant.id);
    const { staff: colab } = await createStaffUser(a.tenant.id, owner, { name: "Colab", email: "colab@teste.com", role: "STAFF" });
    const { token } = await createStaffSession(colab);
    expect((await findStaffBySession(token, a.tenant.id))?.id).toBe(colab.id);
    expect(await findStaffBySession(token, b.tenant.id)).toBeNull();
    expect((await authenticateStaff(b.tenant.id, "colab@teste.com", "qualquer123")).ok).toBe(false);
    await setStaffActive(a.tenant.id, owner, colab.id, false);
    expect(await findStaffBySession(token, a.tenant.id)).toBeNull();
    expect(await prisma.staffSession.count()).toBe(0);
  });

  it("limite de licenças de colaboradoras", async () => {
    const { tenant } = await makeTenant("milly");
    await prisma.tenant.update({ where: { id: tenant.id }, data: { staffSeatLimit: 1 } });
    const { staff: owner } = await gestora(tenant.id); // gestora não ocupa licença
    const { staff: c1 } = await createStaffUser(tenant.id, owner, { name: "C1", email: "c1@teste.com", role: "STAFF" });
    await expect(createStaffUser(tenant.id, owner, { name: "C2", email: "c2@teste.com", role: "STAFF" })).rejects.toBeInstanceOf(DomainError);
    await setStaffActive(tenant.id, owner, c1.id, false);
    const { staff: c2 } = await createStaffUser(tenant.id, owner, { name: "C2", email: "c2@teste.com", role: "STAFF" });
    await expect(setStaffActive(tenant.id, owner, c1.id, true)).rejects.toBeInstanceOf(DomainError);
    expect(c2.active).toBe(true);
  });

  it("colaboradora não gerencia a equipe; administradora não cria gestora", async () => {
    const { tenant } = await makeTenant("milly");
    const { staff: owner } = await gestora(tenant.id);
    const { staff: colab } = await createStaffUser(tenant.id, owner, { name: "Carla", email: "c@teste.com", role: "STAFF" });
    const { staff: adm } = await createStaffUser(tenant.id, owner, { name: "Ana", email: "a@teste.com", role: "ADMIN" });
    await expect(createStaffUser(tenant.id, colab, { name: "Xenia", email: "x@teste.com", role: "STAFF" })).rejects.toBeInstanceOf(DomainError);
    await expect(createStaffUser(tenant.id, adm, { name: "Xenia", email: "x@teste.com", role: "OWNER" })).rejects.toBeInstanceOf(DomainError);
    await expect(setStaffActive(tenant.id, adm, owner.id, false)).rejects.toBeInstanceOf(DomainError);
  });

  it("redefinir senha encerra sessões e exige nova troca", async () => {
    const { tenant } = await makeTenant("milly");
    const { staff: owner } = await gestora(tenant.id);
    const { staff: colab } = await createStaffUser(tenant.id, owner, { name: "Carla", email: "c@teste.com", role: "STAFF" });
    const { token } = await createStaffSession(colab);
    const temp = await resetStaffPassword(tenant.id, owner, colab.id);
    expect(await findStaffBySession(token, tenant.id)).toBeNull();
    const r = await authenticateStaff(tenant.id, "c@teste.com", temp);
    expect(r.ok && r.staff.mustChangePassword).toBe(true);
  });
});
