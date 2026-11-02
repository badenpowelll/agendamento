import { notFound } from "next/navigation";
import { getTenant } from "@/lib/context";
import { forTenant } from "@/lib/tenant-db";
import { verifyActionToken } from "@/lib/tokens";
import { formatDateTime } from "@/lib/time";
import { getSite } from "@/lib/site";
import { STATUS_LABEL, UPCOMING_STATUSES } from "@/domain/appointment-state";
import { AppointmentActions } from "@/components/appointment-actions";
import { Badge, Card, Notice } from "@/components/ui";

export const metadata = { title: "Meu agendamento", robots: { index: false } };

export default async function ManageByToken({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const v = verifyActionToken(token);
  if (!v) return <div className="mx-auto max-w-md py-12"><Notice tone="error">Este link é inválido ou expirou. Entre na sua conta para ver seus horários.</Notice></div>;
  const tenant = await getTenant();
  const site = await getSite();
  const a = await forTenant(tenant.id).appointment.findFirst({ where: { id: v.appointmentId }, include: { professional: { select: { name: true } }, customer: { select: { name: true } } } });
  if (!a) notFound();
  const active = UPCOMING_STATUSES.includes(a.status) && a.startAt > new Date();
  return (
    <div className="mx-auto max-w-md py-12">
      <Card className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-2">
          <h1 className="font-display text-2xl">Seu agendamento</h1>
          <Badge tone={a.status === "RECONFIRMED" ? "good" : "brand"}>{STATUS_LABEL[a.status]}</Badge>
        </div>
        <div className="text-sm">
          <p className="font-medium">{a.serviceName}</p>
          <p className="text-muted">{formatDateTime(a.startAt, tenant.timezone)}</p>
          <p className="text-muted">Com {a.professional.name}</p>
          {site.contact.address && <p className="mt-2 text-muted">{site.contact.address}</p>}
          {site.contact.mapsUrl && <a className="text-brand underline" href={site.contact.mapsUrl} target="_blank" rel="noopener noreferrer">Abrir no mapa</a>}
        </div>
        {active ? <AppointmentActions id={a.id} status={a.status} token={token} canReschedule /> : <Notice>Este agendamento não pode mais ser alterado por aqui.</Notice>}
        <p className="text-xs text-muted">Para reagendar, é preciso entrar com a conta Google usada no agendamento.</p>
      </Card>
    </div>
  );
}
