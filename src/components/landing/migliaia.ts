/**
 * Le migliaia col punto, a mano: `toLocaleString` dipende dall'ICU, e server e browser ne
 * hanno due diversi.
 *
 * Sta in un file suo, senza "use client": la usano sia i componenti server della home sia
 * il contatore animato, e una funzione esportata da un modulo client il server non la può
 * chiamare (il build si ferma con «Attempted to call migliaia() from the server»).
 */
export const migliaia = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
