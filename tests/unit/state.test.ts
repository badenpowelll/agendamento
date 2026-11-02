import { describe, expect, it } from "vitest";
import { canTransition } from "@/domain/appointment-state";

describe("máquina de estados", () => {
  it("cliente pode reconfirmar e cancelar, mas não marcar como concluído", () => {
    expect(canTransition("CONFIRMED", "RECONFIRMED", "CUSTOMER")).toBe(true);
    expect(canTransition("CONFIRMED", "CANCELLED", "CUSTOMER")).toBe(true);
    expect(canTransition("CONFIRMED", "COMPLETED", "CUSTOMER")).toBe(false);
    expect(canTransition("CONFIRMED", "NO_SHOW", "CUSTOMER")).toBe(false);
  });
  it("equipe segue o fluxo do atendimento", () => {
    expect(canTransition("RECONFIRMED", "CHECKED_IN", "STAFF")).toBe(true);
    expect(canTransition("CHECKED_IN", "IN_SERVICE", "STAFF")).toBe(true);
    expect(canTransition("IN_SERVICE", "COMPLETED", "STAFF")).toBe(true);
    expect(canTransition("COMPLETED", "CANCELLED", "STAFF")).toBe(false);
  });
  it("o sistema nunca cancela nem marca falta sozinho", () => {
    expect(canTransition("CONFIRMED", "CANCELLED", "SYSTEM")).toBe(false);
    expect(canTransition("CONFIRMED", "NO_SHOW", "SYSTEM")).toBe(false);
  });
});
