"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookAction } from "@/app/actions/booking";
import { Button, Card, Notice, cx } from "@/components/ui";

type Service = { id: string; name: string; description: string | null; durationMin: number; price: string };
type Pro = { id: string; name: string; serviceIds: string[] };
type Slot = { startAt: string; label: string; professionalIds: string[] };

const dayLabel = (d: string, tz: string) => {
  const dt = new Date(`${d}T12:00:00Z`);
  const wd = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(dt).replace(".", "");
  return { wd, dm: `${d.slice(8, 10)}/${d.slice(5, 7)}`, tz };
};

export function BookingWizard(props: {
  services: Service[];
  professionals: Pro[];
  days: string[];
  timezone: string;
  initial: { serviceId?: string; professionalId?: string; date?: string; startAt?: string };
  rescheduleId: string | null;
  session: { loggedIn: boolean; profileComplete: boolean };
}) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(props.initial.serviceId && props.services.some((s) => s.id === props.initial.serviceId) ? props.initial.serviceId : "");
  const [professionalId, setProfessionalId] = useState(props.initial.professionalId ?? "");
  const [date, setDate] = useState(props.initial.date && props.days.includes(props.initial.date) ? props.initial.date : props.days[0]);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [startAt, setStartAt] = useState(props.initial.startAt ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  // Uma chave por tentativa de reserva: cliques repetidos não duplicam
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID());

  const service = props.services.find((s) => s.id === serviceId);
  const pros = useMemo(() => props.professionals.filter((p) => p.serviceIds.includes(serviceId)), [props.professionals, serviceId]);

  useEffect(() => {
    if (!serviceId || !date) return;
    const ctrl = new AbortController();
    setSlots(null);
    setLoadError("");
    const qs = new URLSearchParams({ serviceId, date, ...(professionalId ? { professionalId } : {}), ...(props.rescheduleId ? { ignore: props.rescheduleId } : {}) });
    fetch(`/api/availability?${qs}`, { signal: ctrl.signal })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Erro");
        setSlots(j.slots);
        setStartAt((cur) => (j.slots.some((s: Slot) => s.startAt === cur) ? cur : ""));
      })
      .catch((e) => e.name !== "AbortError" && setLoadError("Não foi possível carregar os horários. Tente novamente."));
    return () => ctrl.abort();
  }, [serviceId, professionalId, date, props.rescheduleId]);

  const selectedSlot = slots?.find((s) => s.startAt === startAt);
  const selectionQs = new URLSearchParams({ servico: serviceId, data: date, hora: startAt, ...(professionalId ? { profissional: professionalId } : {}), ...(props.rescheduleId ? { reagendar: props.rescheduleId } : {}) }).toString();

  function confirm() {
    setError("");
    const back = `/agendar?${selectionQs}`;
    if (!props.session.loggedIn) return router.push(`/entrar?callbackUrl=${encodeURIComponent(back)}`);
    if (!props.session.profileComplete) return router.push(`/cadastro?callbackUrl=${encodeURIComponent(back)}`);
    start(async () => {
      const r = await bookAction({ serviceId, professionalId: professionalId || null, startAt, idempotencyKey: idemKey, rescheduleId: props.rescheduleId });
      if (r.ok) return router.push(`/minha-conta?ok=${r.appointmentId}`);
      setError(r.error);
      if (r.code === "SLOT") {
        setIdemKey(crypto.randomUUID());
        setStartAt("");
        setSlots(null);
        const qs = new URLSearchParams({ serviceId, date, ...(professionalId ? { professionalId } : {}) });
        fetch(`/api/availability?${qs}`).then((x) => x.json()).then((j) => setSlots(j.slots ?? []));
      }
      if (r.code === "LOGIN") router.push(`/entrar?callbackUrl=${encodeURIComponent(back)}`);
      if (r.code === "PROFILE") router.push(`/cadastro?callbackUrl=${encodeURIComponent(back)}`);
    });
  }

  const step = (n: number, title: string) => (
    <h2 className="mb-3 flex items-center gap-2 font-medium"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white">{n}</span>{title}</h2>
  );

  return (
    <div className="space-y-6">
      {!props.rescheduleId && (
        <section>
          {step(1, "Serviço")}
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Serviço">
            {props.services.map((s) => (
              <button key={s.id} role="radio" aria-checked={s.id === serviceId} onClick={() => { setServiceId(s.id); setProfessionalId(""); setStartAt(""); }}
                className={cx("rounded-2xl border bg-white p-4 text-left transition", s.id === serviceId ? "border-brand ring-2 ring-brand/20" : "border-line hover:border-brand/40")}>
                <span className="flex justify-between gap-2"><span className="font-medium">{s.name}</span><span className="text-sm text-brand">{s.price}</span></span>
                <span className="mt-1 block text-xs text-muted">{s.durationMin} min</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {service && pros.length > 1 && (
        <section>
          {step(2, "Profissional")}
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Profissional">
            {[{ id: "", name: "Qualquer uma" }, ...pros].map((p) => (
              <button key={p.id || "any"} role="radio" aria-checked={p.id === professionalId} onClick={() => { setProfessionalId(p.id); setStartAt(""); }}
                className={cx("rounded-full border px-4 py-2 text-sm", p.id === professionalId ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand/40")}>
                {p.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {service && (
        <section>
          {step(pros.length > 1 ? 3 : 2, "Dia")}
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2" role="radiogroup" aria-label="Dia">
            {props.days.map((d) => {
              const l = dayLabel(d, props.timezone);
              return (
                <button key={d} role="radio" aria-checked={d === date} onClick={() => { setDate(d); setStartAt(""); }}
                  className={cx("flex min-w-16 snap-start flex-col items-center rounded-2xl border px-3 py-2 text-sm", d === date ? "border-brand bg-brand text-white" : "border-line bg-white")}>
                  <span className="text-xs capitalize opacity-80">{l.wd}</span><span className="font-medium">{l.dm}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {service && (
        <section aria-live="polite">
          {step(pros.length > 1 ? 4 : 3, "Horário")}
          {loadError ? <Notice tone="error">{loadError}</Notice> : slots === null ? (
            <p className="text-sm text-muted">Carregando horários…</p>
          ) : slots.length === 0 ? (
            <Notice>Nenhum horário livre neste dia. Experimente outro dia.</Notice>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="Horário">
              {slots.map((s) => (
                <button key={s.startAt} role="radio" aria-checked={s.startAt === startAt} onClick={() => setStartAt(s.startAt)}
                  className={cx("rounded-xl border py-2 text-sm", s.startAt === startAt ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand/40")}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {service && selectedSlot && (
        <Card className="sticky bottom-4 space-y-3 border-brand/30 shadow-lg">
          <p className="text-sm">
            <span className="font-medium">{service.name}</span> · {dayLabel(date, props.timezone).dm} às {selectedSlot.label}
            {professionalId && <> · {pros.find((p) => p.id === professionalId)?.name}</>} · <span className="text-brand">{service.price}</span>
          </p>
          {error && <Notice tone="error">{error}</Notice>}
          <Button onClick={confirm} disabled={pending} className="w-full py-3 text-base">
            {pending ? "Confirmando…" : props.rescheduleId ? "Confirmar novo horário" : props.session.loggedIn ? "Confirmar agendamento" : "Entrar com Google e confirmar"}
          </Button>
        </Card>
      )}
      {error && !selectedSlot && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
