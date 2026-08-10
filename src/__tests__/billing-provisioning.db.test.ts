import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { user, organization, member, orgEntitlement, auditLog, stripeCustomer, stripeSubscription, stripeProcessedEvent } from "@/lib/db/schema";
import { prendiInCarico, rilascia } from "@/features/billing/idempotenza";
import { applicaAbbonamento, capacitaDaAbbonamento, statoDaStripe } from "@/features/billing/provisioning";
import { PIANI, ESTENSIONI } from "@/lib/prezzi";
import { eq } from "drizzle-orm";

// Provisioning e idempotenza: la parte del pagamento in cui un difetto costa un cliente.
//
// Gli abbonamenti sono oggetti costruiti a mano e non riletti da Stripe, ed è voluto:
// qui si prova la NOSTRA logica — cosa scriviamo nell'account leggendo un abbonamento —
// non che Stripe funzioni. Il giro con Stripe vero è `verifica-pagamento.mjs`.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const orgId = `org-bill-${RUN}`;
const userId = `user-bill-${RUN}`;
const customerId = `cus_test_${RUN}`;

/** Un abbonamento Stripe finto, con le sole parti che leggiamo. */
function abbonamento(opts: {
  lookups: { lookup: string; quantity?: number }[];
  status?: string;
  id?: string;
}): Stripe.Subscription {
  return {
    id: opts.id ?? `sub_test_${RUN}`,
    status: opts.status ?? "active",
    customer: customerId,
    schedule: null,
    metadata: { organizationId: orgId },
    items: {
      data: opts.lookups.map((l) => ({
        price: { lookup_key: l.lookup },
        quantity: l.quantity ?? 1,
        current_period_end: Math.floor(Date.now() / 1000) + 86_400 * 365,
      })),
    },
  } as unknown as Stripe.Subscription;
}

describe.skipIf(!url)("provisioning dal pagamento", () => {
  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Paga", email: `bill-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Bill", slug: `bill-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    await db.insert(orgEntitlement).values({ organizationId: orgId, status: "demo" });
    await db.insert(stripeCustomer).values({ organizationId: orgId, stripeCustomerId: customerId });
  });

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(stripeSubscription).where(eq(stripeSubscription.organizationId, orgId));
    await db.delete(stripeCustomer).where(eq(stripeCustomer.organizationId, orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(eq(user.id, userId));
    await db.delete(stripeProcessedEvent).where(eq(stripeProcessedEvent.eventId, `evt_test_${RUN}`));
  });

  it("un pagamento sblocca l'account col piano comprato", async () => {
    await applicaAbbonamento(abbonamento({ lookups: [{ lookup: PIANI.studio.lookupAnno1Lancio! }] }), orgId);
    const [e] = await db.select().from(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    expect(e.status).toBe("active");
    expect(e.piano).toBe("studio");
    expect(e.activatedAt).not.toBeNull();
    expect(e.currentPeriodEnd).not.toBeNull();
  });

  it("il prezzo di LANCIO e quello di listino comprano lo stesso piano", async () => {
    // Sono lo stesso prodotto a due prezzi: riconoscerne uno solo significherebbe che
    // alla scadenza della promozione i nuovi clienti pagano e non ottengono niente.
    for (const lookup of [PIANI.studio.lookupAnno1, PIANI.studio.lookupAnno1Lancio, PIANI.studio.lookupRinnovo, PIANI.studio.lookupRinnovoLancio]) {
      expect(capacitaDaAbbonamento(abbonamento({ lookups: [{ lookup: lookup! }] })).piano).toBe("studio");
    }
  });

  it("le estensioni si sommano, e i blocchi diventano aziende", async () => {
    const sub = abbonamento({
      lookups: [
        { lookup: PIANI.studio.lookupAnno1Lancio! },
        { lookup: ESTENSIONI.bloccoAziende.lookupLancio, quantity: 3 },
        { lookup: ESTENSIONI.accesso.lookupLancio, quantity: 4 },
        { lookup: ESTENSIONI.whiteLabel.lookupLancio },
      ],
    });
    const c = capacitaDaAbbonamento(sub);
    // Tre blocchi da cinque = quindici aziende, non tre.
    expect(c.aziendeExtra).toBe(15);
    expect(c.accessiExtra).toBe(4);
    expect(c.whiteLabel).toBe(true);

    await applicaAbbonamento(sub, orgId);
    const [e] = await db.select().from(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    expect(e.aziendeExtra).toBe(15);
    expect(e.whiteLabel).toBe(true);
  });

  it("un evento su sole estensioni non azzera il piano comprato", async () => {
    // Gli eventi arrivano fuori ordine: uno che descrive solo un'estensione non deve
    // cancellare il piano, o l'account cadrebbe in sola lettura senza motivo.
    await applicaAbbonamento(abbonamento({ lookups: [{ lookup: ESTENSIONI.accesso.lookup }] }), orgId);
    const [e] = await db.select().from(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    expect(e.piano).toBe("studio");
  });

  it("gli stati Stripe si traducono in ciò che l'account può fare", async () => {
    expect(statoDaStripe("active")).toBe("active");
    expect(statoDaStripe("trialing")).toBe("active");
    expect(statoDaStripe("past_due")).toBe("past_due");
    expect(statoDaStripe("unpaid")).toBe("past_due");
    // Disdetto: sola lettura. I dati restano, e restano scaricabili.
    expect(statoDaStripe("canceled")).toBe("expired");
    expect(statoDaStripe("incomplete_expired")).toBe("expired");
  });

  it("una disdetta riporta l'account in sola lettura", async () => {
    await applicaAbbonamento(
      abbonamento({ lookups: [{ lookup: PIANI.studio.lookupAnno1Lancio! }], status: "canceled" }),
      orgId,
    );
    const [e] = await db.select().from(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    expect(e.status).toBe("expired");
  });

  it("applicare due volte lo stesso abbonamento lascia lo stesso risultato", async () => {
    const sub = abbonamento({ lookups: [{ lookup: PIANI.studio_plus.lookupAnno1Lancio! }] });
    await applicaAbbonamento(sub, orgId);
    const [primo] = await db.select().from(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await applicaAbbonamento(sub, orgId);
    const [secondo] = await db.select().from(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    expect(secondo.piano).toBe(primo.piano);
    expect(secondo.status).toBe(primo.status);
    // E un solo abbonamento registrato, non due.
    const righe = await db.select().from(stripeSubscription).where(eq(stripeSubscription.organizationId, orgId));
    expect(righe).toHaveLength(1);
  });
});

describe.skipIf(!url)("idempotenza del webhook", () => {
  const evento = `evt_test_${RUN}`;
  afterAll(async () => {
    await db.delete(stripeProcessedEvent).where(eq(stripeProcessedEvent.eventId, evento));
  });

  it("lo stesso evento si prende in carico una volta sola", async () => {
    expect(await prendiInCarico(evento)).toBe(true);
    expect(await prendiInCarico(evento)).toBe(false);
  });

  it("se il lavoro fallisce il claim si rilascia, e il tentativo successivo riesce", async () => {
    // È la differenza fra «Stripe ritenta e funziona» e «un cliente che ha pagato
    // resta bloccato senza che nessun errore lo segnali».
    await rilascia(evento);
    expect(await prendiInCarico(evento)).toBe(true);
  });
});
