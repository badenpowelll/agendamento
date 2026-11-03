import Link from "next/link";
import { requireStaff } from "@/lib/staff-session";
import { staffLogout } from "@/app/actions/staff-auth";

type Item = { href: string; label: string; soon?: boolean };
const NAV: { group: string; items: Item[] }[] = [
  { group: "Operação", items: [
    { href: "/admin", label: "Visão geral" },
    { href: "/admin/agenda", label: "Agenda" },
    { href: "/admin/clientes", label: "Clientes" },
    { href: "/admin/servicos", label: "Serviços" },
    { href: "/admin/profissionais", label: "Profissionais" },
  ] },
  { group: "Gestão", items: [
    { href: "/admin/pdv", label: "PDV", soon: true },
    { href: "/admin/financeiro", label: "Financeiro", soon: true },
    { href: "/admin/estoque", label: "Estoque", soon: true },
    { href: "/admin/pacotes", label: "Pacotes", soon: true },
  ] },
  { group: "Relacionamento", items: [
    { href: "/admin/fidelizacao", label: "Fidelização", soon: true },
    { href: "/admin/retornos", label: "Retornos" },
    { href: "/admin/automacoes", label: "Automações" },
    { href: "/admin/mensagens", label: "Mensagens" },
  ] },
  { group: "Crescimento", items: [
    { href: "/admin/inteligencia-receita", label: "Inteligência de Receita" },
    { href: "/admin/assistente-ia", label: "Assistente IA", soon: true },
    { href: "/admin/marketing", label: "Marketing", soon: true },
    { href: "/admin/relatorios", label: "Relatórios" },
  ] },
  { group: "Administração", items: [
    { href: "/admin/site", label: "Site" },
    { href: "/admin/equipe", label: "Equipe" },
    { href: "/admin/configuracoes", label: "Configurações" },
    { href: "/admin/auditoria", label: "Auditoria" },
  ] },
];

const ROLE_LABEL = { OWNER: "Gestora", ADMIN: "Administradora", STAFF: "Colaboradora" } as const;

export const metadata = { title: "Painel", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireStaff();
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="border-b border-line bg-white lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:overflow-y-auto lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between bg-gradient-to-br from-brand to-brand-dark px-4 py-3 text-white lg:block lg:py-5">
          <Link href="/admin" className="font-display text-lg">Painel {ctx.tenant.name}</Link>
          <p className="hidden text-xs text-white/80 lg:mt-1 lg:block">{ctx.staff.name} · {ROLE_LABEL[ctx.role]}</p>
        </div>
        <nav aria-label="Painel" className="flex gap-1 overflow-x-auto px-2 pb-2 text-sm lg:flex-col lg:px-3">
          {NAV.map((g) => (
            <div key={g.group} className="flex gap-1 lg:block lg:pb-2">
              <p className="hidden px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted/70 lg:block">{g.group}</p>
              {g.items.map((n) => (
                <Link key={n.href} href={n.href} className="flex items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-muted hover:bg-blush hover:text-ink">
                  {n.label}
                  {n.soon && <span className="rounded-full bg-blush px-1.5 text-[10px] text-brand">em breve</span>}
                </Link>
              ))}
            </div>
          ))}
          <div className="flex gap-1 lg:block lg:pt-4">
            <Link href="/" className="block whitespace-nowrap rounded-lg px-3 py-2 text-muted hover:bg-blush">Ver site</Link>
            <Link href="/admin/senha" className="block whitespace-nowrap rounded-lg px-3 py-2 text-muted hover:bg-blush">Trocar senha</Link>
            <form action={staffLogout}><button className="whitespace-nowrap rounded-lg lg:w-full px-3 py-2 text-left text-muted hover:bg-blush">Sair</button></form>
          </div>
        </nav>
      </aside>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}
