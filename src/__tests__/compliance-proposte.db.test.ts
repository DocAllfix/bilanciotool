import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { company, gdprSystem, gdprTrattamento, mogCrimeApplicability, mogModel, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import { creaModello, setApplicabilita } from "@/features/mog231/modello";
import { avviaSistema, setCampoRiga } from "@/features/gdpr/sistema";
import { aggiornaAnagrafica } from "@/features/companies/contatti";

// Compliance: reati 231 e trattamenti GDPR proposti dai dati dell'azienda.
//
// ⚠️ Mai «non applicabile» e mai un trattamento dato per censito: le proposte portano la
// marca finché nessuno le tocca, e i documenti non le contano.

const RUN = Date.now();
const DB = !!process.env.DATABASE_URL;
let S: Studio;

describe.skipIf(!DB)("proposte ai percorsi di compliance", () => {
  beforeAll(async () => {
    S = await creaStudio({ prefisso: "compl-proposte", run: RUN, nomeAzienda: "Corvane Meccanica S.r.l." });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active", piano: "professional", activatedAt: new Date() });
    await db.update(company).set({ ateco: "49.41", dipendenti: 60, sitoWeb: "esempio.it" }).where(eq(company.id, S.companyId));
  });

  afterAll(async () => {
    await db.delete(mogModel).where(eq(mogModel.organizationId, S.orgId));
    await db.delete(gdprSystem).where(eq(gdprSystem.organizationId, S.orgId));
    await pulisciStudio(S.orgId, S.userId);
  });

  it("231: i reati di ogni impresa, quelli del trasporto e la sicurezza sul lavoro, mai «No»", async () => {
    const id = await creaModello(S.userId, S.orgId, { companyId: S.companyId });
    const r = await db.select().from(mogCrimeApplicability).where(eq(mogCrimeApplicability.modelId, id));
    const chiavi = r.map((x) => x.crimeKey);
    for (const k of ["25-ter", "25-quinquiesdecies", "25-undecies", "25-sexiesdecies", "25-septies"]) expect(chiavi, k).toContain(k);
    expect(r.every((x) => x.applicabile === "Sì" && x.propostaMotivo && !x.motivazione)).toBe(true);
    expect(r.find((x) => x.crimeKey === "25-septies")?.propostaMotivo).toMatch(/addetti/);
  });

  it("231: toccare un reato proposto spegne la marca", async () => {
    const [m] = await db.select({ id: mogModel.id }).from(mogModel).where(eq(mogModel.companyId, S.companyId));
    await setApplicabilita(S.userId, S.orgId, m.id, { crimeKey: "25-undecies", campo: "applicabile", valore: "No" });
    const [r] = await db.select().from(mogCrimeApplicability).where(and(eq(mogCrimeApplicability.modelId, m.id), eq(mogCrimeApplicability.crimeKey, "25-undecies")));
    expect(r.applicabile).toBe("No");
    expect(r.propostaMotivo).toBeNull();
  });

  it("GDPR: clienti, fornitori, posta, lavoro, sito, segnalazioni (60 addetti) e quelli del trasporto", async () => {
    const id = await avviaSistema(S.userId, S.orgId, { companyId: S.companyId });
    const t = await db.select().from(gdprTrattamento).where(eq(gdprTrattamento.systemId, id));
    const chiavi = new Set(t.map((x) => x.tipoKey));
    for (const k of [
      "clienti-contratti-ordini-e-fatturazione",
      "gestione-del-rapporto-di-lavoro",
      "sito-web-e-cookie",
      "segnalazioni-di-illeciti",
      "geolocalizzazione-dei-veicoli-aziendali",
      "videosorveglianza",
    ]) {
      expect(chiavi.has(k), k).toBe(true);
    }
    expect(chiavi.has("marketing-e-newsletter")).toBe(false);
    expect(t.every((x) => x.propostaMotivo)).toBe(true);
  });

  it("GDPR: modificare un trattamento proposto lo rende censito", async () => {
    const [s] = await db.select({ id: gdprSystem.id }).from(gdprSystem).where(eq(gdprSystem.companyId, S.companyId));
    const [t] = await db.select().from(gdprTrattamento).where(and(eq(gdprTrattamento.systemId, s.id), isNotNull(gdprTrattamento.propostaMotivo)));
    await setCampoRiga(S.userId, S.orgId, "trattamento", t.id, "funzione", "Amministrazione");
    const [dopo] = await db.select().from(gdprTrattamento).where(eq(gdprTrattamento.id, t.id));
    expect(dopo.propostaMotivo).toBeNull();
  });

  it("231: l'anagrafica salvata dopo porta le proposte mancanti, senza toccare le valutate", async () => {
    await db.update(company).set({ dipendenti: null, ateco: null }).where(eq(company.id, S.companyId));
    const id2 = await creaModello(S.userId, S.orgId, { companyId: S.companyId }).catch(() => null);
    // Un solo modello per azienda: se la creazione è rifiutata si usa quello che c'è.
    const [m] = id2 ? [{ id: id2 }] : await db.select({ id: mogModel.id }).from(mogModel).where(eq(mogModel.companyId, S.companyId));
    const prima = await db.select().from(mogCrimeApplicability).where(eq(mogCrimeApplicability.modelId, m.id));
    await aggiornaAnagrafica(S.userId, S.orgId, S.companyId, "ateco", "49.41");
    const dopo = await db.select().from(mogCrimeApplicability).where(eq(mogCrimeApplicability.modelId, m.id));
    expect(dopo.length).toBeGreaterThanOrEqual(prima.length);
    const undecies = dopo.find((x) => x.crimeKey === "25-undecies");
    if (prima.some((x) => x.crimeKey === "25-undecies")) expect(undecies?.applicabile).toBe("No");
  });
});
