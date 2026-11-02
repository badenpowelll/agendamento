"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { getContext, requireUser } from "@/lib/context";
import { forTenant } from "@/lib/tenant-db";
import { getSite } from "@/lib/site";
import { audit } from "@/domain/audit";
import { normalizePhoneBR } from "@/lib/phone";

const safeCallback = (v: unknown) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/minha-conta");

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: safeCallback(formData.get("callbackUrl")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

const profileSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo.").max(120),
  phone: z.string().trim().min(8, "Informe seu WhatsApp com DDD.").max(30),
  allowEmail: z.boolean(),
  allowWhatsapp: z.boolean(),
  allowMarketing: z.boolean(),
  acceptTerms: z.literal(true, { message: "É preciso aceitar os termos e a política de privacidade." }),
});

export type FormState = { error?: string; ok?: boolean };

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireUser("/cadastro");
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    allowEmail: formData.get("allowEmail") === "on",
    allowWhatsapp: formData.get("allowWhatsapp") === "on",
    allowMarketing: formData.get("allowMarketing") === "on",
    acceptTerms: formData.get("acceptTerms") === "on" || (!!ctx.customer?.profileComplete && formData.get("acceptTerms") !== "off"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const phone = normalizePhoneBR(parsed.data.phone);
  if (!phone) return { error: "WhatsApp inválido. Use DDD + número, por exemplo (84) 99999-9999." };

  const db = forTenant(ctx.tenant.id);
  const site = await getSite();
  const version = site.policies.version;
  const phoneChanged = ctx.customer?.phone !== phone;
  const data = {
    name: parsed.data.name,
    phone,
    email: ctx.user.email,
    allowEmail: parsed.data.allowEmail,
    allowWhatsapp: parsed.data.allowWhatsapp,
    allowMarketing: parsed.data.allowMarketing,
    profileComplete: true,
    ...(phoneChanged ? { phoneVerifiedAt: null } : {}),
  };
  const customer = ctx.customer
    ? await db.customer.update({ where: { id: ctx.customer.id }, data })
    : await db.customer.create({ data: { ...data, userId: ctx.user.id } as never });

  // Registro de consentimentos (LGPD): só grava o que mudou
  const prev = ctx.customer;
  const consents: { kind: "TERMS" | "PRIVACY" | "TRANSACTIONAL_EMAIL" | "TRANSACTIONAL_WHATSAPP" | "MARKETING"; granted: boolean }[] = [];
  if (!prev?.profileComplete) consents.push({ kind: "TERMS", granted: true }, { kind: "PRIVACY", granted: true });
  if (prev?.allowEmail !== data.allowEmail || !prev?.profileComplete) consents.push({ kind: "TRANSACTIONAL_EMAIL", granted: data.allowEmail });
  if (prev?.allowWhatsapp !== data.allowWhatsapp || !prev?.profileComplete) consents.push({ kind: "TRANSACTIONAL_WHATSAPP", granted: data.allowWhatsapp });
  if (prev?.allowMarketing !== data.allowMarketing || !prev?.profileComplete) consents.push({ kind: "MARKETING", granted: data.allowMarketing });
  if (consents.length) {
    await db.consent.createMany({ data: consents.map((c) => ({ ...c, customerId: customer.id, version, source: prev ? "minha-conta" : "cadastro" })) as never });
  }
  await audit(ctx.tenant.id, ctx.user.id, prev ? "customer.update" : "customer.create", "Customer", customer.id);
  revalidatePath("/minha-conta");
  const cb = formData.get("callbackUrl");
  if (cb) redirect(safeCallback(cb));
  return { ok: true };
}

/** Exportação dos dados pessoais (direito de acesso — LGPD art. 18). */
export async function exportMyData() {
  const ctx = await getContext();
  if (!ctx.user || !ctx.customer) return null;
  const db = forTenant(ctx.tenant.id);
  const [appointments, consents] = await Promise.all([
    db.appointment.findMany({ where: { customerId: ctx.customer.id }, select: { serviceName: true, startAt: true, status: true, priceCents: true } }),
    db.consent.findMany({ where: { customerId: ctx.customer.id }, select: { kind: true, granted: true, version: true, createdAt: true } }),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, tenantId: _t, userId: _u, ...profile } = ctx.customer;
  return JSON.stringify({ perfil: profile, agendamentos: appointments, consentimentos: consents }, null, 2);
}
