// I rischi sociali: probabilità × gravità per le persone, non per l'azienda.
//
// ⚠️ Un livello esiste solo se ENTRAMBI i punteggi sono interi da 1 a 5; altrimenti è `null`,
// che si legge «da valutare». Il prototipo moltiplica `(+p||0) * (+g||0)`: con un solo
// punteggio dà zero, che è giusto per caso, e con un punteggio fuori scala darebbe un livello
// che la matrice non sa disegnare. Stessa regola del GDPR.

import type { Parametri, Rischio } from "./tipi";

const punteggio = (v: number | null) => (v !== null && Number.isInteger(v) && v >= 1 && v <= 5 ? v : null);

/** Probabilità × gravità, oppure `null` se manca uno dei due o è fuori scala. */
export function livello(r: Pick<Rischio, "probabilita" | "gravita">): number | null {
  const p = punteggio(r.probabilita);
  const g = punteggio(r.gravita);
  return p !== null && g !== null ? p * g : null;
}

export type Classe = "alto" | "medio" | "basso";

export function classe(liv: number | null, p: Pick<Parametri, "alto" | "medio">): Classe | null {
  if (liv === null) return null;
  return liv >= p.alto ? "alto" : liv >= p.medio ? "medio" : "basso";
}

export type StatoRischi = {
  totale: number;
  valutati: number;
  alti: number;
  medi: number;
  bassi: number;
  /** Rischi alti senza misure di prevenzione o mitigazione, per testo. */
  altiScoperti: string[];
};

export function statoRischi(rischi: readonly Rischio[], p: Pick<Parametri, "alto" | "medio">): StatoRischi {
  const c = rischi.map((r) => ({ r, k: classe(livello(r), p) }));
  return {
    totale: rischi.length,
    valutati: c.filter((x) => x.k !== null).length,
    alti: c.filter((x) => x.k === "alto").length,
    medi: c.filter((x) => x.k === "medio").length,
    bassi: c.filter((x) => x.k === "basso").length,
    altiScoperti: c.filter((x) => x.k === "alto" && !x.r.misure.trim()).map((x) => x.r.testo),
  };
}
