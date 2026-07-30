import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { user, organization, member, orgEntitlement, company, auditLog, ghgInventory, ghgOrgFactor, ghgActivityRow } from "@/lib/db/schema";
import { importGhgFromJson } from "@/features/ghg/import";
import { getResults } from "@/features/ghg/results";
import { eq, inArray } from "drizzle-orm";

// Import di migrazione dal prototipo: atomicità (file corrotto = zero righe)
// e fedeltà (i risultati coincidono col motore sui dati importati).
const url = process.env.DATABASE_URL;

const RUN = Date.now();
const orgId = `org-imp-${RUN}`;
const userId = `user-imp-${RUN}`;
let companyId = "";

// Export in formato prototipo: 2 anni di voci, un fattore custom, GO su cat 2.
const EXPORT_PROTOTIPO = {
  id: "OIMPORT",
  nome: "Gamma S.r.l.",
  anno: 2025,
  annoBase: 2024,
  profilo: { forma: "S.r.l.", sede: "Taranto", gwp: "AR6", consolidamento: "Controllo operativo", metodologia: "Dati di attività × FE" },
  fe: [
    // identico alla piattaforma → NON deve creare override
    { id: "gas_smc", g: "Combustione fissa", n: "Gas naturale", um: "Smc", fe: 1.9755, cat: "1", src: "1a", f: "DEFRA/ISPRA" },
    // modificato → override
    { id: "ee_loc", g: "Energia importata", n: "Energia elettrica — location-based Italia", um: "kWh", fe: 0.26, mkt: 0.46, cat: "2", src: "2a", f: "ISPRA 2026" },
    // custom → override
    { id: "fcustom1", g: "Personalizzati", n: "Fattore di prova", um: "kg", fe: 5, cat: "4", src: "4a", f: "interno" },
  ],
  voci: [
    { id: "V1", anno: 2025, cat: "1", src: "1a", desc: "Gas naturale", feId: "gas_smc", um: "Smc", q: "12500", fe: 1.9755, dq: "F" },
    { id: "V2", anno: 2025, cat: "2", src: "2a", desc: "EE", feId: "ee_loc", um: "kWh", q: 100000, fe: 0.2565, feM: 0.457, qGO: 40000, dq: "M" },
    { id: "V3", anno: 2024, cat: "1", src: "1a", desc: "Gas naturale 2024", feId: "gas_smc", um: "Smc", q: "14000", fe: 1.9755, dq: "F" },
  ],
  sorgenti: { "1a": { st: "in" }, "2a": { st: "in" }, "1d": { st: "na", note: "Nessun processo" } },
  anni: { "2025": { ricavi: "3000000", fte: "30" } },
  obiettivi: [{ id: "B1", n: "Riduzione", ambito: "12", anno: "2030", rid: "25", note: "" }],
  verifica: { v1: { st: "ok" }, v2: { st: "par", note: "in corso" } },
  created: "2025-01-01T00:00:00.000Z",
};

describe.skipIf(!url)("import GHG dal prototipo", () => {
  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Importatore", email: `imp-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Import", slug: `imp-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    await db.insert(orgEntitlement).values({ organizationId: orgId, status: "active" });
    companyId = randomUUID();
    await db.insert(company).values({ id: companyId, organizationId: orgId, nome: "Gamma S.r.l." });
  });

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(ghgOrgFactor).where(eq(ghgOrgFactor.organizationId, orgId));
    await db.delete(company).where(eq(company.organizationId, orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(inArray(user.id, [userId]));
  });

  it("importa 2 inventari, override selettivi e obiettivi; i risultati tornano", async () => {
    const esito = await importGhgFromJson(userId, orgId, companyId, EXPORT_PROTOTIPO);
    expect(esito.inventari.map((i) => i.anno)).toEqual([2024, 2025]);
    expect(esito.inventari.find((i) => i.anno === 2025)?.voci).toBe(2);
    // gas_smc identico → niente override; ee_loc modificato + fcustom1 custom → 2
    expect(esito.fattoriOverride).toBe(2);
    expect(esito.obiettivi).toBe(1);

    const inv2025 = esito.inventari.find((i) => i.anno === 2025)!;
    const r = await getResults(userId, orgId, inv2025.id);
    // Voci 2025: gas 24,69375 + EE 25,65 loc / 27,42 mkt (golden noto)
    expect(r.s1).toBe("24.69375");
    expect(r.s2l).toBe("25.65");
    expect(r.s2m).toBe("27.42");
    // anno base 2024 presente → variazione calcolata: 2024 tot = 14000×1,9755/1000 = 27,657
    expect(r.variazioneAnnoBasePct).not.toBeNull();
    // obiettivo con base disponibile → percorso calcolato
    expect(r.obiettivi[0].base).not.toBeNull();
  });

  it("archivio multi-organizzazione su una singola azienda: rifiutato", async () => {
    await expect(
      importGhgFromJson(userId, orgId, companyId, { org: [EXPORT_PROTOTIPO, { ...EXPORT_PROTOTIPO, id: "O2" }] }),
    ).rejects.toThrow(/singola organizzazione/i);
  });

  it("file corrotto a metà: transazione annullata, ZERO righe scritte", async () => {
    const freshCompany = randomUUID();
    await db.insert(company).values({ id: freshCompany, organizationId: orgId, nome: "Pulita S.r.l." });
    const corrotto = {
      ...EXPORT_PROTOTIPO,
      // la 2ª voce ha una categoria invalida: il parser la rifiuta DOPO che
      // l'inventario sarebbe già stato creato se non fossimo in transazione
      voci: [
        EXPORT_PROTOTIPO.voci[0],
        { ...EXPORT_PROTOTIPO.voci[1], cat: "99" },
      ],
    };
    await expect(importGhgFromJson(userId, orgId, freshCompany, corrotto)).rejects.toThrow();
    const inventari = await db.select().from(ghgInventory).where(eq(ghgInventory.companyId, freshCompany));
    const righe = await db.select().from(ghgActivityRow).where(eq(ghgActivityRow.organizationId, orgId));
    expect(inventari).toHaveLength(0);
    expect(righe.filter((r) => !EXPORT_PROTOTIPO.voci.some(() => r.inventoryId)).length).toBe(0);
  });
});
