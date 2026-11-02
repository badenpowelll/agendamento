"use client";

import { useActionState, type ReactNode } from "react";
import type { AdminState } from "@/app/actions/admin";
import { Button, Notice } from "./ui";

export function AdminForm({ action, children, submit = "Salvar", className }: { action: (p: AdminState, f: FormData) => Promise<AdminState>; children: ReactNode; submit?: string; className?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className ?? "space-y-4"}>
      {children}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">{state.ok}</Notice>}
      <Button type="submit" disabled={pending}>{pending ? "Salvando…" : submit}</Button>
    </form>
  );
}
