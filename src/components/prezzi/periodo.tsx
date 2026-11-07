"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  PIANI,
  PERIODI,
  euro,
  fasceVendibili,
  prezzoDiVendita,
  costoAnnuoMensile,
  risparmioAnnuo,
  risparmioMensile,
  equivalenteMensile,
  scontoPercentuale,
  type PianoKey,
  type Periodo,
} from "@/lib/prezzi";

// MENSILE O ANNUALE: una scelta sola, in tutti i punti dove si vede un prezzo.
//
// ⚠️ I NUMERI ESCONO TUTTI DAL LISTINO (`src/lib/prezzi.ts`), qui non si fa aritmetica. Il
// barrato è dodici mensilità vere; il risparmio è arrotondato per difetto e il costo
// mensile equivalente per eccesso. Se un componente rifacesse il conto per conto suo, il
// giorno che il mensile cambia la pagina mostrerebbe uno sconto e la cassa ne applicherebbe
// un altro.
//
// ⚠️ L'annuale è il PREDEFINITO: è l'offerta che conviene al cliente, e partire dal mensile
// per poi dire «con l'annuale risparmi» costringerebbe a un clic per vedere il prezzo
// migliore.

const Contesto = createContext<{ periodo: Periodo; imposta: (p: Periodo) => void } | null>(null);

export function PeriodoProvider({ iniziale = "anno", children }: { iniziale?: Periodo; children: ReactNode }) {
  const [periodo, imposta] = useState<Periodo>(iniziale);
  return <Contesto.Provider value={{ periodo, imposta }}>{children}</Contesto.Provider>;
}

/** Il periodo scelto. Fuori da un `PeriodoProvider` vale l'annuale. */
export function usePeriodo(): { periodo: Periodo; imposta: (p: Periodo) => void } {
  return useContext(Contesto) ?? { periodo: "anno", imposta: () => {} };
}

/** Lo sconto più alto fra i piani in vendita: il «fino al −29%» accanto all'annuale. */
function scontoMassimo(): number {
  return Math.max(0, ...fasceVendibili().map((k) => scontoPercentuale(PIANI[k]) ?? 0));
}

/**
 * I due pulsanti Annuale / Mensile.
 *
 * ⚠️ Due pulsanti con `aria-pressed`, non un interruttore a levetta: la levetta dice
 * «acceso/spento», e qui le due scelte sono alla pari. Chi usa un lettore di schermo sente
 * «Annuale, premuto» invece di «interruttore, attivo», che non direbbe niente.
 */
export function InterruttorePeriodo({
  periodo: controllato,
  onCambia,
  className = "",
}: {
  /** Facoltativi: senza, l'interruttore legge e scrive il `PeriodoProvider` più vicino. */
  periodo?: Periodo;
  onCambia?: (p: Periodo) => void;
  className?: string;
}) {
  const ctx = usePeriodo();
  const periodo = controllato ?? ctx.periodo;
  const imposta = onCambia ?? ctx.imposta;
  const sconto = scontoMassimo();
  const etichette: Record<Periodo, ReactNode> = {
    anno: (
      <>
        Annuale
        {sconto > 0 && (
          // ⚠️ L'annuale è il periodo predefinito, cioè il fondo del pulsante è quasi sempre
          // `bg-primary`: con `text-primary` lo sconto era verde su verde, presente nel testo
          // e invisibile a schermo. L'ha visto solo guardare il dialogo.
          <span
            className={
              "ml-1.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold " +
              (periodo === "anno"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-primary/12 text-primary")
            }
          >
            fino a −{sconto}%
          </span>
        )}
      </>
    ),
    mese: <>Mensile</>,
  };
  return (
    <div
      role="group"
      aria-label="Come vuoi pagare"
      className={"inline-flex rounded-full border bg-card p-1 " + className}
      data-interruttore-periodo
    >
      {PERIODI.map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={periodo === p}
          onClick={() => imposta(p)}
          data-periodo={p}
          className={
            "inline-flex items-center rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors " +
            (periodo === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
          }
        >
          {etichette[p]}
        </button>
      ))}
    </div>
  );
}

