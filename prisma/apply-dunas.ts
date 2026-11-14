import type { PrismaClient } from "@prisma/client";
import { EMPTY_SITE_CONTENT, siteContentSchema } from "../src/lib/site-content";

/**
 * Perfil inicial do Salão Dunas (Natal/RN), aplicado uma única vez (por versão).
 * Fonte dos dados reais: perfil público no Google Maps enviado pelo Baden em 13/11/2026
 * (endereço, WhatsApp, horário de fechamento, refrigerado, cartão, 2 vagas).
 * Tudo que o salão ainda não confirmou vai marcado com [TESTE]: serviços, preços, durações,
 * horário de abertura e profissionais. Logomarca: ainda não enviada (site usa o nome em texto).
 */
export const DUNAS_SLUG = "salao-dunas";
export const DUNAS_NAME = "Salão Dunas";
const VERSION = "dunas-2026-11-13";

const MAPS = "https://maps.app.goo.gl/RVa4pFMcaGDyzQxn9";
const NOTE = "[TESTE] Preço e duração fictícios, aguardando a tabela do salão.";

// [TESTE] tabela fictícia para homologação. Substituir pela tabela real do Salão Dunas.
const services: { category: string; name: string; price: number; min: number }[] = [
  { category: "Cabelo", name: "[TESTE] Corte feminino", price: 70, min: 60 },
  { category: "Cabelo", name: "[TESTE] Escova", price: 45, min: 45 },
  { category: "Cabelo", name: "[TESTE] Hidratação", price: 80, min: 60 },
  { category: "Cabelo", name: "[TESTE] Coloração", price: 150, min: 120 },
  { category: "Cabelo", name: "[TESTE] Progressiva", price: 250, min: 180 },
  { category: "Unhas", name: "[TESTE] Manicure", price: 25, min: 40 },
  { category: "Unhas", name: "[TESTE] Pedicure", price: 30, min: 50 },
  { category: "Unhas", name: "[TESTE] Pé e mão", price: 50, min: 80 },
  { category: "Sobrancelha", name: "[TESTE] Design de sobrancelha", price: 30, min: 30 },
  { category: "Maquiagem", name: "[TESTE] Maquiagem social", price: 120, min: 60 },
];

export const dunasSite = siteContentSchema.parse({
  ...EMPTY_SITE_CONTENT,
  brand: {
    displayName: DUNAS_NAME,
    tagline: "Salão de beleza em Pajuçara, Natal. Agende seu horário online.",
    logoUrl: "", // aguardando a logomarca do salão
    watermarkUrl: "",
    primaryColor: "#a0632f", // [TESTE] tom areia/caramelo até chegar a identidade visual
    segment: "Salão de Beleza",
    greetingName: "",
    visitWord: "visita",
    placeWord: "no",
  },
  about: {
    title: "Sobre o Salão Dunas",
    text: "Ambiente refrigerado e acolhedor em Pajuçara, com diversos serviços de beleza e atendimento de excelência, nota 4,8 no Google.\n\n[TESTE] Texto provisório; o salão vai revisar.",
  },
  contact: {
    whatsapp: "+5584988150309",
    whatsappMessage: "Oi, quero agendar um horário no Salão Dunas",
    instagram: "",
    email: "",
    address: "Av. Dr. João Medeiros Filho, 4051 - Pajuçara, Natal - RN, 59122-200",
    mapsUrl: MAPS,
    reviewUrl: MAPS,
    hoursText: "[TESTE] Segunda a sábado, das 8h às 18h (confirmar com o salão).",
  },
  faq: [
    { q: "Tem estacionamento?", a: "Temos duas vagas em frente ao salão." },
    { q: "Quais as formas de pagamento?", a: "Aceitamos cartão de crédito e débito." },
    { q: "O salão é climatizado?", a: "Sim, o ambiente é todo refrigerado." },
  ],
  payment: { methods: "Cartão de crédito e débito", depositPercent: 0 },
  policies: {},
  legal: {},
});

export async function applyDunas(prisma: PrismaClient, tenantId: string): Promise<boolean> {
  if (await prisma.auditLog.findFirst({ where: { tenantId, action: "seed.dunas", entityId: VERSION } })) return false;
  await prisma.$transaction(async (tx) => {
    await tx.siteContent.upsert({ where: { tenantId }, update: { data: dunasSite }, create: { tenantId, data: dunasSite } });
    await tx.tenant.update({ where: { id: tenantId }, data: { name: DUNAS_NAME } });

    let pros = await tx.professional.findMany({ where: { tenantId }, select: { id: true } });
    if (!pros.length) {
      for (const [i, name] of ["[TESTE] Profissional 1", "[TESTE] Profissional 2"].entries()) {
        const p = await tx.professional.create({ data: { tenantId, name, sortOrder: i } });
        // [TESTE] segunda a sábado, 8h às 18h
        await tx.workingHours.createMany({ data: [1, 2, 3, 4, 5, 6].map((weekday) => ({ tenantId, professionalId: p.id, weekday, startMin: 8 * 60, endMin: 18 * 60 })) });
      }
      pros = await tx.professional.findMany({ where: { tenantId }, select: { id: true } });
    }
    if (!(await tx.service.count({ where: { tenantId } }))) {
      for (const [i, s] of services.entries()) {
        const svc = await tx.service.create({
          data: { tenantId, name: s.name, category: s.category, description: NOTE, priceCents: s.price * 100, durationMin: s.min, bufferMin: 10, sortOrder: (i + 1) * 10 },
        });
        await tx.professionalService.createMany({ data: pros.map((p) => ({ tenantId, professionalId: p.id, serviceId: svc.id })) });
      }
    }
    await tx.auditLog.create({ data: { tenantId, action: "seed.dunas", entity: "SiteContent", entityId: VERSION, data: { services: services.length } } });
  });
  return true;
}
