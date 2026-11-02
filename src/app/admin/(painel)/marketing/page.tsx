import { requireStaff } from "@/lib/staff-session";
import { PlannedModule } from "@/components/planned-module";

export default async function Page() {
  await requireStaff("ADMIN");
  return (
    <PlannedModule
      title="Marketing" stage="Etapa 4 — Aumentar o faturamento"
      summary="De onde vêm as clientes e quanto cada campanha traz."
      groups={[
        { title: "Origem", items: ["Origem dos agendamentos (site, Instagram, WhatsApp, equipe)", "Links com parâmetros UTM", "Conversão de visitantes em agendamentos"] },
        { title: "Resultados", items: ["Clientes novas, retenção e reativação", "Receita por campanha", "Cupons utilizados"] },
      ]}
      note="A origem site/equipe já é registrada em cada reserva e aparece em Relatórios."
    />
  );
}
