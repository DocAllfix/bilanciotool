import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  user, organization, member, orgEntitlement, company, auditLog,
  energyVectorInput, energyAllocation, energyEndUseState,
} from "@/lib/db/schema";
import { createBalance, updateProfilo, setAnnoBase, latestEnergySetId } from "@/features/energy/balances";
import {
  listVectors, listVectorInputs, setVectorInput, setMonthlyValue,
  upsertCompanyFactor, deleteCompanyFactor,
} from "@/features/energy/vectors";
import { setAllocation, setEndUseState, listAllocations, listEndUseStates } from "@/features/energy/allocation";
import { setDriverValue } from "@/features/energy/drivers";
import { addMeasure, updateMeasure, listMeasures } from "@/features/energy/measures";
import { saveChapter, listChapters } from "@/features/energy/narrative";
import { getWizardData } from "@/features/energy/queries";

// Ciclo completo del bilancio energetico sui fatti del database: quello che il
// motore calcola sui dati in memoria deve risultare identico partendo dalle
// righe realmente scritte, quadratura compresa.
const url = process.env.DATABASE_URL;

const RUN = Date.now();
const orgId = `org-ene-${RUN}`;
const userId = `user-ene-${RUN}`;
let companyId = "";
let balanceId = "";

describe.skipIf(!url)("modulo energetico — ciclo completo", () => {
  beforeAll(async () => {
    await db.insert(user).values({ id: userId, name: "Consulente Energia", email: `ene-${RUN}@example.com` });
    await db.insert(organization).values({ id: orgId, name: "Studio Energia", slug: `ene-${RUN}` });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId, role: "owner" });
    await db.insert(orgEntitlement).values({ organizationId: orgId, status: "active" });
    companyId = randomUUID();
    await db.insert(company).values({ id: companyId, organizationId: orgId, nome: "Fonderia di prova" });
  });

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.organizationId, orgId));
    await db.delete(company).where(eq(company.organizationId, orgId));
    await db.delete(orgEntitlement).where(eq(orgEntitlement.organizationId, orgId));
    await db.delete(member).where(eq(member.organizationId, orgId));
    await db.delete(organization).where(eq(organization.id, orgId));
    await db.delete(user).where(inArray(user.id, [userId]));
  });

  it("crea il bilancio, congela la metodologia e accende gli usi predefiniti", async () => {
    balanceId = await createBalance(userId, orgId, { companyId, anno: 2025 });
    const stati = await listEndUseStates(userId, orgId, balanceId);
    expect(stati.length).toBe(11);
    expect(stati.every((s) => s.attivo)).toBe(true);

    const [b] = await db.select().from(energyEndUseState).where(eq(energyEndUseState.balanceId, balanceId)).limit(1);
    expect(b.organizationId).toBe(orgId);

    await updateProfilo(userId, orgId, balanceId, { forma: "S.r.l.", sede: "Salerno", settore: "Fonderia" });
    await setAnnoBase(userId, orgId, balanceId, 2024);
    // Un secondo bilancio sullo stesso anno viola l'unicità azienda+anno.
    await expect(createBalance(userId, orgId, { companyId, anno: 2025 })).rejects.toThrow();
  });

  it("vettori: quantità e costo, e la riga sparisce se si svuota tutto", async () => {
    await setVectorInput(userId, orgId, balanceId, { vettoreKey: "ele", quantita: "2280000", costo: "410400" });
    await setVectorInput(userId, orgId, balanceId, { vettoreKey: "gas", quantita: "186000", costo: "111600" });
    await setVectorInput(userId, orgId, balanceId, { vettoreKey: "gpl", quantita: "500", costo: "700" });
    expect((await listVectorInputs(userId, orgId, balanceId)).length).toBe(3);

    await setVectorInput(userId, orgId, balanceId, { vettoreKey: "gpl", quantita: "", costo: "" });
    const dopo = await listVectorInputs(userId, orgId, balanceId);
    expect(dopo.length).toBe(2);
    expect(dopo.some((r) => r.vettoreKey === "gpl")).toBe(false);
  });

  it("mensili: jsonb_set su un solo mese, senza rileggere i dodici", async () => {
    // Vettore mai inserito prima: la riga nasce con i dodici slot.
    await setMonthlyValue(userId, orgId, balanceId, { vettoreKey: "gasolio_t", mese: 3, valore: "1200" });
    const [nuova] = await db
      .select()
      .from(energyVectorInput)
      .where(eq(energyVectorInput.balanceId, balanceId))
      .then((r) => r.filter((x) => x.vettoreKey === "gasolio_t"));
    expect((nuova.mensili as string[]).length).toBe(12);
    expect((nuova.mensili as string[])[3]).toBe("1200");

    // Su riga esistente: cambia SOLO l'indice richiesto.
    await setMonthlyValue(userId, orgId, balanceId, { vettoreKey: "ele", mese: 0, valore: "190000" });
    await setMonthlyValue(userId, orgId, balanceId, { vettoreKey: "ele", mese: 11, valore: "200000" });
    const [ele] = await db
      .select()
      .from(energyVectorInput)
      .where(eq(energyVectorInput.balanceId, balanceId))
      .then((r) => r.filter((x) => x.vettoreKey === "ele"));
    const mensili = ele.mensili as string[];
    expect(mensili[0]).toBe("190000");
    expect(mensili[11]).toBe("200000");
    expect(mensili.filter((m) => m !== "").length).toBe(2);
    expect(ele.quantita).toBe("2280000"); // l'annuo non è stato toccato
  });

  it("fattori a sovrapposizione: l'azienda scavalca la piattaforma e può tornare indietro", async () => {
    const setId = await latestEnergySetId();
    const prima = await listVectors(userId, orgId, companyId, setId);
    const gasPrima = prima.find((v) => v.key === "gas")!;
    expect(gasPrima.origine).toBe("piattaforma");

    await upsertCompanyFactor(userId, orgId, companyId, { key: "gas", kwhUnita: "9,95", fonte: "Analisi del fornitore" });
    const dopo = await listVectors(userId, orgId, companyId, setId);
    const gasDopo = dopo.find((v) => v.key === "gas")!;
    expect(Number(gasDopo.kwhUnita)).toBe(9.95);
    expect(gasDopo.origine).toBe("personalizzato");
    expect(gasDopo.tepUnita).toBe(gasPrima.tepUnita); // gli altri restano di piattaforma

    await deleteCompanyFactor(userId, orgId, companyId, "gas");
    const ripristinato = (await listVectors(userId, orgId, companyId, setId)).find((v) => v.key === "gas")!;
    expect(ripristinato.kwhUnita).toBe(gasPrima.kwhUnita);
    expect(ripristinato.origine).toBe("piattaforma");
  });

  it("ripartizione: una riga per cella valorizzata, svuotare cancella", async () => {
    // Solo usi accesi di default: una cella su un uso spento non entrerebbe nel
    // calcolo, ed è proprio ciò che il test successivo verifica.
    await setAllocation(userId, orgId, balanceId, { usoKey: "U01", vettoreKey: "ele", quantita: "1400000" });
    await setAllocation(userId, orgId, balanceId, { usoKey: "U07", vettoreKey: "ele", quantita: "500000" });
    await setAllocation(userId, orgId, balanceId, { usoKey: "U15", vettoreKey: "ele", quantita: "380000" });
    await setAllocation(userId, orgId, balanceId, { usoKey: "U13", vettoreKey: "gas", quantita: "186000" });
    expect((await listAllocations(userId, orgId, balanceId)).length).toBe(4);

    await setAllocation(userId, orgId, balanceId, { usoKey: "U15", vettoreKey: "ele", quantita: "" });
    expect((await listAllocations(userId, orgId, balanceId)).length).toBe(3);
    const righe = await db.select().from(energyAllocation).where(eq(energyAllocation.balanceId, balanceId));
    expect(righe.every((r) => r.organizationId === orgId)).toBe(true);

    // Rimessa a posto per chiudere la quadratura dell'elettricità.
    await setAllocation(userId, orgId, balanceId, { usoKey: "U15", vettoreKey: "ele", quantita: "380000" });
  });

  it("quadratura chiusa e ripartizione coerente con i vettori", async () => {
    const d = (await getWizardData(userId, orgId, companyId, 2025))!;
    const q = d.risultati!.quadratura;
    const ele = q.perVettore.find((v) => v.key === "ele")!;
    const gas = q.perVettore.find((v) => v.key === "gas")!;
    expect(ele.ok).toBe(true);
    expect(Number(ele.residuo)).toBe(0);
    expect(gas.ok).toBe(true);
    expect(q.ok).toBe(q.valutati);

    // 2.280.000 kWh elettrici + 186.000 Smc di gas: il totale non dipende dal
    // percorso database, deve essere quello del motore.
    const tot = Number(d.risultati!.totali.kwh);
    expect(tot).toBeCloseTo(2280000 + 186000 * Number(d.catalogo!.vettori.find((v) => v.key === "gas")!.kwhUnita), 3);
    expect(Number(d.risultati!.ripartizione.coperturaPct)).toBeCloseTo(100, 1);
  });

  it("uso spento: le celle restano, il calcolo le ignora", async () => {
    const prima = Number((await getWizardData(userId, orgId, companyId, 2025))!.risultati!.ripartizione.kwhRipartito);
    await setEndUseState(userId, orgId, balanceId, { usoKey: "U07", attivo: false });
    const dopo = (await getWizardData(userId, orgId, companyId, 2025))!;
    expect(Number(dopo.risultati!.ripartizione.kwhRipartito)).toBeCloseTo(prima - 500000, 3);
    // La cella non è stata cancellata: riaccendendo l'uso torna tutto.
    expect((await listAllocations(userId, orgId, balanceId)).some((c) => c.usoKey === "U07")).toBe(true);
    await setEndUseState(userId, orgId, balanceId, { usoKey: "U07", attivo: true, metodo: "cal" });
    expect(Number((await getWizardData(userId, orgId, companyId, 2025))!.risultati!.ripartizione.kwhRipartito)).toBeCloseTo(prima, 3);
  });

  it("indicatori: dai driver del database agli EnPI, con null dove manca il denominatore", async () => {
    await setDriverValue(userId, orgId, companyId, { anno: 2025, driverKey: "prod", valore: "1200" });
    const d = (await getWizardData(userId, orgId, companyId, 2025))!;
    const cs = d.risultati!.indicatori.find((i) => i.key === "cs")!;
    expect(Number(cs.valore)).toBeCloseTo(Number(d.risultati!.totali.kwh) / 1200, 4);
    // Nessuna superficie inserita: l'indicatore per metro quadro non esiste, non vale zero.
    expect(d.risultati!.indicatori.find((i) => i.key === "csm2")!.valore).toBeNull();
  });

  it("interventi: il ritorno resta indefinito finché non c'è un risparmio", async () => {
    const id = await addMeasure(userId, orgId, balanceId, { descrizione: "Rifasamento", vettoreKey: "ele", investimento: "20000" });
    let d = (await getWizardData(userId, orgId, companyId, 2025))!;
    expect(d.risultati!.misure.righe[0].pbtAnni).toBeNull();

    await updateMeasure(userId, orgId, id, { quantita: "120000" });
    d = (await getWizardData(userId, orgId, companyId, 2025))!;
    const r = d.risultati!.misure.righe[0];
    expect(Number(r.kwh)).toBe(120000);
    expect(Number(r.pbtAnni)).toBeGreaterThan(0);
    expect((await listMeasures(userId, orgId, balanceId)).length).toBe(1);
  });

  it("capitoli: la sanificazione scarta il markup pericoloso e conserva il testo", async () => {
    await saveChapter(userId, orgId, balanceId, "sintesi", {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Il sito consuma prevalentemente energia elettrica." }] },
        { type: "script", content: [{ type: "text", text: "alert(1)" }] },
      ],
    });
    const capitoli = await listChapters(userId, orgId, balanceId);
    const testo = JSON.stringify(capitoli[0].contenuto);
    expect(testo).toContain("prevalentemente energia elettrica");
    expect(testo).not.toContain("script");
  });

  it("avanzamento: cresce con la compilazione e resta fra 0 e 100", async () => {
    const d = (await getWizardData(userId, orgId, companyId, 2025))!;
    const a = d.stato!.avanzamento;
    expect(a.s1).toBeGreaterThan(0);
    expect(a.s2).toBe(1); // due vettori, entrambi con costo
    expect(a.s3).toBeGreaterThan(0);
    expect(a.totPct).toBeGreaterThan(0);
    expect(a.totPct).toBeLessThanOrEqual(100);
  });

  it("account expired: scrittura bloccata, lettura consentita", async () => {
    await db.update(orgEntitlement).set({ status: "expired" }).where(eq(orgEntitlement.organizationId, orgId));
    await expect(
      setAllocation(userId, orgId, balanceId, { usoKey: "U01", vettoreKey: "ele", quantita: "1" }),
    ).rejects.toMatchObject({ code: "read_only" });
    await expect(getWizardData(userId, orgId, companyId, 2025)).resolves.toBeDefined();
    await db.update(orgEntitlement).set({ status: "active" }).where(eq(orgEntitlement.organizationId, orgId));
  });
});
