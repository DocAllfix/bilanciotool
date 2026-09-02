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
  | { tipo: "formula"; testo: string }
  | { tipo: "interfaccia"; titolo?: string; nota?: string; vista: VistaFinta };

/**
 * Una riproduzione dell'interfaccia, dichiarata come DATO e disegnata coi token veri.
 *
 * ⚠️ NON UNO SCREENSHOT, e la ragione questo progetto l'ha gia' pagata. L'immagine sociale
 * della vetrina si genera dal codice apposta: un file statico diverge dal prodotto e «la
 * prima volta che diverge non se ne accorge nessuno, perche' chi la vede non e' chi la
 * controlla». In piu' un'immagine non segue il tema chiaro/scuro, non si stringe su un
 * telefono e va rifatta a ogni ritocco.
 *
 * Il precedente giusto e' il Deck della vetrina: mini-interfacce vere che si
 * rimpiccioliscono identiche a se' stesse.
 *
 * ⚠️ Quattro generi e non di piu'. Sono i quattro modi in cui questo prodotto mostra
 * qualcosa: un percorso a passi, una riga che si calcola, uno stato dichiarato, un elenco
 * di lacune. Un quinto genere sarebbe una figura senza una domanda dietro.
 */
export type VistaFinta =
  /** Il percorso a passi, com'e' in cima a ogni modulo per esercizio. */
  | { genere: "passi"; passi: { nome: string; stato: "fatto" | "corso" | "vuoto" }[] }
  /** Una riga di tabella con il numero che il prodotto calcola da solo. */
  | { genere: "riga"; intestazioni: string[]; celle: string[]; risultato?: { etichetta: string; valore: string } }
  /** Le scelte possibili su una domanda o un requisito, con quella scelta in evidenza. */
  | { genere: "stati"; voci: { testo: string; stato: "ok" | "parziale" | "no" | "na" }[] }
  /** L'elenco della verifica: che cosa c'e' e che cosa manca. */
  | { genere: "verifica"; voci: { testo: string; esito: "ok" | "manca" }[] };

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
