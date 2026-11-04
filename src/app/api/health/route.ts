import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Verificação de saúde para monitoramento externo (ex.: UptimeRobot): 200 = site e banco respondendo. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "ok", at: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, db: "erro" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
