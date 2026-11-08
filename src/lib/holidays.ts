/**
 * Feriados nacionais (BrasilAPI: GET /api/feriados/v1/{ano}).
 *
 * - Resultado guardado em memória por ano (24 h), então a agenda não consulta a API a cada clique.
 * - Se a BrasilAPI estiver fora do ar ou lenta, usa o cálculo local (datas fixas + Páscoa),
 *   e tenta a API de novo em 10 minutos. A agenda nunca quebra por causa disso.
 */

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  type: string; // "national" na BrasilAPI
}

const API = "https://brasilapi.com.br/api/feriados/v1";
const TTL_OK = 24 * 3600_000;
const TTL_FALLBACK = 10 * 60_000;
const TIMEOUT_MS = 3000;

const cache = new Map<number, { at: number; ttl: number; list: Holiday[] }>();

const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);

/** Domingo de Páscoa (algoritmo de Meeus/Butcher). */
export function easterSunday(year: number): string {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(year, month, day);
}

const shift = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return iso(y, m, d + days);
};

/** Cálculo local, no mesmo formato da BrasilAPI. Usado quando a API não responde. */
export function localNationalHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  const list: Holiday[] = [
    { date: iso(year, 1, 1), name: "Confraternização mundial", type: "national" },
    { date: shift(easter, -47), name: "Carnaval", type: "national" },
    { date: shift(easter, -2), name: "Sexta-feira Santa", type: "national" },
    { date: easter, name: "Páscoa", type: "national" },
    { date: iso(year, 4, 21), name: "Tiradentes", type: "national" },
    { date: iso(year, 5, 1), name: "Dia do trabalho", type: "national" },
    { date: shift(easter, 60), name: "Corpus Christi", type: "national" },
    { date: iso(year, 9, 7), name: "Independência do Brasil", type: "national" },
    { date: iso(year, 10, 12), name: "Nossa Senhora Aparecida", type: "national" },
    { date: iso(year, 11, 2), name: "Finados", type: "national" },
    { date: iso(year, 11, 15), name: "Proclamação da República", type: "national" },
    ...(year >= 2024 ? [{ date: iso(year, 11, 20), name: "Dia da consciência negra", type: "national" }] : []),
    { date: iso(year, 12, 25), name: "Natal", type: "national" },
  ];
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/** Valida e normaliza a resposta da API; descarta itens fora do padrão. */
export function parseHolidays(data: unknown, year: number): Holiday[] | null {
  if (!Array.isArray(data)) return null;
  const list = data
    .filter((h): h is Holiday => !!h && typeof h.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h.date) && typeof h.name === "string")
    .filter((h) => h.date.startsWith(`${year}-`))
    .map((h) => ({ date: h.date, name: h.name.trim().slice(0, 80), type: typeof h.type === "string" ? h.type : "national" }));
  return list.length ? list.sort((a, b) => a.date.localeCompare(b.date)) : null;
}

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export async function nationalHolidays(year: number, opts: { fetcher?: Fetcher; now?: number } = {}): Promise<Holiday[]> {
  if (!Number.isInteger(year) || year < 1900 || year > 2199) return [];
  const now = opts.now ?? Date.now();
  const hit = cache.get(year);
  if (hit && now - hit.at < hit.ttl) return hit.list;

  // Testes automatizados não dependem de rede
  if (!opts.fetcher && (process.env.VITEST || process.env.HOLIDAYS_OFFLINE === "1")) {
    const list = localNationalHolidays(year);
    cache.set(year, { at: now, ttl: TTL_OK, list });
    return list;
  }

  try {
    const r = await (opts.fetcher ?? fetch)(`${API}/${year}`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!r.ok) throw new Error(`BrasilAPI ${r.status}`);
    const list = parseHolidays(await r.json(), year);
    if (!list) throw new Error("BrasilAPI: resposta inesperada");
    cache.set(year, { at: now, ttl: TTL_OK, list });
    return list;
  } catch (e) {
    console.warn(`[feriados] usando cálculo local para ${year}:`, e instanceof Error ? e.message : e);
    const list = hit?.list ?? localNationalHolidays(year);
    cache.set(year, { at: now, ttl: TTL_FALLBACK, list });
    return list;
  }
}

/** Feriados entre duas datas (inclusive), como mapa data → nome. */
export async function holidaysBetween(from: string, to: string): Promise<Map<string, string>> {
  const y1 = Number(from.slice(0, 4)), y2 = Number(to.slice(0, 4));
  const out = new Map<string, string>();
  for (let y = y1; y <= y2; y++) {
    for (const h of await nationalHolidays(y)) if (h.date >= from && h.date <= to) out.set(h.date, h.name);
  }
  return out;
}

export async function holidayOn(date: string): Promise<string | null> {
  return (await holidaysBetween(date, date)).get(date) ?? null;
}

/** Só para testes. */
export function clearHolidayCache() {
  cache.clear();
}
