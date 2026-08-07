import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { organization, member, orgEntitlement, company, companyShareLink, documentSnapshot, auditLog, user } from "@/lib/db/schema";
import { creaCollegamento, elencaCollegamenti, revocaCollegamento, apriCollegamento } from "@/features/condivisione";
import { improntaToken, generaToken } from "@/features/condivisione/token";
import { eq, inArray } from "drizzle-orm";

// Il portale del cliente, sui fatti del database.
//
// Qui il collegamento È la credenziale, quindi le prove che contano sono quelle negative:
// un token sbagliato non deve aprire niente, un collegamento non deve mostrare i documenti
// di un'altra azienda, e revoca e scadenza devono avere effetto immediato.
//
// **Va eseguito anche con `RLS_FORCE_ROLE=app_rls`**: l'apertura pubblica non ha sessione e
// passa dalla valvola platformAdmin. Con la connessione privilegiata dello sviluppo
// funzionerebbe comunque, e in produzione il portale tornerebbe zero documenti in silenzio.

const url = process.env.DATABASE_URL;
const RUN = Date.now();
const orgId = `org-cond-${RUN}`;
const userId = `user-cond-${RUN}`;
const aziendaA = `az-a-${RUN}`;
const aziendaB = `az-b-${RUN}`;

const snapshot = (companyId: string, tipo: "ghg" | "bilancio", anno: number) => ({
  id: randomUUID(),
  organizationId: orgId,
  companyId,
  tipo,
  anno,
  versione: 1,
  publishedBy: userId,
  dati: { prova: true },
});

