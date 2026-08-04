import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/landing/site-header";
import { PiedeMarketing } from "@/components/landing/piede";
import { SchedaArticolo } from "@/components/blog/scheda-articolo";
import { autoreBlog, slugAutoriBlog, blogVisibileAiMotori } from "@/features/blog/fonte";
import { ArrowLeft } from "lucide-react";

const APP = (process.env.NEXT_PUBLIC_APP_URL ?? "https://evalisdeck.it").replace(/\/$/, "");

// La pagina dell'autore.
//
// Non è un vezzo: è il collegamento che regge l'E-E-A-T. Un articolo che dichiara un
// autore la cui pagina non esiste è una firma che non porta da nessuna parte, e il
// controllo automatico lo segnala.

export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const trovato = await autoreBlog(slug);
  if (!trovato) return { title: "Autore" };
  const { autore } = trovato;
  return {
    title: autore.nome,
    description: autore.bio || `Articoli scritti da ${autore.nome}.`,
    alternates: { canonical: `${APP}/blog/autore/${autore.slug}` },
    robots: blogVisibileAiMotori() ? undefined : { index: false, follow: false },
  };
}

export async function generateStaticParams() {
  const slug = await slugAutoriBlog();
  return slug.map((s) => ({ slug: s }));
}

export default async function AutorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trovato = await autoreBlog(slug);
  if (!trovato) notFound();
  const { autore, articoli } = trovato;

  const datiStrutturati = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: autore.nome,
    ...(autore.ruolo ? { jobTitle: autore.ruolo } : {}),
    ...(autore.bio ? { description: autore.bio } : {}),
    url: `${APP}/blog/autore/${autore.slug}`,
    worksFor: { "@type": "Organization", name: "Evalis Srl", url: APP },
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datiStrutturati) }} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14">
        <Link
          href="/blog"
          className="tocco-comodo inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Tutti gli articoli
        </Link>

        <div className="mt-8 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Autore</p>
          <h1 className="font-display mt-3 text-[34px] font-bold leading-[1.1] tracking-[-0.02em]">{autore.nome}</h1>
          {autore.ruolo && <p className="mt-2 text-[15px] font-medium text-muted-foreground">{autore.ruolo}</p>}
          {autore.bio && <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{autore.bio}</p>}
        </div>

        <div className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {articoli.length === 1 ? "Un articolo" : `${articoli.length} articoli`}
          </h2>
          {articoli.length === 0 ? (
            <p className="mt-3 text-[14px] text-muted-foreground">Nessun articolo pubblicato al momento.</p>
          ) : (
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articoli.map((a) => (
                <SchedaArticolo key={a.slug} articolo={a} />
              ))}
            </div>
          )}
        </div>
      </main>
      <PiedeMarketing />
    </div>
  );
}
