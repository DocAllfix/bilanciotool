import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { user, organization, member, orgEntitlement, company, auditLog, ghgInventory, ghgOrgFactor } from "@/lib/db/schema";
import { createInventory, updateBoundaries, updatePeriodMeta } from "@/features/ghg/inventories";
import { setSourceState } from "@/features/ghg/sources";
import { addActivityRow, copyRowsFromInventory, listActivityRows } from "@/features/ghg/activity-data";
import { listFactors, upsertOrgFactor, deleteOrgFactor } from "@/features/ghg/factors";
import { setChecklistState } from "@/features/ghg/checklist";
import { addTarget } from "@/features/ghg/targets";
import { getResults, getProgress } from "@/features/ghg/results";
import { latestContentSetId } from "@/features/ghg/inventories";
import { eq, inArray } from "drizzle-orm";

// Ciclo completo del modulo GHG sui FATTI: crea inventario, compila il percorso,
// verifica che i risultati coincidano col golden del motore (Fase 2).
const url = process.env.DATABASE_URL;

const RUN = Date.now();
const orgId = `org-ghg-${RUN}`;
const userId = `user-ghg-${RUN}`;
let companyId = "";
let invId = "";

describe.skipIf(!url)("modulo GHG — ciclo completo", () => {
  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Consulente GHG", email: `ghg-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio GHG", slug: `ghg-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    await db.insert(orgEntitlement).values({ organizationId: orgId, status: "active" });
    companyId = randomUUID();
    await db.insert(company).values({ id: companyId, organizationId: orgId, nome: "Alfa S.r.l." });
  });

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(ghgOrgFactor).where(eq(ghgOrgFactor.organizationId, orgId));
    await db.delete(company).where(eq(company.organizationId, orgId)); // cascade su inventari/righe/target
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(inArray(user.id, [userId]));
  });

  it("crea l'inventario con il content_set corrente", async () => {
    invId = await createInventory(userId, orgId, { companyId, anno: 2025, annoBase: 2024 });
    const [inv] = await db.select().from(ghgInventory).where(eq(ghgInventory.id, invId));
    expect(inv.contentSetId).toBe(await latestContentSetId("ghg"));
    expect(inv.annoBase).toBe(2024);
  });

  it("un secondo inventario stessa azienda+anno è rifiutato (unique)", async () => {
    await expect(createInventory(userId, orgId, { companyId, anno: 2025 })).rejects.toThrow();
  });

  it("esclusione senza motivazione: bloccata (requisito di norma)", async () => {
    await expect(
      setSourceState(userId, orgId, invId, { sourceTypeKey: "1d", stato: "out", motivazione: "" }),
    ).rejects.toThrow(/motivazione/i);
    await setSourceState(userId, orgId, invId, { sourceTypeKey: "1d", stato: "out", motivazione: "Nessun processo chimico in stabilimento" });
    await setSourceState(userId, orgId, invId, { sourceTypeKey: "1a", stato: "in" });
    await setSourceState(userId, orgId, invId, { sourceTypeKey: "2a", stato: "in" });
    await setSourceState(userId, orgId, invId, { sourceTypeKey: "1c", stato: "in" });
  });

  it("inserisce le voci del golden e i risultati coincidono col motore", async () => {
    await addActivityRow(userId, orgId, invId, {
      sourceTypeKey: "1a", categoryKey: "1", descrizione: "Gas naturale", factorKey: "gas_smc",
      um: "Smc", quantita: "12500", fe: "1,9755", dq: "F",
    });
    await addActivityRow(userId, orgId, invId, {
      sourceTypeKey: "2a", categoryKey: "2", descrizione: "Energia elettrica", factorKey: "ee_loc",
      um: "kWh", quantita: "100000", fe: "0.2565", feMarket: "0.457", quotaGo: "40000", dq: "M",
    });
    await addActivityRow(userId, orgId, invId, {
      sourceTypeKey: "1a", categoryKey: "1", descrizione: "Pellet", factorKey: "pellet",
      um: "kg", quantita: "10000", fe: "0.016", feBiogenic: "1.83", dq: "C",
    });
    await addActivityRow(userId, orgId, invId, {
      sourceTypeKey: "1c", categoryKey: "1", descrizione: "R410A", factorKey: "r410a",
      um: "kg", quantita: "12", fe: "2088", dq: "S",
    });
    await updatePeriodMeta(userId, orgId, invId, { ricavi: "2500000", fte: "25", produzione: "1000", umProduzione: "t" });

    const r = await getResults(userId, orgId, invId);
    // Golden Fase 2 (ghg-totals-pure.test.ts): stessi numeri, ora dai FATTI del DB.
    expect(r.s1).toBe("49.90975");
    expect(r.s2l).toBe("25.65");
    expect(r.s2m).toBe("27.42");
    expect(r.totL).toBe("75.55975");
    expect(r.totM).toBe("77.32975");
    expect(r.bio).toBe("18.3");
    expect(Number(r.incPct)).toBeCloseTo(10.1, 1);
    expect(Number(r.dqMedia)).toBeCloseTo(3.34, 2);
    expect(r.intensita.perFatturato).not.toBeNull();
    expect(Number(r.intensita.perAddetto)).toBeCloseTo(3022.39, 1);
    expect(r.top[0].descrizione).toBe("Energia elettrica");
  });

  it("avanzamento: sorgenti valutate e voci presenti muovono le percentuali", async () => {
    await updateBoundaries(userId, orgId, invId, { forma: "S.r.l.", sede: "Bari", metodologia: "Dati di attività × FE", significativita: "Soglia 5%" });
    await setChecklistState(userId, orgId, invId, { requirementKey: "v1", stato: "ok" });
    await addTarget(userId, orgId, { companyId, nome: "Riduzione 1+2", ambito: "12", riduzionePct: "30", annoTarget: 2030 });
    const p = await getProgress(userId, orgId, invId);
    expect(p.a2).toBeCloseTo(4 / 25, 5); // 4 sorgenti valutate su 25
    expect(p.a3).toBe(1); // tutte le incluse hanno voci
    expect(p.a5).toBe(1);
    expect(p.a6).toBe(1);
    expect(p.a7).toBeCloseTo(1 / 15, 5);
    expect(p.a8).toBe(1);
    expect(p.totPct).toBeGreaterThan(0);
  });

  it("copia dall'anno precedente: voci duplicate con quantità azzerate", async () => {
    const inv2026 = await createInventory(userId, orgId, { companyId, anno: 2026, annoBase: 2024 });
    const n = await copyRowsFromInventory(userId, orgId, invId, inv2026);
    expect(n).toBe(4);
    const rows = await listActivityRows(userId, orgId, inv2026);
    expect(rows).toHaveLength(4);
    for (const r of rows) expect(r.quantita).toBe("0");
    // il fattore resta congelato sulla riga copiata
    expect(rows.find((r) => r.descrizione === "Gas naturale")?.fe).toBe("1.9755");
  });

  it("fattori a overlay: piattaforma + override + custom, con protezione in-uso", async () => {
    const setId = await latestContentSetId("ghg");
    const prima = await listFactors(userId, orgId, setId);
    expect(prima).toHaveLength(59);
    expect(prima.find((f) => f.key === "gas_smc")?.origine).toBe("piattaforma");

    await upsertOrgFactor(userId, orgId, {
      key: "gas_smc", baseFactorKey: "gas_smc", gruppo: "Combustione fissa", nome: "Gas naturale",
      um: "Smc", fe: "1.984", categoryKey: "1", sourceTypeKey: "1a", fonte: "ISPRA 2026 tab.2",
    });
    await upsertOrgFactor(userId, orgId, {
      key: "bioetanolo_e85", gruppo: "Combustione mobile", nome: "Bioetanolo E85",
      um: "litri", fe: "1.1", categoryKey: "1", sourceTypeKey: "1b", fonte: "DEFRA 2026",
    });
    const dopo = await listFactors(userId, orgId, setId);
    expect(dopo).toHaveLength(60); // 59 + 1 custom (l'override sostituisce, non aggiunge)
    expect(dopo.find((f) => f.key === "gas_smc")).toMatchObject({ fe: "1.984", origine: "override" });
    expect(dopo.find((f) => f.key === "bioetanolo_e85")?.origine).toBe("custom");

    // gas_smc è referenziato dalle voci → l'override non si elimina
    await expect(deleteOrgFactor(userId, orgId, "gas_smc")).rejects.toThrow(/in uso/i);
    await expect(deleteOrgFactor(userId, orgId, "bioetanolo_e85")).resolves.toBeUndefined();
  });

  it("account expired: scrittura bloccata, lettura consentita", async () => {
    await db.update(orgEntitlement).set({ status: "expired" }).where(eq(orgEntitlement.organizationId, orgId));
    await expect(
      addActivityRow(userId, orgId, invId, { sourceTypeKey: "1a", categoryKey: "1", um: "Smc", quantita: "1", fe: "1", dq: "F" }),
    ).rejects.toMatchObject({ code: "read_only" });
    await expect(getResults(userId, orgId, invId)).resolves.toBeDefined();
    await db.update(orgEntitlement).set({ status: "active" }).where(eq(orgEntitlement.organizationId, orgId));
  });
});
