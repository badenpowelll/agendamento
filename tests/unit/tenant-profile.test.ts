import { describe, expect, it } from "vitest";
import { dunasSite } from "../../prisma/apply-dunas";
import { paletteVars } from "@/lib/palette";
import { returnMessage } from "@/domain/returns";
import { parseSiteContent } from "@/lib/site-content";

describe("perfil do Salão Dunas", () => {
  it("não herda nada da Milly", () => {
    const json = JSON.stringify(dunasSite).toLowerCase();
    expect(json).not.toContain("milly");
    expect(json).not.toContain("depila");
    expect(json).not.toContain("99927");
    expect(dunasSite.contact.whatsapp).toBe("+5584988150309");
    expect(dunasSite.brand.segment).toBe("Salão de Beleza");
  });
  it("conteúdo antigo da Milly continua com os padrões dela", () => {
    const s = parseSiteContent({ brand: { displayName: "Milly Rodrigues", tagline: "", logoUrl: "/marca/logo-milly.png", watermarkUrl: "", primaryColor: "#e0457b" } });
    expect(s.brand.segment).toBe("Epilação e Estética");
    expect(s.brand.greetingName).toBe("Milly");
    expect(paletteVars("#e0457b")).toEqual({});
  });
  it("outra cor gera tons claros próprios", () => {
    const v = paletteVars("#a0632f");
    expect(v["--blush"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(v["--cream"]).not.toBe("#fff7fa");
  });
  it("lembrete de retorno usa a palavra do estabelecimento", () => {
    expect(returnMessage("Ana", "Salão Dunas", "https://x", "visita", "no")).toContain("sua próxima visita aqui no Salão Dunas");
    expect(returnMessage("Ana", "Milly", "https://x")).toContain("próxima depilação");
  });
});
