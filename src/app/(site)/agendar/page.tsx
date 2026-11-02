import { getContext } from "@/lib/context";
import { forTenant } from "@/lib/tenant-db";
import { formatBRL } from "@/lib/money";
import { addDays, toLocalDate, formatDateTime } from "@/lib/time";
import { UPCOMING_STATUSES } from "@/domain/appointment-state";
import { BookingWizard } from "@/components/booking-wizard";
import { EmptyState, Notice, PageTitle } from "@/components/ui";

export const metadata = { title: "Agendar" };

export default async function Agendar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ctx = await getContext();
  const db = forTenant(ctx.tenant.id);
  const [services, pros] = await Promise.all([
    db.service.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.professional.findMany({ where: { active: true }, include: { services: { select: { serviceId: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  let reschedule: { id: string; serviceId: string; label: string } | null = null;
  if (sp.reagendar && ctx.customer) {
    const a = await db.appointment.findFirst({ where: { id: sp.reagendar, customerId: ctx.customer.id, status: { in: UPCOMING_STATUSES } } });
    if (a) reschedule = { id: a.id, serviceId: a.serviceId, label: `${a.serviceName} em ${formatDateTime(a.startAt, ctx.tenant.timezone)}` };
  }

  const today = toLocalDate(new Date(), ctx.tenant.timezone);
  const days = Array.from({ length: Math.min(ctx.tenant.maxDaysAhead + 1, 45) }, (_, i) => addDays(today, i));

  return (
    <div className="mx-auto max-w-2xl py-10">
      <PageTitle title={reschedule ? "Reagendar" : "Agendar horário"} subtitle={reschedule ? `Atual: ${reschedule.label}` : "Escolha o serviço, o dia e o horário."} />
      {sp.reagendar && !reschedule && <div className="mb-4"><Notice tone="error">Agendamento não encontrado para reagendar. Entre com a conta usada no agendamento.</Notice></div>}
      {services.length === 0 ? (
        <EmptyState>Os serviços ainda não foram cadastrados.</EmptyState>
      ) : (
        <BookingWizard
          services={services.map((s) => ({ id: s.id, name: s.name, description: s.description, durationMin: s.durationMin, price: formatBRL(s.priceCents) }))}
          professionals={pros.map((p) => ({ id: p.id, name: p.name, serviceIds: p.services.map((x) => x.serviceId) }))}
          days={days}
          timezone={ctx.tenant.timezone}
          initial={{ serviceId: reschedule?.serviceId ?? sp.servico, professionalId: sp.profissional, date: sp.data, startAt: sp.hora }}
          rescheduleId={reschedule?.id ?? null}
          session={{ loggedIn: !!ctx.user, profileComplete: !!ctx.customer?.profileComplete }}
        />
      )}
    </div>
  );
}
