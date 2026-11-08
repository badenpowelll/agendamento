/**
 * Consulta de CEP (BrasilAPI: GET /api/cep/v2/{cep}).
 * Só usamos o endereço (rua, bairro, cidade, UF); coordenadas não são guardadas.
 */

export interface CepAddress {
  cep: string; // 8 dígitos
  street: string;
  neighborhood: string;
  city: string;
  state: string; // UF
}

export class CepUnavailableError extends Error {}

const API = "https://brasilapi.com.br/api/cep/v2";
const TIMEOUT_MS = 4000;
const MAX_CACHE = 500;
const cache = new Map<string, { at: number; value: CepAddress | null }>();

export const normalizeCep = (v: string) => {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length === 8 ? d : null;
};

export const formatCep = (v: string | null | undefined) => {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : (v ?? "");
};

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function parseCep(data: unknown, cep: string): CepAddress | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const state = s(d.state, 2).toUpperCase();
  const city = s(d.city, 80);
  if (!city || !/^[A-Z]{2}$/.test(state)) return null;
  return { cep, street: s(d.street, 120), neighborhood: s(d.neighborhood, 80), city, state };
}

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** Endereço do CEP; null se o CEP não existir; CepUnavailableError se a BrasilAPI não responder. */
export async function lookupCep(input: string, opts: { fetcher?: Fetcher; now?: number } = {}): Promise<CepAddress | null> {
  const cep = normalizeCep(input);
  if (!cep) return null;
  const now = opts.now ?? Date.now();
  const hit = cache.get(cep);
  if (hit && now - hit.at < (hit.value ? 7 * 86400_000 : 3600_000)) return hit.value;

  let r: Response;
  try {
    r = await (opts.fetcher ?? fetch)(`${API}/${cep}`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch (e) {
    throw new CepUnavailableError(e instanceof Error ? e.message : "falha de rede");
  }
  if (r.status === 404 || r.status === 400) {
    remember(cep, now, null);
    return null;
  }
  if (!r.ok) throw new CepUnavailableError(`BrasilAPI ${r.status}`);
  const value = parseCep(await r.json().catch(() => null), cep);
  remember(cep, now, value);
  return value;
}

function remember(cep: string, at: number, value: CepAddress | null) {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
  cache.set(cep, { at, value });
}

export function clearCepCache() {
  cache.clear();
}
