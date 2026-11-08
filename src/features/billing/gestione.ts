import type Stripe from "stripe";
import { and, desc, eq, notInArray } from "drizzle-orm";
import { stripe, idPrezzo } from "@/lib/stripe/client";
import { withTenant } from "@/lib/db/tenant";
import { stripeSubscription } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { PIANI, chiavePiano, prezzoDiVendita } from "@/lib/prezzi";
import { applicaAbbonamento, periodoDaIntervallo } from "./provisioning";

// LA GESTIONE DELL'ABBONAMENTO DALLO STUDIO STESSO (6 novembre 2026).
//
// Tre comandi: disdire, ripensarci, passare dal mensile all'annuale. I Termini promettevano
// già la disdetta «dall'area di gestione dell'abbonamento», mentre fino a oggi serviva
// un'email: con il mensile non è più accettabile, perché chi paga un mese per volta si
// aspetta di potersi fermare da solo.
//
// ⚠️ DUE REGOLE, le stesse del webhook.
//
// 1. **Lo stato si rilegge da Stripe dopo ogni comando, e si applica subito.** Il webhook
//    arriverà comunque e scriverà la stessa cosa; ma fra il clic e il suo arrivo la pagina
//    direbbe ancora «si rinnova», cioè il contrario di ciò che si è appena chiesto.
//
// 2. **Un abbonamento con uno Schedule non si tocca da qui.** Gli abbonamenti venduti col
//    listino precedente hanno un piano a due fasi su Stripe, e Stripe rifiuta di cambiare
//    direttamente un abbonamento governato da uno Schedule. Per quelli resta «scrivici»:
//    sono pochi, e un errore di Stripe mostrato al cliente sarebbe peggio di un'email.

export class GestioneRifiutata extends Error {
  constructor(
    message: string,
    readonly codice: "nessun_abbonamento" | "schedule" | "gia_annuale" | "non_mensile" | "piano_ritirato" | "pagamento_rifiutato",
  ) {
    super(message);
  }
}

/** L'abbonamento Stripe vivo dello studio, riletto da Stripe. */
async function abbonamentoVivo(orgId: string): Promise<Stripe.Subscription> {
  const [riga] = await withTenant({ orgId }, (tx) =>
    tx
      .select({ id: stripeSubscription.stripeSubscriptionId })
      .from(stripeSubscription)
      .where(
        and(
          eq(stripeSubscription.organizationId, orgId),
          notInArray(stripeSubscription.status, ["canceled", "incomplete_expired"]),
        ),
      )
      .orderBy(desc(stripeSubscription.updatedAt))
      .limit(1),
  );
  if (!riga) {
    throw new GestioneRifiutata(
      "Questo account non ha un abbonamento con carta da gestire qui: scrivici e lo sistemiamo noi.",
      "nessun_abbonamento",
    );
  }
  const sub = await stripe().subscriptions.retrieve(riga.id);
  if (sub.schedule) {
    throw new GestioneRifiutata(
      "Il tuo abbonamento segue le condizioni del listino precedente: per disdirlo o cambiarlo scrivici, lo facciamo noi in giornata.",
      "schedule",
    );
  }
  return sub;
}

/** La riga del piano: quella la cui chiave Stripe è un piano, in vendita o storico. */
function rigaDelPiano(sub: Stripe.Subscription) {
  return sub.items.data.find((i) => chiavePiano(i.price.lookup_key)) ?? null;
}

// ⚠️ L'azione si scrive alla lettera in ogni chiamata, con la sua chiave: è la forma che
// `etichette-audit-pure` sa leggere. Passata come parametro le sfuggirebbe, e nel registro
// delle attività comparirebbe il nome macchina senza che nessun test lo dica.
async function registra(voce: { userId: string; orgId: string; azione: string; dettagli: Record<string, unknown> }) {
  await withTenant({ userId: voce.userId, orgId: voce.orgId }, (tx) =>
    logAudit(tx, {
      organizationId: voce.orgId,
      userId: voce.userId,
      azione: voce.azione,
      entita: "organization",
      entitaId: voce.orgId,
      dettagli: voce.dettagli,
    }),
  );
}

/**
 * Disdice l'abbonamento alla fine del periodo pagato. Fino ad allora l'account resta
 * pienamente attivo: si paga quel periodo, e si usa quel periodo.
 */
export async function disdiciAbbonamento(userId: string, orgId: string): Promise<void> {
  const sub = await abbonamentoVivo(orgId);
  const aggiornato = await stripe().subscriptions.update(sub.id, { cancel_at_period_end: true });
  await applicaAbbonamento(aggiornato, orgId);
  await registra({ userId, orgId, azione: "billing.abbonamento.disdici", dettagli: { subscriptionId: sub.id } });
}

