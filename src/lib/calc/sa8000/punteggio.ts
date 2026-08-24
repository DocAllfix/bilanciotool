// Il completamento del sistema SA8000/2026 e il raggruppamento dei suoi criteri.
//
// Il golden viene da `scripts/golden-sa8000.mjs`, che esegue il prototipo: i pesi e lo
// scostamento qui sotto sono misurati, non supposti.

/**
 * I cinque pesi del completamento, sommano a 1.
 *
 * ⚠️ Le procedure pesano il DOPPIO dei moduli, ed è la proporzione del prototipo che si
 * conserva: una procedura è il sistema, un modulo è il foglio che la applica. Approvare
 * una procedura è la decisione; compilare un modulo ne è la conseguenza.
 */
export const PESI = {
  anagrafica: 0.15,
  procedure: 0.3,
  moduli: 0.15,
  criteri: 0.25,
  registri: 0.15,
} as const;

export type VociCompletamento = {
  /** Ognuna 0 ÷ 100. */
  anagrafica: number;
  procedure: number;
  moduli: number;
  criteri: number;
  registri: number;
};

/** Il completamento complessivo, 0 ÷ 100. */
export function completamento(v: VociCompletamento): number {
  return Math.round(
    v.anagrafica * PESI.anagrafica +
      v.procedure * PESI.procedure +
      v.moduli * PESI.moduli +
      v.criteri * PESI.criteri +
      v.registri * PESI.registri,
  );
}

/** Gli stati di un criterio SA8000. `null` = non ancora valutato. */
export type StatoCriterio = "ok" | "parziale" | "no" | "na";

/**
 * La percentuale dei criteri, 0 ÷ 100.
 *
 * ⚠️ «PARZIALE» PESA ZERO, e diverge di proposito dal Sistema integrato QAS, dove
 * «parzialmente conforme» vale 50. Sono due prototipi dello stesso autore che trattano la
 * stessa idea in modi opposti, e la fedeltà a ciascuno è la regola di questo progetto:
 * allinearli cambierebbe i punteggi SA8000 che il committente ha già visto.
 *
 * La ragione metodologica regge da sola: SA8000 è una certificazione sociale, e un
 * criterio attuato a metà non protegge a metà un lavoratore.
 *
 * ⚠️ «na» esce dal denominatore — è una valutazione, non un'omissione — mentre un
 * criterio **non ancora valutato** ci resta e pesa zero: saltare i difficili non deve far
 * salire il punteggio.
 */
export function percentualeCriteri(stati: readonly (StatoCriterio | null)[]): number {
  const applicabili = stati.filter((s) => s !== "na");
  if (!applicabili.length) return 0;
  const attuati = applicabili.filter((s) => s === "ok").length;
  return Math.round((attuati / applicabili.length) * 100);
}

/**
 * Il gruppo di un criterio, dal suo codice.
 *
 * ⚠️ CORREZIONE DI UN DIFETTO DEL PROTOTIPO. Là il gruppo si ricava con
 * `codice.split(".")[0]`: per «M1.1» dà «M1», che nel catalogo dei gruppi esiste; per
 * «F1» dà «F1», che **non esiste**. Risultato misurato: i cinque criteri fondazionali
 * finiscono in cinque riquadri separati e senza titolo, mentre il gruppo giusto —
 * `grp.F`, «Criteri fondazionali (F1–F5)» — è scritto nel catalogo e non viene mai usato.
 *
 * Qui un codice senza punto ricade sulla lettera della sezione, che è il gruppo vero.
 */
export function gruppoDelCriterio(codice: string): string {
  const punto = codice.indexOf(".");
  return punto === -1 ? codice.slice(0, 1) : codice.slice(0, punto);
}
