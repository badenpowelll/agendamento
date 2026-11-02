import { prisma } from "@/lib/db";

export async function resetDb() {
  if (!/test/i.test(process.env.DATABASE_URL ?? "")) throw new Error("resetDb só roda no banco de teste");
  await prisma.$executeRawUnsafe(`TRUNCATE "Tenant", "User", "OutboxMessage", "AuditLog" RESTART IDENTITY CASCADE`);
}

/** Estabelecimento de teste com 1 serviço de 60 min (+15 de preparo) e 1 profissional das 08:00 às 18:00, todos os dias. */
export async function makeTenant(slug: string, opts: { professionals?: number } = {}) {
  const tenant = await prisma.tenant.create({
    data: { slug, name: `Teste ${slug}`, minLeadMinutes: 60, slotStepMinutes: 15, notificationEmail: `admin@${slug}.test` },
  });
  const service = await prisma.service.create({ data: { tenantId: tenant.id, name: "Serviço teste", durationMin: 60, bufferMin: 15, priceCents: 10000 } });
  const professionals = [];
  for (let i = 0; i < (opts.professionals ?? 1); i++) {
    const p = await prisma.professional.create({ data: { tenantId: tenant.id, name: `Profissional ${i + 1}` } });
    await prisma.professionalService.create({ data: { tenantId: tenant.id, professionalId: p.id, serviceId: service.id } });
    for (let d = 0; d < 7; d++) await prisma.workingHours.create({ data: { tenantId: tenant.id, professionalId: p.id, weekday: d, startMin: 8 * 60, endMin: 18 * 60 } });
    professionals.push(p);
  }
  return { tenant, service, professional: professionals[0], professionals };
}

export async function makeCustomer(tenantId: string, name = "Cliente") {
  return prisma.customer.create({ data: { tenantId, name, email: `${name.toLowerCase().replace(/\W/g, "")}@cliente.test`, profileComplete: true } });
}

/** Terça, 10/11/2026, 09:00 em Fortaleza (UTC-3). */
export const NOW = new Date("2026-11-10T12:00:00Z");
/** Quinta, 12/11/2026, 10:00 em Fortaleza. */
export const SLOT = new Date("2026-11-12T13:00:00Z");
