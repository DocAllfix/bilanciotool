import Link from "next/link";
import { Headphones, Play } from "lucide-react";

import { MODULI_AZIENDA } from "@/features/companies/moduli";
import type { SchedaCorso } from "@/features/formazione";
import { minutiDiVoce } from "@/features/formazione/audio";
import { RISULTATO } from "@/features/formazione/risultati";
import { tempoDaDedicare, formattaDurata } from "@/features/formazione/tempo";
import { cn } from "@/lib/utils";

/**
 * La scheda di un corso nell'indice.
 *
 * ⚠️ RIFATTA TRE VOLTE, E OGNI VOLTA PER TOGLIERE. Prima erano dodici schede identiche —
 * la griglia di card uguali che PRODUCT.md nomina fra le anti-reference. Poi dicevano
 * troppo: i minuti due volte, una barra spezzata in quattordici slivere illeggibili, e un
 * «Apri il corso» con la freccia su una scheda che è già tutta un collegamento. Poi c'era
 * ancora il quadratino colorato con l'icona dentro, che è la forma più riconoscibile della
 * card SaaS generica.
 *
 * ⚠️ QUELLO CHE FA APRIRE UN CORSO NON È IL DISEGNO: È SAPERE CHE COSA SAPRAI FARE DOPO.
 * Il titolo dice la materia, e chi legge la conosce già. La riga di risultato dice il
 * ritorno, ed è quella che decide se qualcuno spende quaranta minuti. Sta sotto il nome ed
 * è la cosa più grande della scheda dopo il titolo.
 *
 * ⚠️ E IL CALORE VIENE DALLE PAROLE, NON DAI COLORI. Questo prodotto ha una palette fredda
 * per scelta, e la tentazione davanti a una pagina che «non invita» è aggiungere tinte.
 * Chi produce corsi da anni, con una palette calda a disposizione, ha scaldato le proprie
 * schede cambiando le stringhe: e' la leva che costa meno e regge di piu'.
 */
export function SchedaFormazione({ corso }: { corso: SchedaCorso }) {
  const m = MODULI_AZIENDA.find((x) => x.href === corso.modulo)!;

  const minutiComuni = corso.sezioni
    .filter((s) => corso.idComuni.includes(s.id))
    .reduce((n, s) => n + s.minuti, 0);
  const voce = minutiDiVoce(corso.modulo, corso.sezioni, corso.idComuni);

  return (
    <Link
      href={`/formazione/${corso.modulo}`}
      data-corso={corso.modulo}
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card p-5 transition-all hover:border-foreground/15 hover:shadow-md"
    >
      {/* Il filo del colore d'area lungo il bordo ALTO, che si accende passandoci sopra.
          Dice la materia senza colorare il riquadro, e senza diventare la banda laterale
          spessa che l'anti-reference vieta per iscritto. */}
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-0.5 opacity-40 transition-opacity group-hover:opacity-100",
          m.colore.tratto,
        )}
        aria-hidden
      />

      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{corso.norma}</p>
      <p className="mt-1.5 text-[17px] font-semibold leading-tight tracking-[-0.01em] group-hover:text-primary">
        {corso.nome}
      </p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/75">{RISULTATO[corso.modulo]}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
        <span data-slot="kpi">{formattaDurata(tempoDaDedicare(corso.minuti))}</span>
        <span aria-hidden>·</span>
        <span>
          <span data-slot="kpi">{corso.sezioni.length}</span> sezioni
        </span>
        {voce.totale > 0 && (
          <>
            <span aria-hidden>·</span>
            <span className="flex items-center gap-1.5 font-medium text-primary">
              <Headphones className="size-3.5" aria-hidden />
              <span data-slot="kpi">{voce.totale}</span> min di voce
              {!voce.completa && <span className="font-normal text-muted-foreground">in parte</span>}
            </span>
          </>
        )}
      </div>

      {/* ⚠️ LE SEZIONI PROPRIE SI VEDONO, e non è ornamento. Un corso da quaranta minuti è
          un impegno che si rimanda; sette sezioni da sei minuti sono sette cose che si
          cominciano. Gli id sono stabili e la presentazione avanza per sezione, quindi chi
          ha già fatto il passo uno può entrare al passo tre.
          Le comuni non si elencano: sono le stesse su tutti e dodici i corsi, e ripeterle
          dodici volte è rumore che copre proprio la parte che distingue. */}
      {corso.argomenti.length > 0 && (
        <p className="mt-3 flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
          {corso.argomenti.slice(0, 4).join(" · ")}
          {corso.argomenti.length > 4 ? ` · e altre ${corso.argomenti.length - 4}` : ""}
        </p>
      )}

      {voce.totale > 0 ? (
        <span className="mt-4 flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors group-hover:text-primary">
          <Play className="size-3.5" strokeWidth={2.5} aria-hidden />
          Si può seguire ascoltando
        </span>
      ) : (
        <span className="mt-4 text-[12.5px] text-muted-foreground">
          <span data-slot="kpi">{minutiComuni}</span> min sull&apos;uso del prodotto · parte specifica in
          preparazione
        </span>
      )}
    </Link>
  );
}
