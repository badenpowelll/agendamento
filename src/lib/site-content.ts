import { z } from "zod";

/**
 * Conteúdo editável do site. Nada aqui é preenchido com dados inventados:
 * campos vazios simplesmente não aparecem no site público.
 */
export const siteContentSchema = z.object({
  brand: z.object({
    displayName: z.string().max(80).default("Milly Rodrigues"),
    tagline: z.string().max(160).default(""),
    logoUrl: z.string().max(500).default("/marca/logo-milly.png"), // logomarca oficial (enviada pelo Baden em 05/11/2026)
    watermarkUrl: z.string().max(500).default("/marca/marca-dagua.png"), // foto clarinha ao fundo de todas as páginas
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#e0457b"),
    segment: z.string().max(60).default("Epilação e Estética"), // linha abaixo do nome (ex.: Salão de Beleza)
    greetingName: z.string().max(40).default("Milly"), // "Olá, Milly!" na mensagem do WhatsApp; vazio = "Olá!"
    visitWord: z.string().max(40).default("depilação"), // "sua próxima ___" no lembrete de retorno
    placeWord: z.enum(["na", "no"]).default("na"), // "aqui ___ Milly Rodrigues" / "aqui no Salão Dunas"
  }),
  about: z.object({
    title: z.string().max(120).default(""),
    text: z.string().max(4000).default(""),
  }),
  contact: z.object({
    whatsapp: z.string().max(30).default("+5584999279661"), // E.164 (informado pelo Baden em 02/11/2026)
    whatsappMessage: z.string().max(200).default("Oi, quero agendar minha depilação"),
    instagram: z.string().max(200).default("https://www.instagram.com/depilacao_millyrodrigues"),
    email: z.string().max(200).default(""),
    address: z.string().max(300).default(""),
    mapsUrl: z.string().max(500).default(""),
    reviewUrl: z.string().max(500).default("https://maps.app.goo.gl/j1bhVY3aXQt1VmbUA"), // perfil no Google para avaliações (enviado pelo Baden em 05/11/2026)
    hoursText: z.string().max(500).default(""),
  }),
  gallery: z
    .array(z.object({ url: z.string().max(500), alt: z.string().max(200), authorized: z.boolean() }))
    .max(30)
    .default([]),
  testimonials: z
    .array(z.object({ author: z.string().max(80), text: z.string().max(600), authorized: z.boolean() }))
    .max(30)
    .default([]),
  faq: z.array(z.object({ q: z.string().max(200), a: z.string().max(1500) })).max(40).default([]),
  policies: z.object({
    cancellation: z.string().max(4000).default(""),
    privacy: z.string().max(20000).default(""),
    terms: z.string().max(20000).default(""),
    version: z.string().max(20).default("1"),
  }),
  payment: z
    .object({
      pixKey: z.string().max(120).default(""),
      pixName: z.string().max(120).default(""), // nome que aparece no app do banco ao pagar
      depositPercent: z.coerce.number().int().min(0).max(100).default(0), // 0 = sem sinal
      depositHours: z.coerce.number().int().min(1).max(168).default(24), // prazo para pagar o sinal
      methods: z.string().max(300).default(""), // ex.: Pix, débito e crédito (crédito com taxa da maquininha)
      note: z.string().max(1000).default(""),
    })
    .prefault({}),
  legal: z.object({
    companyName: z.string().max(200).default(""),
    document: z.string().max(30).default(""), // CNPJ
  }),
});

export type SiteContent = z.infer<typeof siteContentSchema>;

export const EMPTY_SITE_CONTENT: SiteContent = siteContentSchema.parse({
  brand: {},
  about: {},
  contact: {},
  policies: {},
  payment: {},
  legal: {},
});

export function parseSiteContent(data: unknown): SiteContent {
  const merged = { ...EMPTY_SITE_CONTENT, ...(typeof data === "object" && data ? data : {}) };
  const r = siteContentSchema.safeParse(merged);
  return r.success ? r.data : EMPTY_SITE_CONTENT;
}
