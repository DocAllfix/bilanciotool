import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { orgEntitlement, entitlementEvent } from "@/lib/db/schema";
import { applicaAbbonamento } from "@/features/billing/provisioning";
import { getQuadroAbbonamento } from "@/features/studio/queries";
import { creaStudio, pulisciStudio } from "./comune";
import { PIANI } from "@/lib/prezzi";
import { asc, eq } from "drizzle-orm";

// Il registro delle capacità: append-only, e con una conseguenza che si vede subito.
//
// `org_entitlement` è una riga sola, sovrascritta dall'ultimo evento arrivato. Dopo un
// anno di rinnovi nessuno poteva più dire quando uno studio fosse stato attivato la prima
// volta — e non era archeologia: `activated_at` alimenta la finestra di recesso a
// quattordici giorni promessa dai Termini, che si RIAPRIVA a ogni evento con un piano,
// rinnovo annuale compreso.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
let S: Awaited<ReturnType<typeof creaStudio>>;

/** Un abbonamento Stripe finto, quel tanto che basta a `capacitaDaAbbonamento`. */
function abbonamento(stato: string, fineperiodo: number): Stripe.Subscription {
  return {
    id: `sub_reg_${RUN}`,
    status: stato,
    customer: `cus_reg_${RUN}`,
    metadata: {},
    items: {
      data: [
        {
          quantity: 1,
          price: { id: "price_x", lookup_key: PIANI.studio.lookupAnno1, recurring: { interval: "year" } },
          current_period_end: fineperiodo,
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

const evento = (tipo: string, quando: number) => ({ id: `evt_reg_${tipo}_${RUN}`, type: tipo, created: quando });

describe.skipIf(!url)("il registro delle capacità", () => {
  beforeAll(async () => {
    S = await creaStudio({ prefisso: "registro", run: RUN, nomeStudio: "Studio Registro" });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "demo" });
  });

  afterAll(async () => {
    // Il registro non si cancella dal ruolo applicativo: qui gira la connessione
    // privilegiata, che il trigger blocca comunque. Si usa SQL diretto per la pulizia.
    await db.execute(
      `alter table entitlement_event disable trigger trg_entitlement_event_immutabile` as never,
    );
    await db.delete(entitlementEvent).where(eq(entitlementEvent.organizationId, S.orgId));
    await db.execute(
      `alter table entitlement_event enable trigger trg_entitlement_event_immutabile` as never,
    );
    await pulisciStudio(S.orgId, S.userId);
  });

  it("ogni evento lascia una riga, con la sua causa", async () => {
    const fra = Math.floor(Date.now() / 1000) + 86_400 * 365;
    await applicaAbbonamento(abbonamento("active", fra), S.orgId, evento("checkout.session.completed", 1_700_000_000));

    const righe = await db
      .select()
      .from(entitlementEvent)
      .where(eq(entitlementEvent.organizationId, S.orgId));

    expect(righe).toHaveLength(1);
    expect(righe[0].statoPrima).toBe("demo");
    expect(righe[0].statoDopo).toBe("active");
    expect(righe[0].piano).toBe("studio");
    // Il filo che prima mancava del tutto: quale evento Stripe ha causato questo stato.
    expect(righe[0].stripeEventId).toContain("evt_reg_");
    expect(righe[0].stripeEventType).toBe("checkout.session.completed");
    expect(righe[0].occurredAt?.getTime()).toBe(1_700_000_000_000);
  });

  it("una transizione è una riga NUOVA, non una riga modificata", async () => {
    const fra = Math.floor(Date.now() / 1000) + 86_400 * 365;
    await applicaAbbonamento(abbonamento("past_due", fra), S.orgId, evento("invoice.payment_failed", 1_700_100_000));

    const righe = await db
      .select()
      .from(entitlementEvent)
      .where(eq(entitlementEvent.organizationId, S.orgId))
      .orderBy(asc(entitlementEvent.id));

    expect(righe).toHaveLength(2);
    expect(righe.map((r) => r.statoDopo)).toEqual(["active", "past_due"]);
    // E la prima riga non è stata toccata: la storia non si riscrive.
    expect(righe[0].statoDopo).toBe("active");
  });

  it("è IMMUTABILE anche per la connessione privilegiata", async () => {
    // È la differenza fra questo registro e `audit_log`, che ha solo la revoca sul ruolo
    // applicativo: qui il trigger vale per chiunque, come per gli snapshot dei documenti.
    const [riga] = await db.select().from(entitlementEvent).where(eq(entitlementEvent.organizationId, S.orgId));

    // Si guarda anche la CAUSA e non solo il messaggio in cima: Drizzle incapsula
    // l'errore di Postgres in «Failed query: ...», e un `toThrow(/append-only/)` sul solo
    // messaggio esterno fallirebbe pur essendo stato bloccato davvero.
    const messaggioIntero = (e: unknown) => {
      const err = e as { message?: string; cause?: { message?: string } };
      return `${err?.message ?? ""} ${err?.cause?.message ?? ""}`;
    };

    await expect(
      db
        .update(entitlementEvent)
        .set({ statoDopo: "expired" })
        .where(eq(entitlementEvent.id, riga.id))
        .catch((e) => Promise.reject(new Error(messaggioIntero(e)))),
    ).rejects.toThrow(/append-only/i);

    await expect(
      db
        .delete(entitlementEvent)
        .where(eq(entitlementEvent.id, riga.id))
        .catch((e) => Promise.reject(new Error(messaggioIntero(e)))),
    ).rejects.toThrow(/append-only/i);

    // E la riga è intatta: non basta che l'operazione fallisca, deve non aver fatto nulla.
    const [dopo] = await db.select().from(entitlementEvent).where(eq(entitlementEvent.id, riga.id));
    expect(dopo.statoDopo).toBe("active");
  });

  it("la finestra di recesso NON si riapre al rinnovo", async () => {
    // Il difetto vero. `activated_at` si riscrive a ogni evento con un piano, quindi al
    // rinnovo annuale la colonna diceva «attivato adesso» e il recesso a quattordici
    // giorni tornava disponibile a chi aveva pagato dodici mesi prima.
    //
    // Si simula l'attivazione originale spostando indietro la PRIMA riga del registro:
    // il registro è append-only, quindi si disattiva il trigger per il solo tempo di
    // costruire la premessa — è allestimento del test, non un'operazione del prodotto.
    const [primo] = await db
      .select()
      .from(entitlementEvent)
      .where(eq(entitlementEvent.organizationId, S.orgId))
      .orderBy(asc(entitlementEvent.id))
      .limit(1);

    const unAnnoFa = new Date(Date.now() - 400 * 86_400_000);
    await db.execute(`alter table entitlement_event disable trigger trg_entitlement_event_immutabile` as never);
    await db
      .update(entitlementEvent)
      .set({ occurredAt: unAnnoFa, recordedAt: unAnnoFa })
      .where(eq(entitlementEvent.id, primo.id));
    await db.execute(`alter table entitlement_event enable trigger trg_entitlement_event_immutabile` as never);

    // Il rinnovo: la colonna `activated_at` viene riscritta a oggi.
    const fra = Math.floor(Date.now() / 1000) + 86_400 * 365;
    await applicaAbbonamento(abbonamento("active", fra), S.orgId, evento("invoice.paid", Math.floor(Date.now() / 1000)));

    const [e] = await db.select().from(orgEntitlement).where(eq(orgEntitlement.organizationId, S.orgId));
    expect(e.activatedAt!.getTime(), "la colonna si riscrive: è il difetto").toBeGreaterThan(
      Date.now() - 60_000,
    );

    // Ma il quadro legge il REGISTRO, e vede la prima attivazione vera.
    const quadro = await getQuadroAbbonamento(S.userId, S.orgId);
    expect(quadro.attivatoIl!.getTime()).toBeCloseTo(unAnnoFa.getTime(), -4);
    expect(quadro.rimborsabile, "il recesso non deve riaprirsi dopo un anno").toBe(false);
  });
});
