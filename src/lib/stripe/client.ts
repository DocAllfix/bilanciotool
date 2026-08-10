import Stripe from "stripe";
import { env } from "@/lib/env";

// L'unico punto in cui si costruisce il client Stripe.
//
// Nessun id di prezzo o di prodotto vive in una variabile d'ambiente: si risolvono per
// `lookup_key` a partire da `src/lib/prezzi.ts`. Gli id cambiano fra sandbox e
// produzione, le chiavi del listino no — e un id sbagliato in produzione significa
// addebitare il piano di un altro.

let istanza: Stripe | null = null;

export function stripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY assente: il pagamento non è configurato.");
  }
  istanza ??= new Stripe(env.STRIPE_SECRET_KEY, {
    // Le richieste che falliscono per un guasto momentaneo si ripetono da sole. Senza,
    // un singolo errore di rete durante il checkout diventa un cliente che non paga.
    maxNetworkRetries: 2,
    timeout: 20_000,
  });
  return istanza;
}

export function stripeConfigurato(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

/**
 * L'id del prezzo a partire dalla chiave del listino.
 *
 * Se la chiave non esiste su Stripe si ferma qui, con un messaggio che dice quale
 * manca: è quasi sempre il segno che `stripe-bootstrap.mjs` non è stato eseguito su
 * quell'ambiente, e scoprirlo adesso costa meno che scoprirlo dal cliente.
 */
export async function idPrezzo(lookupKey: string): Promise<string> {
  const trovati = await stripe().prices.list({ lookup_keys: [lookupKey], limit: 1, active: true });
  const p = trovati.data[0];
  if (!p) {
    throw new Error(
      `Prezzo «${lookupKey}» non trovato su Stripe. Esegui: node scripts/stripe-bootstrap.mjs --applica`,
    );
  }
  return p.id;
}
