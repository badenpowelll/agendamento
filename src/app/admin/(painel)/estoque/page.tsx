import { requireStaff } from "@/lib/staff-session";
import { PlannedModule } from "@/components/planned-module";

export default async function Page() {
  await requireStaff("STAFF");
  return (
    <PlannedModule
      title="Estoque" stage="Etapa 2 — Controlar o dinheiro"
      summary="Produtos de venda e insumos usados nos procedimentos."
      groups={[
        { title: "Cadastros", items: ["Produtos e insumos", "Fornecedores", "Lotes e validade"] },
        { title: "Movimentação", items: ["Entradas e saídas", "Baixa automática por procedimento", "Inventário e histórico"] },
        { title: "Alertas", items: ["Estoque mínimo", "Produtos perto do vencimento"] },
      ]}
    />
  );
}
