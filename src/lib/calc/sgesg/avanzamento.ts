// Avanzamento del programma ESG: quante delle otto fasi sono chiuse, e dove si è.
//
// ⚠️ Vale la regola condivisa dei moduli di conformità: **una fase dovuta e non
// valutata pesa zero, non viene ignorata.** Mediare sulle sole fasi toccate farebbe
// salire l'avanzamento man mano che si saltano le fasi difficili — il contrario del
// vero. Il denominatore è sempre il numero di fasi del catalogo.
//
// Funzioni pure: nessun accesso al database, nessuna data «adesso». Le stesse che il
// browser usa per l'anteprima, così l'anteprima non può divergere dal salvato.

export type StatoFase = "da_avviare" | "in_corso" | "conclusa";

export type FaseCorrente = {
  key: string;
  stato: StatoFase;
};

export type Avanzamento = {
  /** Fasi del catalogo: il denominatore, sempre. */
  totali: number;
  concluse: number;
  inCorso: number;
  /** Mai toccate: `totali - concluse - inCorso`, non il conteggio delle righe. */
  daAvviare: number;
  /** Percentuale intera 0÷100, sulle sole fasi CONCLUSE. */
  percentuale: number;
  /**
   * La chiave della prima fase non conclusa, in ordine di catalogo, o `null` se sono
   * tutte chiuse. È «dove riprendere», ed è la sola domanda che un consulente fa
   * riaprendo un lavoro lasciato a metà.
   */
  prossima: string | null;
};

/**
 * @param ordinate le chiavi delle fasi del catalogo, **in ordine**
 * @param stati    lo stato delle fasi toccate; le assenti valgono `da_avviare`
 */
export function avanzamento(ordinate: readonly string[], stati: readonly FaseCorrente[]): Avanzamento {
  const perChiave = new Map(stati.map((f) => [f.key, f.stato]));
  let concluse = 0;
  let inCorso = 0;
  let prossima: string | null = null;

  for (const key of ordinate) {
    // ⚠️ Una chiave che non è nel catalogo NON conta. Può esistere: il programma
    // congela il set alla creazione, e una fase tolta da una versione successiva
    // resterebbe come riga orfana. Contarla farebbe superare il 100%.
    const stato = perChiave.get(key) ?? "da_avviare";
    if (stato === "conclusa") concluse++;
    else {
      if (stato === "in_corso") inCorso++;
      if (prossima === null) prossima = key;
    }
  }

  const totali = ordinate.length;
  return {
    totali,
    concluse,
    inCorso,
    daAvviare: totali - concluse - inCorso,
    // ⚠️ Zero fasi nel catalogo dà 0, non `NaN`: un catalogo vuoto è un guasto del
    // seme, e un `NaN` a schermo lo racconta come «percentuale non disponibile»
    // invece che come «non c'è niente da fare».
    percentuale: totali === 0 ? 0 : Math.round((concluse / totali) * 100),
    prossima,
  };
}
