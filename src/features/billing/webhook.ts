import type Stripe from "stripe";
import { stripe, idPrezzo } from "@/lib/stripe/client";
import { db } from "@/lib/db";
import { stripeSubscription } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PIANI, prezzoDiVendita, type PianoKey } from "@/lib/prezzi";
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

/** Gli eventi che ci riguardano. Tutto il resto riceve un «va bene» e finisce lì. */
export const EVENTI = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
] as const;

export type EsitoEvento = { fatto: boolean; nota: string };

/**
 * Il piano a due fasi: primo anno al suo prezzo, poi rinnovo al prezzo ridotto, per
 * sempre.
 *
 * Si crea DOPO il pagamento, a partire dall'abbonamento appena nato. Non prima: al
 * momento del checkout l'abbonamento non esiste ancora.
 *
 * ⚠️ `end_behavior: "release"` significa che, esaurite le fasi, lo Schedule si stacca e
 * l'abbonamento continua da solo al prezzo dell'ultima fase. È il comportamento che
 * vogliamo — e il motivo per cui `subscription_schedule.released` NON è una disdetta.
 */
async function creaPianoDueFasi(sub: Stripe.Subscription, piano: PianoKey): Promise<void> {
  if (sub.schedule) return; // già fatto: l'evento è arrivato due volte
  const rinnovo = prezzoDiVendita(PIANI[piano], "rinnovo");
  if (!rinnovo) return;

  const schedule = await stripe().subscriptionSchedules.create({ from_subscription: sub.id });
  const fase = schedule.phases[0];
  if (!fase) return;

  await stripe().subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    phases: [
      {
        // La prima fase si ridichiara identica a com'è: Stripe pretende l'elenco
        // completo, e ometterla la cancellerebbe.
        items: fase.items.map((i) => ({
          price: typeof i.price === "string" ? i.price : i.price.id,
          quantity: i.quantity ?? 1,
        })),
        start_date: fase.start_date,
        end_date: fase.end_date,
      },
      {
        items: [{ price: await idPrezzo(rinnovo.lookup), quantity: 1 }],
        // `duration` e non `iterations`: quest'ultimo non esiste più nella versione
        // corrente dell'API, e il compilatore l'ha intercettato prima che diventasse
        // un errore in produzione su un rinnovo fra dodici mesi.
        duration: { interval: "year", interval_count: 1 },
      },
    ],
  });
}

/** Rilegge l'abbonamento da Stripe e ne riporta lo stato nell'account. */
async function riallinea(subscriptionId: string, nota: string): Promise<EsitoEvento> {
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

  await applicaAbbonamento(sub, orgId);
  return { fatto: true, nota };
}

export async function gestisciEvento(evento: Stripe.Event): Promise<EsitoEvento> {
  switch (evento.type) {
    case "checkout.session.completed": {
      const sessione = evento.data.object;
      if (!sessione.subscription) return { fatto: false, nota: "sessione senza abbonamento" };
      const subId =
        typeof sessione.subscription === "string" ? sessione.subscription : sessione.subscription.id;

      const esito = await riallinea(subId, "attivato dal checkout");
      // Le due fasi si impostano solo dopo che l'account è stato attivato: se questo
      // fallisse, il cliente ha comunque quello per cui ha pagato, e il rinnovo si
      // sistema a mano. L'ordine inverso lascerebbe un pagato senza servizio.
      if (esito.fatto) {
        const sub = await stripe().subscriptions.retrieve(subId);
        const piano = sub.metadata?.piano as PianoKey | undefined;
        if (piano && PIANI[piano]) await creaPianoDueFasi(sub, piano);
      }
      return esito;
    }

    case "customer.subscription.created": {
      const esito = await riallinea(evento.data.object.id, "abbonamento creato");
      // Le due fasi si impostano su OGNI abbonamento nuovo, non solo su quelli nati dal
      // checkout: un abbonamento creato a mano — per un Enterprise, o per rimediare a un
      // pagamento fuori flusso — resterebbe altrimenti al prezzo del primo anno per
      // sempre, e il cliente pagherebbe il rinnovo piu' caro del dovuto. Trovato dal
      // collaudo, che paga via API e non dal modulo.
      if (esito.fatto) {
        const sub = await stripe().subscriptions.retrieve(evento.data.object.id);
        const piano = sub.metadata?.piano as PianoKey | undefined;
        if (piano && PIANI[piano]) await creaPianoDueFasi(sub, piano);
      }
      return esito;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return riallinea(evento.data.object.id, `abbonamento ${evento.type.split(".").pop()}`);

    case "invoice.paid":
    case "invoice.payment_failed": {
      const fattura = evento.data.object as Stripe.Invoice & { subscription?: string | { id: string } };
      const sub = fattura.subscription;
      if (!sub) return { fatto: false, nota: "fattura non legata a un abbonamento" };
      return riallinea(typeof sub === "string" ? sub : sub.id, `fattura ${evento.type.split(".").pop()}`);
    }

    default:
      return { fatto: false, nota: `evento ignorato: ${evento.type}` };
  }
}

/** Lo schedule collegato a un abbonamento, per i test e la diagnostica. */
export async function scheduleDi(orgId: string): Promise<string | null> {
  const r = await db
    .select({ id: stripeSubscription.stripeScheduleId })
    .from(stripeSubscription)
    .where(eq(stripeSubscription.organizationId, orgId))
    .limit(1);
  return r[0]?.id ?? null;
}
