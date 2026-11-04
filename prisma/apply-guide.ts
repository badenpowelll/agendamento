import type { PrismaClient } from "@prisma/client";
import { parseSiteContent, siteContentSchema } from "../src/lib/site-content";
import { GUIDE_VERSION, guideServices, guideSite } from "./data/guia-milly";

/**
 * Aplica uma única vez (por versão) os dados reais do Guia de Atendimento:
 * textos do site, Pix do sinal, políticas e a tabela de serviços.
 * Serviços entram com duração 0 ("defina a duração" no painel): aparecem na tabela de preços,
 * mas só ficam agendáveis online depois que a gestora informar a duração.
 * Os itens de teste ("[TESTE] …") são desativados.
 */
export async function applyGuide(prisma: PrismaClient, tenantId: string): Promise<boolean> {
  const done = await prisma.auditLog.findFirst({ where: { tenantId, action: "seed.guide", entityId: GUIDE_VERSION } });
  if (done) return false;

  await prisma.$transaction(async (tx) => {
    const row = await tx.siteContent.findUnique({ where: { tenantId } });
    const cur = parseSiteContent(row?.data);
    const data = siteContentSchema.parse({
      ...cur,
      brand: { ...cur.brand, tagline: guideSite.tagline },
      about: { title: guideSite.aboutTitle, text: guideSite.aboutText },
      contact: { ...cur.contact, address: guideSite.address, mapsUrl: guideSite.mapsUrl, whatsappMessage: cur.contact.whatsappMessage.replace(/\bepila(ç|c)ão\b/gi, "depilação") },
      faq: guideSite.faq,
      payment: guideSite.payment,
      policies: { ...cur.policies, cancellation: guideSite.cancellation },
    });
    await tx.siteContent.upsert({ where: { tenantId }, update: { data }, create: { tenantId, data } });

    const existing = new Set((await tx.service.findMany({ where: { tenantId }, select: { name: true } })).map((s) => s.name.toLowerCase()));
    const pros = await tx.professional.findMany({ where: { tenantId, active: true }, select: { id: true } });
    let order = 0;
    for (const s of guideServices) {
      order += 10;
      if (existing.has(s.name.toLowerCase())) continue;
      const svc = await tx.service.create({
        data: { tenantId, name: s.name, category: s.category, description: s.description ?? null, priceCents: Math.round(s.price * 100), durationMin: 0, sortOrder: order, active: true },
      });
      if (pros.length) await tx.professionalService.createMany({ data: pros.map((p) => ({ tenantId, professionalId: p.id, serviceId: svc.id })), skipDuplicates: true });
    }
    await tx.service.updateMany({ where: { tenantId, name: { startsWith: "[TESTE]" } }, data: { active: false } });
    await tx.auditLog.create({ data: { tenantId, action: "seed.guide", entity: "SiteContent", entityId: GUIDE_VERSION, data: { services: guideServices.length } } });
  });
  return true;
}
