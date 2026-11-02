"use client";
import { useTransition } from "react";
import { deleteTimeOff } from "@/app/actions/admin";
export function DeleteTimeOffButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button disabled={pending} onClick={() => start(() => deleteTimeOff(id))} className="text-xs text-red-700 underline">remover</button>;
}
