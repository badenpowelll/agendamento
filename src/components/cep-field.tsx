"use client";

import { useRef, useState } from "react";
import { Input } from "./ui";

type Address = { cep: string; street: string; neighborhood: string; city: string; state: string };

/**
 * Campo de CEP que, com 8 números, consulta /api/cep e preenche os outros campos do mesmo formulário.
 * `fill` liga cada parte do endereço ao name de um campo; `compose` escreve o endereço inteiro em um único campo.
 * Se a consulta falhar, nada é apagado: a pessoa preenche à mão.
 */
export function CepField(props: {
  name: string;
  defaultValue?: string;
  fill?: { street?: string; neighborhood?: string; city?: string; state?: string; focus?: string };
  compose?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const last = useRef("");
  const [status, setStatus] = useState<{ tone: "muted" | "error" | "ok"; text: string } | null>(null);

  async function lookup(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 8 || digits === last.current) return;
    last.current = digits;
    setStatus({ tone: "muted", text: "Buscando endereço…" });
    try {
      const r = await fetch(`/api/cep/${digits}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setStatus({ tone: "error", text: j.error ?? "Não foi possível buscar o CEP. Preencha manualmente." });
        return;
      }
      const a = j as Address;
      const form = ref.current?.form;
      const set = (field: string | undefined, value: string) => {
        if (!form || !field || !value) return;
        const el = form.elements.namedItem(field);
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) el.value = value;
      };
      set(props.fill?.street, a.street);
      set(props.fill?.neighborhood, a.neighborhood);
      set(props.fill?.city, a.city);
      set(props.fill?.state, a.state);
      if (props.compose) {
        const cep = `${a.cep.slice(0, 5)}-${a.cep.slice(5)}`;
        set(props.compose, [a.street, a.neighborhood, `${a.city} - ${a.state}`, `CEP ${cep}`].filter(Boolean).join(", "));
      }
      const focus = props.fill?.focus && form?.elements.namedItem(props.fill.focus);
      if (focus instanceof HTMLInputElement) focus.focus();
      setStatus({ tone: "ok", text: `${a.city} - ${a.state}${props.compose && a.street ? ". Confira e inclua o número." : ""}` });
    } catch {
      setStatus({ tone: "error", text: "Sem conexão para buscar o CEP. Preencha manualmente." });
    }
  }

  const mask = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  };

  return (
    <>
      <Input
        ref={ref}
        name={props.name}
        defaultValue={props.defaultValue ? mask(props.defaultValue) : ""}
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder="00000-000"
        maxLength={9}
        onChange={(e) => {
          e.target.value = mask(e.target.value);
          void lookup(e.target.value);
        }}
        onBlur={(e) => void lookup(e.target.value)}
      />
      {status && (
        <span role="status" className={status.tone === "error" ? "block text-xs text-red-700" : status.tone === "ok" ? "block text-xs text-emerald-700" : "block text-xs text-muted"}>
          {status.text}
        </span>
      )}
    </>
  );
}
