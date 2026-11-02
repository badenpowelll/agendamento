import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (pw: string, salt: Buffer, len: number, opts: ScryptOptions) =>
  new Promise<Buffer>((res, rej) => scryptCb(pw, salt, len, opts, (e, k) => (e ? rej(e) : res(k))));

const N = 16384, r = 8, p = 1, KEYLEN = 64;

/** Hash de senha com scrypt (salt aleatório). Formato: scrypt$N$r$p$salt$hash (base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, rr, pp, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length, { N: Number(n), r: Number(rr), p: Number(pp), maxmem: 64 * 1024 * 1024 });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Regras mínimas: 10+ caracteres, com letra e número. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "A senha precisa ter pelo menos 10 caracteres.";
  if (pw.length > 200) return "Senha longa demais.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "A senha precisa ter letras e números.";
  return null;
}

/** Senha provisória legível (sem caracteres ambíguos), para a gestora repassar à colaboradora. */
export function generateTempPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += alphabet[randomInt(alphabet.length)];
  return /\d/.test(out) ? out : out.slice(0, 11) + String(randomInt(2, 10) % 10);
}
