import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ghgInventory, kpiValue, mogModel, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import { suggerimentiDaPercorsi } from "@/features/supplier/ponte-percorsi";
import { createInventory } from "@/features/ghg/inventories";
import { addActivityRow } from "@/features/ghg/activity-data";
import { setKpiValue } from "@/features/report/kpi";
import { creaModello } from "@/features/mog231/modello";

// Le risposte dell'autovalutazione che gli altri percorsi già danno, proposte col motivo.
// Si propone solo ciò che i dati DIMOSTRANO: un percorso che manca non diventa un «no».

const RUN = Date.now();
const DB = !!process.env.DATABASE_URL;
let S: Studio;

describe.skipIf(!DB)("proposte all'autovalutazione ESG dagli altri percorsi", () => {
  beforeAll(async () => {
    S = await creaStudio({ prefisso: "forn-proposte", run: RUN, nomeAzienda: "Corvane Meccanica S.r.l." });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active", piano: "professional", activatedAt: new Date() });
  });

  afterAll(async () => {
    await db.delete(ghgInventory).where(eq(ghgInventory.organizationId, S.orgId));
    await db.delete(kpiValue).where(eq(kpiValue.organizationId, S.orgId));
    await db.delete(mogModel).where(eq(mogModel.organizationId, S.orgId));
    await pulisciStudio(S.orgId, S.userId);
  });

  it("senza percorsi non propone niente, nemmeno un «no»", async () => {
    expect(await suggerimentiDaPercorsi(S.userId, S.orgId, S.companyId)).toEqual([]);
  });

  it("dai percorsi compilati arrivano le risposte che dimostrano, col motivo", async () => {
    const inv = await createInventory(S.userId, S.orgId, { companyId: S.companyId, anno: 2025 });
    await addActivityRow(S.userId, S.orgId, inv, { sourceTypeKey: "1a", categoryKey: "1", factorKey: "gas_smc", um: "Smc", quantita: "42500", fe: "1.9755" });
    await setKpiValue(S.userId, S.orgId, S.companyId, { kpiKey: "hr_tot", anno: 2025, valore: "48" });
    await creaModello(S.userId, S.orgId, { companyId: S.companyId });

    const s = await suggerimentiDaPercorsi(S.userId, S.orgId, S.companyId);
    const per = Object.fromEntries(s.map((x) => [x.chiave, x]));
    // Solo lo Scope 1: la risposta è «parziale», e il motivo dice perché.
    expect(per.E2).toMatchObject({ risposta: "parziale" });
    expect(per.E2.motivo).toMatch(/solo lo Scope 1/);
    expect(per.S4).toMatchObject({ risposta: "si" });
    expect(per.G2).toMatchObject({ risposta: "si" });
    for (const x of s) {
      expect(x.risposta).not.toBe("no");
      expect(x.motivo.length).toBeGreaterThan(15);
    }
  });
});
