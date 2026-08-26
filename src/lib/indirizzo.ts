import { env } from "@/lib/env";

// DUE INDIRIZZI, NON UNO.
//
// Finora c'era `NEXT_PUBLIC_APP_URL` e basta, letta in quattordici punti con **quattro
// ripieghi diversi** (`""`, `"https://evalisdeck.it"`, `"http://localhost:3000"`). Finche'
// il prodotto e' esistito in un posto solo la confusione non costava niente. Su un deploy
// di anteprima costa subito, e in due modi opposti:
//
//   · chi RIMANDA l'utente da qualche parte — l'accesso, il collegamento di un invito, il
//     ritorno da Stripe — deve puntare a DOVE SI TROVA ADESSO. Su un'anteprima l'indirizzo
//     e' assegnato al volo (`evalisdeck-git-<ramo>-….vercel.app`) e nessuna variabile
//     impostata a mano lo conosce: con l'indirizzo di produzione l'utente esce
//     dall'anteprima a meta' flusso, e il collaudo misura il sito vero credendo di
//     misurare il ramo.
//
//   · chi DICHIARA un indirizzo permanente — il canonical di un articolo, la sitemap, e
//     soprattutto il collegamento di verifica stampato dentro un documento — deve puntare
//     al SITO VERO, sempre. Un PDF pubblicato da un'anteprima porterebbe in mano al
//     cliente un indirizzo che fra un'ora non esiste piu'. Lo snapshot e' immutabile:
//     quell'indirizzo resterebbe sbagliato per sempre.
//
// Sono due domande diverse e meritano due funzioni. Chiamare quella sbagliata e' un
// difetto silenzioso, ed e' il motivo per cui questo file esiste invece di una costante.

/** L'indirizzo di produzione, quando non lo dichiara nessuno. */
const CANONICO_PREDEFINITO = "https://evalisdeck.it";

const senzaBarra = (u: string) => u.replace(/\/+$/, "");

/**
 * Dove si trova QUESTO deployment, adesso.
 *
 * Per i rinvii: `baseURL` di Better Auth, il collegamento dell'invito, gli indirizzi di
 * ritorno di Stripe. Su Vercel `VERCEL_URL` porta l'host effettivo — anche quello di
 * un'anteprima — e non richiede che qualcuno lo indovini in anticipo.
 */
export function indirizzoCorrente(): string {
  // ⚠️ `VERCEL_URL` viene PRIMA di `NEXT_PUBLIC_APP_URL` solo sulle anteprime: in
  // produzione le due coincidono, e su un'anteprima e' l'unica che dice il vero.
  const vercel = process.env.VERCEL_URL;
  const ambiente = process.env.VERCEL_ENV;
  if (vercel && ambiente && ambiente !== "production") return `https://${vercel}`;
  if (env.NEXT_PUBLIC_APP_URL) return senzaBarra(env.NEXT_PUBLIC_APP_URL);
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/**
 * L'indirizzo PUBBLICO e permanente del prodotto.
 *
 * Per cio' che resta scritto: canonical, sitemap, robots, `llms.txt`, e il collegamento
 * di verifica che finisce stampato in un documento consegnato al cliente.
 *
 * ⚠️ NON segue mai l'anteprima. Un canonical verso un host temporaneo insegna a Google un
 * indirizzo che muore, e un codice di verifica stampato su un PDF immutabile che rimanda
 * a un'anteprima e' un documento nato sbagliato.
 */
export function indirizzoCanonico(): string {
  return senzaBarra(env.NEXT_PUBLIC_APP_URL ?? CANONICO_PREDEFINITO);
}
