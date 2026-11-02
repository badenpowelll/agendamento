/** Normaliza telefone brasileiro para E.164 (+55DDNNNNNNNNN). Retorna null se inválido. */
export function normalizePhoneBR(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  return `+55${d}`;
}

export function formatPhoneBR(e164: string | null | undefined): string {
  if (!e164) return "";
  const d = e164.replace(/^\+55/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : e164;
}
