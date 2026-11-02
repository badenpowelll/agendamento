import Link from "next/link";
import { getContext } from "@/lib/context";
import { getStaff } from "@/lib/staff-session";
import { getSite } from "@/lib/site";
import { ButtonLink } from "./ui";

export async function SiteHeader() {
  const [site, ctx, staff] = await Promise.all([getSite(), getContext(), getStaff()]);
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2" aria-label="Página inicial">
          {site.brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.brand.logoUrl} alt={site.brand.displayName} className="h-9 w-auto" />
          ) : (
            <span className="font-display text-xl text-ink">{site.brand.displayName}</span>
          )}
        </Link>
        <nav className="flex items-center gap-1 text-sm" aria-label="Principal">
          <Link href="/#servicos" className="hidden rounded-full px-3 py-2 text-muted hover:text-ink sm:inline">Serviços</Link>
          <Link href="/#contato" className="hidden rounded-full px-3 py-2 text-muted hover:text-ink sm:inline">Contato</Link>
          {staff && <Link href="/admin" className="rounded-full px-3 py-2 text-muted hover:text-ink">Painel</Link>}
          {ctx.user ? (
            <Link href="/minha-conta" className="rounded-full px-3 py-2 text-muted hover:text-ink">Minha conta</Link>
          ) : (
            <Link href="/entrar" className="rounded-full px-3 py-2 text-muted hover:text-ink">Entrar</Link>
          )}
          <ButtonLink href="/agendar" className="px-4 py-2">Agendar</ButtonLink>
        </nav>
      </div>
    </header>
  );
}
