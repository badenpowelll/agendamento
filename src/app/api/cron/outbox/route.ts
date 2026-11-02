import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { processOutbox } from "@/domain/outbox";

/** Processa a fila de mensagens. Chamado pelo cron do Railway: Authorization: Bearer $CRON_SECRET. */
export async function POST(req: NextRequest) {
  const expected = env.cronSecret;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await processOutbox();
  return NextResponse.json(result);
}
