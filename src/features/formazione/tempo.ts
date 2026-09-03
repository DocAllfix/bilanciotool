/**
 * Il tempo che un corso chiede DAVVERO.
 *
 * ⚠️ Il campo `minuti` di una sezione è tempo di LETTURA pura, ed è una misura giusta per
 * quello che misura e falsa per quello che si dichiara a chi sceglie un corso. Nessuno
 * segue un corso leggendolo di fila: lo segue col prodotto aperto di fianco, si ferma a
 * provare, torna indietro su un passaggio, riapre la pagina di cui si sta parlando. Il
 * tempo da mettere in agenda è un altro, ed è più lungo.
 *
 * Il fattore è UNO e sta qui, non sparso nelle schede: un numero moltiplicato in tre punti
 * diversi diverge al primo ritocco, e le tre superfici comincerebbero a dire tre durate
 * diverse dello stesso corso.
 */
const LETTURA_A_STUDIO = 1.6;

/** Minuti di lettura pura -> minuti da dedicare, arrotondati ai cinque. */
export function tempoDaDedicare(minutiDiLettura: number): number {
  return Math.round((minutiDiLettura * LETTURA_A_STUDIO) / 5) * 5;
}

/**
 * «1 h 40», «45 min».
 *
 * ⚠️ Oltre l'ora i minuti si smettono di contare: «100 min» costringe chi legge a fare una
 * divisione per capire se il corso sta in una mattinata. Il formato si sceglie sul lettore,
 * non sull'unità di misura.
 */
export function formattaDurata(minuti: number): string {
  if (minuti < 60) return `${minuti} min`;
  const ore = Math.floor(minuti / 60);
  const resto = minuti % 60;
  return resto === 0 ? `${ore} h` : `${ore} h ${resto}`;
}
