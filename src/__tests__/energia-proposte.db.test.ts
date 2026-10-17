import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { company, energyBalance, energyEndUseState, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import { createBalance } from "@/features/energy/balances";
import proposte from "@/lib/db/seeds/data/ateco-proposte.json";

// Gli usi finali del bilancio energetico si trovano da soli: dall'esercizio prima, poi dal
// codice ATECO. Prima uno studio professionale partiva coi «forni fusori» accesi.

const RUN = Date.now();
const DB = !!process.env.DATABASE_URL;
let S: Studio;

const attivi = async (balanceId: string) =>
  (await db.select({ k: energyEndUseState.usoKey }).from(energyEndUseState).where(and(eq(energyEndUseState.balanceId, balanceId), eq(energyEndUseState.attivo, true))))
    .map((x) => x.k)
    .sort();

describe.skipIf(!DB)("usi finali proposti", () => {
  beforeAll(async () => {
    S = await creaStudio({ prefisso: "energia-proposte", run: RUN, nomeAzienda: "Studio Tecnico S.r.l." });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active", piano: "professional", activatedAt: new Date() });
    await db.update(company).set({ ateco: "71.12" }).where(eq(company.id, S.companyId));
  });

  afterAll(async () => {
    await db.delete(energyBalance).where(eq(energyBalance.organizationId, S.orgId));
    await pulisciStudio(S.orgId, S.userId);
  });

  let b2024: string;
  it("il primo bilancio accende gli usi tipici del codice ATECO, e niente forni", async () => {
    b2024 = await createBalance(S.userId, S.orgId, { companyId: S.companyId, anno: 2024 });
    expect(await attivi(b2024)).toEqual([...proposte.energia.profili.professionali].sort());
    expect(await attivi(b2024)).not.toContain("U01");
  });

  it("l'esercizio dopo riprende gli usi dell'esercizio prima, anche se il consulente li ha cambiati", async () => {
    await db.update(energyEndUseState).set({ attivo: false }).where(and(eq(energyEndUseState.balanceId, b2024), eq(energyEndUseState.usoKey, "U18")));
    const b2025 = await createBalance(S.userId, S.orgId, { companyId: S.companyId, anno: 2025 });
    const attesi = proposte.energia.profili.professionali.filter((u) => u !== "U18").sort();
    expect(await attivi(b2025)).toEqual(attesi);
  });
});
