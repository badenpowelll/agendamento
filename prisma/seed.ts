/**
 * Semente de produção: cria o estabelecimento de DEFAULT_TENANT_SLUG.
 * Cada cliente da Argos roda em um deploy próprio (banco próprio) com seu slug:
 * "milly-rodrigues" (padrão) ou "salao-dunas". Outros slugs começam vazios e são preenchidos pelo painel.
 */
import { PrismaClient } from "@prisma/client";
import { EMPTY_SITE_CONTENT } from "../src/lib/site-content";
import { hashPassword, passwordProblem } from "../src/lib/password";
import { applyGuide } from "./apply-guide";
import { applyStaffReset } from "./apply-staff-reset";
import { applyBrand } from "./apply-brand";
import { applyDunas, DUNAS_NAME, DUNAS_SLUG } from "./apply-dunas";

const NAMES: Record<string, string> = { "milly-rodrigues": "Milly Rodrigues — Epilação e Estética", [DUNAS_SLUG]: DUNAS_NAME };

const prisma = new PrismaClient();

async function main() {
  const slug = process.env.DEFAULT_TENANT_SLUG ?? "milly-rodrigues";
  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {},
    create: { slug, name: NAMES[slug] ?? process.env.TENANT_NAME ?? slug, timezone: "America/Fortaleza" },
  });
  await prisma.siteContent.upsert({ where: { tenantId: tenant.id }, update: {}, create: { tenantId: tenant.id, data: EMPTY_SITE_CONTENT } });

  // Primeiro acesso da gestora em ambientes sem terminal (ex.: Railway): só cria se ainda não houver ninguém da equipe.
  const ownerEmail = process.env.INITIAL_OWNER_EMAIL?.trim().toLowerCase();
  const ownerPassword = process.env.INITIAL_OWNER_PASSWORD ?? "";
  if (ownerEmail && ownerPassword && (await prisma.staffUser.count({ where: { tenantId: tenant.id } })) === 0) {
    const problem = passwordProblem(ownerPassword);
    if (problem) throw new Error(`INITIAL_OWNER_PASSWORD: ${problem}`);
    await prisma.staffUser.create({
      data: { tenantId: tenant.id, name: process.env.INITIAL_OWNER_NAME?.trim() || "Gestora", email: ownerEmail, role: "OWNER", passwordHash: await hashPassword(ownerPassword), mustChangePassword: true, active: true },
    });
    console.info(`Acesso da gestora criado: ${ownerEmail} (troca de senha obrigatória no primeiro acesso)`);
  }
  if (process.env.SKIP_GUIDE !== "1" && slug === "milly-rodrigues" && (await applyGuide(prisma, tenant.id))) console.info("Guia de Atendimento aplicado (textos, Pix do sinal e serviços).");
  if (slug === "milly-rodrigues" && (await applyStaffReset(prisma, tenant.id))) console.info("Acesso de teste liberado (teste@teste.com).");
  if (slug === "milly-rodrigues" && (await applyBrand(prisma, tenant.id))) console.info("Logomarca oficial aplicada.");
  if (slug === DUNAS_SLUG && (await applyDunas(prisma, tenant.id))) console.info("Perfil do Salão Dunas aplicado (dados [TESTE] para homologação).");
  if (slug === DUNAS_SLUG && (await applyStaffReset(prisma, tenant.id))) console.info("Acesso de teste liberado (teste@teste.com).");
  console.info(`Estabelecimento pronto: ${tenant.name} (${tenant.id})`);
}

main().finally(() => prisma.$disconnect());
