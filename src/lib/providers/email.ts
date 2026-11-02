import { env } from "../env";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}

export class ProviderError extends Error {
  constructor(message: string, public retryable = true) {
    super(message);
  }
}

/** Envia e-mail. Em desenvolvimento ("console") apenas registra no log. */
export async function sendEmail(msg: EmailMessage): Promise<{ providerId: string }> {
  if (env.emailProvider === "console") {
    console.info(`[email:console] para=${msg.to} assunto="${msg.subject}"\n${msg.text}`);
    return { providerId: "console" };
  }
  if (!env.resendApiKey) throw new ProviderError("RESEND_API_KEY não configurada", false);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
      // Evita e-mail duplicado se o worker repetir após uma falha de rede
      "Idempotency-Key": msg.idempotencyKey,
    },
    body: JSON.stringify({ from: env.emailFrom, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ProviderError(`Resend ${res.status}: ${body.slice(0, 300)}`, res.status >= 500 || res.status === 429);
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { providerId: data.id ?? "resend" };
}
