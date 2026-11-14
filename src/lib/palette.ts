/**
 * Tons claros do site derivados da cor principal. A cor padrão (rosa da Milly) mantém a
 * paleta original definida em globals.css; outras cores ganham tons claros na mesma família,
 * inclusive o "horário ocupado" da agenda, que usa esses tons.
 */
const DEFAULT_BRAND = "#e0457b";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mistura a cor com branco (amount = fração da cor, 0..1). */
function tint(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex).map((c) => Math.round(255 - (255 - c) * amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Mistura a cor com um quase-preto (amount = fração da cor). */
function shade(hex: string, amount: number, base: [number, number, number]): string {
  const [r, g, b] = hexToRgb(hex).map((c, i) => Math.round(base[i] + (c - base[i]) * amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function paletteVars(primary: string): Record<string, string> {
  if (!/^#[0-9a-fA-F]{6}$/.test(primary) || primary.toLowerCase() === DEFAULT_BRAND) return {};
  return {
    "--blush": tint(primary, 0.13),
    "--rose": tint(primary, 0.3),
    "--line": tint(primary, 0.17),
    "--cream": tint(primary, 0.04),
    "--ink": shade(primary, 0.15, [40, 32, 28]),
    "--muted": shade(primary, 0.35, [100, 92, 88]),
  };
}
