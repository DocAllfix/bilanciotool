import { ECOVADIS, ECOVADIS_ALT, ecovadisValido } from "@/lib/ecovadis";
import { Reveal } from "./scroll-reveal";

// Riconoscimento EcoVadis, in due misure: la fascia dedicata dopo "Il metodo"
// e il segno piccolo nel piede.
//
// Il badge si usa COME CONSEGNATO: nessuna ricolorazione, nessun ritaglio,
// proporzioni intatte. Vale come regola di casa sui marchi e come condizione
// d'uso di EcoVadis.

export function BadgeEcoVadis({ dimensione = 120, className }: { dimensione?: number; className?: string }) {
  if (!ecovadisValido()) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={ECOVADIS.badge}
      alt={ECOVADIS_ALT}
      width={dimensione}
      height={dimensione}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}

/** La medaglia dentro l'hero, sopra la piega.
 *
 *  Due righe soltanto: il punteggio e chi è valutato. La spiegazione completa,
 *  con il limite di che cosa il rating copre e che cosa no, resta nella fascia
 *  più in basso: qui non c'è lo spazio per dirla bene, e detta male sarebbe
 *  peggio che non dirla. */
export function FirmaEcoVadis() {
  if (!ecovadisValido()) return null;
  return (
    <div className="mt-5 flex items-center gap-3.5 border-t pt-4">
      <BadgeEcoVadis dimensione={64} className="size-16 shrink-0" />
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Sviluppato per {ECOVADIS.azienda}, valutata{" "}
        <a href="#metodo" className="font-semibold text-primary hover:underline">
          EcoVadis {ECOVADIS.medaglia}
        </a>{" "}
        <span data-slot="kpi">
          {ECOVADIS.punteggio}/100
        </span>
        , {ECOVADIS.percentile}° percentile.
        <span className="block">Il primo 1% delle aziende valutate nel mondo.</span>
      </p>
    </div>
  );
}

/** Fascia "Chi ha costruito lo strumento": sta fra la sezione del metodo e le
 *  FAQ, cioè nel punto in cui il lettore ha appena finito di leggere sei prove
 *  che il prodotto dà di sé stesso e si chiede chi ci sia dietro. */
export function FasciaEcoVadis() {
  if (!ecovadisValido()) return null;
  return (
    <section className="border-b bg-accent/30">
      <div className="mx-auto w-full max-w-6xl px-5 py-16">
        <Reveal>
          <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:gap-12">
            <BadgeEcoVadis dimensione={120} className="h-22 w-22 shrink-0 sm:h-30 sm:w-30" />
            <div className="min-w-0">
              <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                <span className="h-px w-8 bg-primary" aria-hidden />
                Chi ha costruito lo strumento
              </p>
              <p className="font-display mt-4 max-w-2xl text-[22px] font-semibold leading-[1.3] tracking-[-0.01em] md:text-[26px]">
                EvalisDeck è sviluppato per {ECOVADIS.azienda}, valutata{" "}
                <span className="text-primary">EcoVadis {ECOVADIS.medaglia}</span> con {ECOVADIS.punteggio}/100 e{" "}
                {ECOVADIS.percentile}° percentile: il primo 1% delle aziende valutate nel mondo.
              </p>
              <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
                La valutazione EcoVadis riguarda {ECOVADIS.azienda} come organizzazione, su ambiente, pratiche
                lavorative, etica e acquisti. Non è una certificazione del software né dei documenti che produce.
                Valutazione di {ECOVADIS.mese}, valida fino a giugno 2027.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
