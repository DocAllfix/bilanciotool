import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { count, eq } from "drizzle-orm";
import {
  contentSet, ghgCategory, ghgSourceType, emissionFactor, gwpSet,
  checklistRequirement, materialityTopic, kpiSection, kpiDefinition,
  ratingScale, narrativeTemplate, atecoSuggestion,
  energyVector, energyArea, energyEndUse, energyDriverDefinition, energyIndicator,
  supplierArea, supplierQuestion,
} from "@/lib/db/schema";
import { INDICATORI_KEYS } from "@/lib/calc/energy/indicators";
import { AREE_PESI } from "@/lib/calc/supplier/scoring";

// Conteggi ESATTI dei contenuti metodologici estratti dai prototipi
// (estrazione automatica via scripts/extract-seed.mjs — niente trascrizione manuale).
// NB: le sorgenti sono 25 (4+2+5+7+4+3), non 26 come stimato in pianificazione.
const url = process.env.DATABASE_URL;

describe.skipIf(!url)("seed contenuti metodologici", () => {
  const conta = async (t: Parameters<typeof db.select>[0] extends never ? never : any) => {
    const r = await db.select({ n: count() }).from(t);
    return r[0].n;
  };

  it("conteggi esatti per ogni catalogo", async () => {
    expect(await conta(contentSet)).toBe(4); // ghg-v1 + report-v1 + energy-v1 + supplier-v1
    expect(await conta(ghgCategory)).toBe(6);
    expect(await conta(ghgSourceType)).toBe(25);
    expect(await conta(emissionFactor)).toBe(59);
    expect(await conta(gwpSet)).toBe(3);
    expect(await conta(checklistRequirement)).toBe(15);
    expect(await conta(materialityTopic)).toBe(18);
    expect(await conta(kpiSection)).toBe(8);
    expect(await conta(kpiDefinition)).toBe(49);
    expect(await conta(ratingScale)).toBe(5); // dq + imp + fin + energy:metodo + supplier:fascia
    expect(await conta(narrativeTemplate)).toBe(14); // 7 bilancio + 7 energetico
    expect(await conta(atecoSuggestion)).toBe(8);
  });

  it("conteggi esatti del modulo energetico", async () => {
    expect(await conta(energyVector)).toBe(12);
    expect(await conta(energyArea)).toBe(4);
    expect(await conta(energyEndUse)).toBe(20);
    expect(await conta(energyDriverDefinition)).toBe(8);
    expect(await conta(energyIndicator)).toBe(10);
    // Gli 11 usi accesi su un nuovo bilancio (USI_DEF del prototipo).
    const predefiniti = (await db.select().from(energyEndUse)).filter((u) => u.predefinito);
    expect(predefiniti).toHaveLength(11);
  });

  it("conteggi esatti del modulo supplier", async () => {
    expect(await conta(supplierArea)).toBe(5);
    expect(await conta(supplierQuestion)).toBe(37);
    // 5 governo + 9 ambiente + 9 sociale + 8 etica + 6 filiera.
    const domande = await db.select().from(supplierQuestion);
    const per = (a: string) => domande.filter((q) => q.areaKey === a).length;
    expect([per("base"), per("env"), per("soc"), per("eth"), per("proc")]).toEqual([5, 9, 9, 8, 6]);
  });

  it("le aree supplier hanno i pesi del motore e sommano a cento", async () => {
    const aree = await db.select().from(supplierArea);
    expect(Object.fromEntries(aree.map((a) => [a.key, a.peso]))).toEqual(AREE_PESI);
    expect(aree.reduce((s2, a) => s2 + a.peso, 0)).toBe(100);
  });

  it("ogni domanda supplier ha peso, riferimento, evidenza e area esistente", async () => {
    const aree = new Set((await db.select().from(supplierArea)).map((a) => a.key));
    const giorniAttesi: Record<number, number> = { 3: 10, 2: 6, 1: 3 };
    for (const q of await db.select().from(supplierQuestion)) {
      expect(aree.has(q.areaKey), `${q.key}→${q.areaKey}`).toBe(true);
      expect([1, 2, 3], `${q.key}: peso`).toContain(q.peso);
      expect(q.testo, `${q.key}: testo`).toBeTruthy();
      expect(q.riferimento, `${q.key}: riferimento normativo`).toBeTruthy();
      expect(q.evidenzaAttesa, `${q.key}: evidenza documentale`).toBeTruthy();
      // I giorni stimati derivano dal peso: se divergessero, il piano
      // ordinerebbe le lacune con un impegno che nessuno ha dichiarato.
      expect(q.giorniStimati, `${q.key}: giornate`).toBe(giorniAttesi[q.peso]);
    }
  });

  it("i cataloghi dei quattro domini restano separati", async () => {
    // narrative_template e rating_scale ospitano più domini: una query che
    // dimenticasse il filtro su set_id restituirebbe capitoli di un altro modulo.
    const perSet = (rows: { setId: string }[], set: string) => rows.filter((r) => r.setId === set).length;
    const templates = await db.select().from(narrativeTemplate);
    expect(perSet(templates, "report-v1")).toBe(7);
    expect(perSet(templates, "energy-v1")).toBe(7);
    const scale = await db.select().from(ratingScale);
    expect(perSet(scale, "energy-v1")).toBe(1);
    expect(perSet(scale, "supplier-v1")).toBe(1);
  });

  it("ogni uso finale ha una guida completa e un'area esistente", async () => {
    const aree = new Set((await db.select().from(energyArea)).map((a) => a.key));
    const usi = await db.select().from(energyEndUse);
    for (const u of usi) {
      expect(aree.has(u.areaKey as "P" | "A" | "G" | "T"), `${u.key}→${u.areaKey}`).toBe(true);
      const g = u.guida as { def?: string; come?: string[]; stima?: string; flag?: string; ev?: string };
      expect(g.def, `${u.key}: definizione`).toBeTruthy();
      expect(g.come?.length, `${u.key}: modi di determinazione`).toBeGreaterThanOrEqual(2);
      expect(g.stima, `${u.key}: formula di stima`).toBeTruthy();
      expect(g.flag, `${u.key}: errore ricorrente`).toBeTruthy();
      expect(g.ev, `${u.key}: evidenze`).toBeTruthy();
    }
  });

  it("ogni indicatore seminato ha una formula nel motore, e viceversa", async () => {
    // Il catalogo porta le etichette, il motore le formule: se divergono, un
    // indicatore comparirebbe nel documento senza mai essere calcolato.
    const catalogo = (await db.select().from(energyIndicator)).map((i) => i.key).sort();
    expect(catalogo).toEqual([...INDICATORI_KEYS].sort());
  });

  it("i vettori energetici portano i tre fattori di conversione", async () => {
    const vettori = await db.select().from(energyVector);
    for (const v of vettori) {
      expect(v.kwhUnita, `${v.key}: potere calorifico`).toBeTruthy();
      expect(v.tepUnita, `${v.key}: energia primaria`).toBeTruthy();
      expect(v.feUnita !== null, `${v.key}: fattore di emissione`).toBe(true);
    }
    const [ele] = vettori.filter((v) => v.key === "ele");
    expect(ele.feUnita).toBe("0.2565");
    expect(ele.feMarket).toBe("0.4570"); // residual mix, solo sull'elettricità
    const [go] = vettori.filter((v) => v.key === "ele_go");
    expect(go.sub).toBe(true); // dettaglio di 'ele': fuori dai totali
    const [gas] = vettori.filter((v) => v.key === "gas");
    expect(gas.kwhUnita).toBe("9.72");
  });

  it("i contenuti campione sono fedeli al prototipo", async () => {
    const [gas] = await db.select().from(emissionFactor).where(eq(emissionFactor.key, "gas_smc"));
    expect(gas.nome).toBe("Gas naturale");
    expect(gas.fe).toBe("1.9755");
    const [t01] = await db.select().from(materialityTopic).where(eq(materialityTopic.key, "T01"));
    expect(t01.nome).toBe("Cambiamento climatico ed emissioni");
    expect((t01.guida as { imp: string[] }).imp).toHaveLength(3);
    const [sf6] = await db.select().from(emissionFactor).where(eq(emissionFactor.key, "sf6"));
    expect(sf6.fe).toBe("23500"); // GWP SF6 — il valore più estremo della libreria
  });

  it("ogni sorgente appartiene a una categoria esistente", async () => {
    const cats = new Set((await db.select().from(ghgCategory)).map((c) => c.key));
    const srcs = await db.select().from(ghgSourceType);
    for (const s of srcs) expect(cats.has(s.categoryKey), `${s.key}→${s.categoryKey}`).toBe(true);
  });
});