describe.skipIf(!url)("portale cliente: collegamenti a scadenza", () => {
  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Consulente", email: `cond-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Cond", slug: `cond-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    await db.insert(orgEntitlement).values({ organizationId: orgId, status: "active" });
    await db.insert(company).values([
      { id: aziendaA, organizationId: orgId, nome: "Alfa S.r.l." },
      { id: aziendaB, organizationId: orgId, nome: "Beta S.p.A." },
    ]);
    await db.insert(documentSnapshot).values([
      snapshot(aziendaA, "ghg", 2025),
      snapshot(aziendaA, "bilancio", 2025),
      snapshot(aziendaB, "ghg", 2025),
    ]);
  });

  afterAll(async () => {
    await db.delete(companyShareLink).where(eq(companyShareLink.organizationId, orgId));
    await db.delete(documentSnapshot).where(eq(documentSnapshot.organizationId, orgId));
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(company).where(eq(company.organizationId, orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(inArray(user.id, [userId]));
  });

  it("nel database finisce l'impronta, mai il collegamento", async () => {
    const { token, id } = await creaCollegamento(userId, orgId, aziendaA, { giorni: 30 });
    const righe = await db.select().from(companyShareLink).where(eq(companyShareLink.id, id));
    expect(righe[0].tokenHash).toBe(improntaToken(token));
    // La prova che conta: il token in chiaro non deve comparire da nessuna parte nella riga.
    expect(JSON.stringify(righe[0])).not.toContain(token);
  });

  it("chi ha il collegamento vede i documenti della SUA azienda, e solo quelli", async () => {
    const { token } = await creaCollegamento(userId, orgId, aziendaA, { giorni: 30 });
    const a = await apriCollegamento(token);
    expect(a.esito).toBe("ok");
    if (a.esito !== "ok") return;
    expect(a.azienda).toBe("Alfa S.r.l.");
    expect(a.documenti).toHaveLength(2);
    // Il documento di Beta non deve comparire: un collegamento apre una porta sola.
    expect(a.documenti.every((d) => d.id)).toBe(true);
    const idBeta = (
      await db.select({ id: documentSnapshot.id }).from(documentSnapshot).where(eq(documentSnapshot.companyId, aziendaB))
    ).map((r) => r.id);
    expect(a.documenti.map((d) => d.id).some((id) => idBeta.includes(id))).toBe(false);
  });

  it("un token inventato non apre niente", async () => {
    for (const finto of ["", "corto", "a".repeat(43), improntaToken("x")]) {
      const a = await apriCollegamento(finto);
      expect(a.esito, `«${finto.slice(0, 12)}»`).not.toBe("ok");
    }
  });

  it("l'impronta non è la chiave: presentarla non apre il collegamento", async () => {
    // Chi leggesse il database avrebbe l'impronta, non il token. Provare ad aprire con
    // l'impronta deve fallire, altrimenti conservarla al posto del token non servirebbe.
    const { token } = await creaCollegamento(userId, orgId, aziendaA, { giorni: 30 });
    const a = await apriCollegamento(improntaToken(token));
    expect(a.esito).not.toBe("ok");
  });

  it("ogni apertura si conta, e si vede l'ultima", async () => {
    const { token, id } = await creaCollegamento(userId, orgId, aziendaA, { giorni: 30 });
    await apriCollegamento(token);
    await apriCollegamento(token);
    const righe = await db.select().from(companyShareLink).where(eq(companyShareLink.id, id));
    expect(righe[0].aperture).toBe(2);
    expect(righe[0].lastOpenedAt).not.toBeNull();
  });

  it("la revoca ha effetto immediato, e si distingue dalla scadenza", async () => {
    const { token, id } = await creaCollegamento(userId, orgId, aziendaA, { giorni: 30 });
    expect((await apriCollegamento(token)).esito).toBe("ok");
    await revocaCollegamento(userId, orgId, id);
    const dopo = await apriCollegamento(token);
    // «revocato» e non «scaduto»: la scadenza è ancora lontana, e dire la cosa sbagliata
    // manderebbe lo studio a cercare il problema nella data.
    expect(dopo.esito).toBe("revocato");
  });

  it("un collegamento scaduto non apre più", async () => {
    // La scadenza NON si può spostare nel passato su un collegamento vivo: il vincolo
    // `expires_at > created_at` lo impedisce, ed è giusto — accorciare una scadenza fino a
    // ieri è riscrivere la storia, e per chiudere un accesso c'è la revoca. Qui si crea
    // quindi un collegamento già vecchio, con entrambe le date nel passato.
    const token = generaToken();
    const id = randomUUID();
    const dueMesiFa = new Date(Date.now() - 60 * 86_400_000);
    const unMeseFa = new Date(Date.now() - 30 * 86_400_000);
    await db.insert(companyShareLink).values({
      id,
      organizationId: orgId,
      companyId: aziendaA,
      tokenHash: improntaToken(token),
      creatoDa: userId,
      createdAt: dueMesiFa,
      expiresAt: unMeseFa,
    });
    expect((await apriCollegamento(token)).esito).toBe("scaduto");
  });

  it("lo studio vede i propri collegamenti col loro stato", async () => {
    const elenco = await elencaCollegamenti(userId, orgId, aziendaA);
    expect(elenco.length).toBeGreaterThan(0);
    expect(new Set(elenco.map((c) => c.stato))).toEqual(new Set(["valido", "revocato", "scaduto"]));
  });

  it("non si può condividere l'azienda di un altro studio", async () => {
    const altrove = `az-altrui-${RUN}`;
    const altroOrg = `org-altro-${RUN}`;
    await db.insert(organization).values({ id: altroOrg, name: "Altro Studio", slug: `altro-${RUN}` });
    await db.insert(company).values({ id: altrove, organizationId: altroOrg, nome: "Non tua S.r.l." });
    await expect(creaCollegamento(userId, orgId, altrove, { giorni: 30 })).rejects.toThrow();
    await db.delete(company).where(eq(company.id, altrove));
    await db.delete(organization).where(eq(organization.id, altroOrg));
  });

  it("un account scaduto non può creare nuovi collegamenti", async () => {
    await db.update(orgEntitlement).set({ status: "expired" }).where(eq(orgEntitlement.organizationId, orgId));
    await expect(creaCollegamento(userId, orgId, aziendaA, { giorni: 30 })).rejects.toMatchObject({
      code: "read_only",
    });
    await db.update(orgEntitlement).set({ status: "active" }).where(eq(orgEntitlement.organizationId, orgId));
  });
});
