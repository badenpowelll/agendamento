import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { CepUnavailableError, lookupCep, normalizeCep } from "@/lib/cep";

/** GET /api/cep/59600000 → { cep, street, neighborhood, city, state } */
export async function GET(req: NextRequest, { params }: { params: Promise<{ cep: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`cep:${ip}`, 30, 60_000)) return NextResponse.json({ error: "Muitas consultas. Aguarde um minuto." }, { status: 429 });
  const cep = normalizeCep((await params).cep);
  if (!cep) return NextResponse.json({ error: "CEP precisa ter 8 números." }, { status: 400 });
  try {
    const address = await lookupCep(cep);
    if (!address) return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 });
    return NextResponse.json(address, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch (e) {
    if (e instanceof CepUnavailableError) {
      console.warn("[cep]", e.message);
      return NextResponse.json({ error: "Consulta de CEP indisponível agora. Preencha o endereço manualmente." }, { status: 503 });
    }
    console.error(e);
    return NextResponse.json({ error: "Erro ao consultar o CEP." }, { status: 500 });
  }
}
