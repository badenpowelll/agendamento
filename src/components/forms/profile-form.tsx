"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveProfile, type FormState } from "@/app/actions/customer";
import { Button, Field, Input, Notice } from "@/components/ui";
import { CepField } from "@/components/cep-field";

export type AddressInitial = { cep: string; street: string; number: string; complement: string; district: string; city: string; state: string };

export function ProfileForm(props: {
  callbackUrl?: string;
  initial: { name: string; phone: string; email: string; allowEmail: boolean; allowWhatsapp: boolean; allowMarketing: boolean; complete: boolean; address?: AddressInitial };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile, {});
  const i = props.initial;
  const a = i.address;
  return (
    <form action={action} className="space-y-4">
      {props.callbackUrl && <input type="hidden" name="callbackUrl" value={props.callbackUrl} />}
      <Field label="Nome completo"><Input name="name" defaultValue={i.name} autoComplete="name" required /></Field>
      <Field label="WhatsApp" hint="Com DDD. Usado para avisos sobre seus horários.">
        <Input name="phone" defaultValue={i.phone} inputMode="tel" autoComplete="tel" placeholder="(84) 99999-9999" required />
      </Field>
      <Field label="E-mail" hint="Vem da sua conta Google."><Input value={i.email} disabled readOnly /></Field>
      <fieldset className="space-y-3 rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-medium">Endereço (opcional)</legend>
        <p className="text-xs text-muted">Digite o CEP e preenchemos rua, bairro e cidade para você.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="CEP"><CepField name="addressCep" defaultValue={a?.cep} fill={{ street: "addressStreet", neighborhood: "addressDistrict", city: "addressCity", state: "addressState", focus: "addressNumber" }} /></Field>
          <div className="sm:col-span-2"><Field label="Rua"><Input name="addressStreet" defaultValue={a?.street} autoComplete="address-line1" maxLength={120} /></Field></div>
          <Field label="Número"><Input name="addressNumber" defaultValue={a?.number} maxLength={20} /></Field>
          <div className="sm:col-span-2"><Field label="Complemento"><Input name="addressComplement" defaultValue={a?.complement} autoComplete="address-line2" maxLength={80} /></Field></div>
          <Field label="Bairro"><Input name="addressDistrict" defaultValue={a?.district} maxLength={80} /></Field>
          <Field label="Cidade"><Input name="addressCity" defaultValue={a?.city} autoComplete="address-level2" maxLength={80} /></Field>
          <Field label="UF"><Input name="addressState" defaultValue={a?.state} autoComplete="address-level1" maxLength={2} className="uppercase" /></Field>
        </div>
      </fieldset>
      <fieldset className="space-y-2 rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-medium">Como prefere receber avisos sobre seus horários?</legend>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="allowEmail" defaultChecked={i.allowEmail} className="mt-0.5 accent-brand" /> E-mail (confirmação e lembretes)</label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="allowWhatsapp" defaultChecked={i.allowWhatsapp} className="mt-0.5 accent-brand" /> WhatsApp (confirmação e lembretes)</label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="allowMarketing" defaultChecked={i.allowMarketing} className="mt-0.5 accent-brand" /> Novidades e promoções (opcional)</label>
      </fieldset>
      {!i.complete && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acceptTerms" required className="mt-0.5 accent-brand" />
          <span>Li e aceito os <Link className="underline" href="/termos" target="_blank">termos</Link> e a <Link className="underline" href="/privacidade" target="_blank">política de privacidade</Link>.</span>
        </label>
      )}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">Dados salvos.</Notice>}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? "Salvando…" : i.complete ? "Salvar alterações" : "Concluir cadastro"}</Button>
    </form>
  );
}
