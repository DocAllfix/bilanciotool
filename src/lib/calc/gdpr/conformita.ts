// L'indice di conformità ai requisiti del GDPR.
//
// ⚠️ DIVERGE DAL PROTOTIPO, di proposito. Il prototipo calcola
// `(conformi + parziali × 0,5) ÷ (conformi + parziali + non conformi)`, cioè media i SOLI
// requisiti valutati: tre conformi su novantanove, e il resto mai guardato, danno 100%.
// Qui un requisito pertinente e non valutato pesa zero, come in tutti i moduli di
// conformità del prodotto (`comune/valutazione.ts`). Sull'esempio del prototipo l'indice
// passa da 89 a 83: i sei punti di differenza sono i sei requisiti mai valutati.
//
// Il «parziale» pesa metà: è la scelta del prototipo e del committente (12 ottobre 2026).

import { mediaPesata, NON_APPLICABILE } from "@/lib/calc/comune/valutazione";
import type { StatoRequisito } from "./tipi";

export const PESI_GDPR = { c: 100, p: 50, n: 0 } as const;

export type Conformita = {
  /** Requisiti in esame. */
  totale: number;
  conformi: number;
  parziali: number;
  nonConformi: number;
  nonPertinenti: number;
  daValutare: number;
  /** Valutati, «non pertinente» compreso: è una valutazione, non un'omissione. */
  valutati: number;
  /** 0 ÷ 100, oppure `null` se nessun requisito è stato valutato o nessuno è pertinente:
   *  zero direbbe «tutto non conforme» di un sistema di cui non si sa ancora niente. */
  indice: number | null;
};

/**
 * La conformità di un elenco di requisiti.
 *
 * `stati` contiene lo stato di OGNI requisito dell'elenco, `null` per quelli mai valutati:
 * passare solo i valutati riaprirebbe il difetto che questa funzione chiude.
 */
export function conformita(stati: readonly (StatoRequisito | null | undefined)[]): Conformita {
  let conformi = 0;
  let parziali = 0;
  let nonConformi = 0;
  let nonPertinenti = 0;
  for (const s of stati) {
    if (s === "c") conformi++;
    else if (s === "p") parziali++;
    else if (s === "n") nonConformi++;
    else if (s === "na") nonPertinenti++;
  }
  const valutati = conformi + parziali + nonConformi + nonPertinenti;
  const pertinenti = stati.length - nonPertinenti;
  // ⚠️ «na» va tradotto nell'etichetta che `mediaPesata` esclude dal denominatore. Passato
  // così com'è conterebbe come un requisito pertinente a peso zero, e abbasserebbe l'indice
  // in silenzio a chi ha dichiarato, motivandolo, che quel requisito non lo riguarda.
  const etichette = stati.map((s) => (s === "na" ? NON_APPLICABILE : (s ?? null)));
  return {
    totale: stati.length,
    conformi,
    parziali,
    nonConformi,
    nonPertinenti,
    daValutare: stati.length - valutati,
    valutati,
    indice: valutati > 0 && pertinenti > 0 ? mediaPesata(etichette, PESI_GDPR) : null,
  };
}

/** Il colore di un indice: verde da 90, giallo da 60, rosso sotto. Le soglie del prototipo. */
export function fasciaIndice(indice: number | null): "buona" | "media" | "bassa" | null {
  if (indice === null) return null;
  return indice >= 90 ? "buona" : indice >= 60 ? "media" : "bassa";
}
