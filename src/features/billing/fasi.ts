import { chiavePiano } from "@/lib/prezzi";

// Che cosa si paga alla SECONDA fase dell'abbonamento, cioè dal rinnovo in poi.
//
// Lo Schedule ha due fasi: primo anno al suo prezzo, poi rinnovo a prezzo ridotto per
// sempre (`end_behavior: "release"`). La prima fase ricopia le righe vere
// dell'abbonamento. La seconda le costruisce questa funzione.
//
// Prima le costruiva una riga sola — «il prezzo di rinnovo del piano, quantità 1» — e
// quello era un difetto latente: **le estensioni sparivano al rinnovo**. Chi avesse
// comprato Studio più cinque aziende in più si sarebbe visto, dodici mesi dopo, il
// limite riportato a dieci senza un avviso, mentre Stripe smetteva di addebitargliele.
// Non si era mai visto perché nessuno ha ancora rinnovato: sarebbe uscito fra un anno,
// su abbonamenti in corso, cioè nel momento peggiore per correggerlo.
//
// È pura apposta: decide quanto pagherà qualcuno per gli anni a venire, e una cosa così
// va provata senza chiamare Stripe.

export type RigaAbbonamento = {
  /** L'id del prezzo su Stripe. */
  priceId: string;
  /** La chiave del listino: è così che si riconosce che cos'è, non dal nome. */
  lookupKey: string | null;
  quantita: number;
  /** Falso per gli addebiti una tantum, che al rinnovo NON si ripetono. */
  ricorrente: boolean;
};

export type VoceFase = { price: string; quantity: number };

/**
 * Le righe della fase di rinnovo, a partire da quelle in corso.
 *
 * Tre regole:
 *  1. la riga del piano si sostituisce col prezzo di rinnovo, quantità 1;
 *  2. tutto il resto che è ricorrente **si porta dietro invariato** — stesso prezzo e
 *     stessa quantità: l'estensione comprata al prezzo di lancio resta a quel prezzo,
 *     esattamente come il piano;
 *  3. gli addebiti **una tantum non passano**: l'avvio assistito si paga una volta, e
 *     ripeterlo ogni anno sarebbe un addebito che nessuno ha accettato.
 *
 * Una riga ricorrente che non riconosciamo si porta dietro lo stesso: qualcuno l'ha
 * aggiunta dal cruscotto di Stripe e il cliente l'ha accettata. Smettere di addebitarla
 * in silenzio è il danno peggiore fra i due.
 */
export function vociDelRinnovo(righe: RigaAbbonamento[], priceIdRinnovo: string): VoceFase[] {
  const estensioni = righe
    .filter((r) => !chiavePiano(r.lookupKey) && r.ricorrente)
    .map((r) => ({ price: r.priceId, quantity: Math.max(1, r.quantita) }));

  // Il piano davanti: è la riga che il cliente cerca per prima quando apre la fattura.
  return [{ price: priceIdRinnovo, quantity: 1 }, ...estensioni];
}
