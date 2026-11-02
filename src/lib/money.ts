export function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return "Sob consulta";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "120,50" | "120.50" | "120" -> 12050 */
export function parseBRLToCents(input: string): number | null {
  const s = input.trim().replace(/[R$\s]/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) throw new Error("Valor inválido");
  return Math.round(n * 100);
}
