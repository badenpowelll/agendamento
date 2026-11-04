"use client";

import { useState } from "react";

/** Instruções do sinal via Pix, com botão para copiar a chave. */
export function PixBox(props: { pixKey: string; pixName: string; percent: number; hours: number; amount: string | null; methods?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* navegador sem permissão de cópia: a chave continua visível para copiar à mão */
    }
  };
  return (
    <div className="space-y-2 rounded-2xl border border-rose/60 bg-blush/60 p-4 text-sm">
      <p className="font-medium text-brand">
        Sinal de {props.percent}%{props.amount ? `: ${props.amount}` : ""} · pagar em até {props.hours}h
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted">Chave Pix:</span>
        <code className="rounded-lg bg-white px-2 py-1 font-mono text-[13px]">{props.pixKey}</code>
        <button type="button" onClick={copy} className="rounded-full border border-brand/40 bg-white px-3 py-1 text-xs text-brand hover:bg-brand hover:text-white">
          {copied ? "Copiado!" : "Copiar chave"}
        </button>
      </div>
      {props.pixName && <p className="text-muted">Nome do recebedor: <span className="text-ink">{props.pixName}</span></p>}
      {!props.compact && props.methods && <p className="text-muted">Formas de pagamento: {props.methods}</p>}
      <p>Seu horário será confirmado somente após o pagamento do sinal.</p>
    </div>
  );
}
