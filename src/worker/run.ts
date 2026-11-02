/* Worker da fila de mensagens. Uso: `npm run worker` (loop) ou `npm run worker -- --once`. */
import { processOutbox } from "@/domain/outbox";
import { prisma } from "@/lib/db";

const once = process.argv.includes("--once");
const intervalMs = Number(process.env.WORKER_INTERVAL_MS ?? 30_000);
let stopping = false;
process.on("SIGTERM", () => (stopping = true));
process.on("SIGINT", () => (stopping = true));

async function main() {
  do {
    try {
      const r = await processOutbox();
      if (r.claimed) console.info(`[worker] ${JSON.stringify(r)}`);
    } catch (e) {
      console.error("[worker] erro", e);
    }
    if (once) break;
    await new Promise((r) => setTimeout(r, intervalMs));
  } while (!stopping);
  await prisma.$disconnect();
}
main();
