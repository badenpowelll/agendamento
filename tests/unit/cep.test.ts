import { afterEach, describe, expect, it, vi } from "vitest";
import { CepUnavailableError, clearCepCache, formatCep, lookupCep, normalizeCep } from "@/lib/cep";

const sample = {
  cep: "89010025", state: "SC", city: "Blumenau", neighborhood: "Centro", street: "Rua Doutor Luiz de Freitas Melro",
  location: { type: "Point", coordinates: { longitude: "-49.0629788", latitude: "-26.9244749" } },
};

describe("CEP", () => {
  afterEach(() => clearCepCache());

  it("normaliza e formata", () => {
    expect(normalizeCep("89010-025")).toBe("89010025");
    expect(normalizeCep("8901")).toBeNull();
    expect(formatCep("89010025")).toBe("89010-025");
  });

  it("devolve só o endereço e guarda em cache", async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response(JSON.stringify(sample), { status: 200 })));
    const a = await lookupCep("89010-025", { fetcher });
    expect(a).toEqual({ cep: "89010025", street: "Rua Doutor Luiz de Freitas Melro", neighborhood: "Centro", city: "Blumenau", state: "SC" });
    await lookupCep("89010025", { fetcher });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]).toEqual(["https://brasilapi.com.br/api/cep/v2/89010025", expect.any(Object)]);
  });

  it("CEP inexistente devolve null; API fora do ar avisa", async () => {
    expect(await lookupCep("00000000", { fetcher: () => Promise.resolve(new Response("{}", { status: 404 })) })).toBeNull();
    await expect(lookupCep("11111111", { fetcher: () => Promise.reject(new Error("rede")) })).rejects.toBeInstanceOf(CepUnavailableError);
    await expect(lookupCep("22222222", { fetcher: () => Promise.resolve(new Response("", { status: 500 })) })).rejects.toBeInstanceOf(CepUnavailableError);
  });
});
