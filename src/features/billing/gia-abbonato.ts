import { and, eq, notInArray } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { orgEntitlement, stripeSubscription } from "@/lib/db/schema";

// Uno studio che paga già non deve poter aprire un secondo checkout.
//
// ── Perché esiste questo file ─────────────────────────────────────────────────
//
// Nella pagina dell'abbonamento la griglia dei piani si rende per tutti, e a chi ha già
// pagato mostrava «Passa a questo» sugli altri due piani. Quel pulsante non cambiava
// niente: apriva un checkout in `mode: "subscription"` sullo stesso cliente Stripe, e
// Stripe creava un **secondo abbonamento parallelo**.
//
// Il primo continuava a fatturare ogni anno. Lo studio ne vedeva uno solo, perché
// `org_entitlement` è una riga sola riscritta dall'evento arrivato per ultimo. E non
// poteva disdirlo: il portale ha `subscription_cancel` spento di proposito.
//
// Doppio addebito ricorrente, raggiungibile con un click dall'interfaccia ufficiale.
// Nessun attacco: bastava crederci.
//
// ── Perché lato SERVER e non solo nell'interfaccia ────────────────────────────
//
// Il pulsante si nasconde, ed è giusto nasconderlo. Ma una server action è un endpoint
// HTTP, e il tipo TypeScript non esiste a runtime: due schede aperte, un `fetch` a mano,
// o il tasto indietro dopo essere usciti verso Stripe bastano ad aggirare l'interfaccia.
// La regola vale qui come per il resto del prodotto.

/** Gli stati Stripe in cui un abbonamento **non** impegna più nessuno. */
const TERMINATI = ["canceled", "incomplete_expired"] as const;

export type MotivoBlocco = "abbonamento_attivo" | "abbonamento_in_sofferenza";

/**
 * Perché questo studio non può aprire un checkout, oppure `null` se può.
 *
 * Due domande, non una, e servono entrambe:
 *
 * 1. **`org_entitlement.status`** — è ciò che il prodotto crede. Copre anche gli studi
 *    attivati a mano (Enterprise pagato per bonifico), che un abbonamento Stripe non ce
 *    l'hanno affatto.
 * 2. **`stripe_subscription`** — è ciò che Stripe fattura. Copre la finestra fra il
 *    pagamento e l'arrivo del webhook, in cui l'entitlement è ancora `demo` ma
 *    l'abbonamento esiste già: sono i secondi in cui un cliente impaziente ripaga.
 *
 * `past_due` blocca come `active`: un pagamento non riuscito si risolve aggiornando la
 * carta dal portale, non comprando un secondo abbonamento sopra il primo.
 */
export async function bloccoAlCheckout(
  userId: string,
  orgId: string,
): Promise<MotivoBlocco | null> {
  return withTenant({ userId, orgId }, async (tx) => {
    const [e] = await tx
      .select({ status: orgEntitlement.status })
      .from(orgEntitlement)
      .where(eq(orgEntitlement.organizationId, orgId))
      .limit(1);

    if (e?.status === "active") return "abbonamento_attivo";
    if (e?.status === "past_due") return "abbonamento_in_sofferenza";

    const vivi = await tx
      .select({ id: stripeSubscription.id })
      .from(stripeSubscription)
      .where(
        and(
          eq(stripeSubscription.organizationId, orgId),
          notInArray(stripeSubscription.status, [...TERMINATI]),
        ),
      )
      .limit(1);

    return vivi.length ? "abbonamento_attivo" : null;
  });
}

/**
 * Che cosa leggerà chi viene fermato.
 *
 * Dice a chi scrivere, e non è cortesia: il cambio piano e la disdetta sono spenti nel
 * portale per scelta, quindi l'unica strada vera è parlare con qualcuno. Un messaggio
 * che si limitasse a «non consentito» lascerebbe il cliente senza sapere che fare.
 */
export function messaggioBlocco(motivo: MotivoBlocco): string {
  return motivo === "abbonamento_attivo"
    ? "Questo studio ha già un abbonamento attivo. Per cambiare piano o aggiungere estensioni scrivici: lo modifichiamo sul tuo abbonamento, senza aprirne un secondo."
    : "C'è un pagamento in sospeso su questo abbonamento. Aggiorna il metodo di pagamento dal portale: aprire un nuovo abbonamento non risolve il precedente.";
}
