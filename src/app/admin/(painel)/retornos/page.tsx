import Link from "next/link";
import { requireStaff } from "@/lib/staff-session";
import { env } from "@/lib/env";
import { getSite, whatsappLink } from "@/lib/site";
import { formatDate } from "@/lib/time";
import { formatPhoneBR } from "@/lib/phone";
import { NOTICE_DAYS_BEFORE, RETURN_DAYS, returnList, returnMessage, type ReturnItem } from "@/domain/returns";
import { Badge, Card, EmptyState, PageTitle } from "@/components/ui";
import { ReturnActions } from "@/components/return-actions";

export const metadata = { title: "Retornos" };
const DAY = 86_400_000;

export default async function Retornos() {
  const ctx = await requireStaff("STAFF");
  const [site, { due, soon }] = await Promise.all([getSite(), returnList(ctx.tenant.id)]);
  const tz = ctx.tenant.timezone;
  const now = Date.now();
  const bookingUrl = `${env.appUrl}/agendar`;
  const link = (r: ReturnItem) => (r.phone ? whatsappLink(r.phone, returnMessage(r.name.split(" ")[0], site.brand.displayName, bookingUrl, site.brand.visitWord, site.brand.placeWord)) : null);

  const row = (r: ReturnItem, showWhen: "due" | "soon") => {
    const daysSince = Math.floor((now - r.lastAt.getTime()) / DAY);
    const daysToNotice = Math.ceil((r.noticeAt.getTime() - now) / DAY);
    return (
      <li key={r.customerId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium">
            <Link href={`/admin/clientes/${r.customerId}`} className="hover:underline">{r.name}</Link>{" "}
            {r.contactedAt ? <Badge tone="good">Avisada em {formatDate(r.contactedAt, tz)}</Badge> : showWhen === "due" ? <Badge tone="brand">Avisar</Badge> : null}
          </p>
          <p className="text-sm text-muted">
            Último atendimento: {formatDate(r.lastAt, tz)} · {r.lastService} · há {daysSince} dias
          </p>
          <p className="text-sm text-muted">
            Retorno ideal: {formatDate(r.returnAt, tz)}
            {showWhen === "soon" && ` · avisar em ${daysToNotice} dia${daysToNotice === 1 ? "" : "s"} (${formatDate(r.noticeAt, tz)})`}
            {r.phone && ` · ${formatPhoneBR(r.phone)}`}
          </p>
          {!r.allowMarketing && r.phone && <p className="mt-1 text-xs text-amber-800">A cliente não marcou que aceita mensagens promocionais. Envie só se ela costuma falar com vocês pelo WhatsApp.</p>}
        </div>
        {showWhen === "due" && <ReturnActions id={r.customerId} href={link(r)} contacted={!!r.contactedAt} />}
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Retornos"
        subtitle={`Clientes que completam ${RETURN_DAYS} dias do último atendimento. Elas aparecem para aviso ${NOTICE_DAYS_BEFORE} dias antes, com a mensagem pronta para o WhatsApp.`}
      />
      <Card className="p-0">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="font-display text-xl">Avisar agora</h2>
          <span className="text-sm text-muted tabular-nums">{due.length}</span>
        </div>
        {due.length === 0 ? (
          <div className="p-5"><EmptyState>Nenhuma cliente para avisar hoje.</EmptyState></div>
        ) : (
          <ul className="mt-2 divide-y divide-line">{due.map((r) => row(r, "due"))}</ul>
        )}
      </Card>
      <Card className="p-0">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="font-display text-xl">Próximos 7 dias</h2>
          <span className="text-sm text-muted tabular-nums">{soon.length}</span>
        </div>
        {soon.length === 0 ? (
          <div className="p-5"><EmptyState>Nenhum retorno previsto para a próxima semana.</EmptyState></div>
        ) : (
          <ul className="mt-2 divide-y divide-line">{soon.map((r) => row(r, "soon"))}</ul>
        )}
      </Card>
      <p className="text-xs text-muted">
        Quem já tem horário marcado não aparece aqui. Mensagem enviada: “{returnMessage("Nome", site.brand.displayName, bookingUrl, site.brand.visitWord, site.brand.placeWord)}”
      </p>
    </div>
  );
}
