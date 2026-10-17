import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { company, ghgActivityRow, ghgInventory, ghgSourceSelection, orgEntitlement } from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import { createInventory, updateBoundaries } from "@/features/ghg/inventories";
import { copyRowsFromInventory, updateActivityRow } from "@/features/ghg/activity-data";

// LE VOCI GHG SI TROVANO DA SOLE (decisione del committente del 17 ottobre 2026).
//
// Le prove che contano sono quelle che difendono il lavoro del consulente: una voce toccata
// non si tocca più, un numero scritto non sparisce, un campo compilato a mano non si
// sovrascrive. Una compilazione automatica che cancella il lavoro di qualcuno è peggio di
// nessuna compilazione.

const RUN = Date.now();
const DB = !!process.env.DATABASE_URL;
let S: Studio;

const voci = (inventoryId: string) => db.select().from(ghgActivityRow).where(eq(ghgActivityRow.inventoryId, inventoryId));
const proposte = (inventoryId: string) =>
  db.select().from(ghgActivityRow).where(and(eq(ghgActivityRow.inventoryId, inventoryId), isNotNull(ghgActivityRow.propostaMotivo)));

describe.skipIf(!DB)("voci GHG proposte", () => {
  beforeAll(async () => {
    S = await creaStudio({ prefisso: "ghg-proposte", run: RUN, nomeAzienda: "Corvane Meccanica S.r.l." });
    await db.insert(orgEntitlement).values({ organizationId: S.orgId, status: "active", piano: "professional", activatedAt: new Date() });
    await db.update(company).set({ ateco: "25.62", piva: "07481930726", sede: "Bari", dipendenti: 48, fatturato: "5200000.00" }).where(eq(company.id, S.companyId));
  });

  afterAll(async () => {
    await db.delete(ghgInventory).where(eq(ghgInventory.organizationId, S.orgId));
    await pulisciStudio(S.orgId, S.userId);
  });

  let inv2024: string;

  it("il primo inventario parte dall'anagrafica: confini, ricavi e addetti copiati", async () => {
    inv2024 = await createInventory(S.userId, S.orgId, { companyId: S.companyId, anno: 2024 });
    const [i] = await db.select().from(ghgInventory).where(eq(ghgInventory.id, inv2024));
    expect(i.boundaries).toMatchObject({ ateco: "25.62", piva: "07481930726", sede: "Bari", dipendenti: "48" });
    expect(Number(i.ricavi)).toBe(5200000);
    expect(Number(i.fte)).toBe(48);
  });

  it("…e riceve le voci tipiche del codice ATECO, a quantità zero, col motivo", async () => {
    const p = await proposte(inv2024);
    expect(p.length).toBeGreaterThan(5);
    expect(p.length).toBeLessThanOrEqual(15);
    for (const v of p) {
      expect(Number(v.quantita)).toBe(0);
      expect(v.propostaMotivo).toMatch(/^Proposta dal codice ATECO \(Metallurgia/);
      expect(v.factorKey).toBeTruthy();
    }
    expect(p.map((v) => v.factorKey)).toContain("acciaio");
  });

  it("le sorgenti delle voci proposte risultano incluse", async () => {
    const sel = await db.select().from(ghgSourceSelection).where(eq(ghgSourceSelection.inventoryId, inv2024));
    const incluse = new Set(sel.filter((x) => x.stato === "in").map((x) => x.sourceTypeKey));
    for (const v of await proposte(inv2024)) expect(incluse.has(v.sourceTypeKey), v.sourceTypeKey).toBe(true);
  });

  it("riproporre è idempotente: risalvare lo stesso ATECO non duplica niente", async () => {
    const prima = (await voci(inv2024)).length;
    await updateBoundaries(S.userId, S.orgId, inv2024, { ateco: "25.62" });
    expect((await voci(inv2024)).length).toBe(prima);
  });

  it("⚠️ modificare una voce spegne la marca: da lì è del consulente", async () => {
    const [v] = (await proposte(inv2024)).filter((x) => x.factorKey === "acciaio");
    await updateActivityRow(S.userId, S.orgId, v.id, {
      sourceTypeKey: v.sourceTypeKey, categoryKey: v.categoryKey as "4", factorKey: v.factorKey, um: v.um, quantita: "12000", fe: v.fe,
    });
    const [dopo] = await db.select().from(ghgActivityRow).where(eq(ghgActivityRow.id, v.id));
    expect(dopo.propostaMotivo).toBeNull();
    expect(Number(dopo.quantita)).toBe(12000);
  });

  it("⚠️ cambiando ATECO escono SOLO le proposte non toccate: la voce scritta resta", async () => {
    await updateBoundaries(S.userId, S.orgId, inv2024, { ateco: "69.20" });
    const tutte = await voci(inv2024);
    expect(tutte.find((v) => v.factorKey === "acciaio")?.quantita).toBe("12000");
    const p = await proposte(inv2024);
    expect(p.every((v) => v.propostaMotivo?.includes("professionali"))).toBe(true);
    expect(p.map((v) => v.factorKey)).toContain("aereo_corto");
  });

  it("un codice illeggibile toglie le proposte non toccate e non ne inventa", async () => {
    await updateBoundaries(S.userId, S.orgId, inv2024, { ateco: "Meccanica" });
    expect(await proposte(inv2024)).toEqual([]);
    expect((await voci(inv2024)).length).toBe(1);
  });

  let inv2025: string;
  it("l'esercizio dopo riprende le voci del precedente come proposte, e NON quelle ATECO", async () => {
    await updateBoundaries(S.userId, S.orgId, inv2024, { metodologia: "GHG Protocol, controllo operativo" });
    inv2025 = await createInventory(S.userId, S.orgId, { companyId: S.companyId, anno: 2025 });
    const p = await proposte(inv2025);
    expect(p.length).toBe(1);
    expect(p[0].factorKey).toBe("acciaio");
    expect(Number(p[0].quantita)).toBe(0);
    expect(p[0].propostaMotivo).toMatch(/esercizio 2024/);
    // I testi lunghi dei confini vengono dall'esercizio prima.
    const [i] = await db.select().from(ghgInventory).where(eq(ghgInventory.id, inv2025));
    expect((i.boundaries as Record<string, string>).metodologia).toBe("GHG Protocol, controllo operativo");
  });

  it("«Copia dal 2024» sostituisce le proposte non toccate, senza doppioni", async () => {
    await copyRowsFromInventory(S.userId, S.orgId, inv2024, inv2025);
    const tutte = await voci(inv2025);
    expect(tutte.length).toBe(1);
    expect(tutte[0].propostaMotivo).toBeNull();
  });
});
