import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { user, organization, member, orgEntitlement, company, auditLog } from "@/lib/db/schema";
import { createReportProject, updateProfilo, setSoglia } from "@/features/report/projects";
import { setTopicScore, getMateriality, getAtecoSuggestions } from "@/features/report/materiality";
import { setKpiValue, getKpiWithDerived } from "@/features/report/kpi";
import { setTopicManagement, setTopicManagementField, listTopicManagement } from "@/features/report/policies";
import { saveChapter, listChapters } from "@/features/report/chapters";
import { getGapAnalysis } from "@/features/report/gap";
import { getEmissionsBridge, checkCoherence } from "@/features/report/ghg-bridge";
import { createInventory } from "@/features/ghg/inventories";
import { addActivityRow } from "@/features/ghg/activity-data";
import { latestContentSetId } from "@/features/ghg/inventories";
import { eq, inArray } from "drizzle-orm";

// Ciclo completo del modulo Bilancio sui fatti, incluso il bridge GHG:
// modificare l'inventario cambia la lettura del bilancio SENZA scritture.
const url = process.env.DATABASE_URL;

const RUN = Date.now();
const orgId = `org-rep-${RUN}`;
const userId = `user-rep-${RUN}`;
let companyId = "";
let projectId = "";

describe.skipIf(!url)("modulo Bilancio — ciclo completo", () => {
  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Consulente Report", email: `rep-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Report", slug: `rep-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    await db.insert(orgEntitlement).values({ organizationId: orgId, status: "active" });
    companyId = randomUUID();
    await db.insert(company).values({ id: companyId, organizationId: orgId, nome: "Beta S.p.A." });
  });

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(company).where(eq(company.organizationId, orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(inArray(user.id, [userId]));
  });

  it("crea il progetto e aggiorna profilo e soglia", async () => {
    projectId = await createReportProject(userId, orgId, { companyId, anno: 2025 });
    await updateProfilo(userId, orgId, projectId, { forma: "S.p.A.", sede: "Salerno", ateco: "17.12" });
    await setSoglia(userId, orgId, projectId, 3);
    await expect(createReportProject(userId, orgId, { companyId, anno: 2025 })).rejects.toThrow(); // unique
  });

  it("materialità: punteggi, soglia, esito calcolato", async () => {
    await setTopicScore(userId, orgId, projectId, { topicKey: "T01", scoreImpact: 4, scoreFinancial: 2 });
    await setTopicScore(userId, orgId, projectId, { topicKey: "T07", scoreImpact: 3, scoreFinancial: 3 });
    await setTopicScore(userId, orgId, projectId, { topicKey: "T03", scoreImpact: 2, scoreFinancial: 2 });
    const m = await getMateriality(userId, orgId, projectId);
    expect(m.esito.materialKeys.sort()).toEqual(["T01", "T07"]);
    expect(m.esito.assessedCount).toBe(3);
  });

  it("suggerimenti ATECO: dal codice numerico alla sezione curata", async () => {
    const setId = await latestContentSetId("report");
    const s = await getAtecoSuggestions("17.12", setId); // carta → manifatturiero C
    expect(s?.macroSettore).toBe("C");
    expect((s?.punteggi as Record<string, unknown>).T01).toBeDefined();
    expect(await getAtecoSuggestions("99.99", setId)).toBeNull();
  });

  it("gestione temi: consentita solo sui materiali", async () => {
    await setTopicManagement(userId, orgId, projectId, { topicKey: "T01", politica: "Politica energia", azioni: "Fotovoltaico 200 kWp" });
    await expect(
      setTopicManagement(userId, orgId, projectId, { topicKey: "T03", politica: "x", azioni: "y" }),
    ).rejects.toThrow(/non è materiale/i);
  });

  it("⚠️ salvare un campo NON cancella gli altri cinque", async () => {
    // QUARTA OCCORRENZA della regola più costosa di questo progetto: «mai rimandare la
    // riga intera da props». Prima l'energetico (salvare il costo azzerava la quantità),
    // poi la materialità (la rilevanza finanziaria azzerava l'impatto), poi i contatti
    // (il secondo si dichiarava riferimento scalzando il primo). Qui il client leggeva la
    // riga da props stantie, ci fondeva la modifica e la rimandava tutta: chi scriveva la
    // politica e subito dopo le azioni — prima che il rinfresco fosse atterrato — si
    // vedeva cancellare la politica appena scritta.
    //
    // Trovato dal collaudo per comando del Bilancio, il 26 agosto 2026: il modulo non ne
    // aveva mai avuto uno, e il gate visivo della Fase 7 non preme questi campi.
    // T01 porta già politica e azioni dal test precedente: scrivere un TERZO campo non
    // deve toccarle. È la prova diretta, sui dati che ci sono davvero.
    await setTopicManagementField(userId, orgId, projectId, { topicKey: "T01", campo: "responsabile", valore: "Direzione tecnica" });
    await setTopicManagementField(userId, orgId, projectId, { topicKey: "T01", campo: "target", valore: "−30% al 2030" });

    const righe = await listTopicManagement(userId, orgId, projectId);
    const t01 = righe.find((r) => r.topicKey === "T01");
    expect(t01?.responsabile).toBe("Direzione tecnica");
    expect(t01?.target).toBe("−30% al 2030");
    expect(t01?.politica).toBe("Politica energia");
    expect(t01?.azioni).toBe("Fotovoltaico 200 kWp");
  });

  it("un campo si può svuotare, e svuota solo se stesso", async () => {
    await setTopicManagementField(userId, orgId, projectId, { topicKey: "T01", campo: "azioni", valore: "" });
    const righe = await listTopicManagement(userId, orgId, projectId);
    const t01 = righe.find((r) => r.topicKey === "T01");
    expect(t01?.azioni).toBeNull();
    expect(t01?.politica).toBe("Politica energia");
    expect(t01?.responsabile).toBe("Direzione tecnica");

    // ⚠️ Si rimette com'era. I test di questo file condividono il fixture e girano in
    // ordine: lasciare `azioni` vuoto faceva fallire la gap-analysis più sotto, che le
    // conta fra le lacune. Un test che sporca il banco accusa il prodotto al posto suo.
    await setTopicManagementField(userId, orgId, projectId, { topicKey: "T01", campo: "azioni", valore: "Fotovoltaico 200 kWp" });
  });

  it("il campo è un dominio chiuso: un nome inventato viene respinto", async () => {
    // ⚠️ Il nome del campo finisce dentro `set({ [campo]: … })`: se arrivasse dal client
    // senza un dominio chiuso, sarebbe il client a scegliere quale colonna scrivere.
    await expect(
      // @ts-expect-error — è esattamente ciò che il dominio chiuso deve impedire
      setTopicManagementField(userId, orgId, projectId, { topicKey: "T01", campo: "organizationId", valore: "altro" }),
    ).rejects.toThrow();
  });

  it("KPI doppio anno: i derivati coincidono col motore (golden)", async () => {
    await setKpiValue(userId, orgId, companyId, { kpiKey: "en_ele", anno: 2025, valore: "100000" });
    await setKpiValue(userId, orgId, companyId, { kpiKey: "en_ele_go", anno: 2025, valore: "40000" });
    await setKpiValue(userId, orgId, companyId, { kpiKey: "hr_tot", anno: 2025, valore: "50" });
    await setKpiValue(userId, orgId, companyId, { kpiKey: "hr_don", anno: 2025, valore: "18" });
    await setKpiValue(userId, orgId, companyId, { kpiKey: "en_ele", anno: 2024, valore: "90000" });
    const k = await getKpiWithDerived(userId, orgId, companyId, 2025);
    expect(k.derivati.scope2Loc.toString()).toBe("25.65");
    expect(k.derivati.scope2Mkt.toString()).toBe("27.42");
    expect(k.derivati.pctDonne.toString()).toBe("36");
    expect(k.derivatiPrecedente.scope2Loc.toString()).toBe("23.085"); // 90000×0,2565/1000
    // cancellazione con valore vuoto
    await setKpiValue(userId, orgId, companyId, { kpiKey: "hr_don", anno: 2025, valore: "" });
    const k2 = await getKpiWithDerived(userId, orgId, companyId, 2025);
    expect(k2.corrente.hr_don).toBeUndefined();
  });

  it("capitoli: il payload XSS viene SANIFICATO, non salvato", async () => {
    const malevolo = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Testo lecito", marks: [{ type: "bold" }] }] },
        { type: "iframe", attrs: { src: "https://evil.example" } },
        {
          type: "paragraph",
          content: [{ type: "text", text: "cliccami", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }],
        },
        { type: "html", content: [{ type: "text", text: "<script>alert(1)</script>" }] },
      ],
    };
    await saveChapter(userId, orgId, projectId, "lettera", malevolo);
    const capitoli = await listChapters(userId, orgId, projectId);
    const lettera = capitoli.find((c) => c.templateKey === "lettera")!;
    const json = JSON.stringify(lettera.contenuto);
    expect(json).not.toContain("iframe");
    expect(json).not.toContain("javascript:");
    expect(json).not.toContain("script");
    expect(json).not.toContain("link");
    expect(json).toContain("Testo lecito");
    expect(json).toContain("cliccami"); // il testo resta, il mark malevolo no
  });

  it("bridge GHG: mancante → vuoto → ok, senza mai scrivere", async () => {
    let b = await getEmissionsBridge(userId, orgId, companyId, 2025);
    expect(b.corrente.stato).toBe("mancante");

    const invId = await createInventory(userId, orgId, { companyId, anno: 2025 });
    b = await getEmissionsBridge(userId, orgId, companyId, 2025);
    expect(b.corrente.stato).toBe("vuoto");

    await addActivityRow(userId, orgId, invId, {
      sourceTypeKey: "2a", categoryKey: "2", um: "kWh", quantita: "100000", fe: "0.2565", feMarket: "0.457", quotaGo: "40000", dq: "M",
    });
    b = await getEmissionsBridge(userId, orgId, companyId, 2025);
    expect(b.corrente).toMatchObject({ stato: "ok", scope2Loc: "25.65", scope2Mkt: "27.42" });

    // coerenza: gas dichiarato nei KPI ma niente cat 1 nell'inventario
    await setKpiValue(userId, orgId, companyId, { kpiKey: "en_gas", anno: 2025, valore: "12500" });
    const k = await getKpiWithDerived(userId, orgId, companyId, 2025);
    const warnings = checkCoherence(k.corrente, b.corrente);
    expect(warnings.map((w) => w.codice)).toContain("gas_incoerente");
  });

  it("gap-analysis: le lacune si chiudono man mano", async () => {
    const g = await getGapAnalysis(userId, orgId, projectId);
    expect(g.readyPct).toBeGreaterThan(0);
    expect(g.readyPct).toBeLessThan(100);
    expect(g.profiloMancanti).toContain("mercati"); // non compilato
    expect(g.gestioneMancante).toEqual(["T07"]); // T01 ha politica+azioni, T07 no
    expect(g.capitoliDaCompletare).toContain("metodo"); // mai scritto
  });
});
