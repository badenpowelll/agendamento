import { requireStaff } from "@/lib/staff-session";
import { PlannedModule } from "@/components/planned-module";

export default async function Page() {
  await requireStaff("ADMIN");
  return (
    <PlannedModule
      title="Assistente IA" stage="Etapa 4 — Aumentar o faturamento"
      summary="Assistente Milly 360° para clientes e para a gestão, com permissões limitadas."
      groups={[
        { title: "Para a cliente", items: ["Dúvidas sobre serviços e políticas", "Consulta de horários e ajuda para agendar", "Transferência para atendimento humano"] },
        { title: "Para a gestão", items: ["Resumo dos indicadores", "Padrões de faltas e cancelamentos", "Sugestões de horários para campanhas"] },
        { title: "Limites", items: ["Não confirma pagamentos nem dá descontos", "Não acessa dados de outras clientes", "Não faz orientação clínica", "Toda alteração passa pelas regras do sistema"] },
      ]}
    />
  );
}
