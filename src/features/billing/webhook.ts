import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { applicaAbbonamento, organizzazioneDelCliente } from "./provisioning";

// Il dispatch degli eventi Stripe.
//
// DUE REGOLE, e sono quelle che rendono questo file noioso invece che pericoloso:
//
// 1. **Non si crede al payload.** Da ogni evento si prende solo un identificativo, e
//    lo stato si RILEGGE da Stripe. Gli eventi arrivano fuori ordine — un
//    `subscription.updated` vecchio può presentarsi dopo uno nuovo — e chi si fida del
//    contenuto scrive lo stato di ieri sopra quello di oggi.
//
// 2. **Quello che non si riconosce si ignora, con successo.** Rispondere errore a un
//    evento che non ci interessa fa accumulare tentativi a Stripe finché disabilita
//    l'endpoint, e con l'endpoint disabilitato si fermano anche quelli che servono.

// Quali eventi ci riguardano lo dice lo `switch` di `gestisciEvento`, e basta lui.
// Qui c'era anche un elenco `EVENTI` che nessuno leggeva: due verità sullo stesso fatto,
// e quella che nessuno legge è quella che diverge.

export type EsitoEvento = { fatto: boolean; nota: string };

/* ⚠️ IL PIANO A DUE FASI NON SI CREA PIÙ (6 novembre 2026).
 *
 * Fino al listino precedente ogni abbonamento nuovo riceveva uno Schedule: primo anno al
 * suo prezzo, poi rinnovo al prezzo ridotto. Dal 6 novembre il prezzo è lo stesso ogni
 * periodo, quindi lo Schedule non ha niente da fare — e su un MENSILE sarebbe un danno:
 * la fase uno sarebbe durata un mese, e la due avrebbe addebitato per un anno il prezzo di
 * «rinnovo» di un listino che non esiste più.
 *
 * Gli abbonamenti già venduti con lo Schedule lo conservano: vive su Stripe, e Stripe lo
 * porta a termine da solo. Questo file non lo tocca, e `subscription_schedule.*` resta fra
 * gli eventi ignorati — `released` non è una disdetta.
 */

/**
 * Rilegge l'abbonamento da Stripe e ne riporta lo stato nell'account.
 *
 * Restituisce anche l'oggetto letto: chi deve creare lo Schedule lo riusa invece di
 * chiedere a Stripe la stessa cosa una seconda volta. Non e' economia di chiamate — e'
 * il budget della funzione: sei round trip sincroni dentro la risposta erano il modo in
 * cui il webhook arrivava al timeout, e un webhook ucciso a meta' fa sparire un pagamento.
 */
async function riallinea(
  subscriptionId: string,
  nota: string,
  /** L'evento che ha causato il riallineamento: finisce nel registro delle capacita'. */
  causa?: { id: string; type: string; created: number },
): Promise<EsitoEvento & { sub?: Stripe.Subscription }> {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const orgId =
    (sub.metadata?.organizationId as string | undefined) ?? (await organizzazioneDelCliente(customerId));
  if (!orgId) {
    // Un cliente che non è nostro: può capitare con account condivisi o dopo una
    // cancellazione. Si risponde bene e si lascia traccia, invece di far ritentare
    // Stripe all'infinito su qualcosa che non sapremo mai gestire.
    console.error("[billing] evento orfano: nessuna organizzazione per", customerId);
    return { fatto: false, nota: "cliente senza organizzazione" };
  }

  await applicaAbbonamento(sub, orgId, causa);
  return { fatto: true, nota, sub };
}

export async function gestisciEvento(evento: Stripe.Event): Promise<EsitoEvento> {
  switch (evento.type) {
    case "checkout.session.completed": {
      const sessione = evento.data.object;
      if (!sessione.subscription) return { fatto: false, nota: "sessione senza abbonamento" };
      const subId =
        typeof sessione.subscription === "string" ? sessione.subscription : sessione.subscription.id;

      // Lo Schedule NON si crea da questo ramo: lo crea `customer.subscription.created`,
      // che arriva sempre. Facendolo da entrambi, due eventi con id diversi superavano
      // entrambi il claim di idempotenza — che e' per evento, non per abbonamento — e
      // chiamavano `subscriptionSchedules.create` sullo stesso abbonamento. La guardia
      // `if (sub.schedule) return` legge un oggetto scaricato prima, quindi in corsa
      // entrambe vedevano `null`: la seconda riceveva un errore da Stripe, e ogni
      // pagamento produceva un 500 spurio che alimentava il contatore di fallimenti
      // dell'endpoint.
      return riallinea(subId, "attivato dal checkout", evento);
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return riallinea(evento.data.object.id, `abbonamento ${evento.type.split(".").pop()}`, evento);

    case "invoice.paid":
    case "invoice.payment_failed": {
      // ⚠️ Con l'API `2026-07-29.dahlia` l'abbonamento di una fattura sta in
      // `parent.subscription_details.subscription`: il campo `subscription` alla radice è
      // quello delle versioni precedenti. Si leggono entrambi, perché l'endpoint può essere
      // registrato con una versione diversa da quella dell'SDK — e leggendone uno solo una
      // fattura pagata risulterebbe «non legata a un abbonamento», in silenzio.
      const fattura = evento.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null };
      const sub = fattura.parent?.subscription_details?.subscription ?? fattura.subscription ?? null;
      if (!sub) return { fatto: false, nota: "fattura non legata a un abbonamento" };
      return riallinea(typeof sub === "string" ? sub : sub.id, `fattura ${evento.type.split(".").pop()}`, evento);
    }

    default:
      return { fatto: false, nota: `evento ignorato: ${evento.type}` };
  }
}
