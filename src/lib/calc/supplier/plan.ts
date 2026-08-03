import { AREE_PESI, type AreaKey, type Domanda, type EsitoSupplier, type Risposta } from "./scoring";

// Piano di adeguamento: quali lacune conviene colmare per prime.
//
// Il criterio non è "la domanda che pesa di più" ma il RENDIMENTO: quanti punti
// di indice si guadagnano per giornata di lavoro. Una domanda leggera che si
// chiude in tre giorni può valere più di una pesante che ne chiede dieci, e
// l'ordinamento lo rende visibile senza che nessuno debba fare il conto.

const VALORE: Record<Exclude<Risposta, "na">, number> = { si: 100, parziale: 50, no: 0 };

/** Punti di indice complessivo che si recuperano portando UNA domanda a "sì",
 *  lasciando invariato tutto il resto. È un calcolo marginale: la somma dei
 *  recuperi delle singole domande non coincide con il salto che si otterrebbe
 *  chiudendole tutte insieme, ed è giusto così — servono a ordinare, non a
 *  promettere un totale. */
export function computeUpside(
  domande: Domanda[],
  risposte: Record<string, Risposta | null | undefined>,
  esito: EsitoSupplier,
  key: string,
): number {
  const q = domande.find((x) => x.key === key);
  if (!q) return 0;
  const attuale = risposte[key];
  if (attuale === "si" || attuale === "na") return 0;

  const area = esito.perArea[q.areaKey];
  const prima = area?.punteggio ?? 0;

  // Punteggio dell'area se questa domanda fosse a "sì": le domande ancora senza
  // risposta restano fuori, tranne quella che stiamo simulando, che entra ora
  // anche nel denominatore.
  let ottenuto = 0;
  let massimo = 0;
  for (const x of domande.filter((d) => d.areaKey === q.areaKey)) {
    const ax = risposte[x.key];
    if (ax === "na") continue;
    if ((ax === undefined || ax === null) && x.key !== key) continue;
    const v = x.key === key ? 100 : VALORE[ax as Exclude<Risposta, "na">];
    ottenuto += x.peso * v;
    massimo += x.peso * 100;
  }
  const dopo = massimo > 0 ? (ottenuto / massimo) * 100 : 0;

  // Il denominatore comprende anche l'area in esame, che con questa risposta
  // entrerebbe comunque nel calcolo dell'indice.
  let pesoAree = 0;
  for (const k of Object.keys(AREE_PESI) as AreaKey[]) {
    if (esito.perArea[k]?.punteggio !== null || k === q.areaKey) pesoAree += AREE_PESI[k];
  }

  const delta = ((dopo - prima) * AREE_PESI[q.areaKey as AreaKey]) / (pesoAree || 1);
  return Math.max(0, Math.round(delta * 10) / 10);
}

export type VocePiano = {
  key: string;
  areaKey: string;
  risposta: Exclude<Risposta, "si" | "na">;
  azione: string;
  punti: number;
  giorni: number;
};

/** Le sole domande con una lacuna dichiarata ("no" o "parziale"), ordinate per
 *  punti guadagnati per giornata. Le domande senza risposta NON entrano: non
 *  sono una lacuna accertata, sono una parte di questionario non ancora letta. */
export function buildPlan(
  domande: Domanda[],
  risposte: Record<string, Risposta | null | undefined>,
  esito: EsitoSupplier,
  evidenze: Record<string, string> = {},
): VocePiano[] {
  return domande
    .filter((q) => risposte[q.key] === "no" || risposte[q.key] === "parziale")
    .map((q) => {
      const risposta = risposte[q.key] as "no" | "parziale";
      const evidenza = evidenze[q.key] ?? "l'evidenza attesa";
      return {
        key: q.key,
        areaKey: q.areaKey,
        risposta,
        azione:
          (risposta === "no" ? "Predisporre e formalizzare — " : "Completare e aggiornare — ") + evidenza,
        punti: computeUpside(domande, risposte, esito, q.key),
        giorni: q.giorniStimati,
      };
    })
    .sort((a, b) => b.punti / b.giorni - a.punti / a.giorni || a.key.localeCompare(b.key));
}
