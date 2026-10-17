import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ghgInventory, orgEntitlement, supplierAssessment } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import { createInventory, updateBoundaries } from "@/features/ghg/inventories";
import { createAssessment, updateProfilo as updateProfiloFornitore } from "@/features/supplier/assessments";

// Campi diversi dello stesso profilo, salvati nello stesso istante, sopravvivono TUTTI.
//
// ⚠️ È il difetto più costoso di questo progetto: «leggi l'oggetto, fondi in memoria,
// riscrivi». Due salvataggi vicini leggono lo stesso oggetto, e il secondo riscrive il primo
// col valore vecchio. Le compilazioni automatiche moltiplicano le scritture sullo stesso
// profilo: la fusione ora la fa Postgres (`fondiJsonb`). Dieci campi in parallelo, perché
// con due la gara si vince per caso.

const RUN = Date.now();
const DB = !!process.env.DATABASE_URL;
let S: Studio;

describe.skipIf(!DB)("profili salvati in parallelo", () => {
  beforeAll(async () => {
    S = await creaStudio({ prefisso: "profili-conc", run: RUN, nomeAzienda: "Corvane Meccanica S.r.l." });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active", piano: "professional", activatedAt: new Date() });
  });

  afterAll(async () => {
    await db.delete(ghgInventory).where(eq(ghgInventory.organizationId, S.orgId));
    await db.delete(supplierAssessment).where(eq(supplierAssessment.organizationId, S.orgId));
    await pulisciStudio(S.orgId, S.userId);
  });

  it("GHG: dieci campi dei confini in parallelo, nessuno perso", async () => {
    const id = await createInventory(S.userId, S.orgId, { companyId: S.companyId, anno: 2025 });
    const campi = { forma: "S.r.l.", piva: "07481930726", sede: "Bari", settore: "Meccanica", ateco: "25.62", siti: "Bari", dipendenti: "48", responsabile: "Ing. Bianchi", periodo: "2025", metodologia: "GHG Protocol" };
    await Promise.all(Object.entries(campi).map(([k, v]) => updateBoundaries(S.userId, S.orgId, id, { [k]: v })));
    const [r] = await db.select({ b: ghgInventory.boundaries }).from(ghgInventory).where(eq(ghgInventory.id, id));
    expect(r.b).toMatchObject(campi);
  });

  it("Autovalutazione ESG: nove campi del profilo in parallelo, nessuno perso", async () => {
    const id = await createAssessment(S.userId, S.orgId, { companyId: S.companyId });
    const campi = { piva: "07481930726", settore: "Meccanica", ateco: "25.62", dipendenti: "48", fatturato: "5,2", sede: "Bari", referente: "Anna Greco", committente: "Cliente S.p.A.", scadenza: "2026-12-31" };
    await Promise.all(Object.entries(campi).map(([k, v]) => updateProfiloFornitore(S.userId, S.orgId, id, { [k]: v })));
    const [r] = await db.select({ p: supplierAssessment.profilo }).from(supplierAssessment).where(eq(supplierAssessment.id, id));
    expect(r.p).toMatchObject(campi);
  });

  it("un id di un altro studio non viene toccato, e lo si dice", async () => {
    await expect(updateBoundaries(S.userId, S.orgId, "inesistente", { forma: "x" })).rejects.toThrow(/inesistente/);
  });
});
