// L'aritmetica del denaro: funzioni PURE, nessun accesso al database.
//
// ⚠️ Sta qui e non dentro `features/compensi` per una ragione concreta e già pagata: il
// componente che disegna la pagina è `"use client"`, e importare `euro` da un modulo che
// importa anche `@/lib/db` trascina **`postgres` nel bundle del browser**. Il build si
// ferma con «Can't resolve 'fs'», e la diagnosi parte dalla parte sbagliata del sistema
// perché l'errore nomina un file di `node_modules`.
//
// È lo specchio della regola già scritta per le domande della vetrina: i dati condivisi
// fra server e client stanno in un file proprio.
//
// ⚠️ Tutti gli importi sono in CENTESIMI, interi. Un totale è una somma di interi e resta
// esatto; con i decimali in virgola mobile «tre acconti da 333,33» non fanno mai 1000.

export type StatoCompenso = "previsto" | "concordato" | "fatturato" | "incassato";

export type Riepilogo = {
  concordato: number;
  incassato: number;
  daIncassare: number;
  /** Quanti compensi hanno un residuo e una scadenza già passata. */
  inRitardo: number;
};

/** La forma minima che il riepilogo sa leggere: chi ne ha di più la porta lo stesso. */
export type VoceSommabile = {
  importo: number;
  incassato: number;
  residuo: number;
  scadenza: string | null;
};

/**
 * Da centesimi a stringa leggibile: `123456` → `1.234,56`.
 *
 * ⚠️ Le migliaia si raggruppano A MANO e non con `toLocaleString("it-IT")`.
 *
 * Sembra la scelta giusta e non lo è: `toLocaleString` dipende dai dati ICU del runtime,
 * e senza ICU completo restituisce `1234` invece di `1.234`. In Node il test l'ha colto
 * subito; il guaio vero sarebbe stato altrove — **il server e il browser hanno due ICU
 * diversi**, quindi lo stesso importo si sarebbe stampato in due modi nella stessa
 * pagina, e un documento avrebbe potuto riportare un numero scritto diversamente da come
 * si vede a schermo. Su una cifra di denaro non è una questione estetica.
 */
export function euro(centesimi: number): string {
  const segno = centesimi < 0 ? "-" : "";
  const n = Math.abs(centesimi);
  const intero = String(Math.floor(n / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const cent = String(n % 100).padStart(2, "0");
  return `${segno}${intero},${cent}`;
}

/**
 * Da testo a centesimi, o `null` se non è un importo.
 *
 * ⚠️ Non usa `parseFloat`. «1.234,56» in italiano vale milleduecentotrentaquattro e
 * cinquantasei; `parseFloat` legge `1.234` e restituisce **uno virgola duecentotrentaquattro**,
 * cioè un compenso di un euro e ventitré al posto di milleduecento — e non solleva
 * nessun errore. Sarebbe finito in una somma, e la somma sarebbe sembrata plausibile.
 */
export function aCentesimi(testo: string): number | null {
  // ⚠️ Il simbolo si toglie solo AGLI ESTREMI, non ovunque. Togliendolo ovunque
  // «12€34» diventava «1234», cioè un compenso di milleduecentotrentaquattro euro nato
  // da un refuso di dodici. Un importo indovinato male non produce un errore: produce
  // un numero sbagliato in una colonna che si somma.
  const t = testo.trim().replace(/^€\s*/, "").replace(/\s*€$/, "").replace(/\s/g, "");
  if (!t) return null;
  // Punto come migliaia, virgola come decimali: la forma italiana.
  const normalizzato = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/\.(?=\d{3}\b)/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalizzato)) return null;
  const [intero, dec = ""] = normalizzato.split(".");
  return Number(intero) * 100 + Number(dec.padEnd(2, "0"));
}

export function riepilogo(voci: readonly VoceSommabile[], oggi: string): Riepilogo {
  let concordato = 0;
  let incassato = 0;
  let inRitardo = 0;
  for (const v of voci) {
    concordato += v.importo;
    incassato += v.incassato;
    if (v.residuo > 0 && v.scadenza && v.scadenza < oggi) inRitardo++;
  }
  return { concordato, incassato, daIncassare: Math.max(0, concordato - incassato), inRitardo };
}
