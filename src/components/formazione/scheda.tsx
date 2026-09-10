import Link from "next/link";
import { Headphones, ListChecks, Play } from "lucide-react";

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
  // ⚠️ Il numero si DERIVA dalle sezioni, non si scrive accanto al corso: scritto a mano
  // sarebbe un secondo posto dove vive lo stesso fatto, e i due divergono al primo
  // ritocco delle domande. È la stessa ragione per cui i numeri dei corsi vengono da
  // `numeri.ts` e non dalla memoria di chi scrive.
  const domande = corso.sezioni.reduce((n, s) => n + (s.verifica?.domande.length ?? 0), 0);

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
        <span aria-hidden>·</span>
        {/* ⚠️ La verifica si DICHIARA anche quando non c'è. Undici corsi su quindici non
            hanno ancora le domande: tacerlo lascia credere che il corso sia finito e che
            la verifica non fosse prevista, e chi la cerca smette di cercarla. È la stessa
            scelta del dodicesimo percorso nella guida, che dichiara di non produrre
            ancora un documento invece di restare muto in mezzo ad altri che ne nominano uno. */}
        {domande > 0 ? (
          <span className="flex items-center gap-1.5">
            <ListChecks className="size-3.5" aria-hidden />
            <span data-slot="kpi">{domande}</span> domande di verifica
          </span>
        ) : (
          <span>verifica in preparazione</span>
        )}
        {voce.totale > 0 && (
          <>
            <span aria-hidden>·</span>
            {/* ⚠️ QUI NON VA IL NUMERO DEI MINUTI DI VOCE, e non è una dimenticanza.
                Fra un corso e l'altro va da trentuno a quarantaquattro, e tredici numeri
                sparpagliati su una griglia si leggono come disordine invece che come
                informazione. La tentazione opposta — arrotondarli tutti verso l'alto per
                farli sembrare uguali — sarebbe scrivere una durata che il corso non ha, su
                una pagina che legge chi paga: un numero falso costa più del disordine che
                risolve. Il minutaggio vero sta DENTRO il corso, dove serve a decidere se
                cominciare adesso; qui basta sapere che si può ascoltare. */}
            <span className="flex items-center gap-1.5 font-medium text-primary">
              <Headphones className="size-3.5" aria-hidden />
              con la voce
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
