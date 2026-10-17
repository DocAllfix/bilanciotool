import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  briberySystem, chainProgram, company, energyBalance, gdprSystem, ghgActivityRow, ghgInventory, mogModel, orgEntitlement,
  pasSystem, qasSystem, reportProject, saSystem, soaDeclaration, supplierAssessment, wbSystem,
} from "@/lib/db/schema";
import { creaStudio, pulisciStudio, type Studio } from "./comune";
import { anagraficaInTesto } from "@/features/companies/profilo";
import { aggiornaAnagrafica } from "@/features/companies/contatti";
import { creaModello, aggiornaProfilo as profiloMog } from "@/features/mog231/modello";
import { creaSistema as creaAnticorruzione } from "@/features/anticorruzione/sistema";
import { creaAssetto } from "@/features/segnalazioni/sistema";
import { creaProgramma } from "@/features/filiera/programma";
import { creaSistema as creaQas } from "@/features/sgiqas/sistema";
import { creaSistema as creaSa } from "@/features/sa8000/sistema";
import { avviaSistema as avviaGdpr } from "@/features/gdpr/sistema";
import { avviaSistema as avviaPas } from "@/features/pas/sistema";
import { createBalance } from "@/features/energy/balances";
import { createReportProject } from "@/features/report/projects";
import { createAssessment } from "@/features/supplier/assessments";
import { createDeclaration } from "@/features/soa/declarations";
import { createInventory } from "@/features/ghg/inventories";
import { TABELLE_PROPAGATE } from "@/features/companies/propaga";

// L'ANAGRAFICA IN TUTTI I PERCORSI (decisione del committente del 17 ottobre 2026).
//
// Due prove reggono tutto il resto: un percorso nuovo nasce con l'anagrafica già scritta, e
// un campo compilato a mano in un percorso NON viene mai sovrascritto quando l'anagrafica
// cambia. Una compilazione automatica che cancella il lavoro di qualcuno è peggio di nessuna.

const RUN = Date.now();
const DB = !!process.env.DATABASE_URL;
let piena: Studio;
let vuota: Studio;

async function avviaTutti(s: Studio) {
  const c = { companyId: s.companyId };
  await creaModello(s.userId, s.orgId, c);
  await creaAnticorruzione(s.userId, s.orgId, c);
  await creaAssetto(s.userId, s.orgId, c);
  await creaProgramma(s.userId, s.orgId, c);
  await creaQas(s.userId, s.orgId, c);
  await creaSa(s.userId, s.orgId, c);
  await avviaGdpr(s.userId, s.orgId, c);
  await avviaPas(s.userId, s.orgId, c);
  await createBalance(s.userId, s.orgId, { ...c, anno: 2025 });
  await createReportProject(s.userId, s.orgId, { ...c, anno: 2025 });
  await createAssessment(s.userId, s.orgId, c);
  await createDeclaration(s.userId, s.orgId, c);
  await createInventory(s.userId, s.orgId, { ...c, anno: 2025 });
}

const radice = async <T,>(t: { companyId: unknown } & object, companyId: string) =>
  (await db.select().from(t as never).where(eq((t as unknown as { companyId: never }).companyId, companyId as never)))[0] as T;

