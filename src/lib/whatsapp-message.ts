export type WaReason = "agendar" | "valor" | "info";

export const WA_REASONS: { id: WaReason; label: string }[] = [
  { id: "valor", label: "Saber o valor" },
  { id: "agendar", label: "Agendar um horário" },
  { id: "info", label: "Tirar uma dúvida" },
];

/**
 * Monta a mensagem que chega no WhatsApp da Milly.
 * Com nome: "Olá, Milly! Aqui quem fala é Ana. Gostaria de agendar Virilha completa."
 * Sem nome (genérica): "Olá, tudo bem? Gostaria de saber o valor para depilação."
 */
export function composeWhatsappMessage(input: { name?: string; reason: WaReason; service?: string; note?: string }): string {
  const name = (input.name ?? "").trim().replace(/\s+/g, " ");
  const service = input.service?.trim();
  const what =
    input.reason === "agendar"
      ? `Gostaria de agendar ${service || "um horário"}.`
      : input.reason === "valor"
        ? `Gostaria de saber o valor ${service ? `para ${service}` : "dos serviços"}.`
        : `Gostaria de uma informação${service ? ` sobre ${service}` : ""}.`;
  const lines = [name ? `Olá, Milly! Aqui quem fala é ${name}.` : "Olá, tudo bem?", what];
  const note = input.note?.trim();
  if (note) lines.push(note);
  return lines.join("\n");
}
