import { getTenant } from "@/lib/context";
import { getSite, whatsappLink } from "@/lib/site";
import { forTenant } from "@/lib/tenant-db";
import { formatBRL } from "@/lib/money";
import { ButtonLink, Card, EmptyState } from "@/components/ui";

export default async function Home() {
  const tenant = await getTenant();
  const site = await getSite();
  const services = await forTenant(tenant.id).service.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const gallery = site.gallery.filter((g) => g.authorized && g.url);
  const testimonials = site.testimonials.filter((t) => t.authorized && t.text);

  return (
    <div className="space-y-16 py-10 sm:py-16">
      <section className="text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-brand">Depilação e Estética</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-ink sm:text-6xl">{site.brand.displayName}</h1>
        {site.brand.tagline && <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{site.brand.tagline}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/agendar" className="px-7 py-3 text-base">Agendar meu horário</ButtonLink>
          {site.contact.whatsapp && (
            <ButtonLink href={whatsappLink(site.contact.whatsapp, "Olá! Gostaria de tirar uma dúvida.")} variant="secondary" className="px-7 py-3 text-base" target="_blank" rel="noopener noreferrer">
              Falar no WhatsApp
            </ButtonLink>
          )}
        </div>
      </section>

      {(site.about.title || site.about.text) && (
        <section aria-labelledby="sobre" className="mx-auto max-w-2xl text-center">
          <h2 id="sobre" className="font-display text-3xl">{site.about.title || "Sobre"}</h2>
          <p className="mt-4 whitespace-pre-line text-muted">{site.about.text}</p>
        </section>
      )}

      <section id="servicos" aria-labelledby="servicos-titulo" className="scroll-mt-20">
        <h2 id="servicos-titulo" className="text-center font-display text-3xl">Serviços</h2>
        {services.length === 0 ? (
          <div className="mt-6"><EmptyState>Os serviços serão publicados em breve.</EmptyState></div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {services.map((s) => (
              <li key={s.id}>
                <Card className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium text-ink">{s.name}</h3>
                    <span className="whitespace-nowrap font-medium text-brand">{formatBRL(s.priceCents)}</span>
                  </div>
                  {s.description && <p className="mt-2 text-sm text-muted">{s.description}</p>}
                  <div className="mt-auto flex items-center justify-between pt-4 text-sm">
                    <span className="text-muted">{s.durationMin} min</span>
                    <a className="font-medium text-brand hover:underline" href={`/agendar?servico=${s.id}`}>Agendar →</a>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {gallery.length > 0 && (
        <section aria-labelledby="galeria">
          <h2 id="galeria" className="text-center font-display text-3xl">Galeria</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((g, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={g.url} alt={g.alt} loading="lazy" className="aspect-square w-full rounded-2xl object-cover" />
            ))}
          </div>
        </section>
      )}

      {testimonials.length > 0 && (
        <section aria-labelledby="avaliacoes">
          <h2 id="avaliacoes" className="text-center font-display text-3xl">Avaliações</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {testimonials.map((t, i) => (
              <li key={i}><Card><blockquote className="text-muted">“{t.text}”</blockquote><p className="mt-3 text-sm font-medium">{t.author}</p></Card></li>
            ))}
          </ul>
        </section>
      )}

      {site.faq.length > 0 && (
        <section aria-labelledby="faq" className="mx-auto max-w-2xl">
          <h2 id="faq" className="text-center font-display text-3xl">Perguntas frequentes</h2>
          <div className="mt-8 space-y-3">
            {site.faq.map((f, i) => (
              <details key={i} className="group rounded-2xl border border-line bg-white px-5 py-4">
                <summary className="cursor-pointer list-none font-medium">{f.q}</summary>
                <p className="mt-2 whitespace-pre-line text-sm text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <section id="contato" aria-labelledby="contato-titulo" className="scroll-mt-20">
        <Card className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <h2 id="contato-titulo" className="font-display text-3xl">Contato</h2>
            {site.contact.address ? <p className="mt-3 text-muted">{site.contact.address}</p> : <p className="mt-3 text-muted">Endereço em breve.</p>}
            {site.contact.hoursText && <p className="mt-2 whitespace-pre-line text-sm text-muted">{site.contact.hoursText}</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              {site.contact.mapsUrl && <ButtonLink href={site.contact.mapsUrl} variant="secondary" target="_blank" rel="noopener noreferrer">Ver no mapa</ButtonLink>}
              {site.contact.instagram && <ButtonLink href={site.contact.instagram} variant="secondary" target="_blank" rel="noopener noreferrer">Instagram</ButtonLink>}
              {site.contact.whatsapp && <ButtonLink href={whatsappLink(site.contact.whatsapp)} variant="secondary" target="_blank" rel="noopener noreferrer">WhatsApp</ButtonLink>}
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-2xl bg-cream p-6 text-center">
            <p className="font-display text-2xl">Pronta para agendar?</p>
            <p className="mt-2 text-sm text-muted">Escolha o serviço, o dia e o horário em menos de um minuto.</p>
            <ButtonLink href="/agendar" className="mx-auto mt-5">Agendar agora</ButtonLink>
          </div>
        </Card>
      </section>
    </div>
  );
}
