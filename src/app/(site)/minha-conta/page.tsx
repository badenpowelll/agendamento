import Link from "next/link";
import { requireCustomer } from "@/lib/context";
import { forTenant } from "@/lib/tenant-db";
import { formatDateTime } from "@/lib/time";
import { formatBRL } from "@/lib/money";
import { formatPhoneBR } from "@/lib/phone";
import { STATUS_LABEL, UPCOMING_STATUSES } from "@/domain/appointment-state";
import { signOutAction } from "@/app/actions/customer";
import { AppointmentActions } from "@/components/appointment-actions";
import { ProfileForm } from "@/components/forms/profile-form";
import { Badge, Button, ButtonLink, Card, EmptyState, Notice, PageTitle } from "@/components/ui";
import { ExportDataButton } from "@/components/export-data-button";
import { PixBox } from "@/components/pix-box";
import { getSite } from "@/lib/site";
import { depositCents, depositRequired } from "@/lib/deposit";

export const metadata = { title: "Minha conta" };

export default async function MinhaConta({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const ctx = await requireCustomer("/minha-conta");
  const tz = ctx.tenant.timezone;
  const now = new Date();
  const appts = await forTenant(ctx.tenant.id).appointment.findMany({
    where: { customerId: ctx.customer.id },
    include: { professional: { select: { name: true } } },
    orderBy: { startAt: "desc" },
    take: 50,
  });
  const upcoming = appts.filter((a) => UPCOMING_STATUSES.includes(a.status) && a.startAt > now).reverse();
  const history = appts.filter((a) => !upcoming.includes(a));
  const c = ctx.customer;
  const site = await getSite();
  const pay = depositRequired(site) ? site.payment : null;
  const justBooked = ok ? appts.find((a) => a.id === ok) : undefined;

  return (
    <div className="py-10">
      <PageTitle
        title={`Olá, ${c.name.split(" ")[0]}!`}
        subtitle="Seus horários e preferências."
        actions={<form action={signOutAction}><Button variant="ghost" type="submit">Sair</Button></form>}
      />
      {ok && (
        <div className="mb-6">
          {justBooked?.status === "PENDING" && pay ? (
            <Notice tone="success">Horário reservado! Pague o sinal pelo Pix abaixo para confirmar. Você receberá os detalhes e os lembretes pelos canais escolhidos.</Notice>
          ) : (
            <Notice tone="success">Agendamento confirmado! Você receberá a confirmação e os lembretes pelos canais escolhidos.</Notice>
          )}
        </div>
      )}

      <section aria-labelledby="proximos" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="proximos" className="font-display text-xl">Próximos horários</h2>
          <ButtonLink href="/agendar" variant="secondary" className="px-4 py-2">Novo agendamento</ButtonLink>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState>Você não tem horários marcados. <Link href="/agendar" className="text-brand underline">Agendar agora</Link></EmptyState>
        ) : (
          upcoming.map((a) => (
            <Card key={a.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{a.serviceName}</p>
                  <p className="text-sm text-muted">{formatDateTime(a.startAt, tz)} · {a.professional.name}</p>
                  <p className="text-sm text-muted">{formatBRL(a.priceCents)}</p>
                </div>
                <Badge tone={a.status === "RECONFIRMED" ? "good" : a.status === "PENDING" ? "warn" : "brand"}>{STATUS_LABEL[a.status]}</Badge>
              </div>
              {a.status === "PENDING" && pay && (
                <PixBox pixKey={pay.pixKey} pixName={pay.pixName} percent={pay.depositPercent} hours={pay.depositHours} methods={pay.methods}
                  amount={(() => { const d = depositCents(a.priceCents, pay.depositPercent); return d != null ? formatBRL(d) : null; })()} />
              )}
              <AppointmentActions id={a.id} status={a.status} canReschedule />
            </Card>
          ))
        )}
      </section>

      <section aria-labelledby="historico" className="mt-10 space-y-3">
        <h2 id="historico" className="font-display text-xl">Histórico</h2>
        {site.contact.reviewUrl && history.some((a) => a.status === "COMPLETED") && (
          <Card className="flex flex-col items-start gap-3 border-[#f4b400]/40 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">Gostou do atendimento? Sua avaliação no Google ajuda outras clientes a encontrar a gente.</p>
            <a href={site.contact.reviewUrl} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">★ Avaliar no Google</a>
          </Card>
        )}
        {history.length === 0 ? (
          <EmptyState>Nenhum atendimento anterior.</EmptyState>
        ) : (
          <Card className="divide-y divide-line p-0">
            {history.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium">{a.serviceName}</p>
                  <p className="text-muted">{formatDateTime(a.startAt, tz, { dateStyle: "short" })}</p>
                </div>
                <Badge tone={a.status === "COMPLETED" ? "good" : a.status === "CANCELLED" || a.status === "NO_SHOW" ? "bad" : "neutral"}>{STATUS_LABEL[a.status]}</Badge>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section aria-labelledby="dados" className="mt-10">
        <h2 id="dados" className="mb-3 font-display text-xl">Meus dados e preferências</h2>
        <Card>
          <ProfileForm
            initial={{ name: c.name, phone: formatPhoneBR(c.phone), email: c.email ?? "", allowEmail: c.allowEmail, allowWhatsapp: c.allowWhatsapp, allowMarketing: c.allowMarketing, complete: true }}
          />
          <div className="mt-6 border-t border-line pt-4 text-sm text-muted">
            <p>Você pode baixar uma cópia dos seus dados ou pedir a exclusão do cadastro pelo WhatsApp do estabelecimento.</p>
            <div className="mt-3"><ExportDataButton /></div>
          </div>
        </Card>
      </section>
    </div>
  );
}
