"use client";

import { useEffect, useRef, useState } from "react";
import { composeWhatsappMessage, WA_REASONS, type WaReason } from "@/lib/whatsapp-message";

const NAME_KEY = "wa-name";

/**
 * Antes de abrir o WhatsApp, pergunta o nome, o motivo e o serviço, para a mensagem
 * chegar com contexto ("Olá, Milly! Aqui quem fala é Ana. Queria agendar Virilha completa.").
 * Intercepta qualquer link com data-wa; sem JavaScript, o link abre o WhatsApp normalmente.
 */
export function WhatsappComposer(props: { phone: string; services: { name: string; category: string | null }[]; defaultName?: string; greetingName?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(props.defaultName ?? "");
  const [reason, setReason] = useState<WaReason>("valor");
  const [service, setService] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!props.defaultName) {
      try {
        const saved = localStorage.getItem(NAME_KEY);
        if (saved) setName(saved);
      } catch {}
    }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[data-wa]") as HTMLAnchorElement | null;
      if (!a || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      if (a.dataset.waService) setService(a.dataset.waService);
      if (a.dataset.waReason) setReason(a.dataset.waReason as WaReason);
      dialog.current?.showModal();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [props.defaultName]);

  const groups = new Map<string, string[]>();
  for (const s of props.services) groups.set(s.category?.trim() || "Serviços", [...(groups.get(s.category?.trim() || "Serviços") ?? []), s.name]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    try { localStorage.setItem(NAME_KEY, name.trim()); } catch {}
    const text = composeWhatsappMessage({ name, reason, service, note, greetingName: props.greetingName });
    window.open(`https://wa.me/${props.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    dialog.current?.close();
    setNote("");
  };

  const field = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
  return (
    <dialog ref={dialog} className="m-auto w-[min(92vw,26rem)] rounded-3xl border border-line bg-cream p-0 text-ink shadow-2xl backdrop:bg-ink/40">
      <form onSubmit={send} className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Falar no WhatsApp</h2>
            <p className="text-sm text-muted">Conte rapidinho o que você precisa e a mensagem já vai pronta.</p>
          </div>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Fechar" className="rounded-full px-2 text-2xl leading-none text-muted hover:text-ink">×</button>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Seu nome <span className="font-normal text-muted">(opcional)</span></span>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
        </label>
        <fieldset className="space-y-1 text-sm">
          <legend className="mb-1 font-medium">O que você gostaria?</legend>
          <div className="flex flex-wrap gap-2">
            {WA_REASONS.map((r) => (
              <label key={r.id} className={`cursor-pointer rounded-full border px-3 py-1.5 ${reason === r.id ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>
                <input type="radio" name="wa-reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} className="sr-only" />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Tipo de serviço</span>
          <select className={field} value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">Ainda não sei / outro</option>
            {[...groups.keys()].filter((c) => c !== "Serviços").map((c) => <option key={`cat-${c}`} value={c.toLowerCase()}>{c} (em geral)</option>)}
            {[...groups.entries()].map(([cat, names]) => (
              <optgroup key={cat} label={cat}>{names.map((n) => <option key={n} value={n}>{n}</option>)}</optgroup>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Mensagem (opcional)</span>
          <textarea className={field} rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} placeholder="Ex.: tem horário no sábado?" />
        </label>
        <p className="whitespace-pre-line rounded-2xl bg-white p-3 text-xs text-muted">{composeWhatsappMessage({ name, reason, service, note, greetingName: props.greetingName })}</p>
        <button type="submit" className="w-full rounded-full bg-[#25d366] py-3 font-medium text-white hover:brightness-95">Abrir o WhatsApp</button>
      </form>
    </dialog>
  );
}
