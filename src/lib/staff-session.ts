import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { StaffRole } from "@prisma/client";
import { getTenant } from "./context";
import { findStaffBySession } from "@/domain/staff";

export const STAFF_COOKIE = process.env.NODE_ENV === "production" ? "__Host-milly_staff" : "milly_staff";

export async function setStaffCookie(token: string, expiresAt: Date) {
  (await cookies()).set(STAFF_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}
export async function readStaffCookie() {
  return (await cookies()).get(STAFF_COOKIE)?.value;
}
export async function clearStaffCookie() {
  (await cookies()).delete(STAFF_COOKIE);
}

/** Usuária da equipe logada no painel (ou null). */
export const getStaff = cache(async () => {
  const tenant = await getTenant();
  const staff = await findStaffBySession(await readStaffCookie(), tenant.id);
  return staff ? { tenant, staff } : null;
});

const ORDER: StaffRole[] = ["STAFF", "ADMIN", "OWNER"];

/**
 * Exige login da equipe. Retorna `user` (id/e-mail da usuária da equipe) para auditoria.
 * Na primeira entrada a senha provisória precisa ser trocada.
 */
export async function requireStaff(minRole: StaffRole = "STAFF", opts: { allowMustChange?: boolean } = {}) {
  const s = await getStaff();
  if (!s) redirect("/admin/entrar");
  if (s.staff.mustChangePassword && !opts.allowMustChange) redirect("/admin/senha");
  if (ORDER.indexOf(s.staff.role) < ORDER.indexOf(minRole)) redirect("/admin?sem-permissao=1");
  return { tenant: s.tenant, staff: s.staff, role: s.staff.role, user: { id: s.staff.id, email: s.staff.email } };
}
