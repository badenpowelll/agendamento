import Link from "next/link";
import { requireStaff } from "@/lib/staff-session";
import { forTenant } from "@/lib/tenant-db";
import { getSite, whatsappLink } from "@/lib/site";
import { formatDateTime } from "@/lib/time";
import { formatBRL } from "@/lib/money";
import { formatPhoneBR } from "@/lib/phone";
import { depositCents, depositDeadline, depositReminderMessage, depositRequired } from "@/lib/deposit";
import { StatusControl } from "@/components/status-control";
import { Badge, Card, EmptyState, Notice, PageTitle } from "@/components/ui";

export const metadata = { title: "Sinais pendentes" };

export default async function Sinais() {
  const ctx = await requireStaff("STAFF");
  const tz = ctx.tenant.timezone;
  const site = await getSite();
  const pay = site.payment;
  const now = new Date();
  const list = await forTenant(ctx.tenant.id).appointment.findMany({
    where: { status: "PENDING", startAt: { gt: new Date(now.getTime() - 86_400_000) } },
    include: { customer: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageTitle
        title="Sinais pendentes"
        subtitle={`Reservas do site esperando o sinal de ${pay.depositPercent}% (prazo de ${pay.depositHours}h). Confira o Pix no extrato e marque "Confirmar (sinal recebido)". Sem pagamento no prazo, cancele para liberar o horário.`}
      />
      {!depositRequired(site) && <Notice>A cobrança de sinal está desligada (Site &gt; Pagamento do sinal). As novas reservas já entram confirmadas.</Notice>}
      {list.length === 0 ? (
        <EmptyState>Nenhuma reserva esperando sinal.</EmptyState>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {list.map((a) => {
              const deadline = depositDeadline(a.createdAt, pay.depositHours);
              const hoursLeft = Math.ceil((deadline.getTime() - now.getTime()) / 3_600_000);
              const amountCents = depositCents(a.priceCents, pay.depositPercent);
              const amount = amountCents != null ? formatBRL(amountCents) : null;
              const msg = depositReminderMessage({
                firstName: a.customer.name.split(" ")[0] || a.customer.name,
                service: a.serviceName,
                when: formatDateTime(a.startAt, tz),
                amount,
                pixKey: pay.pixKey,
                pixName: pay.pixName,
                deadline: formatDateTime(deadline, tz),
              });
              return (
                <li key={a.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">
                      <Link href={`/admin/clientes/${a.customer.id}`} className="hover:underline">{a.customer.name}</Link>{" "}
                      {hoursLeft <= 0 ? <Badge tone="bad">Prazo vencido</Badge> : hoursLeft <= 6 ? <Badge tone="warn">Vence em {hoursLeft}h</Badge> : <Badge tone="neutral">Vence em {hoursLeft}h</Badge>}
                    </p>
                    <p className="text-sm text-muted">{a.serviceName} · {formatDateTime(a.startAt, tz)} · valor {formatBRL(a.priceCents)}{amount && <> · sinal <span className="text-ink">{amount}</span></>}</p>
                    <p className="text-sm text-muted">Reservado em {formatDateTime(a.createdAt, tz)} · prazo {formatDateTime(deadline, tz)}{a.customer.phone && ` · ${formatPhoneBR(a.customer.phone)}`}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.customer.phone && pay.pixKey && (
                      <a href={whatsappLink(a.customer.phone, msg)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#25d366] px-4 py-2 text-sm font-medium text-white hover:brightness-95">
                        Lembrar do sinal
                      </a>
                    )}
                    <StatusControl id={a.id} status={a.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
