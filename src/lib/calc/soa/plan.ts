import { chiaveControllo, VALORE_STATO, type Controllo, type Decisione, type EsitoSoa, type StatoAttuazione } from "./scoring";

// Piano di attuazione: quali controlli portare avanti per primi.
//
// La priorità non dipende dal punteggio recuperabile ma dalla natura del
// controllo. Un controllo cardine non attuato è un rilievo quasi certo in
// audit, indipendentemente da quanti decimi di indice valga.

export type Priorita = "alta" | "media";

export type VocePiano = {
  frameworkKey: string;
  controlloId: string;
  sectionKey: string;
  cardine: boolean;
  stato: StatoAttuazione | null;
  priorita: Priorita;
  punti: number;
};

/** Punti di indice recuperabili portando il controllo ad "attuato e verificato".
 *  È un calcolo marginale, a parità di tutto il resto: serve a ordinare, non a
 *  promettere un totale. */
export function computeUpside(esito: EsitoSoa, stato: StatoAttuazione | null): number {
  if (!esito.applicabili) return 0;
  const valore = stato ? VALORE_STATO[stato] : 0;
  return Math.round(((100 - valore) / esito.applicabili) * 10) / 10;
}

export function buildPlan(
  esito: EsitoSoa,
  decisioni: Record<string, Decisione | undefined>,
): VocePiano[] {
  const dec = (c: Controllo) => decisioni[chiaveControllo(c.frameworkKey, c.controlloId)];

  return esito.inAmbito
    .filter((c) => {
      if (dec(c)?.applicabile === false) return false;
      const s = dec(c)?.stato;
      // Già attuato o verificato: fuori dal piano.
      return s !== "at" && s !== "av";
    })
    .map((c) => {
      const stato = dec(c)?.stato ?? null;
      // Alta se il controllo è cardine, oppure se non ha stato, oppure se è
      // dichiarato non attuato: sono i tre casi che un auditor guarda subito.
      const priorita: Priorita = c.cardine || stato === null || stato === "nd" ? "alta" : "media";
      return {
        frameworkKey: c.frameworkKey,
        controlloId: c.controlloId,
        sectionKey: c.sectionKey,
        cardine: c.cardine,
        stato,
        priorita,
        punti: computeUpside(esito, stato),
      };
    })
    .sort((a, b) => {
      if (a.priorita !== b.priorita) return a.priorita === "alta" ? -1 : 1;
      return b.punti - a.punti || a.controlloId.localeCompare(b.controlloId, "it", { numeric: true });
    });
}
