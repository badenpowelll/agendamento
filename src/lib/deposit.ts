import type { SiteContent } from "./site-content";

/** Sinal exigido para garantir o horário (configurado no painel, em Site > Pagamento). */
export function depositRequired(site: SiteContent): boolean {
  return site.payment.depositPercent > 0 && site.payment.pixKey.trim().length > 0;
}

/** Valor do sinal em centavos, arredondado para cima no centavo. null quando o serviço não tem preço. */
export function depositCents(priceCents: number | null | undefined, percent: number): number | null {
  if (priceCents == null || percent <= 0) return null;
  return Math.ceil((priceCents * percent) / 100);
}

/** Linhas de texto com as instruções do Pix, usadas na mensagem de confirmação. */
export function depositLines(site: SiteContent, priceCents: number | null | undefined, fmt: (c: number | null) => string): string[] {
  if (!depositRequired(site)) return [];
  const p = site.payment;
  const value = depositCents(priceCents, p.depositPercent);
  return [
    `Sinal de ${p.depositPercent}%${value != null ? `: ${fmt(value)}` : ""}, a pagar em até ${p.depositHours}h.`,
    `Pix: ${p.pixKey}${p.pixName ? ` (${p.pixName})` : ""}`,
    ...(p.methods ? [`Formas de pagamento: ${p.methods}`] : []),
    "Seu horário será confirmado somente após o pagamento do sinal.",
  ];
}
