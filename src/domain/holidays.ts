import { forTenant, type TenantDb, type TenantTx } from "@/lib/tenant-db";
import { parseSiteContent, type SiteContent } from "@/lib/site-content";
import { holidaysBetween } from "@/lib/holidays";

export interface DayHoliday {
  date: string;
  name: string;
  /** true = a agenda online fica fechada neste dia. */
  closed: boolean;
}

export type HolidayRule = SiteContent["holidays"];

export async function loadHolidayRule(tenantId: string, db: TenantDb | TenantTx = forTenant(tenantId)): Promise<HolidayRule> {
  return parseSiteContent((await db.siteContent.findFirst())?.data).holidays;
}

export const isClosed = (rule: HolidayRule, date: string) => rule.closeNational && !rule.openDates.includes(date);

/** Feriados nacionais no período (inclusive), com a regra do estabelecimento aplicada. */
export async function holidaysInRange(tenantId: string, from: string, to: string, db: TenantDb | TenantTx = forTenant(tenantId)): Promise<Map<string, DayHoliday>> {
  const [rule, list] = await Promise.all([loadHolidayRule(tenantId, db), holidaysBetween(from, to)]);
  const out = new Map<string, DayHoliday>();
  for (const [date, name] of list) out.set(date, { date, name, closed: isClosed(rule, date) });
  return out;
}

/** Nome do feriado se a agenda estiver fechada nesse dia; senão null. */
export async function closedHolidayOn(tenantId: string, date: string, db: TenantDb | TenantTx = forTenant(tenantId)): Promise<string | null> {
  const h = (await holidaysInRange(tenantId, date, date, db)).get(date);
  return h?.closed ? h.name : null;
}
