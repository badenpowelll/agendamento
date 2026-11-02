import { requireStaff } from "@/lib/staff-session";
import { PlannedModule } from "@/components/planned-module";

export default async function Page() {
  await requireStaff("STAFF");
  return (
    <PlannedModule
      title="Pacotes" stage="Etapa 2 — Controlar o dinheiro"
      summary="Pacotes de sessões vendidos à cliente e consumidos a cada atendimento."
      groups={[
        { title: "Venda", items: ["Pacotes com quantidade de sessões e validade", "Pagamento à vista, parcelado ou com sinal"] },
        { title: "Uso", items: ["Sessões consumidas automaticamente ao concluir o atendimento", "Saldo visível na área da cliente", "Aviso de pacote perto do vencimento"] },
      ]}
    />
  );
}
