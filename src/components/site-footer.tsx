import Link from "next/link";
import { getSite, whatsappLink } from "@/lib/site";

export async function SiteFooter() {
  const site = await getSite();
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
          {site.contact.instagram && <li><a className="hover:text-ink" href={site.contact.instagram} target="_blank" rel="noopener noreferrer">Instagram</a></li>}
          {site.contact.whatsapp && <li><a className="hover:text-ink" href={whatsappLink(site.contact.whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
          {site.contact.email && <li><a className="hover:text-ink" href={`mailto:${site.contact.email}`}>{site.contact.email}</a></li>}
        </ul>
        <ul className="space-y-1.5">
          <li><Link className="hover:text-ink" href="/privacidade">Política de privacidade</Link></li>
          <li><Link className="hover:text-ink" href="/termos">Termos e condições</Link></li>
          <li className="pt-2 text-xs">© {year} {site.brand.displayName}</li>
        </ul>
      </div>
    </footer>
  );
}
