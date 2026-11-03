"use client";
import { useTransition } from "react";
import { markReturnContacted } from "@/app/actions/admin";

export function ReturnActions({ id, href, contacted }: { id: string; href: string | null; contacted: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => !contacted && start(() => markReturnContacted(id))}
          className="inline-flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-2 text-sm font-medium text-white hover:brightness-95"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.2-.5-.3Z" /></svg>
          {contacted ? "Enviar de novo" : "Enviar no WhatsApp"}
        </a>
      ) : (
        <span className="text-xs text-muted">Sem WhatsApp no cadastro</span>
      )}
      {!contacted && (
        <button type="button" disabled={pending} onClick={() => start(() => markReturnContacted(id))} className="rounded-full border border-line px-3 py-2 text-xs text-muted hover:border-brand/40 disabled:opacity-50">
          Marcar como avisada
        </button>
      )}
    </div>
  );
}
