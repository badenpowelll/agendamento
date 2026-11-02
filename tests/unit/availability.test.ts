import { describe, expect, it } from "vitest";
import { computeSlots } from "@/domain/availability";

const base = {
  date: "2026-11-12",
  timezone: "America/Fortaleza",
  windows: [{ startMin: 8 * 60, endMin: 12 * 60 }],
  busy: [],
  durationMin: 60,
  bufferMin: 0,
  stepMin: 60,
  now: new Date("2026-11-10T12:00:00Z"),
  minLeadMinutes: 0,
};
const hhmm = (d: Date) => d.toISOString().slice(11, 16);

describe("computeSlots", () => {
  it("gera horários dentro da janela respeitando a duração", () => {
    // 08,09,10,11 locais = 11,12,13,14 UTC
    expect(computeSlots(base).map(hhmm)).toEqual(["11:00", "12:00", "13:00", "14:00"]);
  });

  it("o preparo após o atendimento bloqueia o horário seguinte", () => {
    const busy = [{ start: new Date("2026-11-12T12:00:00Z"), end: new Date("2026-11-12T13:15:00Z") }];
    expect(computeSlots({ ...base, busy, stepMin: 15 }).map(hhmm)).not.toContain("13:00");
    expect(computeSlots({ ...base, busy, stepMin: 15 }).map(hhmm)).toContain("13:15");
  });

  it("um novo atendimento precisa caber com o próprio preparo antes da próxima reserva", () => {
    const busy = [{ start: new Date("2026-11-12T13:00:00Z"), end: new Date("2026-11-12T14:00:00Z") }];
    const slots = computeSlots({ ...base, busy, bufferMin: 15, stepMin: 15 }).map(hhmm);
    expect(slots).toContain("11:45");
    expect(slots).not.toContain("12:00"); // 12:00-13:00 + 15 min de preparo invade 13:00
  });

  it("não oferece horários no passado nem dentro da antecedência mínima", () => {
    const now = new Date("2026-11-12T11:30:00Z"); // 08:30 local
    expect(computeSlots({ ...base, now, minLeadMinutes: 60 }).map(hhmm)).toEqual(["13:00", "14:00"]);
  });

  it("respeita bloqueios e duas janelas no dia (pausa para almoço)", () => {
    const windows = [{ startMin: 8 * 60, endMin: 10 * 60 }, { startMin: 13 * 60, endMin: 15 * 60 }];
    const busy = [{ start: new Date("2026-11-12T11:00:00Z"), end: new Date("2026-11-12T12:00:00Z") }];
    expect(computeSlots({ ...base, windows, busy }).map(hhmm)).toEqual(["12:00", "16:00", "17:00"]);
  });

  it("sem janela de trabalho, sem horários", () => {
    expect(computeSlots({ ...base, windows: [] })).toEqual([]);
  });
});
