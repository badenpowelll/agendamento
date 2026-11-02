"use client";

import { useActionState, useState, useTransition } from "react";
import type { StaffRole } from "@prisma/client";
import { createStaffAction, resetStaffPasswordAction, setStaffActiveAction, setStaffRoleAction, type StaffState } from "@/app/actions/admin";
import { Button, Field, Input, Notice, Select } from "./ui";

function TempPassword({ value, email }: { value: string; email?: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
      <p>Senha provisória{email ? ` de ${email}` : ""} (aparece só agora):</p>
      <p className="mt-1 select-all font-mono text-lg tracking-wider">{value}</p>
      <p className="mt-1 text-xs text-muted">Envie por um canal privado. No primeiro acesso, ela cria a própria senha.</p>
    </div>
  );
}

export function CreateStaffForm({ isOwner, professionals }: { isOwner: boolean; professionals: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<StaffState, FormData>(createStaffAction, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome"><Input name="name" required /></Field>
        <Field label="E-mail de acesso"><Input name="email" type="email" required /></Field>
        <Field label="Papel">
          <Select name="role" defaultValue="STAFF">
            <option value="STAFF">Colaboradora</option>
            <option value="ADMIN">Administradora</option>
            {isOwner && <option value="OWNER">Gestora</option>}
          </Select>
        </Field>
        <Field label="Agenda vinculada (opcional)">
          <Select name="professionalId" defaultValue=""><option value="">Nenhuma</option>{professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        </Field>
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.tempPassword && <TempPassword value={state.tempPassword} email={state.forEmail} />}
      <Button type="submit" disabled={pending}>{pending ? "Criando…" : "Criar acesso"}</Button>
    </form>
  );
}

export function StaffRowControls({ id, active, role, isOwner, isSelf }: { id: string; active: boolean; role: StaffRole; isOwner: boolean; isSelf: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<StaffState>({});
  if (isSelf) return <span className="text-xs text-muted">você</span>;
  const canManage = isOwner || role !== "OWNER";
  if (!canManage) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={active ? "danger" : "primary"} className="px-3 py-1.5 text-xs" disabled={pending} onClick={() => start(async () => setMsg(await setStaffActiveAction(id, !active)))}>
          {active ? "Desativar acesso" : "Liberar licença"}
        </Button>
        <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={pending} onClick={() => start(async () => setMsg(await resetStaffPasswordAction(id)))}>Redefinir senha</Button>
        {isOwner && (
          <select aria-label="Papel" defaultValue={role} disabled={pending} className="rounded-lg border border-line bg-white px-2 py-1 text-xs"
            onChange={(e) => start(async () => setMsg(await setStaffRoleAction(id, e.target.value as StaffRole)))}>
            <option value="STAFF">Colaboradora</option><option value="ADMIN">Administradora</option><option value="OWNER">Gestora</option>
          </select>
        )}
      </div>
      {msg.error && <Notice tone="error">{msg.error}</Notice>}
      {msg.tempPassword && <TempPassword value={msg.tempPassword} />}
    </div>
  );
}
