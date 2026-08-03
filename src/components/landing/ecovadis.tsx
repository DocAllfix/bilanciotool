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
            <BadgeEcoVadis dimensione={120} className="h-[88px] w-[88px] shrink-0 sm:h-[120px] sm:w-[120px]" />
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
