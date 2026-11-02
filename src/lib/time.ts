import { TZDate } from "@date-fns/tz";

/** "YYYY-MM-DD" válido? */
export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Instante (UTC) correspondente a `minutes` minutos após a meia-noite local de `date` no fuso `tz`. */
export function localDateMinutesToInstant(date: string, minutes: number, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(new TZDate(y, m - 1, d, Math.floor(minutes / 60), minutes % 60, 0, tz).getTime());
}

/** Dia da semana (0 = domingo) de uma data local. */
export function weekdayOf(date: string, tz: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new TZDate(y, m - 1, d, 12, 0, 0, tz).getDay();
}

/** Início e fim (exclusivo) do dia local em UTC. */
export function dayRange(date: string, tz: string): { start: Date; end: Date } {
  return { start: localDateMinutesToInstant(date, 0, tz), end: localDateMinutesToInstant(addDays(date, 1), 0, tz) };
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Data local "YYYY-MM-DD" de um instante. */
export function toLocalDate(instant: Date, tz: string): string {
  const t = new TZDate(instant.getTime(), tz);
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${mm}-${dd}`;
}

export function formatDateTime(instant: Date, tz: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, dateStyle: "full", timeStyle: "short", ...opts }).format(instant);
}

export function formatTime(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(instant);
}

export function formatDate(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "short", day: "2-digit", month: "2-digit" }).format(instant);
}

export function minutesToHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function hhmmToMinutes(s: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) throw new Error("Horário inválido");
  const v = Number(m[1]) * 60 + Number(m[2]);
  if (v < 0 || v > 1440) throw new Error("Horário inválido");
  return v;
}

export const addMinutes = (d: Date, min: number) => new Date(d.getTime() + min * 60_000);
