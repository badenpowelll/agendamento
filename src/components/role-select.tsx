"use client";
import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import { setMemberRole } from "@/app/actions/admin";
const LABEL: Record<Role, string> = { OWNER: "Proprietária", ADMIN: "Administradora", STAFF: "Equipe", CLIENT: "Cliente" };
export function RoleSelect({ id, role, disabled }: { id: string; role: Role; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <span className="flex items-center gap-2">
      <select aria-label="Papel" defaultValue={role} disabled={disabled || pending} className="rounded-lg border border-line bg-white px-2 py-1 text-sm"
        onChange={(e) => start(async () => { const r = await setMemberRole(id, e.target.value as Role); setMsg(r.error ?? "salvo"); })}>
        {(Object.keys(LABEL) as Role[]).map((r) => <option key={r} value={r}>{LABEL[r]}</option>)}
      </select>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </span>
  );
}
