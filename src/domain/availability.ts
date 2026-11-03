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
 * Grade do dia: todos os inícios possíveis dentro do expediente (a partir da antecedência mínima),
 * marcando se estão livres ou ocupados por reserva/bloqueio. Função pura: não acessa banco.
 */
export function computeSlotGrid(input: SlotInput): { start: Date; free: boolean }[] {
  const { date, timezone, windows, busy, durationMin, bufferMin, stepMin, now, minLeadMinutes } = input;
  if (durationMin <= 0 || stepMin <= 0) return [];
  const earliest = addMinutes(now, minLeadMinutes);
  const byTime = new Map<number, boolean>();

  for (const w of [...windows].sort((a, b) => a.startMin - b.startMin)) {
    for (let t = w.startMin; t + durationMin <= w.endMin; t += stepMin) {
      const start = localDateMinutesToInstant(date, t, timezone);
      if (start < earliest) continue;
      const block: Interval = { start, end: addMinutes(start, durationMin + bufferMin) };
      const free = !busy.some((b) => overlaps(block, b));
      byTime.set(start.getTime(), (byTime.get(start.getTime()) ?? false) || free);
    }
  }
  return [...byTime.entries()].sort(([a], [b]) => a - b).map(([t, free]) => ({ start: new Date(t), free }));
}

/**
 * Calcula os horários de início disponíveis para um serviço em um dia, para uma profissional.
 * A garantia final contra conflito é a restrição no PostgreSQL.
 */
export function computeSlots(input: SlotInput): Date[] {
  return computeSlotGrid(input).filter((g) => g.free).map((g) => g.start);
}
