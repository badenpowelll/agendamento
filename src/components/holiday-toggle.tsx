"use client";
import { useTransition } from "react";
import { setHolidayOpen } from "@/app/actions/admin";

/** Botão para abrir um feriado (atender normalmente) ou voltar a fechá-lo. */
export function HolidayToggle({ date, closed }: { date: string; closed: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => setHolidayOpen(date, closed))} className="text-xs text-brand underline disabled:opacity-50">
      {pending ? "salvando…" : closed ? "abrir neste dia" : "fechar neste dia"}
    </button>
  );
}
