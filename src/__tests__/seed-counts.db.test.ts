import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { count, eq } from "drizzle-orm";
import {
  contentSet, ghgCategory, ghgSourceType, emissionFactor, gwpSet,
  checklistRequirement, materialityTopic, kpiSection, kpiDefinition,
  ratingScale, narrativeTemplate, atecoSuggestion,
  energyVector, energyArea, energyEndUse, energyDriverDefinition, energyIndicator,
  supplierArea, supplierQuestion,
  soaFramework, soaSection, soaControl,
  briberyChapter, briberyRequirement, briberyDimension, briberyFlag,
  mogFamily, mogCrime, mogPillar, mogRequirement,
} from "@/lib/db/schema";
import { INDICATORI_KEYS } from "@/lib/calc/energy/indicators";
import { AREE_PESI } from "@/lib/calc/supplier/scoring";
import { VALORE_STATO } from "@/lib/calc/soa/scoring";

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
    // Cinque moduli in produzione piu' i sei di conformita': un content set per
    // dominio, cosi' la versione del corpus di ciascuno si congela da sola.
    expect(await conta(contentSet)).toBe(11);
    expect(await conta(ghgCategory)).toBe(6);
    expect(await conta(ghgSourceType)).toBe(25);
    expect(await conta(emissionFactor)).toBe(59);
    expect(await conta(gwpSet)).toBe(3);
    expect(await conta(checklistRequirement)).toBe(15);
    expect(await conta(materialityTopic)).toBe(18);
    expect(await conta(kpiSection)).toBe(8);
    expect(await conta(kpiDefinition)).toBe(49);
    // dq + imp + fin + energy:metodo + supplier:fascia + soa:stato/motivazione/fascia
    expect(await conta(ratingScale)).toBe(8);
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

  it("conteggi esatti del modulo SoA", async () => {
    expect(await conta(soaFramework)).toBe(5);
    expect(await conta(soaSection)).toBe(21);
    expect(await conta(soaControl)).toBe(174);
    // 93 (27001) + 7 (27017) + 25 (27018) + 31 (27701-A) + 18 (27701-B).
    const controlli = await db.select().from(soaControl);
    const per = (f: string) => controlli.filter((c) => c.frameworkKey === f).length;
    expect([per("27001"), per("27017"), per("27018"), per("27701A"), per("27701B")])
      .toEqual([93, 7, 25, 31, 18]);
    // 61 controlli cardine: quelli che un organismo di certificazione guarda per primi.
    expect(controlli.filter((c) => c.cardine).length).toBe(61);
  });

  it("solo la 27001 è sempre in ambito", async () => {
    const quadri = await db.select().from(soaFramework);
    expect(quadri.filter((f) => f.sempreInAmbito).map((f) => f.key)).toEqual(["27001"]);
  });

  it("ogni controllo SoA ha titolo, evidenza e una sezione del proprio quadro", async () => {
    const sezioni = new Map((await db.select().from(soaSection)).map((s2) => [s2.key, s2.frameworkKey]));
    for (const c of await db.select().from(soaControl)) {
      expect(sezioni.get(c.sectionKey), `${c.controlloId}→${c.sectionKey}`).toBe(c.frameworkKey);
      expect(c.titolo, `${c.controlloId}: titolo`).toBeTruthy();
      expect(c.evidenzaAttesa, `${c.controlloId}: evidenza attesa`).toBeTruthy();
    }
  });

  it("gli stati seminati hanno i valori di maturità del motore", async () => {
    const [scala] = (await db.select().from(ratingScale)).filter((r) => r.setId === "soa-v1" && r.key === "stato");
    const livelli = scala.livelli as Record<string, { v: number }>;
    expect(Object.fromEntries(Object.entries(livelli).map(([k, v]) => [k, v.v]))).toEqual(VALORE_STATO);
  });

  it("i cataloghi dei cinque domini restano separati", async () => {
    // narrative_template e rating_scale ospitano più domini: una query che
    // dimenticasse il filtro su set_id restituirebbe capitoli di un altro modulo.
    const perSet = (rows: { setId: string }[], set: string) => rows.filter((r) => r.setId === set).length;
    const templates = await db.select().from(narrativeTemplate);
    expect(perSet(templates, "report-v1")).toBe(7);
    expect(perSet(templates, "energy-v1")).toBe(7);
    const scale = await db.select().from(ratingScale);
    expect(perSet(scale, "energy-v1")).toBe(1);
    expect(perSet(scale, "supplier-v1")).toBe(1);
    expect(perSet(scale, "soa-v1")).toBe(3);
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

  it("i cataloghi di ISO 37001 hanno i conteggi del prototipo", async () => {
    expect(await conta(briberyChapter)).toBe(7);
    expect(await conta(briberyRequirement)).toBe(91);
    expect(await conta(briberyDimension)).toBe(4);
    expect(await conta(briberyFlag)).toBe(6);
  });

  it("ogni requisito ISO 37001 appartiene a un capitolo esistente", async () => {
    const capi = new Set((await db.select().from(briberyChapter)).map((c) => c.key));
    for (const r of await db.select().from(briberyRequirement)) {
      expect(capi.has(r.chapterKey), `${r.key} rimanda al capitolo ${r.chapterKey}`).toBe(true);
    }
  });

  it("ogni dimensione del rischio ha quattro gradini descritti", async () => {
    // Non e' pignoleria: la media si fa su una scala 1÷4, e una dimensione con tre
    // gradini darebbe un livello di rischio che non corrisponde a nessuna descrizione.
    for (const d of await db.select().from(briberyDimension)) {
      expect((d.scala as string[]).length, `${d.key}`).toBe(4);
      for (const gradino of d.scala as string[]) expect(gradino.length).toBeGreaterThan(10);
    }
  });

  it("i cataloghi del Modello 231 hanno i conteggi del prototipo", async () => {
    expect(await conta(mogFamily)).toBe(10);
    expect(await conta(mogCrime)).toBe(25);
    expect(await conta(mogPillar)).toBe(10);
    expect(await conta(mogRequirement)).toBe(81);
  });

  it("ogni reato appartiene a una famiglia esistente, e ogni requisito a un pilastro", async () => {
    const fam = new Set((await db.select().from(mogFamily)).map((f) => f.key));
    for (const r of await db.select().from(mogCrime)) {
      expect(fam.has(r.familyKey), `${r.key} rimanda alla famiglia ${r.familyKey}`).toBe(true);
    }
    const pil = new Set((await db.select().from(mogPillar)).map((p) => p.key));
    for (const r of await db.select().from(mogRequirement)) {
      expect(pil.has(r.pillarKey), `${r.key} rimanda al pilastro ${r.pillarKey}`).toBe(true);
    }
  });

  it("ogni sorgente appartiene a una categoria esistente", async () => {
    const cats = new Set((await db.select().from(ghgCategory)).map((c) => c.key));
    const srcs = await db.select().from(ghgSourceType);
    for (const s of srcs) expect(cats.has(s.categoryKey), `${s.key}→${s.categoryKey}`).toBe(true);
  });
});
