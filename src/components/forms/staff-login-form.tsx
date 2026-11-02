"use client";

import { useActionState } from "react";
import { staffLogin, type LoginState } from "@/app/actions/staff-auth";
import { Button, Field, Input, Notice } from "@/components/ui";

export function StaffLoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(staffLogin, {});
  return (
    <form action={action} className="space-y-4">
      <Field label="E-mail"><Input name="email" type="email" autoComplete="username" required /></Field>
      <Field label="Senha"><Input name="password" type="password" autoComplete="current-password" required /></Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" disabled={pending} className="w-full py-3">{pending ? "Entrando…" : "Entrar no painel"}</Button>
    </form>
  );
}
