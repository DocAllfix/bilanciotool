// Il marchio in fondo al documento: il nostro, oppure quello dello studio che ha
// comprato l'estensione white-label.
//
// Modulo PURO, senza database: lo importano sia la pubblicazione (che sceglie) sia i
// cinque template (che leggono). La scelta si fa una volta sola e finisce nello
// snapshot immutabile — se il documento consultasse l'abbonamento al momento della
// lettura, una carta gia' consegnata al cliente cambierebbe intestazione il giorno in
// cui l'estensione scade. Un documento firmato non si riscrive da solo.

export type Marchio = {
  nome: string;
  /** true = il nostro, e allora accanto va il monogramma. Il logo dello studio non
   *  ce l'abbiamo: nessun flusso dell'app lo carica, e un'immagine mancante in un PDF
   *  consegnato e' peggio del nome scritto bene. */
  nostro: boolean;
};

export const MARCHIO_NOSTRO: Marchio = { nome: "EvalisDeck", nostro: true };

/** Il piede della pagina ha una riga sola: oltre questa misura si va a capo storto. */
const LUNGHEZZA_MASSIMA = 80;

/** Si decide alla pubblicazione e si scrive nello snapshot. Mai al momento di leggere. */
export function marchioDaCongelare(opts: {
  whiteLabel: boolean;
  nomeStudio: string | null | undefined;
}): Marchio {
  if (!opts.whiteLabel) return MARCHIO_NOSTRO;
  const nome = (opts.nomeStudio ?? "").trim().slice(0, LUNGHEZZA_MASSIMA);
  // Senza un nome utilizzabile il documento uscirebbe senza intestazione: meglio il nostro.
  return nome ? { nome, nostro: false } : MARCHIO_NOSTRO;
}

/**
 * Il marchio congelato in uno snapshot.
 *
 * Gli snapshot pubblicati prima che l'estensione esistesse non hanno il campo, e
 * portano il nostro: e' esattamente quello che c'era stampato sul PDF consegnato.
 */
export function marchioDelloSnapshot(dati: unknown): Marchio {
  const m = (dati as { marchio?: unknown } | null | undefined)?.marchio as
    | Partial<Marchio>
    | null
    | undefined;
  if (!m || typeof m.nome !== "string" || !m.nome.trim()) return MARCHIO_NOSTRO;
  return { nome: m.nome, nostro: m.nostro !== false };
}
