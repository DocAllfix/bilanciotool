import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaginaArchivio } from "@/components/blog/pagina-archivio";
import { articoliPerTermine, terminiBlog, blogVisibileAiMotori } from "@/features/blog/fonte";
import { archivioIndicizzabile } from "@/features/blog/tassonomia";

const APP = (process.env.NEXT_PUBLIC_APP_URL ?? "https://evalisdeck.it").replace(/\/$/, "");
const TIPO = "categoria" as const;

// Archivio per categoria.
//
// L'INDICIZZAZIONE DIPENDE DA QUANTI ARTICOLI CI SONO DENTRO, non da un'impostazione: sotto
// la soglia la pagina resta `noindex, follow` — navigabile dai lettori, seguita da Google per
// arrivare agli articoli, ma fuori dalla gara sulle stesse parole degli articoli stessi.
// Si autocorregge quando l'archivio si riempie.

export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const trovato = await articoliPerTermine(TIPO, slug);
  if (!trovato) return { title: "Categoria" };
  const { termine, articoli } = trovato;
  const indicizzabile = blogVisibileAiMotori() && archivioIndicizzabile(articoli.length);
  return {
    title: termine.nome,
    description: `Articoli su ${termine.nome}: guide e approfondimenti di EvalisDeck sulla rendicontazione di sostenibilità.`,
    alternates: { canonical: `${APP}/blog/categoria/${termine.slug}` },
    robots: indicizzabile ? undefined : { index: false, follow: true },
  };
}

export async function generateStaticParams() {
  const termini = await terminiBlog(TIPO);
  return termini.map(({ termine }) => ({ slug: termine.slug }));
}

export default async function ArchivioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trovato = await articoliPerTermine(TIPO, slug);
  if (!trovato) notFound();
  return <PaginaArchivio tipo={TIPO} termine={trovato.termine} articoli={trovato.articoli} sito={APP} />;
}
