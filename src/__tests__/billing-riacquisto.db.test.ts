import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { orgEntitlement, stripeSubscription } from "@/lib/db/schema";
import { bloccoAlCheckout } from "@/features/billing/gia-abbonato";
import { creaStudio, pulisciStudio } from "./comune";
import { eq } from "drizzle-orm";

// Uno studio che paga già non può aprire un secondo checkout.
//
// Il difetto che questo file pinna era raggiungibile con UN CLICK dall'interfaccia
// ufficiale: la griglia dei piani mostrava «Passa a questo» sugli altri due piani a chi
// aveva già pagato, e quel pulsante apriva un checkout in `mode: "subscription"` sullo
// stesso cliente Stripe. Stripe creava un **secondo abbonamento parallelo**.
//
// Il primo continuava a fatturare ogni anno. Lo studio ne vedeva uno solo, perché
// `org_entitlement` è una riga sola riscritta dall'ultimo evento arrivato. E non poteva
// disdirlo, perché nel portale la disdetta è spenta di proposito.
//
// Si prova la GUARDIA e non la sessione Stripe: la sessione la crea Stripe, e un test che
// dovesse chiamarla davvero non potrebbe girare senza chiavi. Quello che conta è che il
// percorso si fermi prima.

const url = process.env.DATABASE_URL;
const RUN = Date.now();

let S: Awaited<ReturnType<typeof creaStudio>>;

describe.skipIf(!url)("un abbonamento attivo blocca il secondo acquisto", () => {
  beforeAll(async () => {
    S = await creaStudio({ prefisso: "riacq", run: RUN, nomeStudio: "Studio Riacquisto" });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "demo" });
  });

  afterAll(async () => {
    await db.delete(stripeSubscription).where(eq(stripeSubscription.organizationId, S.orgId));
    await pulisciStudio(S.orgId, S.userId);
  });

  it("chi è in prova può comprare", async () => {
    // La difesa non deve chiudere la porta a chi deve entrare.
    expect(await bloccoAlCheckout(S.userId, S.orgId)).toBeNull();
  });

  it("chi ha un abbonamento ATTIVO non può comprarne un secondo", async () => {
    await db
      .update(orgEntitlement)
      .set({ status: "active", piano: "studio", activatedAt: new Date() })
      .where(eq(orgEntitlement.organizationId, S.orgId));

    expect(await bloccoAlCheckout(S.userId, S.orgId)).toBe("abbonamento_attivo");
  });

  it("chi ha un pagamento in sofferenza non compra sopra il primo", async () => {
    // `past_due` si risolve aggiornando la carta, non ricomprando: un secondo
    // abbonamento lascerebbe il primo insoluto E ne aggiungerebbe uno da pagare.
    await db
      .update(orgEntitlement)
      .set({ status: "past_due" })
      .where(eq(orgEntitlement.organizationId, S.orgId));

    expect(await bloccoAlCheckout(S.userId, S.orgId)).toBe("abbonamento_in_sofferenza");
  });

  it("blocca anche PRIMA che il webhook arrivi, se l'abbonamento Stripe esiste già", async () => {
    // La finestra vera: il cliente ha pagato, Stripe ha creato l'abbonamento, il webhook
    // non è ancora atterrato. L'entitlement dice ancora «demo». Sono i secondi in cui un
    // cliente che non vede cambiare niente ripaga.
    await db
      .update(orgEntitlement)
      .set({ status: "demo", piano: null, activatedAt: null })
      .where(eq(orgEntitlement.organizationId, S.orgId));
    await db.insert(stripeSubscription).values({
      id: `sub_finestra_${RUN}`,
      organizationId: S.orgId,
      stripeSubscriptionId: `sub_finestra_${RUN}`,
      status: "active",
    });

    expect(await bloccoAlCheckout(S.userId, S.orgId)).toBe("abbonamento_attivo");
  });

  it("un abbonamento DISDETTO non blocca: quello studio può ricomprare", async () => {
    // Il rovescio, ed è la ragione per cui non basta «esiste una riga»: chi ha disdetto
    // deve poter tornare, altrimenti la difesa diventa una porta chiusa a chi paga.
    await db
      .update(stripeSubscription)
      .set({ status: "canceled" })
      .where(eq(stripeSubscription.organizationId, S.orgId));

    expect(await bloccoAlCheckout(S.userId, S.orgId)).toBeNull();
  });
});
