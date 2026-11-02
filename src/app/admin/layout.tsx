import Link from "next/link";
import { requireStaff } from "@/lib/context";
import { signOutAction } from "@/app/actions/customer";

const NAV = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/servicos", label: "Serviços" },
  { href: "/admin/profissionais", label: "Profissionais" },
  { href: "/admin/mensagens", label: "Mensagens" },
  { href: "/admin/site", label: "Site" },
  { href: "/admin/configuracoes", label: "Configurações" },
  { href: "/admin/auditoria", label: "Auditoria" },
];
// Fases seguintes: PDV, Financeiro, Estoque, Pacotes, Fidelização, Automações, Inteligência de Receita, Assistente IA, Marketing, Relatórios

export const metadata = { title: "Painel", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireStaff();
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="border-b border-line bg-white lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-3 lg:block lg:py-5">
          <Link href="/admin" className="font-display text-lg">Painel {ctx.tenant.name}</Link>
          <p className="hidden text-xs text-muted lg:mt-1 lg:block">{ctx.user.email} · {ctx.role}</p>
        </div>
        <nav aria-label="Painel" className="flex gap-1 overflow-x-auto px-2 pb-2 text-sm lg:flex-col lg:px-3">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-muted hover:bg-cream hover:text-ink">{n.label}</Link>
          ))}
          <div className="hidden pt-4 lg:block">
            <Link href="/" className="block rounded-lg px-3 py-2 text-muted hover:bg-cream">Ver site</Link>
            <form action={signOutAction}><button className="w-full rounded-lg px-3 py-2 text-left text-muted hover:bg-cream">Sair</button></form>
          </div>
        </nav>
      </aside>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}
