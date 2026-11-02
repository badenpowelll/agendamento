/**
 * Semente de produção: cria apenas o estabelecimento Milly Rodrigues, sem serviços,
 * preços ou textos inventados. Tudo é preenchido pelo painel.
 */
import { PrismaClient } from "@prisma/client";
import { EMPTY_SITE_CONTENT } from "../src/lib/site-content";

const prisma = new PrismaClient();

async function main() {
  const slug = process.env.DEFAULT_TENANT_SLUG ?? "milly-rodrigues";
  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {},
    create: { slug, name: "Milly Rodrigues — Depilação e Estética", timezone: "America/Fortaleza" },
  });
  await prisma.siteContent.upsert({ where: { tenantId: tenant.id }, update: {}, create: { tenantId: tenant.id, data: EMPTY_SITE_CONTENT } });
  console.info(`Estabelecimento pronto: ${tenant.name} (${tenant.id})`);
}

main().finally(() => prisma.$disconnect());
