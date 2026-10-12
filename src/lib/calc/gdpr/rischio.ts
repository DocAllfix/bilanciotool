// Il rischio per i diritti e le libertà degli interessati: probabilità × gravità.
//
// ⚠️ DIVERGE DAL PROTOTIPO su un punto. Il prototipo moltiplica `(+p||0) * (+g||0)`: con la
// sola probabilità inserita il livello vale zero, cioè «da valutare», ed è giusto; ma lo è
// per caso, e la stessa espressione con un punteggio fuori scala (es. 7) produrrebbe un
// livello che la matrice non sa disegnare. Qui un livello esiste solo se ENTRAMBI i
// punteggi sono interi da 1 a 5; altrimenti è `null`, e `null` si legge «da valutare».

import type { Parametri, Trattamento } from "./tipi";

const punteggio = (v: number | null) => (v !== null && Number.isInteger(v) && v >= 1 && v <= 5 ? v : null);

/** Probabilità × gravità, oppure `null` se manca uno dei due o è fuori scala. */
export function livello(t: Pick<Trattamento, "probabilita" | "gravita">): number | null {
  const p = punteggio(t.probabilita);
  const g = punteggio(t.gravita);
  return p !== null && g !== null ? p * g : null;
}

export type Classe = "alto" | "medio" | "basso";

export function classe(liv: number | null, p: Parametri): Classe | null {
  if (liv === null) return null;
  return liv >= p.alto ? "alto" : liv >= p.medio ? "medio" : "basso";
}

export type StatoRischi = {
  trattamenti: number;
  valutati: number;
  alti: number;
  medi: number;
  bassi: number;
  /** Rischi alti senza misure di mitigazione. */
  altiScoperti: string[];
};

export function statoRischi(trattamenti: readonly Trattamento[], p: Parametri): StatoRischi {
  const c = trattamenti.map((t) => ({ t, k: classe(livello(t), p) }));
  return {
    trattamenti: trattamenti.length,
    valutati: c.filter((x) => x.k !== null).length,
    alti: c.filter((x) => x.k === "alto").length,
    medi: c.filter((x) => x.k === "medio").length,
    bassi: c.filter((x) => x.k === "basso").length,
    altiScoperti: c.filter((x) => x.k === "alto" && !x.t.mitigazione.trim()).map((x) => x.t.nome),
  };
}
