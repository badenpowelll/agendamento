import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
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

/**
 * Contexto da requisição: estabelecimento, usuária logada, papel e cadastro de cliente.
 * Garante o vínculo (Membership) de cliente no primeiro acesso.
 * O login Google é só para clientes; a equipe usa e-mail e senha (src/lib/staff-session.ts).
 */
export const getContext = cache(async () => {
  const tenant = await getTenant();
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { tenant, user: null, role: null, customer: null } as const;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { tenant, user: null, role: null, customer: null } as const;
  const db = forTenant(tenant.id);
  let membership = await db.membership.findFirst({ where: { userId } });
  if (!membership) membership = await db.membership.create({ data: { userId, role: "CLIENT" } as never });
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
