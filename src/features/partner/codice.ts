// Il codice partner come lo scrive una persona, e come lo legge il prodotto.
//
// Puro: lo usano il modulo di iscrizione (per mostrarlo in maiuscolo mentre si scrive) e il
// server (per non credere a ciò che il browser manda). Una funzione sola nei due posti.

/** Il formato dei codici, lo stesso del vincolo `partner_codice_ck` della migrazione 0071. */
const FORMATO = /^[A-Z0-9]{2,20}$/;

/**
 * Da ciò che è stato scritto al codice da cercare nel registro.
 *
 * - vuoto (o solo spazi) → `null`: il campo è facoltativo, e non scriverlo non è un errore;
 * - « ngr » → «NGR»: le maiuscole e gli spazi attorno non sono una scelta di chi scrive;
 * - un formato impossibile → `"non-valido"`, che il server rifiuta come un codice sconosciuto.
 */
export function normalizzaCodicePartner(grezzo: unknown): string | null | "non-valido" {
  if (grezzo === undefined || grezzo === null) return null;
  if (typeof grezzo !== "string") return "non-valido";
  const v = grezzo.trim().toUpperCase();
  if (!v) return null;
  return FORMATO.test(v) ? v : "non-valido";
}

/** Il messaggio per un codice che non c'è: dice cosa fare, e che si può proseguire senza. */
export function messaggioCodiceSconosciuto(scritto: string): string {
  const mostrato = scritto.trim().slice(0, 20);
  return `Il codice partner «${mostrato}» non è riconosciuto. Controllalo, oppure lascia il campo vuoto: puoi iscriverti anche senza.`;
}
