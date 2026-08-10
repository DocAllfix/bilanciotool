import type Stripe from "stripe";
import { db } from "@/lib/db";
import { orgEntitlement, stripeCustomer, stripeSubscription, member, user } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { withTenant } from "@/lib/db/tenant";
import { PIANI, ESTENSIONI, CHIAVI_PIANO, type PianoKey } from "@/lib/prezzi";

// Da un abbonamento Stripe allo stato dell'account.
//
// La funzione che conta è `applicaAbbonamento`: prende l'abbonamento **riletto da
// Stripe** (mai il payload del webhook, che può arrivare vecchio o fuori ordine) e ne
// deriva lo stato dell'organizzazione. È scritta per essere richiamabile all'infinito
// sullo stesso abbonamento: eventi fuori ordine atterrano tutti sullo stesso risultato.

/** Gli stati Stripe che valgono «l'account funziona». */
const ATTIVI = new Set(["active", "trialing"]);
/** Pagamento non riuscito: l'account resta usabile ma va avvisato. */
const IN_SOFFERENZA = new Set(["past_due", "unpaid"]);

export type Capacita = {
  piano: PianoKey | null;
  aziendeExtra: number;
  accessiExtra: number;
  whiteLabel: boolean;
};

/**
 * Che cosa è stato comprato, leggendo le righe dell'abbonamento.
 *
 * Si riconosce dal `lookup_key` del prezzo e non dal nome del prodotto: il nome è
 * testo modificabile dal cruscotto, la chiave del listino no. E si accettano sia le
 * chiavi di listino sia quelle di lancio, perché sono lo stesso prodotto a due prezzi.
 */
export function capacitaDaAbbonamento(sub: Stripe.Subscription): Capacita {
  let piano: PianoKey | null = null;
  let aziendeExtra = 0;
  let accessiExtra = 0;
  let whiteLabel = false;

  for (const riga of sub.items.data) {
    const lookup = riga.price.lookup_key ?? "";
    const quantita = riga.quantity ?? 1;

    const trovato = CHIAVI_PIANO.find((k) => {
      const p = PIANI[k];
      return (
        lookup === p.lookupAnno1 ||
        lookup === p.lookupRinnovo ||
        lookup === p.lookupAnno1Lancio ||
        lookup === p.lookupRinnovoLancio
      );
    });
    if (trovato) {
      piano = trovato;
      continue;
    }
    if (lookup === ESTENSIONI.bloccoAziende.lookup || lookup === ESTENSIONI.bloccoAziende.lookupLancio) {
      // In `aziendeExtra` finiscono le AZIENDE, non i blocchi: cinque per blocco.
      aziendeExtra += quantita * ESTENSIONI.bloccoAziende.aziende;
    } else if (lookup === ESTENSIONI.accesso.lookup || lookup === ESTENSIONI.accesso.lookupLancio) {
      accessiExtra += quantita;
    } else if (lookup === ESTENSIONI.whiteLabel.lookup || lookup === ESTENSIONI.whiteLabel.lookupLancio) {
      whiteLabel = true;
    }
  }
  return { piano, aziendeExtra, accessiExtra, whiteLabel };
}

/** Lo stato del nostro entitlement a partire da quello dell'abbonamento Stripe. */
export function statoDaStripe(statoStripe: string): "active" | "past_due" | "expired" {
  if (ATTIVI.has(statoStripe)) return "active";
  if (IN_SOFFERENZA.has(statoStripe)) return "past_due";
  // canceled, incomplete_expired, paused: l'account torna in sola lettura. I dati
  // restano, e restano scaricabili: si perde il diritto di scrivere, non il lavoro fatto.
  return "expired";
}

/** L'organizzazione a cui appartiene un cliente Stripe. `null` se non è nostra. */
export async function organizzazioneDelCliente(customerId: string): Promise<string | null> {
  const r = await db
    .select({ orgId: stripeCustomer.organizationId })
    .from(stripeCustomer)
    .where(eq(stripeCustomer.stripeCustomerId, customerId))
    .limit(1);
  return r[0]?.orgId ?? null;
}

