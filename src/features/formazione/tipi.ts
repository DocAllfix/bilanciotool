import type { ModuloAzienda } from "@/features/companies/moduli";

/**
 * Il modello della formazione.
 *
 * ⚠️ UN CORSO È DATO, NON UNA PAGINA. Dodici moduli per una dozzina di sezioni ciascuno
 * sarebbero centinaia di componenti da mantenere allineati: è il bivio che questo progetto
 * ha già affrontato due volte, col corpus (447 documenti resi da un componente solo) e con
 * le 63 schede del metodo. La risposta è la stessa, e per la stessa ragione: ciò che si
 * ricopia diverge.
 */

export type Blocco =
  | { tipo: "prosa"; testo: string }
  | { tipo: "elenco"; voci: string[] }
  | { tipo: "tabella"; intestazioni: string[]; righe: string[][] }
  | { tipo: "avviso"; tono: Tono; titolo?: string; testo: string }
  | { tipo: "formula"; testo: string };

/**
 * ⚠️ Tre toni e non di più.
 *
 * `nota` spiega, `attenzione` previene un errore che costa tempo, `errore` previene un
 * errore che costa un documento. Con una quarta sfumatura nessuno distingue più le prime
 * tre, e un avviso che non si distingue è un paragrafo colorato.
 */
export type Tono = "nota" | "attenzione" | "errore";

export type Sezione = {
  /** Stabile: ci si àncora, e finisce nell'indirizzo. */
  id: string;
  titolo: string;
  minuti: number;
  /** La riga sotto il titolo: che cosa si impara qui. */
  sommario: string;
  blocchi: Blocco[];
};

export type Corso = {
  modulo: ModuloAzienda;
  /**
   * Le sezioni proprie del modulo.
   *
   * ⚠️ Può essere VUOTO, e in quel caso il corso lo DICE. Dieci moduli su dodici oggi non
   * hanno ancora la parte specifica: un corso che finge di averla è peggio di un corso che
   * manca, perché chi lo apre smette di cercare altrove. È la stessa scelta già fatta per
   * il dodicesimo percorso nella guida, che dichiara di non produrre ancora un documento.
   */
  proprie: Sezione[];
};

/** Le sezioni di un corso, nell'ordine in cui si leggono. */
export function sezioniDelCorso(comuni: Sezione[], corso: Corso): Sezione[] {
  return [...comuni, ...corso.proprie];
}

export function minutiTotali(sezioni: Sezione[]): number {
  return sezioni.reduce((n, s) => n + s.minuti, 0);
}
