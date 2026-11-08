import { afterEach, describe, expect, it, vi } from "vitest";
import { clearHolidayCache, easterSunday, localNationalHolidays, nationalHolidays, parseHolidays } from "@/lib/holidays";

const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

describe("feriados nacionais", () => {
  afterEach(() => clearHolidayCache());

  it("calcula a Páscoa e os feriados móveis", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
    const l = localNationalHolidays(2026);
    expect(l.find((h) => h.name === "Sexta-feira Santa")?.date).toBe("2026-04-03");
    expect(l.find((h) => h.name === "Carnaval")?.date).toBe("2026-02-17");
    expect(l.find((h) => h.name === "Corpus Christi")?.date).toBe("2026-06-04");
    expect(l.some((h) => h.date === "2026-11-20")).toBe(true);
    expect(l[0]).toEqual({ date: "2026-01-01", name: "Confraternização mundial", type: "national" });
  });

  it("aceita o formato da BrasilAPI e descarta itens inválidos", () => {
    const r = parseHolidays([{ date: "2021-01-01", name: "Confraternização mundial", type: "national" }, { date: "x", name: 1 }, { date: "2020-12-25", name: "Natal" }], 2021);
    expect(r).toEqual([{ date: "2021-01-01", name: "Confraternização mundial", type: "national" }]);
    expect(parseHolidays({ message: "erro" }, 2021)).toBeNull();
  });

  it("usa a BrasilAPI e guarda por ano", async () => {
    const fetcher = vi.fn(() => ok([{ date: "2021-01-01", name: "Confraternização mundial", type: "national" }]));
    const a = await nationalHolidays(2021, { fetcher, now: 1000 });
    const b = await nationalHolidays(2021, { fetcher, now: 2000 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]).toEqual(["https://brasilapi.com.br/api/feriados/v1/2021", expect.any(Object)]);
  });

  it("se a API cair, usa o cálculo local e tenta de novo depois", async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error("timeout")));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const list = await nationalHolidays(2026, { fetcher, now: 0 });
    expect(list).toEqual(localNationalHolidays(2026));
    await nationalHolidays(2026, { fetcher, now: 60_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await nationalHolidays(2026, { fetcher, now: 11 * 60_000 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
