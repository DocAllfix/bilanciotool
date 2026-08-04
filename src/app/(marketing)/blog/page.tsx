import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/site-header";
import { PiedeMarketing } from "@/components/landing/piede";
import { SchedaArticolo } from "@/components/blog/scheda-articolo";
import { elencoBlog, blogVisibileAiMotori } from "@/features/blog/fonte";
import { FileText } from "lucide-react";

// L'elenco degli articoli.
//
// Si rigenera da sola: le pagine sono statiche e il webhook di WordPress le invalida
// alla pubblicazione. Nessun `force-dynamic` qui — al contrario dell'applicazione,
// dove i numeri devono riflettere l'ultima scrittura.

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Rendicontazione di sostenibilità, inventari GHG, diagnosi energetiche e sicurezza delle informazioni: quello che serve sapere per farli bene.",
  robots: blogVisibileAiMotori() ? undefined : { index: false, follow: false },
};

export default async function BlogPage() {
  const articoli = await elencoBlog();
  const [primo, ...resto] = articoli;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-16">
        <div className="max-w-2xl">
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            <span className="h-px w-8 bg-primary" aria-hidden />
            Il blog
          </p>
          <h1 className="font-display mt-4 text-[36px] font-bold leading-[1.08] tracking-[-0.02em] sm:text-[44px]">
            Quello che serve sapere per rendicontare bene.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Metodo, norme e casi veri: inventari GHG, bilanci di sostenibilità, diagnosi energetiche, qualifica dei
            fornitori e sicurezza delle informazioni.
          </p>
        </div>

        {articoli.length === 0 ? (
          // Lo stato vuoto è una pagina vera, non un errore: capita mentre il CMS non
          // ha ancora articoli, e capita se il CMS non risponde (vedi `fonte.ts`).
          <div className="mt-14 flex flex-col items-center rounded-xl border py-20 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <FileText className="size-6" strokeWidth={1.75} />
            </span>
            <h2 className="font-display mt-4 text-lg font-semibold tracking-tight">I primi articoli stanno arrivando</h2>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
              Stiamo preparando i primi contenuti. Nel frattempo, i due documenti d&apos;esempio sulla home mostrano già
              come lavora la piattaforma.
            </p>
          </div>
        ) : (
          <>
            {primo && (
              <div className="mt-12">
                <SchedaArticolo articolo={primo} evidenza />
              </div>
            )}
            {resto.length > 0 && (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {resto.map((a) => (
                  <SchedaArticolo key={a.slug} articolo={a} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <PiedeMarketing />
    </div>
  );
}
