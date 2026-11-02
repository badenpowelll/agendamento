import { Card, EmptyState } from "./ui";

export function PolicyPage({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <h1 className="mb-6 font-display text-3xl">{title}</h1>
      {text ? <Card className="whitespace-pre-line text-sm leading-relaxed text-ink">{text}</Card> : <EmptyState>Documento em elaboração. Entre em contato para mais informações.</EmptyState>}
    </div>
  );
}
