import { Badge, Card, PageTitle } from "./ui";

/** Tela de um módulo previsto para uma etapa futura: mostra o que vai existir, sem simular dados. */
export function PlannedModule({ title, stage, summary, groups, note }: { title: string; stage: string; summary: string; groups: { title: string; items: string[] }[]; note?: string }) {
  return (
    <div className="space-y-6">
      <PageTitle title={title} subtitle={summary} actions={<Badge tone="brand">{stage}</Badge>} />
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.title}>
            <h2 className="mb-2 font-medium">{g.title}</h2>
            <ul className="space-y-1.5 text-sm text-muted">
              {g.items.map((i) => <li key={i} className="flex gap-2"><span aria-hidden className="text-brand">○</span>{i}</li>)}
            </ul>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted">{note ?? "Módulo planejado. Esta tela mostra o escopo previsto; os dados aparecem quando a etapa for implantada."}</p>
    </div>
  );
}
