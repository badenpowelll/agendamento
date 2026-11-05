import { getTenant } from "@/lib/context";
import { getSite, whatsappLink } from "@/lib/site";
import { forTenant } from "@/lib/tenant-db";
import { formatBRL } from "@/lib/money";
import { ButtonLink, Card, EmptyState } from "@/components/ui";
import { InstagramIcon, instagramHandle } from "@/components/instagram";

export default async function Home() {
  const tenant = await getTenant();
  const site = await getSite();
  const services = await forTenant(tenant.id).service.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const gallery = site.gallery.filter((g) => g.authorized && g.url);
  const testimonials = site.testimonials.filter((t) => t.authorized && t.text);

  const wa = site.contact.whatsapp ? whatsappLink(site.contact.whatsapp, site.contact.whatsappMessage || undefined) : "";
  const igHandle = instagramHandle(site.contact.instagram);
  const photos = gallery.slice(0, 5);

  return (
    <div className="space-y-20 pb-10">
      <section className="relative mx-[calc(50%-50vw)] overflow-hidden bg-gradient-to-br from-blush/80 via-cream/70 to-rose/50 px-4 py-14 sm:py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="text-center md:text-left">
            <p className="inline-block rounded-full bg-white/80 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-brand">Depilação e Estética</p>
            <h1 className="mt-5 font-display text-4xl leading-tight text-ink sm:text-6xl">{site.brand.displayName}</h1>
            {site.brand.tagline && <p className="mt-4 max-w-xl text-lg text-muted md:mx-0 mx-auto">{site.brand.tagline}</p>}
            <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
              <ButtonLink href="/agendar" className="px-7 py-3 text-base shadow-lg shadow-brand/25">Agendar meu horário</ButtonLink>
              {wa && (
                <ButtonLink data-wa href={wa} variant="secondary" className="px-7 py-3 text-base" target="_blank" rel="noopener noreferrer">
                  Falar no WhatsApp
                </ButtonLink>
              )}
            </div>
            {site.contact.instagram && (
              <a href={site.contact.instagram} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
                <InstagramIcon /> {igHandle ? `@${igHandle}` : "Instagram"}
              </a>
            )}
          </div>
          <div className={photos[0] || site.brand.watermarkUrl ? "relative mx-auto w-full max-w-[16rem] md:max-w-sm" : "relative mx-auto hidden w-full max-w-sm md:block"}>
            <div className={photos[0] ? "absolute -inset-3 rotate-3 rounded-[2rem] bg-brand/20" : "absolute -inset-3 rounded-full bg-brand/15"} aria-hidden />
            {photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos[0].url} alt={photos[0].alt} className="relative aspect-[4/5] w-full rounded-[2rem] object-cover shadow-xl" />
            ) : site.brand.watermarkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.brand.watermarkUrl} alt={`Selo ${site.brand.displayName}`} className="relative aspect-square w-full rounded-full bg-white/90 object-contain p-3 shadow-xl" />
            ) : (
              <div className="relative flex aspect-[4/5] w-full flex-col items-center justify-center rounded-[2rem] bg-gradient-to-b from-brand to-brand-dark p-8 text-center text-white shadow-xl">
                <p className="font-display text-3xl">{site.brand.displayName}</p>
                <p className="mt-2 text-sm uppercase tracking-[0.2em] text-white/80">Depilação e Estética</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="como-funciona" className="mx-auto max-w-5xl">
        <h2 id="como-funciona" className="text-center font-display text-3xl">Como agendar</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["1", "Escolha o serviço", "Veja a lista de serviços e escolha o que deseja."],
            ["2", "Escolha dia e horário", "Só aparecem horários realmente livres na agenda."],
            ["3", "Receba a confirmação", "Você recebe a confirmação e um lembrete antes do atendimento."],
          ].map(([n, t, d]) => (
            <li key={n} className="rounded-3xl border border-line bg-white p-6 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blush font-display text-lg text-brand">{n}</span>
              <p className="mt-3 font-medium">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {(site.about.title || site.about.text) && (
        <section aria-labelledby="sobre" className="mx-auto max-w-2xl text-center">
          <h2 id="sobre" className="font-display text-3xl">{site.about.title || "Sobre"}</h2>
          <p className="mt-4 whitespace-pre-line text-muted">{site.about.text}</p>
        </section>
      )}

      <section id="servicos" aria-labelledby="servicos-titulo" className="mx-auto max-w-5xl scroll-mt-20">
        <h2 id="servicos-titulo" className="text-center font-display text-3xl">Serviços</h2>
        {services.length === 0 ? (
          <div className="mt-6"><EmptyState>Os serviços serão publicados em breve.</EmptyState></div>
        ) : (
          <>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {groupByCategory(services).map(([cat, list]) => (
              <Card key={cat || "_"} className="h-full">
                {cat && <h3 className="mb-3 font-display text-xl text-brand">{cat}</h3>}
                <ul className="divide-y divide-line">
                  {list.map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        {s.durationMin >= 5 ? (
                          <a href={`/agendar?servico=${s.id}`} className="font-medium text-ink hover:text-brand">{s.name}</a>
                        ) : (
                          <span className="font-medium text-ink">{s.name}</span>
                        )}
                        {s.description && <p className="text-xs text-muted">{s.description}</p>}
                      </div>
                      <span className="flex flex-col items-end gap-0.5">
                        <span className="whitespace-nowrap font-medium text-brand">{formatBRL(s.priceCents)}</span>
                        {wa && <a data-wa data-wa-service={s.name} data-wa-reason={s.durationMin >= 5 ? "info" : "agendar"} href={wa} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-xs text-muted hover:text-brand">Chamar no WhatsApp</a>}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          {site.payment.methods && <p className="mt-4 text-center text-sm text-muted">Formas de pagamento: {site.payment.methods}</p>}
          <div className="mt-6 text-center"><a href="/agendar" className="inline-block rounded-full bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark">Agendar horário</a></div>
          </>
        )}
      </section>

      {(photos.length > 0 || site.contact.instagram) && (
        <section aria-labelledby="galeria" className="mx-auto max-w-5xl">
          <h2 id="galeria" className="text-center font-display text-3xl">No Instagram</h2>
          {igHandle && <p className="mt-2 text-center text-muted">Acompanhe os resultados e novidades em @{igHandle}</p>}
          {photos.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {photos.map((g, i) => (
                <a key={i} href={site.contact.instagram || g.url} target="_blank" rel="noopener noreferrer" className={i === 0 ? "col-span-2 sm:col-span-1" : ""}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.url} alt={g.alt} loading="lazy" className="aspect-square w-full rounded-2xl object-cover transition hover:opacity-90" />
                </a>
              ))}
            </div>
          )}
          {site.contact.instagram && (
            <div className="mt-8 text-center">
              <ButtonLink href={site.contact.instagram} target="_blank" rel="noopener noreferrer" className="px-6 py-3">
                <InstagramIcon /> Seguir no Instagram
              </ButtonLink>
            </div>
          )}
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

      <section id="contato" aria-labelledby="contato-titulo" className="mx-auto max-w-5xl scroll-mt-20">
        <Card className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <h2 id="contato-titulo" className="font-display text-3xl">Contato</h2>
            {site.contact.address ? <p className="mt-3 text-muted">{site.contact.address}</p> : <p className="mt-3 text-muted">Endereço em breve.</p>}
            {site.contact.hoursText && <p className="mt-2 whitespace-pre-line text-sm text-muted">{site.contact.hoursText}</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              {site.contact.mapsUrl && <ButtonLink href={site.contact.mapsUrl} variant="secondary" target="_blank" rel="noopener noreferrer">Ver no mapa</ButtonLink>}
              {site.contact.instagram && <ButtonLink href={site.contact.instagram} variant="secondary" target="_blank" rel="noopener noreferrer">Instagram</ButtonLink>}
              {site.contact.whatsapp && <ButtonLink data-wa href={wa} variant="secondary" target="_blank" rel="noopener noreferrer">WhatsApp</ButtonLink>}
            </div>
            {site.contact.reviewUrl && (
              <a href={site.contact.reviewUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#f4b400]/60 bg-white px-5 py-2.5 text-sm font-medium text-ink shadow-sm hover:border-[#f4b400]">
                <span className="text-base leading-none text-[#f4b400]" aria-hidden>★★★★★</span> Avalie a gente no Google
              </a>
            )}
          </div>
          <div className="flex flex-col justify-center rounded-2xl bg-blush p-6 text-center">
            <p className="font-display text-2xl">Pronta para agendar?</p>
            <p className="mt-2 text-sm text-muted">Escolha o serviço, o dia e o horário em menos de um minuto.</p>
            <ButtonLink href="/agendar" className="mx-auto mt-5">Agendar agora</ButtonLink>
          </div>
        </Card>
      </section>
    </div>
  );
}

function groupByCategory<T extends { category: string | null }>(list: T[]): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const s of list) {
    const k = s.category?.trim() || "";
    m.set(k, [...(m.get(k) ?? []), s]);
  }
  return [...m.entries()];
}