/**
 * Il prezzo di un piano nel periodo scelto, col barrato e il risparmio.
 *
 * Annuale: «708 €» barrato («12 mesi col mensile»), poi 499 € l'anno, l'equivalente al mese
 * e il risparmio. Mensile: 59 € al mese, e quanto si risparmierebbe con l'annuale.
 */
export function PrezzoFascia({
  piano,
  periodo: forzato,
  compatto = false,
}: {
  piano: PianoKey;
  /** Facoltativo: senza, il periodo è quello del `PeriodoProvider`. */
  periodo?: Periodo;
  /** Per le schede strette: stesse informazioni, caratteri più piccoli. */
  compatto?: boolean;
}) {
  const { periodo: scelto } = usePeriodo();
  const periodo = forzato ?? scelto;
  const p = PIANI[piano];
  const prezzo = prezzoDiVendita(p, periodo);
  if (!prezzo) return null;

  const barrato = costoAnnuoMensile(p);
  const risparmioA = risparmioAnnuo(p);
  const risparmioM = risparmioMensile(p);
  const equivalente = equivalenteMensile(p);
  const annuale = prezzoDiVendita(p, "anno");
  const grande = compatto ? "text-[28px]" : "text-[38px]";

  return (
    <div data-prezzo-fascia={piano} data-periodo-mostrato={periodo}>
      {periodo === "anno" && barrato !== null && risparmioA ? (
        <p className="text-[12.5px] text-muted-foreground">
          <s className="tabular-nums" data-barrato>
            <span className="sr-only">invece di </span>
            {euro(barrato)}
          </s>{" "}
          <span>con dodici mesi di mensile</span>
        </p>
      ) : (
        // Lo spazio resta occupato anche col mensile: cambiando periodo le schede non devono
        // saltare in altezza sotto il dito.
        <p className="text-[12.5px]" aria-hidden>
          &nbsp;
        </p>
      )}
      <p className={`font-display mt-1 ${grande} font-bold leading-none tabular-nums`} data-slot="kpi">
        {euro(prezzo.importo)}{" "}
        <span className="ml-1 align-baseline text-[13px] font-medium text-muted-foreground">
          {periodo === "anno" ? "l'anno" : "al mese"}
        </span>
      </p>
      <p className="mt-2 text-[12.5px] text-muted-foreground">
        IVA esclusa
        {periodo === "anno" && equivalente !== null && <> · equivale a {euro(equivalente)} al mese</>}
      </p>
      {periodo === "anno" && risparmioM !== null && risparmioA ? (
        <p className="mt-3 inline-flex rounded-md bg-primary/10 px-2 py-1 text-[12.5px] font-medium text-primary" data-risparmio>
          Risparmi {euro(risparmioM)} al mese, {euro(risparmioA)}{" "}l&apos;anno
        </p>
      ) : annuale && risparmioA ? (
        <p className="mt-3 text-[12.5px] text-muted-foreground" data-risparmio>
          Con l&apos;annuale paghi {euro(annuale.importo)} e risparmi {euro(risparmioA)}{" "}l&apos;anno.
        </p>
      ) : null}
    </div>
  );
}

/**
 * «Attiva» verso l'iscrizione, col periodo scelto nell'indirizzo.
 *
 * ⚠️ Il periodo viaggia come `?periodo=mese` e non come parte della rotta: `/attiva/<fascia>`
 * è una pagina statica, e il modulo d'iscrizione lo legge dall'indirizzo solo AL MOMENTO
 * DELL'INVIO, quando la pagina è già viva — nessun titolo che cambia sotto gli occhi.
 * L'annuale, che è il predefinito, non si scrive: l'indirizzo resta quello di sempre.
 */
export function hrefAttiva(piano: PianoKey, periodo: Periodo): string {
  return periodo === "mese" ? `/attiva/${piano}?periodo=mese` : `/attiva/${piano}`;
}
