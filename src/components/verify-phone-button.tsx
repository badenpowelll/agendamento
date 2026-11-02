"use client";
import { useTransition } from "react";
import { markPhoneVerified } from "@/app/actions/admin";
import { Button } from "./ui";
export function VerifyPhoneButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <Button variant="secondary" disabled={pending} onClick={() => start(() => markPhoneVerified(id))}>Confirmei o número com a cliente</Button>;
}
