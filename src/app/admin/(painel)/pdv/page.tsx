import { requireStaff } from "@/lib/staff-session";
import { PlannedModule } from "@/components/planned-module";

export default async function Page() {
  await requireStaff("STAFF");
  return (
    <PlannedModule
      title="PDV" stage="Etapa 2 — Controlar o dinheiro"
      summary="Caixa e vendas de serviços e produtos, integrado à agenda, ao financeiro e ao estoque."
      groups={[
        { title: "Caixa", items: ["Abertura e fechamento com conferência", "Sangria e suprimento", "Diferença entre esperado e contado"] },
        { title: "Comanda e venda", items: ["Comanda aberta quando a cliente chega", "Serviços e produtos no mesmo carrinho", "Descontos com autorização da gestora"] },
        { title: "Pagamentos", items: ["Pix, cartão e dinheiro", "Pagamentos mistos, parciais e sinais", "Estornos com histórico (nada é apagado)"] },
        { title: "Integrações", items: ["Gera contas a receber automaticamente", "Baixa de estoque por produto e por procedimento", "Comprovante e emissão fiscal por integração"] },
      ]}
      note="Antes de construir, será auditado o PDV desenvolvido para a Atech (arquitetura, licença e direitos de reuso)."
    />
  );
}
