import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { SiteHeader } from "@/components/landing/site-header";
import { PiedeMarketing } from "@/components/landing/piede";
import { SchedaArticolo } from "@/components/blog/scheda-articolo";
import { ContenutoArticolo } from "@/components/blog/contenuto-articolo";
import { articoloBlog, slugBlog, slugSostitutivo, blogVisibileAiMotori } from "@/features/blog/fonte";
import { dataItaliana, soloGiorno } from "@/features/blog/data";
import { soloTesto } from "@/features/blog/sanitize";
import { ArrowLeft } from "lucide-react";

const APP = (process.env.NEXT_PUBLIC_APP_URL ?? "https://evalisdeck.it").replace(/\/$/, "");

/** Un articolo pubblicato dopo l'ultima compilazione deve funzionare subito, non dare
 *  404: la pagina si genera alla prima richiesta e poi resta in cache. */
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { isEnabled: bozza } = await draftMode();
  const trovato = await articoloBlog(slug, { bozza });
  if (!trovato) return { title: "Articolo" };
  const { articolo: a, seo } = trovato;

  // Una bozza non deve MAI finire in un indice, nemmeno se qualcuno ne condivide l'URL.
  if (bozza) return { title: `[BOZZA] ${a.title}`, robots: { index: false, follow: false } };

  const titolo = seo.title ?? a.title;
  const descrizione = seo.description ?? a.excerpt;
  const immagine = seo.ogImage ?? (a.image?.startsWith("http") ? a.image : a.image ? `${APP}${a.image}` : undefined);

  return {
    title: titolo,
    description: descrizione,
    // Il canonical arriva da `seo.ts`, che lo FORZA sul dominio pubblico: Yoast lo
    // genererebbe puntato al CMS, e dichiarare a Google che l'originale sta su un
    // dominio chiuso e noindex ci deindicizzerebbe.
    alternates: { canonical: seo.canonical },
    robots: blogVisibileAiMotori() ? undefined : { index: false, follow: false },
    openGraph: {
      type: "article",
      title: seo.ogTitle ?? a.title,
      description: seo.ogDescription ?? descrizione,
      url: seo.canonical,
      images: immagine ? [{ url: immagine }] : undefined,
      publishedTime: a.date || undefined,
      modifiedTime: a.dateModified,
      authors: a.author ? [a.author] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.ogTitle ?? a.title,
      description: seo.ogDescription ?? descrizione,
      images: immagine ? [immagine] : undefined,
    },
  };
}

export async function generateStaticParams() {
  const slug = await slugBlog();
  return slug.map((s) => ({ slug: s }));
}

export default async function ArticoloPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { isEnabled: bozza } = await draftMode();
  const trovato = await articoloBlog(slug, { bozza });

  if (!trovato) {
    // Prima di dire 404: il redattore potrebbe aver rinominato l'articolo. Se lo slug è
    // solo vecchio si risponde 301 verso quello nuovo, e non si perde l'indicizzazione.
    const nuovo = await slugSostitutivo(slug);
    if (nuovo) permanentRedirect(`/blog/${nuovo}`);
    notFound();
  }

  const { articolo: a, correlati } = trovato;

  const datiStrutturati = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.excerpt || soloTesto(a.content).slice(0, 200),
    image: a.image ? (a.image.startsWith("http") ? a.image : `${APP}${a.image}`) : undefined,
    datePublished: soloGiorno(a.date),
    dateModified: soloGiorno(a.dateModified) ?? soloGiorno(a.date),
    articleSection: a.category,
    // L'autore punta alla sua pagina quando esiste: è il collegamento che regge l'E-E-A-T.
    author: a.autore?.slug
      ? { "@type": "Person", name: a.autore.nome, url: `${APP}/blog/autore/${a.autore.slug}` }
      : { "@type": "Person", name: a.author },
    publisher: { "@type": "Organization", name: "Evalis Srl", url: APP },
    mainEntityOfPage: `${APP}/blog/${a.slug}`,
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      {/* Lo schema Article NON si emette per una bozza: descriverebbe a Google una
          pagina che non esiste ancora. */}
      {!bozza && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(datiStrutturati) }}
        />
      )}

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14">
        <Link
          href="/blog"
          className="tocco-comodo inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Tutti gli articoli
        </Link>

        <p className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          {a.category}
          <span className="font-normal normal-case tracking-normal text-muted-foreground">
            {dataItaliana(a.date)} · {a.readTime}
          </span>
        </p>

        <h1 className="font-display mt-4 text-[32px] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[40px]">
          {a.title}
        </h1>

        {a.excerpt && <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">{a.excerpt}</p>}

        {a.autore?.nome && (
          <div className="mt-6 flex items-center gap-3 border-y py-4">
            <div className="min-w-0">
              <p className="text-[14px] font-medium">
                {a.autore.slug ? (
                  <Link href={`/blog/autore/${a.autore.slug}`} className="hover:text-primary hover:underline">
                    {a.autore.nome}
                  </Link>
                ) : (
                  a.autore.nome
                )}
              </p>
              {a.autore.ruolo && <p className="text-[12.5px] text-muted-foreground">{a.autore.ruolo}</p>}
            </div>
          </div>
        )}

        {a.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.image}
            alt=""
            className="mt-8 w-full rounded-xl border"
            loading="eager"
            decoding="async"
          />
        )}

        <div className="mt-10">
          <ContenutoArticolo html={a.content} />
        </div>

        {correlati.length > 0 && (
          <section className="mt-16 border-t pt-10" aria-label="Articoli correlati">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Da leggere dopo</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {correlati.map((c) => (
                <SchedaArticolo key={c.slug} articolo={c} />
              ))}
            </div>
          </section>
        )}
      </main>

      {bozza && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-sidebar px-4 py-3 text-sm text-sidebar-foreground print:hidden">
          <span>
            Stai vedendo una <strong className="text-white">bozza</strong>, non l&apos;articolo pubblicato.
          </span>
          <Link href="/api/blog/preview/esci" className="underline hover:no-underline">
            Esci dall&apos;anteprima
          </Link>
        </div>
      )}

      <PiedeMarketing />
    </div>
  );
}
