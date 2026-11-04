import Link from "next/link";
import { getSite, whatsappLink } from "@/lib/site";
import { WhatsappIcon } from "./instagram";
import { WhatsappComposer } from "./whatsapp-composer";
import { getContext, getTenant } from "@/lib/context";
import { forTenant } from "@/lib/tenant-db";

export async function SiteFooter() {
  const site = await getSite();
  const tenant = await getTenant();
  const [services, ctx] = await Promise.all([
    forTenant(tenant.id).service.findMany({ where: { active: true }, select: { name: true, category: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    getContext().catch(() => null),
  ]);
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 text-sm text-muted sm:grid-cols-3">
        <div>
          <p className="font-display text-lg text-ink">{site.brand.displayName}</p>
          {site.legal.companyName && <p className="mt-1">{site.legal.companyName}{site.legal.document ? ` · CNPJ ${site.legal.document}` : ""}</p>}
          {site.contact.address && <p className="mt-1">{site.contact.address}</p>}
        </div>
        <ul className="space-y-1.5">
          {site.contact.instagram && <li><a className="hover:text-ink" href={site.contact.instagram} target="_blank" rel="noopener noreferrer">Instagram{site.contact.instagram.match(/instagram\.com\/([\w.]+)/) ? ` @${site.contact.instagram.match(/instagram\.com\/([\w.]+)/)![1]}` : ""}</a></li>}
          {site.contact.whatsapp && <li><a data-wa className="hover:text-ink" href={whatsappLink(site.contact.whatsapp, site.contact.whatsappMessage || undefined)} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
          {site.contact.email && <li><a className="hover:text-ink" href={`mailto:${site.contact.email}`}>{site.contact.email}</a></li>}
        </ul>
        <ul className="space-y-1.5">
          <li><Link className="hover:text-ink" href="/privacidade">Política de privacidade</Link></li>
          <li><Link className="hover:text-ink" href="/termos">Termos e condições</Link></li>
          <li className="pt-2 text-xs">© {year} {site.brand.displayName}</li>
        </ul>
      </div>
      {site.contact.whatsapp && (
        <a
          data-wa
          href={whatsappLink(site.contact.whatsapp, site.contact.whatsappMessage || undefined)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar no WhatsApp"
          className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg transition hover:scale-105"
        >
          <WhatsappIcon />
        </a>
      )}
      {site.contact.whatsapp && <WhatsappComposer phone={site.contact.whatsapp} services={services} defaultName={ctx?.customer?.name} />}
    </footer>
  );
}
