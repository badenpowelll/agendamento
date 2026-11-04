"use client";

import { useState, useTransition } from "react";
import type { AppointmentStatus } from "@prisma/client";
import { staffTransition } from "@/app/actions/admin";
import { allowedTransitions, STATUS_LABEL } from "@/domain/appointment-state";

const ACTION_LABEL: Partial<Record<AppointmentStatus, string>> = {
  CONFIRMED: "Confirmar (sinal recebido)",
  RECONFIRMED: "Marcar presença reconfirmada",
  CHECKED_IN: "Cliente chegou",
  IN_SERVICE: "Iniciar atendimento",
  COMPLETED: "Concluir",
  CANCELLED: "Cancelar",
  NO_SHOW: "Não compareceu",
};

export function StatusControl({ id, status }: { id: string; status: AppointmentStatus }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const options = allowedTransitions(status, "STAFF");
  if (options.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-2">
      <select
        aria-label={`Mudar estado (atual: ${STATUS_LABEL[status]})`}
        disabled={pending}
        defaultValue=""
        className="rounded-lg border border-line bg-white px-2 py-1 text-xs"
        onChange={(e) => {
          const to = e.target.value as AppointmentStatus;
          e.target.value = "";
          if (!to) return;
          if ((to === "CANCELLED" || to === "NO_SHOW") && !window.confirm(`${ACTION_LABEL[to]}? A cliente será avisada em caso de cancelamento.`)) return;
          start(async () => {
            const r = await staffTransition(id, to);
            setMsg(r.error ?? "");
          });
        }}
      >
        <option value="">Ações…</option>
        {options.map((o) => <option key={o} value={o}>{ACTION_LABEL[o] ?? STATUS_LABEL[o]}</option>)}
      </select>
      {msg && <span className="text-xs text-red-700">{msg}</span>}
    </span>
  );
}
