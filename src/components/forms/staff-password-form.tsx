"use client";

import { useActionState } from "react";
import { staffChangePassword, type LoginState } from "@/app/actions/staff-auth";
import { Button, Field, Input, Notice } from "@/components/ui";

export function StaffPasswordForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(staffChangePassword, {});
  return (
    <form action={action} className="space-y-4">
      <Field label="Senha atual (ou provisória)"><Input name="current" type="password" autoComplete="current-password" required /></Field>
      <Field label="Nova senha" hint="Pelo menos 10 caracteres, com letras e números."><Input name="next" type="password" autoComplete="new-password" required minLength={10} /></Field>
      <Field label="Repita a nova senha"><Input name="confirm" type="password" autoComplete="new-password" required minLength={10} /></Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" disabled={pending} className="w-full py-3">{pending ? "Salvando…" : "Salvar nova senha"}</Button>
    </form>
  );
}
