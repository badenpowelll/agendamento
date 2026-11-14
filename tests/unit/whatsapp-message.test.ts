import { describe, expect, it } from "vitest";
import { composeWhatsappMessage } from "@/lib/whatsapp-message";

describe("mensagem do WhatsApp com contexto", () => {
  it("com nome: diz quem é, o que quer e o serviço", () => {
    expect(composeWhatsappMessage({ name: " Ana  Souza ", reason: "agendar", service: "Virilha completa" })).toBe("Olá, Milly! Aqui quem fala é Ana Souza.\nGostaria de agendar Virilha completa.");
    expect(composeWhatsappMessage({ name: "Ana", reason: "info", note: "Grávida pode?" })).toBe("Olá, Milly! Aqui quem fala é Ana.\nGostaria de uma informação.\nGrávida pode?");
  });
  it("sem nome: mensagem genérica com o tipo de serviço", () => {
    expect(composeWhatsappMessage({ reason: "valor", service: "depilação" })).toBe("Olá, tudo bem?\nGostaria de saber o valor para depilação.");
    expect(composeWhatsappMessage({ name: "  ", reason: "valor" })).toBe("Olá, tudo bem?\nGostaria de saber o valor dos serviços.");
  });
  it("outro estabelecimento: saudação configurável", () => {
    expect(composeWhatsappMessage({ name: "Ana", reason: "agendar", service: "Escova", greetingName: "" })).toBe("Olá! Aqui quem fala é Ana.\nGostaria de agendar Escova.");
    expect(composeWhatsappMessage({ name: "Ana", reason: "valor", greetingName: "Dunas" })).toBe("Olá, Dunas! Aqui quem fala é Ana.\nGostaria de saber o valor dos serviços.");
  });
});
