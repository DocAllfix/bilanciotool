import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { vetrinaPerSlug, moduloDellaVetrina } from "@/features/vetrina/registro";

// Il richiamo al percorso dentro un articolo del blog.
//
// Lo mette il consulente SEO da WordPress, incollando una riga sola:
//
//   <div class="evalis-percorso" id="bilancio-energetico"></div>
//
// ⚠️ IL DISEGNO È NOSTRO, LA POSIZIONE È SUA. Lui decide in quali articoli e a che altezza
// del testo; noi garantiamo che il riquadro segua il tema, si stringa sul telefono e dica
// sempre il nome e la descrizione VERI del percorso — che vengono dal registro, non dal
// testo incollato. Così il giorno in cui cambia un nome non ci sono venti copie da
// rincorrere dentro il CMS.
//
// ⚠️ Uno slug che non esiste non rende NIENTE: chi incolla non può rompere la pagina, e un
// richiamo verso una pagina che non c'è lo incontrerebbe proprio chi stava per comprare.
export function RichiamoPercorso({ slug }: { slug: string }) {
  const vetrina = vetrinaPerSlug(slug);
  if (!vetrina) return null;
  const modulo = moduloDellaVetrina(vetrina);

  return (
    <aside
      data-blog="richiamo-percorso"
      data-percorso={vetrina.slug}
      className="my-10 rounded-xl border bg-muted/30 p-5 sm:p-6"
      aria-label={`Il percorso ${modulo.nome}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
        Il percorso che fa questo lavoro
      </p>
      <h2 className="font-display mt-2 text-[20px] font-bold tracking-[-0.01em]">{modulo.nome}</h2>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
        {vetrina.descrizione}
      </p>
      <Link
        href={`/percorsi/${vetrina.slug}`}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[13.5px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Provalo senza registrarti <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </aside>
  );
}
