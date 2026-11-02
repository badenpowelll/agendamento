"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTenant } from "@/lib/context";
import { rateLimit } from "@/lib/rate-limit";
import { clearStaffCookie, readStaffCookie, requireStaff, setStaffCookie } from "@/lib/staff-session";
import { authenticateStaff, changeOwnPassword, createStaffSession, destroyStaffSession } from "@/domain/staff";
import { DomainError } from "@/domain/errors";
import { audit } from "@/domain/audit";

export type LoginState = { error?: string };

export async function staffLogin(_p: LoginState, f: FormData): Promise<LoginState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const email = String(f.get("email") ?? "").slice(0, 200);
  const password = String(f.get("password") ?? "").slice(0, 200);
  if (!rateLimit(`staff-login:${ip}`, 10, 5 * 60_000)) return { error: "Muitas tentativas. Aguarde alguns minutos." };
  const tenant = await getTenant();
  const r = await authenticateStaff(tenant.id, email, password);
  if (!r.ok) return { error: r.error };
  const { token, expiresAt } = await createStaffSession(r.staff, h.get("user-agent"));
  await setStaffCookie(token, expiresAt);
  await audit(tenant.id, r.staff.id, "staff.login", "StaffUser", r.staff.id);
  redirect(r.staff.mustChangePassword ? "/admin/senha" : "/admin");
}

export async function staffLogout() {
  await destroyStaffSession(await readStaffCookie());
  await clearStaffCookie();
  redirect("/admin/entrar");
}

export async function staffChangePassword(_p: LoginState, f: FormData): Promise<LoginState> {
  const ctx = await requireStaff("STAFF", { allowMustChange: true });
  const next = String(f.get("next") ?? "");
  if (next !== String(f.get("confirm") ?? "")) return { error: "A confirmação não confere com a nova senha." };
  try {
    await changeOwnPassword(ctx.staff, String(f.get("current") ?? ""), next);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
  await audit(ctx.tenant.id, ctx.staff.id, "staff.change_password", "StaffUser", ctx.staff.id);
  redirect("/admin");
}
