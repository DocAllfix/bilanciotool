import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { company, orgEntitlement, sgesgProgramma, sgesgSchedaDato } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import { creaProgramma } from "@/features/sgesg/programma";
import { getScheda, setCampoScheda } from "@/features/sgesg/schede";

// Le schede del metodo ESG propongono l'anagrafica nei campi vuoti, SENZA scriverla: una
// scheda mai aperta deve restare «non aperta».

const RUN = Date.now();
const DB = !!process.env.DATABASE_URL;
let S: Studio;
let prog: string;

describe.skipIf(!DB)("schede del metodo ESG: l'anagrafica proposta nei campi vuoti", () => {
  beforeAll(async () => {
    S = await creaStudio({ prefisso: "sgesg-proposte", run: RUN, nomeAzienda: "Corvane Meccanica S.r.l." });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active", piano: "professional", activatedAt: new Date() });
    await db.update(company).set({ piva: "07481930726", ateco: "25.62", dipendenti: 48, fatturato: "5200000.00" }).where(eq(company.id, S.companyId));
    prog = await creaProgramma(S.userId, S.orgId, { companyId: S.companyId, anno: 2026 });
  });

  afterAll(async () => {
    await db.delete(sgesgProgramma).where(eq(sgesgProgramma.organizationId, S.orgId));
    await pulisciStudio(S.orgId, S.userId);
  });

  it("propone ragione sociale, partita IVA, addetti e fatturato, e la scheda resta non aperta", async () => {
    const s = (await getScheda(S.userId, S.orgId, prog, "00A"))!;
    expect(s.stato).toBe("non_aperta");
    expect(s.proposte).toMatchObject({ ragione_sociale: "Corvane Meccanica S.r.l.", piva: "07481930726", dipendenti: "48", fatturato: "5200000" });
    const righe = await db.select().from(sgesgSchedaDato).where(eq(sgesgSchedaDato.programId, prog));
    expect(righe).toHaveLength(0);
  });

  it("un campo scritto non si propone più, e il valore scritto a mano resta", async () => {
    await setCampoScheda(S.userId, S.orgId, prog, "00A", "piva", "IT07481930726");
    const s = (await getScheda(S.userId, S.orgId, prog, "00A"))!;
    expect(s.proposte.piva).toBeUndefined();
    expect(s.dati.piva).toBe("IT07481930726");
    expect(s.proposte.ragione_sociale).toBe("Corvane Meccanica S.r.l.");
  });

  it("la scheda dell'offerta propone il cliente col nome dell'azienda", async () => {
    const s = (await getScheda(S.userId, S.orgId, prog, "00E"))!;
    expect(s.proposte.cliente).toBe("Corvane Meccanica S.r.l.");
  });
});
