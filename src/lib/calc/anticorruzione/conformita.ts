// La conformità di un sistema ISO 37001: quanto dei 91 requisiti è stato attuato.
//
// ⚠️ SCOSTAMENTO VOLUTO dal prototipo, documentato in `docs/politica-arrotondamento.md`.
//
// Il prototipo mediava i soli requisiti VALUTATI. Misurato sul suo stesso codice: un
// capitolo con tre requisiti conformi su venti, e diciassette mai guardati, restituiva
// **100** — lo stesso numero di «tutti e venti conformi» e di «tre conformi e
// diciassette non applicabili». Tre situazioni opposte, un numero solo, su un documento
// che si porta a un ente di certificazione.
//
// Qui vale la regola già adottata per la Dichiarazione di Applicabilità: **un requisito
// applicabile e non valutato pesa zero**. Mediare sui soli valutati fa salire l'indice
// man mano che si saltano i requisiti difficili, che è il contrario del vero.
//
// «Non applicabile» resta invece FUORI dal denominatore, ed è un'altra cosa: è una
// valutazione, non un'omissione. Chi ha dichiarato che venti requisiti non lo riguardano
// non deve risultare inadempiente su venti requisiti.

/** I pesi del prototipo. Il «parzialmente conforme» vale metà, non zero. */
export const PESI_STATO: Record<string, number> = {
  Conforme: 100,
  "Parzialmente conforme": 50,
  "Non conforme": 0,
};

/**
 * La conformità di un capitolo, 0 ÷ 100.
 *
 * `stati` è lo stato di OGNI requisito del capitolo, nell'ordine: stringa vuota o
 * `null` per quelli mai valutati. Passare solo i valutati farebbe rientrare dalla
 * finestra il difetto che questa funzione esiste per chiudere.
 */
export function conformitaCapitolo(stati: readonly (string | null)[]): number {
  const applicabili = stati.filter((s) => s !== "Non applicabile");
  if (!applicabili.length) return 0;
  // Un requisito senza stato contribuisce 0 e RESTA nel denominatore.
  const somma = applicabili.reduce((a, s) => a + (s ? (PESI_STATO[s] ?? 0) : 0), 0);
  return Math.round(somma / applicabili.length);
}

/**
 * La conformità del sistema: media dei capitoli, ciascuno con lo stesso peso.
 *
 * Non pesata sul numero di requisiti — un capitolo da cinque conta quanto uno da
 * trenta. È la scelta del prototipo e si conserva: la norma non dice che il capitolo 8
 * valga sei volte il capitolo 10.
 *
 * `null` quando non ci sono capitoli: zero vorrebbe dire «tutto non conforme», e un
 * sistema di cui non si sa niente non è un sistema inadempiente.
 */
export function conformitaSistema(perCapitolo: readonly number[]): number | null {
  if (!perCapitolo.length) return null;
  return Math.round(perCapitolo.reduce((a, b) => a + b, 0) / perCapitolo.length);
}

/** Quanti requisiti di un capitolo hanno ricevuto una valutazione, qualunque essa sia. */
export function valutati(stati: readonly (string | null)[]): number {
  return stati.filter((s) => !!s).length;
}