/**
 * Scrive nell'account quello che dice l'abbonamento.
 *
 * Gira in `platformAdmin`: il webhook non ha sessione né organizzazione attiva, e
 * dimenticarlo produrrebbe un update a zero righe **in silenzio** — il caso peggiore,
 * perché tutto sembrerebbe funzionare e il cliente resterebbe bloccato.
 */
export async function applicaAbbonamento(sub: Stripe.Subscription, orgId: string): Promise<void> {
  const capacita = capacitaDaAbbonamento(sub);
  const stato = statoDaStripe(sub.status);
  // Lo stato PRIMA di scrivere: le email si mandano al CAMBIO, non a ogni evento.
  // Stripe ne manda diversi per lo stesso abbonamento — creato, aggiornato, fattura
  // pagata — e un benvenuto per ciascuno diventa posta da filtrare.
  const [prima] = await db
    .select({ status: orgEntitlement.status })
    .from(orgEntitlement)
    .where(eq(orgEntitlement.organizationId, orgId))
    .limit(1);
  const statoPrecedente = prima?.status ?? null;
  const fineperiodo = sub.items.data[0]?.current_period_end;
  const rinnovoIl = fineperiodo ? new Date(fineperiodo * 1000) : null;

  await withTenant({ platformAdmin: true }, async (tx) => {
    await tx
      .update(orgEntitlement)
      .set({
        status: stato,
        // Il piano si scrive solo se l'abbonamento ne contiene uno: un evento su una
        // riga di sola estensione non deve azzerare il piano comprato.
        ...(capacita.piano ? { piano: capacita.piano, activatedAt: new Date() } : {}),
        aziendeExtra: capacita.aziendeExtra,
        accessiExtra: capacita.accessiExtra,
        whiteLabel: capacita.whiteLabel,
        currentPeriodEnd: rinnovoIl,
      })
      .where(eq(orgEntitlement.organizationId, orgId));

    await tx
      .insert(stripeSubscription)
      .values({
        id: sub.id,
        organizationId: orgId,
        stripeSubscriptionId: sub.id,
        stripeScheduleId: typeof sub.schedule === "string" ? sub.schedule : (sub.schedule?.id ?? null),
        status: sub.status,
        currentPeriodEnd: rinnovoIl,
      })
      .onConflictDoUpdate({
        target: stripeSubscription.id,
        set: {
          status: sub.status,
          currentPeriodEnd: rinnovoIl,
          stripeScheduleId: typeof sub.schedule === "string" ? sub.schedule : (sub.schedule?.id ?? null),
        },
      });

    await logAudit(tx, {
      organizationId: orgId,
      userId: null,
      azione: "billing.abbonamento.aggiorna",
      entita: "organization",
      entitaId: orgId,
      dettagli: { stato, statoStripe: sub.status, ...capacita },
    });
  });

  await avvisaSeCambiato(orgId, statoPrecedente, stato, capacita.piano);
}

/**
 * Le email che dipendono dal cambio di stato.
 *
 * Fuori dalla transazione e con gli errori ingoiati: un guasto della posta non deve
 * mai far fallire il provisioning: fra un cliente senza email di benvenuto e un
 * cliente senza abbonamento non c'è partita.
 */
async function avvisaSeCambiato(
  orgId: string,
  prima: string | null,
  adesso: string,
  piano: PianoKey | null,
): Promise<void> {
  if (prima === adesso) return;
  try {
    const destinatario = await titolareDelloStudio(orgId);
    if (!destinatario) return;
    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
    const email = await import("@/lib/email");

    if (adesso === "active" && piano) {
      const p = PIANI[piano];
      await email.sendBenvenutoEmail(destinatario, {
        piano: p.nome,
        aziende: p.aziende,
        accessi: p.accessi,
        url: `${base}/dashboard`,
      });
    } else if (adesso === "past_due") {
      await email.sendPagamentoFallitoEmail(destinatario, {
        url: `${base}/impostazioni/abbonamento`,
      });
    }
  } catch (e) {
    console.error("[billing] avviso non inviato per", orgId, e);
  }
}

/** L'email di chi ha sottoscritto: il titolare dello studio, non l'ultimo che ha scritto. */
export async function titolareDelloStudio(orgId: string): Promise<string | null> {
  const r = await db
    .select({ email: user.email })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(and(eq(member.organizationId, orgId), eq(member.role, "owner")))
    .limit(1);
  return r[0]?.email ?? null;
}
