import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";

// L'email del primo documento pubblicato.
//
// Due cose da provare, e sono quelle che si rompono: che parta UNA volta sola per
// studio, e che un guasto della posta NON tolga al consulente il documento che ha
// appena prodotto.
//
// `@/lib/email` è l'unica dipendenza simulata di tutta la suite, per il motivo ovvio
// che i test non devono spedire posta a nessuno. Tutto il resto — database, RLS,
// entitlement, motore di calcolo — è reale.
const inviata = vi.fn(async () => ({ sent: true }));
vi.mock("@/lib/email", () => ({
  sendPrimoDocumentoEmail: (...a: unknown[]) => inviata(...(a as [])),
  sendVerificationEmail: async () => ({ sent: false }),
  sendResetPasswordEmail: async () => ({ sent: false }),
  sendOrgInvitationEmail: async () => ({ sent: false }),
  inviaAllarmeBlog: async () => ({ sent: false }),
  renderEmail: () => "",
  esc: (s: string) => s,
}));

const { db } = await import("@/lib/db");
const { user, organization, member, orgEntitlement, company, auditLog, documentSnapshot } = await import(
  "@/lib/db/schema"
);
const { publishGhgSnapshot } = await import("@/features/documents/snapshot");
const { createInventory } = await import("@/features/ghg/inventories");
const { addActivityRow } = await import("@/features/ghg/activity-data");
const { eq } = await import("drizzle-orm");

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const orgId = `org-primo-${RUN}`;
const userId = `user-primo-${RUN}`;
let companyId = "";

describe.skipIf(!url)("email del primo documento", () => {
  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Prima Volta", email: `primo-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Primo", slug: `primo-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    await db.insert(orgEntitlement).values({ organizationId: orgId, status: "active" });
    companyId = randomUUID();
    await db.insert(company).values({ id: companyId, organizationId: orgId, nome: "Prima S.r.l." });
  });

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId));
    await db.delete(company).where(eq(company.organizationId, orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(eq(user.id, userId));
  });

  it("parte al primo documento e NON si ripete", async () => {
    const invId = await createInventory(userId, orgId, { companyId, anno: 2025 });
    await addActivityRow(userId, orgId, invId, {
      sourceTypeKey: "1a", categoryKey: "1", descrizione: "Gas", um: "Smc", quantita: "1000", fe: "1.9755", dq: "F",
    });

    await publishGhgSnapshot(userId, orgId, companyId, 2025);
    expect(inviata).toHaveBeenCalledTimes(1);

    // Il destinatario e il contenuto: l'email deve dire quale documento e quale azienda,
    // altrimenti chi segue dieci clienti non sa a cosa si riferisce.
    const [destinatario, dati] = inviata.mock.calls[0] as unknown as [string, Record<string, string>];
    expect(destinatario).toBe(`primo-${RUN}@example.com`);
    expect(dati.azienda).toBe("Prima S.r.l.");
    expect(dati.nomeDocumento).toContain("GHG");
    expect(dati.url).toContain("/documento/");
    expect(dati.urlAzienda).toContain(companyId);

    // Ripubblicare è la versione 2 dello stesso documento: nessun secondo applauso.
    await publishGhgSnapshot(userId, orgId, companyId, 2025);
    expect(inviata).toHaveBeenCalledTimes(1);
  });

  it("se la posta è guasta, il documento si pubblica lo stesso", async () => {
    // La prova che conta davvero: un guasto del fornitore di posta non deve mai
    // togliere a un consulente il lavoro che ha appena finito.
    inviata.mockRejectedValueOnce(new Error("Resend irraggiungibile"));
    const altra = randomUUID();
    await db.insert(company).values({ id: altra, organizationId: orgId, nome: "Seconda S.r.l." });
    const invId = await createInventory(userId, orgId, { companyId: altra, anno: 2025 });
    await addActivityRow(userId, orgId, invId, {
      sourceTypeKey: "1a", categoryKey: "1", descrizione: "Gas", um: "Smc", quantita: "500", fe: "1.9755", dq: "F",
    });
    const id = await publishGhgSnapshot(userId, orgId, altra, 2025);
    expect(id).toBeTruthy();
  });
});
