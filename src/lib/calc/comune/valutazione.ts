// La valutazione di un insieme di requisiti: quanto di ciò che è dovuto è attuato.
//
// Sta qui, e non dentro un modulo, perché la domanda è LETTERALMENTE la stessa in ISO
// 37001 e nel Modello 231 — e lo sarà in SGI QAS e SA8000/2026. Cambiano le etichette
// degli stati e i loro pesi; non cambia la regola.
//
// ⚠️ La regola, e la ragione per cui diverge dai prototipi:
//
// I prototipi mediano i SOLI requisiti valutati. Misurato eseguendo il loro codice, un
// capitolo con tre requisiti conformi su venti e diciassette mai guardati restituisce
// **100** — lo stesso numero di «tutti e venti conformi» e di «tre conformi e
// diciassette non applicabili». Tre situazioni opposte, un numero solo, su un documento
// che si porta a un ente di certificazione.
//
// Qui **un requisito applicabile e non valutato pesa zero**: mediare sui soli valutati
// fa salire l'indice man mano che si saltano i requisiti difficili, che è il contrario
// del vero. «Non applicabile» resta invece FUORI dal denominatore, ed è un'altra cosa: è
// una valutazione, non un'omissione, e chi ha dichiarato che venti requisiti non lo
// riguardano non deve risultare inadempiente su venti requisiti.

/** Il valore che si dà a uno stato. Ogni dominio ha il proprio vocabolario. */
export type Pesi = Readonly<Record<string, number>>;

/** L'etichetta che esce dal denominatore. Uguale in tutti i domini finora. */
export const NON_APPLICABILE = "Non applicabile";

/**
 * La media pesata di un capitolo, 0 ÷ 100.
 *
 * `stati` è lo stato di OGNI requisito del capitolo, nell'ordine: stringa vuota o `null`
 * per quelli mai valutati. Passare solo i valutati farebbe rientrare dalla finestra il
 * difetto che questa funzione esiste per chiudere — ed è un errore facile, perché il
 * codice chiamante spesso ha già una mappa dei soli valutati sotto mano.
 */
export function mediaPesata(stati: readonly (string | null)[], pesi: Pesi): number {
  const applicabili = stati.filter((s) => s !== NON_APPLICABILE);
  if (!applicabili.length) return 0;
  const somma = applicabili.reduce((a, s) => a + (s ? (pesi[s] ?? 0) : 0), 0);
  return Math.round(somma / applicabili.length);
}

/**
 * La media dei capitoli, ciascuno con lo stesso peso.
 *
 * Non pesata sul numero di requisiti: un capitolo da cinque conta quanto uno da trenta.
 * È la scelta dei prototipi e si conserva — nessuna delle norme dice che un capitolo
 * valga sei volte un altro.
 *
 * `null` quando non ci sono capitoli: zero vorrebbe dire «tutto non conforme», e un
 * sistema di cui non si sa niente non è un sistema inadempiente.
 */
export function mediaCapitoli(perCapitolo: readonly number[]): number | null {
  if (!perCapitolo.length) return null;
  return Math.round(perCapitolo.reduce((a, b) => a + b, 0) / perCapitolo.length);
}

/** Quanti requisiti hanno ricevuto una valutazione, qualunque essa sia. */
export function valutati(stati: readonly (string | null)[]): number {
  return stati.filter((s) => !!s).length;
}
