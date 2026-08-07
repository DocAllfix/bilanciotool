import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/landing/site-header";
import { PiedeMarketing } from "@/components/landing/piede";
import { SchedaArticolo } from "@/components/blog/scheda-articolo";
import { Briciole } from "@/components/blog/briciole";
import { bricioleArchivio, archivioIndicizzabile, SOGLIA_ARCHIVIO } from "@/features/blog/tassonomia";
import type { Articolo, Termine } from "@/features/blog/tipi";

// Una pagina di archivio: gli articoli di una categoria o di un tag.
//
// Categorie e tag condividono tutto tranne la parola e la cartella, quindi condividono il
// componente: due copie divergerebbero alla prima modifica, e la seconda se ne accorgerebbe
// mesi dopo.

export function PaginaArchivio({
  tipo,
  termine,
  articoli,
  sito,
}: {
  tipo: "categoria" | "tag";
  termine: Termine;
  articoli: Articolo[];
  sito: string;
}) {
  const sottoSoglia = !archivioIndicizzabile(articoli.length);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14">
        <Briciole briciole={bricioleArchivio(sito, tipo, termine)} />

        <Link
          href="/blog"
          className="tocco-comodo inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Tutti gli articoli
        </Link>

        <div className="mt-8 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            {tipo === "categoria" ? "Categoria" : "Argomento"}
          </p>
          <h1 className="font-display mt-3 text-[34px] font-bold leading-[1.1] tracking-[-0.02em]">
            {termine.nome}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {articoli.length === 1
              ? "Un articolo su questo argomento."
              : `${articoli.length} articoli su questo argomento.`}
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articoli.map((a) => (
            <SchedaArticolo key={a.slug} articolo={a} />
          ))}
        </div>

        {/* Nota per chi cura il blog, non per il lettore comune: spiega perché questa pagina
            non è ancora negli indici, così non sembra una dimenticanza. Sparisce da sola. */}
        {sottoSoglia && (
          <p className="mt-12 max-w-2xl border-t pt-5 text-[12.5px] leading-relaxed text-muted-foreground">
            Questa pagina non è ancora proposta ai motori di ricerca: con meno di{" "}
            {SOGLIA_ARCHIVIO} articoli farebbe concorrenza agli articoli stessi sulle medesime
            parole. Entra negli indici da sola al {SOGLIA_ARCHIVIO}º articolo.
          </p>
        )}
      </main>
      <PiedeMarketing />
    </div>
  );
}
