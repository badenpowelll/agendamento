import type { PrismaClient } from "@prisma/client";
import { parseSiteContent, siteContentSchema } from "../src/lib/site-content";

/** Aplica uma vez a logomarca oficial (PDF enviado pelo Baden em 05/11/2026) e o nome "Epilação e Estética". */
const VERSION = "logo-2026-11-05";

export async function applyBrand(prisma: PrismaClient, tenantId: string): Promise<boolean> {
  if (await prisma.auditLog.findFirst({ where: { tenantId, action: "seed.brand", entityId: VERSION } })) return false;
  const row = await prisma.siteContent.findUnique({ where: { tenantId } });
  const cur = parseSiteContent(row?.data);
  const data = siteContentSchema.parse({ ...cur, brand: { ...cur.brand, logoUrl: "/marca/logo-milly.png", watermarkUrl: "/marca/marca-dagua.png" } });
  await prisma.siteContent.upsert({ where: { tenantId }, update: { data }, create: { tenantId, data } });
  await prisma.tenant.update({ where: { id: tenantId }, data: { name: "Milly Rodrigues — Epilação e Estética" } });
  await prisma.auditLog.create({ data: { tenantId, action: "seed.brand", entity: "SiteContent", entityId: VERSION } });
  return true;
}
