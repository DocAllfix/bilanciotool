// Numeri leggibili per la vetrina pubblica, senza `toLocale*`.
//
// ⚠️ LA VETRINA È UNA PAGINA STATICA CON DENTRO UN COMPONENTE CLIENT: l'HTML lo scrive il
// build (ICU di Node), l'idratazione la fa il browser (ICU suo). `toLocaleString` dipende dai
// dati ICU del runtime, e i due possono raggruppare le migliaia in modo diverso — su Node
// senza ICU completa «1.017.000» esce «1017000». React se ne accorge, butta via l'HTML del
// server e ridisegna: è il difetto #418 già visto sul deploy di anteprima il 26 agosto 2026.
//
// Qui le migliaia si raggruppano a mano, come fa `euro()` nel listino per la stessa ragione.

/** Migliaia col punto, decimali con la virgola. `null` e valori non finiti diventano «—»:
 *  un trattino dice «non lo so», uno zero direbbe «è zero», e sono due cose diverse. */
export function numero(v: string | number | null | undefined, decimali = 0): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";

  const segno = n < 0 ? "-" : "";
  const assoluto = Math.abs(n);
  const fisso = assoluto.toFixed(decimali);
  const [intero, decimale] = fisso.split(".");
  const raggruppato = intero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return segno + raggruppato + (decimale ? "," + decimale : "");
}

/** Percentuale con un decimale. */
export function percentuale(v: string | number | null | undefined, decimali = 1): string {
  const s = numero(v, decimali);
  return s === "—" ? s : `${s}%`;
}
