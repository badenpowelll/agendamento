import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/staff-session";
import { forTenant } from "@/lib/tenant-db";
import { formatDateTime } from "@/lib/time";
import { formatBRL } from "@/lib/money";
import { formatPhoneBR } from "@/lib/phone";
import { formatCep } from "@/lib/cep";
import { STATUS_LABEL } from "@/domain/appointment-state";
import { Badge, Card, PageTitle } from "@/components/ui";
import { VerifyPhoneButton } from "@/components/verify-phone-button";

const CONSENT_LABEL = { TERMS: "Termos", PRIVACY: "Privacidade", TRANSACTIONAL_EMAIL: "Avisos por e-mail", TRANSACTIONAL_WHATSAPP: "Avisos por WhatsApp", MARKETING: "Promoções" } as const;

export default async function Cliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireStaff();
  const db = forTenant(ctx.tenant.id);
  const c = await db.customer.findFirst({ where: { id }, include: { appointments: { orderBy: { startAt: "desc" }, take: 50 }, consents: { orderBy: { createdAt: "desc" }, take: 30 } } });
  if (!c) notFound();
  const tz = ctx.tenant.timezone;
  const completed = c.appointments.filter((a) => a.status === "COMPLETED");
  return (
    <div className="space-y-6">
      <PageTitle title={c.name} subtitle={[c.email, formatPhoneBR(c.phone)].filter(Boolean).join(" · ")} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><p className="text-sm text-muted">Atendimentos concluídos</p><p className="text-2xl font-semibold">{completed.length}</p></Card>
        <Card><p className="text-sm text-muted">Última visita</p><p className="text-lg font-semibold">{completed[0] ? formatDateTime(completed[0].startAt, tz, { dateStyle: "short", timeStyle: undefined }) : "—"}</p></Card>
        <Card><p className="text-sm text-muted">Faltas</p><p className="text-2xl font-semibold">{c.appointments.filter((a) => a.status === "NO_SHOW").length}</p></Card>
      </div>
      {(c.addressCep || c.addressStreet || c.addressCity) && (
        <Card className="space-y-1 text-sm">
          <h2 className="font-display text-lg">Endereço</h2>
          <p>{[[c.addressStreet, c.addressNumber].filter(Boolean).join(", "), c.addressComplement, c.addressDistrict, [c.addressCity, c.addressState].filter(Boolean).join(" - "), c.addressCep && `CEP ${formatCep(c.addressCep)}`].filter(Boolean).join(" · ")}</p>
        </Card>
      )}
      <Card className="space-y-2 text-sm">
        <h2 className="font-display text-lg">WhatsApp</h2>
        <p>{c.phoneVerifiedAt ? <Badge tone="good">Número verificado</Badge> : <Badge tone="warn">Número não verificado</Badge>} {c.allowWhatsapp ? "Aceita avisos por WhatsApp." : "Não aceita avisos por WhatsApp."}</p>
        {!c.phoneVerifiedAt && c.phone && <VerifyPhoneButton id={c.id} />}
        <p className="text-xs text-muted">Avisos automáticos por WhatsApp só são enviados para números verificados. A verificação automática por código chega junto com a ativação do WhatsApp oficial.</p>
      </Card>
      <Card className="p-0">
        <h2 className="px-5 pt-4 font-display text-lg">Histórico</h2>
        <div className="divide-y divide-line">
          {c.appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span>{formatDateTime(a.startAt, tz, { dateStyle: "short" })} · {a.serviceName} · {formatBRL(a.priceCents)}</span>
              <Badge>{STATUS_LABEL[a.status]}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card className="text-sm">
        <h2 className="mb-2 font-display text-lg">Consentimentos (LGPD)</h2>
        <ul className="space-y-1">{c.consents.map((x) => <li key={x.id}>{formatDateTime(x.createdAt, tz, { dateStyle: "short" })} · {CONSENT_LABEL[x.kind]}: {x.granted ? "sim" : "não"} (versão {x.version}, {x.source})</li>)}</ul>
      </Card>
    </div>
  );
}
