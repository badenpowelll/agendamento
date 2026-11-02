import { describe, expect, it } from "vitest";
import { generateTempPassword, hashPassword, passwordProblem, verifyPassword } from "@/lib/password";

describe("senhas da equipe", () => {
  it("hash com salt e verificação", async () => {
    const h1 = await hashPassword("SenhaForte123");
    const h2 = await hashPassword("SenhaForte123");
    expect(h1).not.toBe(h2);
    expect(h1).not.toContain("SenhaForte123");
    expect(await verifyPassword("SenhaForte123", h1)).toBe(true);
    expect(await verifyPassword("senhaforte123", h1)).toBe(false);
  });
  it("regras mínimas", () => {
    expect(passwordProblem("curta1")).toBeTruthy();
    expect(passwordProblem("semnumeroaqui")).toBeTruthy();
    expect(passwordProblem("boaSenha2026")).toBeNull();
  });
  it("senha provisória atende às regras", () => {
    for (let i = 0; i < 50; i++) expect(passwordProblem(generateTempPassword())).toBeNull();
  });
});
