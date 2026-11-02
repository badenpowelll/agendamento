import { addMinutes, localDateMinutesToInstant } from "@/lib/time";

export interface Interval {
  start: Date;
  end: Date; // exclusivo
}

export interface SlotInput {
  date: string; // YYYY-MM-DD (local)
  timezone: string;
  /** Janelas de trabalho do dia, em minutos locais. */
  windows: { startMin: number; endMin: number }[];
  /** Intervalos ocupados: reservas ativas (até o fim do preparo) e bloqueios. */
  busy: Interval[];
  durationMin: number;
  bufferMin: number;
  stepMin: number;
  now: Date;
  minLeadMinutes: number;
}

export const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/**
 * Calcula os horários de início disponíveis para um serviço em um dia, para uma profissional.
 * Função pura: não acessa banco. A garantia final contra conflito é a restrição no PostgreSQL.
 */
export function computeSlots(input: SlotInput): Date[] {
  const { date, timezone, windows, busy, durationMin, bufferMin, stepMin, now, minLeadMinutes } = input;
  if (durationMin <= 0 || stepMin <= 0) return [];
  const earliest = addMinutes(now, minLeadMinutes);
  const result: Date[] = [];
  const seen = new Set<number>();

  for (const w of [...windows].sort((a, b) => a.startMin - b.startMin)) {
    for (let t = w.startMin; t + durationMin <= w.endMin; t += stepMin) {
      const start = localDateMinutesToInstant(date, t, timezone);
      if (start < earliest) continue;
      const block: Interval = { start, end: addMinutes(start, durationMin + bufferMin) };
      if (busy.some((b) => overlaps(block, b))) continue;
      if (!seen.has(start.getTime())) {
        seen.add(start.getTime());
        result.push(start);
      }
    }
  }
  return result.sort((a, b) => a.getTime() - b.getTime());
}
