"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { customerAction, tokenAction, type SimpleResult } from "@/app/actions/booking";
import { Button, ButtonLink, Notice } from "@/components/ui";

export function AppointmentActions({ id, status, token, canReschedule }: { id: string; status: string; token?: string; canReschedule: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<SimpleResult | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const router = useRouter();
  const run = (a: "reconfirm" | "cancel") =>
    start(async () => {
      const r = token ? await tokenAction(token, a) : await customerAction(id, a);
      setResult(r);
      setConfirmCancel(false);
      router.refresh();
    });

  if (result?.ok) return <Notice tone="success">{result.message}</Notice>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "CONFIRMED" && <Button disabled={pending} onClick={() => run("reconfirm")}>Confirmar presença</Button>}
        {canReschedule && <ButtonLink variant="secondary" href={`/agendar?reagendar=${id}`}>Reagendar</ButtonLink>}
        {!confirmCancel ? (
          <Button variant="ghost" disabled={pending} onClick={() => setConfirmCancel(true)}>Cancelar</Button>
        ) : (
          <Button variant="danger" disabled={pending} onClick={() => run("cancel")}>Confirmar cancelamento</Button>
        )}
      </div>
      {result && !result.ok && <Notice tone="error">{result.message}</Notice>}
    </div>
  );
}
