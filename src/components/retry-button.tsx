"use client";
import { useTransition } from "react";
import { retryMessage } from "@/app/actions/admin";
export function RetryButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button disabled={pending} onClick={() => start(() => retryMessage(id))} className="text-xs text-brand underline">tentar de novo</button>;
}
