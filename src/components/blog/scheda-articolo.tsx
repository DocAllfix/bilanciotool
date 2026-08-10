import Link from "next/link";
import { dataItaliana } from "@/features/blog/data";
import type { Articolo } from "@/features/blog/tipi";

// La scheda di un articolo, usata dall'elenco e dalle pagine autore.
//
// Il registro è quello del resto del sito: nessuna libreria di terze parti, nessun
// tema di WordPress. Il CMS fornisce il contenuto, il disegno è nostro.
//
// L'immagine è un `<img>` e non `next/image`: le copertine arrivano dal CMS già in
// WebP e sotto i 150 KB (lo pretende il controllo automatico), quindi
// l'ottimizzazione di Vercel aggiungerebbe poco e consumerebbe quota.

export function SchedaArticolo({
  articolo: a,
  evidenza = false,
  conLinkAutore = true,
}: {
  articolo: Articolo;
  evidenza?: boolean;
  /** Spento nella pagina dell'autore: il collegamento rimanderebbe a se stessa. */
  conLinkAutore?: boolean;
}) {
  return (
    <article
      className={
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md " +
        (evidenza ? "sm:flex-row" : "")
      }
    >
      <Link href={`/blog/${a.slug}`} className="absolute inset-0 z-0 rounded-xl" aria-label={a.title} />
      {a.image && (
        <div className={"shrink-0 overflow-hidden bg-muted " + (evidenza ? "sm:w-[46%]" : "")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.image}
            alt=""
            loading="lazy"
            decoding="async"
            className={"h-full w-full object-cover " + (evidenza ? "aspect-[16/10] sm:aspect-auto" : "aspect-[16/9]")}
          />
        </div>
      )}
      <div className={"flex min-w-0 flex-1 flex-col p-5 " + (evidenza ? "sm:p-7" : "")}>
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          {a.category}
          <span className="font-normal tracking-normal text-muted-foreground normal-case">
            {dataItaliana(a.date)} · {a.readTime}
          </span>
        </p>
        <h3
          className={
            "font-display mt-2.5 font-semibold leading-[1.2] tracking-[-0.01em] group-hover:text-primary " +
            (evidenza ? "text-[24px] md:text-[28px]" : "text-[18px]")
          }
        >
          {a.title}
        </h3>
        {a.excerpt && (
          <p
            className={
              "mt-2.5 text-[14px] leading-relaxed text-muted-foreground " + (evidenza ? "line-clamp-4" : "line-clamp-3")
            }
          >
            {a.excerpt}
          </p>
        )}
        {a.autore?.nome && (
          <p className="mt-auto pt-4 text-[12.5px] text-muted-foreground">
            {/* La firma porta al profilo. Non è un dettaglio di comodità: è il collegamento
                che permette a chi legge — e a un motore di ricerca — di verificare che
                dietro l'articolo ci sia una persona, invece di un nome scritto in fondo.
                Nella pagina dell'autore stesso il collegamento si spegne: rimanderebbe
                alla pagina che si sta già guardando. */}
            di{" "}
            {a.autore.slug && conLinkAutore ? (
              <Link
                href={`/blog/autore/${a.autore.slug}`}
                className="relative z-10 font-medium text-foreground hover:text-primary hover:underline"
              >
                {a.autore.nome}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{a.autore.nome}</span>
            )}
            {a.autore.ruolo && <span> · {a.autore.ruolo}</span>}
          </p>
        )}
      </div>
    </article>
  );
}
