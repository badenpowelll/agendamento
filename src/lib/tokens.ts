import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Tokens assinados (HMAC-SHA256) para links de ação enviados por mensagem,
 * ex.: "Confirmar presença". Não exigem login, valem só para uma reserva e expiram.
 */
export type TokenPurpose = "manage";

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString();

function sign(body: string) {
  return createHmac("sha256", env.secret).update(body).digest("base64url");
}

export function createActionToken(appointmentId: string, purpose: TokenPurpose, expiresAt: Date): string {
  const body = b64(`${appointmentId}.${purpose}.${Math.floor(expiresAt.getTime() / 1000)}`);
  return `${body}.${sign(body)}`;
}

export function verifyActionToken(token: string, now = new Date()): { appointmentId: string; purpose: TokenPurpose } | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [appointmentId, purpose, exp] = unb64(body).split(".");
  if (!appointmentId || purpose !== "manage" || !exp) return null;
  if (Number(exp) * 1000 < now.getTime()) return null;
  return { appointmentId, purpose };
}
