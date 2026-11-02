import { requireStaff } from "@/lib/staff-session";
import { PlannedModule } from "@/components/planned-module";

export default async function Page() {
  await requireStaff("ADMIN");
  return (
    <PlannedModule
      title="Financeiro" stage="Etapa 2 — Controlar o dinheiro"
      summary="Separa o que está previsto, o que foi faturado e o que de fato entrou no caixa."
      groups={[
        { title: "Contas a receber", items: ["Serviços, produtos e pacotes", "Sinais e parcelamentos", "Inadimplência"] },
        { title: "Contas a pagar", items: ["Fornecedores, aluguel, água, energia, internet", "Materiais, marketing e taxas", "Lançamentos recorrentes e alertas de vencimento"] },
        { title: "Gestão", items: ["Fluxo de caixa e projeção", "Demonstrativo de resultado gerencial", "Comparativo mensal e exportação para conciliação"] },
        { title: "Rentabilidade", items: ["Ficha técnica por serviço (insumos, taxas, comissão)", "Margem de contribuição por procedimento", "Alerta de preço abaixo do custo"] },
      ]}
    />
  );
}
