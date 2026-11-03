import { NextResponse, type NextRequest } from "next/server";
import { getTenant } from "@/lib/context";
import { rateLimit } from "@/lib/rate-limit";
import { getSlotBoard } from "@/domain/booking";
import { DomainError } from "@/domain/errors";
import { formatTime } from "@/lib/time";

/** GET /api/availability?serviceId=...&professionalId=...&date=YYYY-MM-DD&ignore=... */
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`avail:${ip}`, 120, 60_000)) return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  const sp = req.nextUrl.searchParams;
  const serviceId = sp.get("serviceId") ?? "";
  const date = sp.get("date") ?? "";
  const professionalId = sp.get("professionalId") || null;
  const ignore = sp.get("ignore") || undefined;
  try {
    const tenant = await getTenant();
    const { available, taken } = await getSlotBoard(tenant.id, { serviceId, professionalId, date, ignoreAppointmentId: ignore });
    const slots = [
      ...available.map((s) => ({ startAt: s.startAt.toISOString(), label: formatTime(s.startAt, tenant.timezone), professionalIds: s.professionalIds, available: true })),
      // Horários ocupados aparecem desabilitados; não expõem quem reservou.
      ...taken.map((t) => ({ startAt: t.toISOString(), label: formatTime(t, tenant.timezone), professionalIds: [] as string[], available: false })),
    ].sort((a, b) => a.startAt.localeCompare(b.startAt));
    return NextResponse.json(
      { timezone: tenant.timezone, slots },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof DomainError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Erro ao consultar horários" }, { status: 500 });
  }
}
