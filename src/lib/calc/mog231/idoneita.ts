import { mediaCapitoli, mediaPesata, valutati as valutatiComune, type Pesi } from "@/lib/calc/comune/valutazione";

// L'idoneità del Modello: quanto degli 81 requisiti sui dieci pilastri è attuato.
//
// La REGOLA sta in `calc/comune/valutazione.ts` — un requisito applicabile e non
// valutato pesa zero, «Non applicabile» esce dal denominatore — perché è la stessa di
// ISO 37001, misurata sugli stessi presupposti. Qui resta il vocabolario di questo
// dominio: in materia 231 non si parla di conformità a una norma ma di PRESIDI, e le
// etichette lo dicono.

export const PESI_PRESIDIO: Pesi = {
  "Presente ed efficace": 100,
  "Presente ma da rafforzare": 50,
  Assente: 0,
};

/** L'idoneità di un pilastro, 0 ÷ 100. `stati` sono TUTTI i suoi requisiti. */
export function idoneitaPilastro(stati: readonly (string | null)[]): number {
  return mediaPesata(stati, PESI_PRESIDIO);
}

/** L'idoneità del Modello: media dei dieci pilastri, `null` se non ce ne sono. */
export function idoneitaModello(perPilastro: readonly number[]): number | null {
  return mediaCapitoli(perPilastro);
}

/** Quanti requisiti di un pilastro sono stati valutati, qualunque sia l'esito. */
export function valutati(stati: readonly (string | null)[]): number {
  return valutatiComune(stati);
}
