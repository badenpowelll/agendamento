import Link from "next/link";
import { requireStaff } from "@/lib/staff-session";
import { formatDateTime } from "@/lib/time";
import { automationStats } from "@/domain/metrics";
import { Badge, Card, PageTitle } from "@/components/ui";

const PLANNED = [
  ["Cliente cadastrada", "Boas-vindas"], ["Atendimento concluído", "Agradecimento"], ["24h após atendimento", "Pesquisa de satisfação"],
  ["Retorno previsto", "Convite para agendar"], ["Cliente inativa", "Campanha autorizada"], ["Aniversário", "Felicitação"],
  ["Cancelamento", "Acionar lista de espera"], ["Pagamento pendente", "Lembrete"], ["Estoque baixo", "Alerta administrativo"],
  ["Conta vencendo", "Alerta financeiro"], ["Automação com falha", "Alerta técnico"],
];

export default async function Automacoes() {
  const ctx = await requireStaff("ADMIN");
  const stats = await automationStats(ctx.tenant.id);
  const tz = ctx.tenant.timezone;
  const when = (d: Date | null) => (d ? formatDateTime(d, tz, { dateStyle: "short" }) : "—");
  return (
    <div className="space-y-6">
      <PageTitle title="Central de Automações" subtitle="Mensagens automáticas em funcionamento. Canal atual: e-mail (WhatsApp quando a conta oficial for aprovada)." />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr><th className="px-5 py-3 font-normal">Automação</th><th className="font-normal">Gatilho</th><th className="font-normal">Quando</th><th className="font-normal">Para</th><th className="font-normal">Execuções</th><th className="font-normal">Falhas</th><th className="font-normal">Última</th><th className="px-5 font-normal">Próxima</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {stats.map((a) => (
              <tr key={a.template}>
                <td className="px-5 py-3"><span className="font-medium">{a.name}</span> <Badge tone="good">Ativa</Badge></td>
                <td>{a.trigger}</td><td>{a.wait}</td><td>{a.recipient}</td>
                <td className="tabular-nums">{a.sent}</td>
                <td className="tabular-nums">{a.failed ? <Link className="text-red-700 underline" href="/admin/mensagens?status=DEAD">{a.failed}</Link> : 0}</td>
                <td>{when(a.lastRun)}</td><td className="px-5">{when(a.nextRun)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg">Próximos gatilhos</h2><Badge tone="warn">Etapa 3</Badge></div>
        <ul className="grid gap-x-6 gap-y-1 text-sm text-muted sm:grid-cols-2">{PLANNED.map(([t, a]) => <li key={t}>○ {t} → {a}</li>)}</ul>
        <p className="mt-3 text-xs text-muted">Na Etapa 3 cada automação poderá ser ligada e desligada, com condições, espera, canal e modelo de mensagem editáveis, e integração com n8n.</p>
      </Card>
    </div>
  );
}
