// Il codice partner arriva fino alla sessione di pagamento di Stripe (sandbox).
//
// ⚠️ Solo con una chiave di PROVA: con una chiave viva questo test creerebbe sessioni e
// clienti nell'account che incassa, e si rifiuta di partire.

import { describe, it, expect, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { member, organization, orgEntitlement, user } from "@/lib/db/schema";

const chiave = process.env.STRIPE_SECRET_KEY ?? "";
const attivo = Boolean(process.env.DATABASE_URL) && chiave.startsWith("sk_test_");
const RUN = Date.now();
const utenti: string[] = [];
const studi: string[] = [];

async function iscrivi(email: string, codicePartner?: string) {
  const { auth } = await import("@/lib/auth");
  const res = await auth.api.signUpEmail({
    body: { email, password: `Pw-molto-sicura-${RUN}!`, name: "Cassa Partner", ...(codicePartner ? { codicePartner } : {}) } as never,
  });
  utenti.push(res.user.id);
  const [m] = await db.select().from(member).where(eq(member.userId, res.user.id));
  studi.push(m!.organizationId);
  return { userId: res.user.id, orgId: m!.organizationId, email };
}

async function metadatiDellaCassa(s: { userId: string; orgId: string; email: string }) {
  const { creaSessioneCheckout } = await import("@/features/billing/checkout");
  const { stripe } = await import("@/lib/stripe/client");
  const { url } = await creaSessioneCheckout({ userId: s.userId, orgId: s.orgId, email: s.email, piano: "singola" });
  const id = new URL(url).pathname.split("/").find((x) => x.startsWith("cs_test_"));
  expect(id, "la sessione è di prova").toBeTruthy();
  const sessione = await stripe().checkout.sessions.retrieve(id!);
  // La sessione non si paga: la si chiude subito, così non resta aperta nella sandbox.
  await stripe().checkout.sessions.expire(id!);
  return sessione.metadata ?? {};
}

describe.skipIf(!attivo)("il codice partner alla cassa", () => {
  afterAll(async () => {
    if (studi.length) {
      await db.delete(orgEntitlement).where(inArray(orgEntitlement.organizationId, studi));
      await db.delete(organization).where(inArray(organization.id, studi));
    }
    if (utenti.length) await db.delete(user).where(inArray(user.id, utenti));
  });

  it("uno studio NGR paga con `partner: NGR` nei metadati", async () => {
    const m = await metadatiDellaCassa(await iscrivi(`cassa-ngr-${RUN}@example.com`, "NGR"));
    expect(m.partner).toBe("NGR");
    expect(m.piano).toBe("singola");
  });

  it("uno studio senza partner non porta la chiave", async () => {
    const m = await metadatiDellaCassa(await iscrivi(`cassa-senza-${RUN}@example.com`));
    expect(m).not.toHaveProperty("partner");
  });
});
