import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";

// Le email che dipendono dal cambio di stato dell'abbonamento.
//
// Il difetto da impedire non è che non partano: è che partano TROPPO. Stripe manda
// più eventi per lo stesso abbonamento — creato, aggiornato, fattura pagata — e un
// benvenuto per ciascuno trasforma il momento più bello del rapporto in posta da
// filtrare.

const benvenuto = vi.fn(async () => ({ sent: true }));
const fallito = vi.fn(async () => ({ sent: true }));
vi.mock("@/lib/email", () => ({
  sendBenvenutoEmail: (...a: unknown[]) => benvenuto(...(a as [])),
  sendPagamentoFallitoEmail: (...a: unknown[]) => fallito(...(a as [])),
  sendPreavvisoRinnovoEmail: async () => ({ sent: true }),
  sendPrimoDocumentoEmail: async () => ({ sent: true }),
  sendVerificationEmail: async () => ({ sent: false }),
  sendResetPasswordEmail: async () => ({ sent: false }),
  sendOrgInvitationEmail: async () => ({ sent: false }),
  inviaAllarmeBlog: async () => ({ sent: false }),
  renderEmail: () => "",
  esc: (s: string) => s,
}));

const { db } = await import("@/lib/db");
const { user, organization, member, orgEntitlement, auditLog, stripeCustomer, stripeSubscription } =
  await import("@/lib/db/schema");
const { applicaAbbonamento } = await import("@/features/billing/provisioning");
const { PIANI } = await import("@/lib/prezzi");
const { eq } = await import("drizzle-orm");

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const orgId = `org-mail-${RUN}`;
const userId = `user-mail-${RUN}`;
const customerId = `cus_mail_${RUN}`;

function abbonamento(status: string): Stripe.Subscription {
  return {
    id: `sub_mail_${RUN}`,
    status,
    customer: customerId,
    schedule: null,
    metadata: { organizationId: orgId },
    items: {
      data: [
        {
          price: { lookup_key: PIANI.studio.lookupAnno1Lancio },
          quantity: 1,
          current_period_end: Math.floor(Date.now() / 1000) + 86_400 * 365,
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

describe.skipIf(!url)("email al cambio di stato dell'abbonamento", () => {
  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Titolare", email: `mail-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Mail", slug: `mail-${RUN}` });
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
  });

  it("il benvenuto parte all'attivazione e NON si ripete a ogni evento", async () => {
    await applicaAbbonamento(abbonamento("active"), orgId);
    expect(benvenuto).toHaveBeenCalledTimes(1);

    const [destinatario, dati] = benvenuto.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(destinatario).toBe(`mail-${RUN}@example.com`);
    expect(dati.piano).toBe("Studio");
    // Le capacità servono a dire cosa è cambiato: senza, è un ringraziamento generico.
    expect(dati.aziende).toBe(PIANI.studio.aziende);

    // Stripe manda altri eventi per lo stesso abbonamento: nessun secondo benvenuto.
    await applicaAbbonamento(abbonamento("active"), orgId);
    await applicaAbbonamento(abbonamento("active"), orgId);
    expect(benvenuto).toHaveBeenCalledTimes(1);
  });

  it("l'avviso di pagamento non riuscito parte al passaggio in sofferenza", async () => {
    await applicaAbbonamento(abbonamento("past_due"), orgId);
    expect(fallito).toHaveBeenCalledTimes(1);
    await applicaAbbonamento(abbonamento("past_due"), orgId);
    expect(fallito).toHaveBeenCalledTimes(1);
  });

  it("se il pagamento rientra, il benvenuto riparte una volta sola", async () => {
    // Tornare attivi dopo una sofferenza è un cambio di stato vero, e vale un avviso:
    // il cliente aveva ricevuto un allarme e merita di sapere che è rientrato.
    await applicaAbbonamento(abbonamento("active"), orgId);
    expect(benvenuto).toHaveBeenCalledTimes(2);
  });

  it("un guasto della posta non fa fallire il provisioning", async () => {
    // Fra un cliente senza email e un cliente senza abbonamento non c'è partita.
    benvenuto.mockRejectedValueOnce(new Error("Resend giù"));
    await applicaAbbonamento(abbonamento("canceled"), orgId);
    await expect(applicaAbbonamento(abbonamento("active"), orgId)).resolves.toBeUndefined();
    const [e] = await db.select().from(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    expect(e.status).toBe("active");
  });
});
