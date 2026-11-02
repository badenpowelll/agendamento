import { env } from "../env";
import { ProviderError } from "./email";

export interface WhatsappTemplateMessage {
  to: string; // E.164 sem "+"
  template: string; // nome do modelo aprovado na Meta
  params: string[]; // variáveis do corpo, na ordem {{1}}, {{2}}...
}

/**
 * WhatsApp Business Platform (Cloud API oficial da Meta).
 * Fica desligado até WHATSAPP_ENABLED=true e os modelos serem aprovados.
 */
export async function sendWhatsappTemplate(msg: WhatsappTemplateMessage): Promise<{ providerId: string }> {
  if (!env.whatsappEnabled) throw new ProviderError("Canal WhatsApp desativado", false);
  if (!env.whatsappToken || !env.whatsappPhoneNumberId) throw new ProviderError("WhatsApp não configurado", false);
  const res = await fetch(`https://graph.facebook.com/v21.0/${env.whatsappPhoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.whatsappToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: msg.to.replace(/^\+/, ""),
      type: "template",
      template: {
        name: msg.template,
        language: { code: env.whatsappTemplateLang },
        components: [{ type: "body", parameters: msg.params.map((text) => ({ type: "text", text })) }],
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ProviderError(`WhatsApp ${res.status}: ${body.slice(0, 300)}`, res.status >= 500 || res.status === 429);
  }
  const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[] };
  return { providerId: data.messages?.[0]?.id ?? "whatsapp" };
}