/** Ritira la disdetta: l'abbonamento torna a rinnovarsi come prima. */
export async function annullaDisdetta(userId: string, orgId: string): Promise<void> {
  const sub = await abbonamentoVivo(orgId);
  const aggiornato = await stripe().subscriptions.update(sub.id, { cancel_at_period_end: false });
  await applicaAbbonamento(aggiornato, orgId);
  await registra({ userId, orgId, azione: "billing.abbonamento.annulla_disdetta", dettagli: { subscriptionId: sub.id } });
}

/**
 * Dal mensile all'annuale, sullo STESSO abbonamento.
 *
 * Stripe sostituisce il prezzo, riparte da oggi con un periodo di un anno e scala dalla
 * fattura la parte di mese già pagata e non ancora usata.
 *
 * ⚠️ `billing_cycle_anchor: "now"` NON è facoltativo. Senza, Stripe tiene la vecchia
 * ricorrenza: misurato sulla sandbox, un passaggio fatto un mese dopo l'attivazione
 * addebitava undici dodicesimi dell'annuale, con la scadenza all'anniversario della prima
 * attivazione — mentre la finestra e i Termini dicono «paghi l'annuale, e l'anno decorre dal
 * passaggio». Con la ripartenza la fattura è 499 € meno la parte di mese non usata.
 *
 * ⚠️ `pending_if_incomplete`: il cambio si applica SOLO se il pagamento dell'annuale riesce.
 * Senza, una carta rifiutata lascerebbe l'abbonamento già passato all'annuale e una fattura
 * insoluta: il cliente si ritroverebbe in sofferenza per aver cercato di risparmiare.
 * Misurato sulla sandbox: con la carta rifiutata l'abbonamento resta mensile e la fattura
 * resta aperta; al secondo tentativo Stripe la annulla e ne incassa una sola, quindi dire
 * «controlla la carta e riprova» non espone a un doppio addebito.
 *
 * ⚠️ Niente metadati nello stesso aggiornamento: con `pending_if_incomplete` Stripe accetta
 * solo i campi che riguardano righe e fatturazione. Il periodo non serve scriverlo da
 * nessuna parte: il provisioning lo legge dall'intervallo del prezzo.
 */
export async function passaAllAnnuale(userId: string, orgId: string): Promise<{ addebitato: number | null }> {
  const sub = await abbonamentoVivo(orgId);
  const riga = rigaDelPiano(sub);
  const piano = chiavePiano(riga?.price.lookup_key);
  if (!riga || !piano) {
    throw new GestioneRifiutata("Non trovo il piano nel tuo abbonamento: scrivici e lo sistemiamo noi.", "nessun_abbonamento");
  }
  const periodo = periodoDaIntervallo(riga.price.recurring?.interval);
  if (periodo === "anno") throw new GestioneRifiutata("Il tuo abbonamento è già annuale.", "gia_annuale");
  if (periodo !== "mese") throw new GestioneRifiutata("Il tuo abbonamento non è mensile.", "non_mensile");

  const annuale = prezzoDiVendita(PIANI[piano], "anno");
  if (!annuale) {
    throw new GestioneRifiutata(
      `La fascia «${PIANI[piano].nome}» non è più in vendita: scrivici e ti proponiamo il passaggio.`,
      "piano_ritirato",
    );
  }

  const aggiornato = await stripe().subscriptions.update(sub.id, {
    items: [{ id: riga.id, price: await idPrezzo(annuale.lookup), quantity: 1 }],
    billing_cycle_anchor: "now",
    proration_behavior: "always_invoice",
    payment_behavior: "pending_if_incomplete",
    expand: ["latest_invoice"],
  });

  // Se il pagamento non è riuscito, Stripe tiene il cambio IN SOSPESO e l'abbonamento resta
  // mensile: lo si dice, invece di festeggiare un passaggio che non è avvenuto.
  if (aggiornato.pending_update) {
    throw new GestioneRifiutata(
      "Il pagamento dell'annuale non è andato a buon fine: il tuo abbonamento resta mensile. Controlla la carta in «Fatture e metodo di pagamento» e riprova.",
      "pagamento_rifiutato",
    );
  }

  await applicaAbbonamento(aggiornato, orgId);
  const fattura = aggiornato.latest_invoice;
  const addebitato = fattura && typeof fattura !== "string" ? (fattura.amount_paid ?? null) : null;
  await registra({ userId, orgId, azione: "billing.abbonamento.passa_annuale", dettagli: { subscriptionId: sub.id, piano, addebitato } });
  return { addebitato };
}
