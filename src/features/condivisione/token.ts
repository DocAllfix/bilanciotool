import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Il collegamento che l'azienda cliente riceve per scaricare i propri documenti.
//
// Non c'è account, non c'è password: chi ha il collegamento entra. È una scelta, non una
// scorciatoia — l'alternativa (registrare il referente aziendale) significa creare utenti
// veri, gestirne le password, contarli negli accessi del piano e chiedere a un
// imprenditore di aprire un account per scaricare tre PDF una volta l'anno.
//
// Il prezzo di questa scelta è che il collegamento **è** la credenziale, e da lì discendono
// le tre difese:
//
// 1. **Nel database sta solo l'impronta**, mai il collegamento. Chi leggesse le righe non
//    potrebbe aprirne nessuno: dall'impronta non si risale al token.
// 2. **Scade da solo**, e la scadenza si sceglie quando lo si crea.
// 3. **Si revoca**, e la revoca ha effetto immediato.

/** Quanti byte di casualità. 32 byte = 256 bit: indovinarlo non è una strada percorribile. */
const BYTE = 32;

/** Genera un collegamento nuovo. Il valore in chiaro si vede UNA volta sola, alla creazione. */
export function generaToken(): string {
  return randomBytes(BYTE).toString("base64url");
}

/** L'impronta da conservare. SHA-256 basta: il token è già casuale e lungo, non è una
 *  password da proteggere da un attacco a dizionario. */
export function improntaToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Il token ha la forma giusta? Serve a scartare subito la spazzatura, prima di interrogare
 *  il database: un indirizzo storto non deve costare una query. */
export function formaValida(token: string): boolean {
  return typeof token === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

/** Confronto a tempo costante fra due impronte. */
export function improntaCoincide(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

export type StatoCollegamento = "valido" | "scaduto" | "revocato";

/**
 * Un collegamento è utilizzabile?
 *
 * L'ordine conta: **prima la revoca, poi la scadenza**. Un collegamento revocato resta
 * revocato anche se la sua scadenza è ancora lontana, e dire «scaduto» a chi ne ha uno
 * revocato sarebbe una bugia che manda lo studio a cercare il problema nella data.
 */
export function statoCollegamento(
  link: { revokedAt: Date | null; expiresAt: Date },
  adesso: Date = new Date(),
): StatoCollegamento {
  if (link.revokedAt) return "revocato";
  if (link.expiresAt.getTime() <= adesso.getTime()) return "scaduto";
  return "valido";
}

/** Le durate proposte allo studio. Un collegamento eterno non è un collegamento: è una porta
 *  aperta di cui ci si dimentica. */
export const DURATE = [
  { giorni: 7, etichetta: "7 giorni" },
  { giorni: 30, etichetta: "30 giorni" },
  { giorni: 90, etichetta: "90 giorni" },
] as const;

export const DURATA_PREDEFINITA = 30;

export function scadenzaFraGiorni(giorni: number, da: Date = new Date()): Date {
  const ammessi = DURATE.map((d) => d.giorni);
  const g = ammessi.includes(giorni as (typeof ammessi)[number]) ? giorni : DURATA_PREDEFINITA;
  return new Date(da.getTime() + g * 86_400_000);
}
