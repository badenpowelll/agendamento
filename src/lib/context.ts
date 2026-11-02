import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "./db";
import { env } from "./env";
import { forTenant } from "./tenant-db";

/** Estabelecimento atual. Hoje: o padrão (Milly). Na Fase 5: resolvido pelo domínio. */
export const getTenant = cache(async () => {
  const t = await prisma.tenant.findUnique({ where: { slug: env.defaultTenantSlug } });
  if (!t) throw new Error(`Estabelecimento "${env.defaultTenantSlug}" não existe. Rode "npm run db:seed".`);
  return t;
});

const STAFF_ROLES: Role[] = ["OWNER", "ADMIN", "STAFF"];
export const isStaff = (role?: Role | null) => !!role && STAFF_ROLES.includes(role);

/**
 * Contexto da requisição: estabelecimento, usuária logada, papel e cadastro de cliente.
 * Garante o vínculo (Membership) no primeiro acesso. E-mails em ADMIN_EMAILS viram OWNER.
 */
export const getContext = cache(async () => {
  const tenant = await getTenant();
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { tenant, user: null, role: null, customer: null } as const;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { tenant, user: null, role: null, customer: null } as const;
  const db = forTenant(tenant.id);
  const wantsOwner = !!user.email && env.adminEmails.includes(user.email.toLowerCase());
  let membership = await db.membership.findFirst({ where: { userId } });
  if (!membership) {
    membership = await db.membership.create({ data: { userId, role: wantsOwner ? "OWNER" : "CLIENT" } as never });
  } else if (wantsOwner && membership.role !== "OWNER") {
    membership = await db.membership.update({ where: { id: membership.id }, data: { role: "OWNER" } });
  }
  const customer = await db.customer.findFirst({ where: { userId } });
  return { tenant, user, role: membership.role, customer } as const;
});

export async function requireUser(callbackUrl = "/minha-conta") {
  const ctx = await getContext();
  if (!ctx.user) redirect(`/entrar?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return ctx as typeof ctx & { user: NonNullable<typeof ctx.user> };
}

/** Exige cadastro completo de cliente. */
export async function requireCustomer(callbackUrl = "/minha-conta") {
  const ctx = await requireUser(callbackUrl);
  if (!ctx.customer || !ctx.customer.profileComplete) redirect(`/cadastro?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return ctx as typeof ctx & { customer: NonNullable<typeof ctx.customer> };
}

export async function requireStaff(minRole: "STAFF" | "ADMIN" | "OWNER" = "STAFF") {
  const ctx = await requireUser("/admin");
  const order: Role[] = ["CLIENT", "STAFF", "ADMIN", "OWNER"];
  if (order.indexOf(ctx.role!) < order.indexOf(minRole)) redirect("/sem-permissao");
  return ctx;
}