describe.skipIf(!DB)("l'anagrafica entra nei percorsi", () => {
  beforeAll(async () => {
    piena = await creaStudio({ prefisso: "anag-piena", run: RUN, nomeAzienda: "Corvane Meccanica S.r.l." });
    vuota = await creaStudio({ prefisso: "anag-vuota", run: RUN, nomeAzienda: "Azienda Vuota S.r.l." });
    for (const s of [piena, vuota]) {
      await db.insert(orgEntitlement).values({ organizationId: s.orgId, status: "active", piano: "professional", activatedAt: new Date() });
    }
    await db
      .update(company)
      .set({ piva: "07481930726", sede: "Bari", settore: "Lavorazioni meccaniche", ateco: "25.62", dipendenti: 48, fatturato: "5200000.00", sitoWeb: "esempio.it" })
      .where(eq(company.id, piena.companyId));
  });

  afterAll(async () => {
    for (const s of [piena, vuota]) {
      for (const t of TABELLE_PROPAGATE) await db.delete(t as never).where(eq((t as unknown as { organizationId: never }).organizationId, s.orgId as never));
      await pulisciStudio(s.orgId, s.userId);
    }
  });

  it("anagraficaInTesto: il fatturato diventa milioni con la virgola, i vuoti restano assenti", () => {
    const base = { nome: "x", piva: null, settore: "  ", ateco: null, sede: null, nazione: null, sitoWeb: null, referente: null, profilo: null };
    expect(anagraficaInTesto({ ...base, dipendenti: 48, fatturato: "5200000.00" })).toEqual({ addetti: "48", fatturatoMilioni: "5,2" });
    expect(anagraficaInTesto({ ...base, dipendenti: 0, fatturato: "10000000.00" })).toEqual({ addetti: "0", fatturatoMilioni: "10" });
    expect(anagraficaInTesto({ ...base, dipendenti: null, fatturato: "123456.00" }).fatturatoMilioni).toBe("0,12");
  });

  it("un percorso nuovo nasce con l'anagrafica dell'azienda, nei campi che ha", async () => {
    await avviaTutti(piena);
    const c = piena.companyId;
    for (const t of [mogModel, briberySystem, wbSystem, chainProgram, qasSystem, saSystem]) {
      const r = await radice<{ piva: string; sede: string; settore: string; addetti: string }>(t, c);
      expect([r.piva, r.sede, r.settore, r.addetti]).toEqual(["07481930726", "Bari", "Lavorazioni meccaniche", "48"]);
    }
    expect((await radice<{ sitoWeb: string }>(saSystem, c)).sitoWeb).toBe("esempio.it");
    const g = await radice<{ ateco: string; dipendenti: string }>(gdprSystem, c);
    expect([g.ateco, g.dipendenti]).toEqual(["25.62", "48"]);
    expect((await radice<{ ateco: string }>(pasSystem, c)).ateco).toBe("25.62");
    for (const t of [energyBalance, reportProject]) {
      expect((await radice<{ profilo: object }>(t, c)).profilo).toMatchObject({ piva: "07481930726", ateco: "25.62", sede: "Bari" });
    }
    expect((await radice<{ profilo: object }>(supplierAssessment, c)).profilo).toMatchObject({ fatturato: "5,2", dipendenti: "48" });
    expect((await radice<{ profilo: object }>(soaDeclaration, c)).profilo).toMatchObject({ piva: "07481930726", sede: "Bari" });
  });

  it("⚠️ un campo scritto a mano nel percorso NON viene sovrascritto quando l'anagrafica arriva", async () => {
    await avviaTutti(vuota);
    const [m] = await db.select({ id: mogModel.id }).from(mogModel).where(eq(mogModel.companyId, vuota.companyId));
    await profiloMog(vuota.userId, vuota.orgId, m.id, { sede: "Milano, sede scritta a mano" });

    await aggiornaAnagrafica(vuota.userId, vuota.orgId, vuota.companyId, "sede", "Bari");
    await aggiornaAnagrafica(vuota.userId, vuota.orgId, vuota.companyId, "piva", "07481930726");

    expect((await radice<{ sede: string }>(mogModel, vuota.companyId)).sede).toBe("Milano, sede scritta a mano");
    expect((await radice<{ piva: string }>(mogModel, vuota.companyId)).piva).toBe("07481930726");
    expect((await radice<{ sede: string }>(briberySystem, vuota.companyId)).sede).toBe("Bari");
    expect((await radice<{ profilo: { sede?: string } }>(soaDeclaration, vuota.companyId)).profilo.sede).toBe("Bari");
  });

  it("l'ATECO salvato dopo porta all'inventario anche le sue voci tipiche", async () => {
    const [inv] = await db.select().from(ghgInventory).where(eq(ghgInventory.companyId, vuota.companyId));
    expect((inv.boundaries as Record<string, string>).ateco ?? "").toBe("");
    await aggiornaAnagrafica(vuota.userId, vuota.orgId, vuota.companyId, "ateco", "10.71");
    const [dopo] = await db.select().from(ghgInventory).where(eq(ghgInventory.id, inv.id));
    expect((dopo.boundaries as Record<string, string>).ateco).toBe("10.71");
    const voci = await db.select().from(ghgActivityRow).where(eq(ghgActivityRow.inventoryId, inv.id));
    expect(voci.length).toBeGreaterThan(5);
    expect(voci.every((v) => v.propostaMotivo?.includes("alimentare"))).toBe(true);
  });

  it("svuotare l'anagrafica NON svuota i percorsi", async () => {
    await aggiornaAnagrafica(vuota.userId, vuota.orgId, vuota.companyId, "sede", null);
    expect((await radice<{ sede: string }>(briberySystem, vuota.companyId)).sede).toBe("Bari");
  });
});
