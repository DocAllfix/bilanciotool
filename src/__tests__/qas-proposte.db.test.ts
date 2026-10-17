import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { company, corpusRegisterRow, documentCodice, documentSnapshot, orgEntitlement, qasSystem } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import { creaSistema } from "@/features/sgiqas/sistema";
import { aggiornaRiga, confermaRiga } from "@/features/corpus/registri";
import { aggiornaAnagrafica } from "@/features/companies/contatti";
import { publishAnalisiAmbientaleSnapshot } from "@/features/documents/snapshot";

// Sistema integrato: aspetti ambientali e pericoli tipici del settore, proposti nei registri.
//
// ⚠️ Entrano SENZA valutazioni: gravità, frequenza e probabilità sono il giudizio del
// consulente. Finché restano proposte, l'analisi ambientale firmata non le porta.

const RUN = Date.now();
const DB = !!process.env.DATABASE_URL;
let S: Studio;

const righe = (registro: string) =>
  db
    .select()
    .from(corpusRegisterRow)
    .where(and(eq(corpusRegisterRow.companyId, S.companyId), eq(corpusRegisterRow.registerId, registro)))
    .orderBy(corpusRegisterRow.numero);

describe.skipIf(!DB)("proposte ai registri del sistema integrato", () => {
  beforeAll(async () => {
    S = await creaStudio({ prefisso: "qas-proposte", run: RUN, nomeAzienda: "Corvane Meccanica S.r.l." });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active", piano: "professional", activatedAt: new Date() });
    // 25.62: lavorazioni meccaniche, cioè il gruppo «manifattura».
    await db.update(company).set({ ateco: "25.62" }).where(eq(company.id, S.companyId));
  });

  afterAll(async () => {
    const snap = await db.select({ id: documentSnapshot.id }).from(documentSnapshot).where(eq(documentSnapshot.organizationId, S.orgId));
    for (const s of snap) await db.delete(documentCodice).where(eq(documentCodice.snapshotId, s.id));
    await db.delete(documentSnapshot).where(eq(documentSnapshot.organizationId, S.orgId));
    await db.delete(qasSystem).where(eq(qasSystem.organizationId, S.orgId));
    await pulisciStudio(S.orgId, S.userId);
  });

  it("all'avvio entrano le righe comuni e quelle del settore, numerate, marcate, senza valutazioni", async () => {
    await creaSistema(S.userId, S.orgId, { companyId: S.companyId });
    const asp = await righe("aspetti");
    const per = await righe("pericoli");
    expect(asp.length).toBeGreaterThanOrEqual(6);
    expect(per.length).toBeGreaterThanOrEqual(5);
    expect(asp.map((r) => r.riferimento)).toEqual(asp.map((_, i) => `AS${String(i + 1).padStart(3, "0")}`));
    for (const r of [...asp, ...per]) {
      expect(r.propostaMotivo, r.tipoKey ?? "").toBeTruthy();
      const d = r.dati as Record<string, string>;
      for (const k of ["g", "f", "s", "p"]) expect(d[k], `${r.tipoKey}: ${k}`).toBeUndefined();
    }
    expect(asp.some((r) => r.tipoKey?.startsWith("manifattura-"))).toBe(true);
    expect(asp.find((r) => r.tipoKey?.startsWith("manifattura-"))?.propostaMotivo).toMatch(/codice ATECO/);
  });

  it("modificare un campo o confermare spegne la marca", async () => {
    const [a, b] = await righe("aspetti");
    await aggiornaRiga(S.userId, S.orgId, { companyId: S.companyId, rowId: a.id, dati: { g: "2 · contenuto" } });
    await confermaRiga(S.userId, S.orgId, S.companyId, b.id);
    const dopo = await db.select().from(corpusRegisterRow).where(eq(corpusRegisterRow.companyId, S.companyId));
    expect(dopo.find((r) => r.id === a.id)?.propostaMotivo).toBeNull();
    expect(dopo.find((r) => r.id === b.id)?.propostaMotivo).toBeNull();
    expect((dopo.find((r) => r.id === b.id)?.dati as Record<string, string>).att).toBe((b.dati as Record<string, string>).att);
  });

  it("l'analisi ambientale porta solo le righe toccate", async () => {
    const id = await publishAnalisiAmbientaleSnapshot(S.userId, S.orgId, S.companyId);
    const [s] = await db.select({ dati: documentSnapshot.dati }).from(documentSnapshot).where(eq(documentSnapshot.id, id));
    const toccate = await db
      .select({ id: corpusRegisterRow.id })
      .from(corpusRegisterRow)
      .where(and(eq(corpusRegisterRow.companyId, S.companyId), eq(corpusRegisterRow.registerId, "aspetti"), isNull(corpusRegisterRow.propostaMotivo)));
    expect((s.dati as { aspetti: unknown[] }).aspetti).toHaveLength(toccate.length);
    expect(toccate.length).toBe(2);
  });

  it("cambiando ATECO escono le proposte non toccate del settore vecchio, le toccate restano", async () => {
    const prima = await righe("aspetti");
    const toccate = prima.filter((r) => !r.propostaMotivo).map((r) => r.id);
    // 56.10: ristorazione.
    await aggiornaAnagrafica(S.userId, S.orgId, S.companyId, "ateco", "56.10");
    const dopo = await righe("aspetti");
    for (const id of toccate) expect(dopo.some((r) => r.id === id), id).toBe(true);
    const proposte = dopo.filter((r) => r.propostaMotivo);
    expect(proposte.some((r) => r.tipoKey?.startsWith("ristorazione-"))).toBe(true);
    expect(proposte.some((r) => r.tipoKey?.startsWith("manifattura-"))).toBe(false);
    // I numeri non si riciclano su righe che esistono già: nessun doppione.
    expect(new Set(dopo.map((r) => r.numero)).size).toBe(dopo.length);
  });

  it("riproporre non duplica", async () => {
    const prima = await db.select({ id: corpusRegisterRow.id }).from(corpusRegisterRow).where(and(eq(corpusRegisterRow.companyId, S.companyId), isNotNull(corpusRegisterRow.tipoKey)));
    await aggiornaAnagrafica(S.userId, S.orgId, S.companyId, "ateco", "56.10");
    const dopo = await db.select({ id: corpusRegisterRow.id }).from(corpusRegisterRow).where(and(eq(corpusRegisterRow.companyId, S.companyId), isNotNull(corpusRegisterRow.tipoKey)));
    expect(dopo.length).toBe(prima.length);
  });
});
