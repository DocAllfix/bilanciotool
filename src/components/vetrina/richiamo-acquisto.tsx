"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PIANI, euro, prezzoDiVendita, costoAnnuoMensile } from "@/lib/prezzi";

// Il richiamo all'acquisto della vetrina.
//
// ⚠️ ARRIVA QUANDO IL VALORE È STATO CONSEGNATO, non prima: compare al primo risultato
// calcolato — la persona ha appena visto i propri numeri — oppure dopo un minuto se resta a
// leggere. È la stessa regola per cui l'offerta di fine giro guidato si vede solo dopo il
// giro: interrompere chi sta ancora capendo che cos'è non vende niente, infastidisce.
//
// ⚠️ IL PREZZO VIENE DAL LISTINO, sempre, e il barrato è VERO: dodici mesi pagati col
// mensile, che si possono scegliere davvero. Un barrato senza un'offerta reale dietro è
// pubblicità ingannevole — vietata anche fra imprese.
//
// ⚠️ Qui c'era una riga «Prezzo d'introduzione: restano N posti, poi si va a listino».
// Prometteva un aumento che non è mai esistito — il prezzo d'introduzione ERA il listino —
// e il 6 novembre 2026 è stata tolta insieme al Programma Fondatori.

/** Il piano proposto da questa vetrina: l'azienda che fa da sé, il cliente primario. */
const PIANO_PROPOSTO = "azienda" as const;

const CHIAVE = "evalisdeck-vetrina-richiamo";
const DOPO_MS = 60_000;

export function RichiamoAcquisto({ visto }: { visto: boolean }) {
  const [aperto, setAperto] = useState(false);
  const [chiuso, setChiuso] = useState(true); // finché non si legge la memoria: mai lampeggiare

  useEffect(() => {
    try {
      setChiuso(Boolean(localStorage.getItem(CHIAVE)));
    } catch {
      setChiuso(false);
    }
  }, []);

  // Il valore consegnato apre il richiamo; il tempo è solo il ripiego per chi legge e basta.
  useEffect(() => {
    if (visto) setAperto(true);
  }, [visto]);

  // ⚠️ MAI SOPRA LA SCELTA SUI COOKIE, e nemmeno sotto.
  //
  // Il banner del consenso è fisso in basso come questo richiamo, e sta a `z-50` contro il
  // nostro `z-40`: aprendolo adesso finirebbe COPERTO, col pulsante che non risponde al
  // clic. L'ha trovato il collaudo, che non riusciva a premerlo — ed è la stessa famiglia
  // del velo del tour sopra il video di benvenuto.
  //
  // Si guardano TRE marcatori: `data-modale`, che dichiara una finestra vera; `data-consenso`,
  // che è solo del banner dei cookie — separato apposta, perché segnarlo come finestra
  // impediva al giro guidato del benvenuto di partire; e il velo del giro guidato.
  //
  // ⚠️ IL VELO È ENTRATO QUI QUANDO IL GIRO HA COMINCIATO DAI RISULTATI. Finché il tour
  // partiva dai consumi, il passo 4 non era ancora stato raggiunto e il richiamo non poteva
  // scattare a giro aperto. Aprendo direttamente sul risultato, la condizione «valore
  // consegnato» è vera dal primo istante: senza questa riga il banner si aprirebbe SOTTO il
  // velo, col pulsante che non risponde al clic. È la stessa famiglia del velo sopra il
  // video di benvenuto, e stavolta è stata prevista invece che scoperta.
  //
  // Il controllo si rifà ogni mezzo secondo, quindi il richiamo si arma da solo quando il
  // giro si chiude — comunque si chiuda, anche a metà.
  const [modale, setModale] = useState(true);
  useEffect(() => {
    const guarda = () =>
      setModale(
        Boolean(document.querySelector("[data-modale], [data-consenso], .driver-overlay, .driver-popover")),
      );
    guarda();
    const t = setInterval(guarda, 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setAperto(true), DOPO_MS);
    return () => clearTimeout(t);
  }, []);

  if (chiuso || !aperto || modale) return null;

  const piano = PIANI[PIANO_PROPOSTO];
  const anno = prezzoDiVendita(piano, "anno")!;
  const mese = prezzoDiVendita(piano, "mese")!;
  const barrato = costoAnnuoMensile(piano);

  const chiudi = () => {
    setChiuso(true);
    try {
      localStorage.setItem(CHIAVE, "1");
    } catch {
      /* senza memoria ricomparirà alla visita dopo: è il male minore. */
    }
  };

  return (
    <div
      data-vetrina="richiamo"
      className={cn(
        "fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl rounded-xl border bg-card p-4 shadow-lg",
        "motion-safe:animate-[slideEntra_360ms_cubic-bezier(0.16,1,0.3,1)_both]",
        "sm:inset-x-5 sm:bottom-5 sm:p-5",
      )}
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[16px] font-bold tracking-[-0.01em]">
            Questi numeri possono diventare la diagnosi da consegnare.
          </p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
            Con l&apos;abbonamento completi gli otto passi, generi il documento impaginato
            secondo la norma e apri gli altri percorsi sulla stessa azienda.
          </p>

          <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1" data-vetrina="prezzo">
            {barrato !== null && (
              <s className="text-[13px] text-muted-foreground tabular-nums" data-barrato>
                <span className="sr-only">invece di </span>
                {euro(barrato)}
              </s>
            )}
            <span className="font-display text-[22px] font-bold tabular-nums" data-slot="kpi">
              {euro(anno.importo)}
            </span>
            <span className="text-[12.5px] text-muted-foreground">
              l&apos;anno, oppure {euro(mese.importo)} al mese · {piano.nome} · IVA esclusa
            </span>
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button asChild size="sm" data-vetrina="richiamo-cta">
              <Link href={`/attiva/${PIANO_PROPOSTO}`}>Attiva il servizio</Link>
            </Button>
            <Link
              href="/prezzi"
              className="text-[12.5px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Segui aziende clienti? I piani per i consulenti
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={chiudi}
          aria-label="Chiudi il richiamo"
          data-vetrina="richiamo-chiudi"
          className="tocco-comodo shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
