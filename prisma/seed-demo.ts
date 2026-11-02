/**
 * Dados de DEMONSTRAÇÃO para desenvolvimento local. NÃO são dados reais da Milly.
 * Recusa rodar em produção.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" || /railway|rlwy/.test(process.env.DATABASE_URL ?? "")) throw new Error("seed-demo não roda em produção");
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: process.env.DEFAULT_TENANT_SLUG ?? "milly-rodrigues" } });
  if (await prisma.service.count({ where: { tenantId: tenant.id } })) return console.info("Já existem serviços; nada feito.");
  const s1 = await prisma.service.create({ data: { tenantId: tenant.id, name: "[DEMO] Serviço A", durationMin: 30, bufferMin: 10, priceCents: 5000, sortOrder: 1 } });
  const s2 = await prisma.service.create({ data: { tenantId: tenant.id, name: "[DEMO] Serviço B", durationMin: 60, bufferMin: 15, priceCents: 12000, sortOrder: 2 } });
  const p = await prisma.professional.create({ data: { tenantId: tenant.id, name: "[DEMO] Profissional" } });
  await prisma.professionalService.createMany({ data: [s1, s2].map((s) => ({ tenantId: tenant.id, professionalId: p.id, serviceId: s.id })) });
  for (const d of [1, 2, 3, 4, 5, 6]) {
    await prisma.workingHours.createMany({ data: [{ tenantId: tenant.id, professionalId: p.id, weekday: d, startMin: 480, endMin: 720 }, { tenantId: tenant.id, professionalId: p.id, weekday: d, startMin: 780, endMin: 1080 }] });
  }
  console.info("Dados de demonstração criados.");
}

main().finally(() => prisma.$disconnect());
