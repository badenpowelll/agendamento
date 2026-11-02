import { requireStaff } from "@/lib/staff-session";
import { PlannedModule } from "@/components/planned-module";

export default async function Page() {
  await requireStaff("ADMIN");
  return (
    <PlannedModule
      title="Fidelização" stage="Etapa 3 — Reduzir trabalho manual"
      summary="Trazer a cliente de volta no momento certo, com regras transparentes."
      groups={[
        { title: "Segmentos", items: ["Nova, recorrente e inativa", "Retorno previsto por serviço", "Alto ticket e aniversariantes"] },
        { title: "Ações", items: ["Cupons e programa de pontos", "Retorno programado", "Indicações com regras claras", "Pesquisa de satisfação"] },
      ]}
      note="Campanhas só são enviadas para clientes que aceitaram receber promoções."
    />
  );
}
