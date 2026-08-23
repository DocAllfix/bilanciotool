import { mediaCapitoli, mediaPesata, valutati as valutatiComune, type Pesi } from "@/lib/calc/comune/valutazione";

// La conformità di un sistema ISO 37001: quanto dei 91 requisiti è stato attuato.
//
// La REGOLA sta in `calc/comune/valutazione.ts`, perché è la stessa del Modello 231 (e
// lo sarà di SGI QAS e SA8000/2026): un requisito applicabile e non valutato pesa zero,
// «Non applicabile» esce dal denominatore, i capitoli si mediano senza pesi. Lì c'è
// anche la ragione per cui diverge dai prototipi, misurata sul loro codice.
//
// Qui resta ciò che è di QUESTO dominio: il vocabolario degli stati e i loro pesi.

/** I pesi del prototipo. Il «parzialmente conforme» vale metà, non zero.
 *
 *  ⚠️ In SA8000/2026 lo stesso concetto pesa ZERO: sono due prototipi dello stesso
 *  autore che trattano la stessa idea in modo opposto. Si resta fedeli a ciascuno, e la
 *  divergenza fra i moduli è registrata in `docs/politica-arrotondamento.md` invece di
 *  essere appianata. È anche il motivo per cui i pesi stanno qui e non nel comune. */
export const PESI_STATO: Pesi = {
  Conforme: 100,
  "Parzialmente conforme": 50,
  "Non conforme": 0,
};

/** La conformità di un capitolo, 0 ÷ 100. Vedi `mediaPesata` per la regola. */
export function conformitaCapitolo(stati: readonly (string | null)[]): number {
  return mediaPesata(stati, PESI_STATO);
}

/** La conformità del sistema: media dei sette capitoli, `null` se non ce ne sono. */
export function conformitaSistema(perCapitolo: readonly number[]): number | null {
  return mediaCapitoli(perCapitolo);
}

/** Quanti requisiti di un capitolo hanno ricevuto una valutazione, qualunque essa sia. */
export function valutati(stati: readonly (string | null)[]): number {
  return valutatiComune(stati);
}
