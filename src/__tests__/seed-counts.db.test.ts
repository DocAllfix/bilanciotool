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
  wbChapter, wbRequirement,
  sgesgPhaseDef,
  sgesgSchedaDef,
  nis2Chapter, nis2Level, nis2Requirement, nis2Control, nis2Phase,
  nis2IndicatorDef, nis2Sector, nis2Criterion,
} from "@/lib/db/schema";
import { INDICATORI_KEYS } from "@/lib/calc/energy/indicators";
import { AREE_PESI } from "@/lib/calc/supplier/scoring";
import { VALORE_STATO } from "@/lib/calc/soa/scoring";
import { CLASSE_DEL_CRITERIO } from "@/lib/calc/nis2/ambito";
import { LIVELLI } from "@/lib/calc/nis2/conformita";

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
    // Un content set per dominio, cosi' la versione dei contenuti di ciascuno si
    // congela da sola. Dal 25 agosto 2026 sono dodici: si aggiunge `sgesg`, le otto
    // fasi del metodo di implementazione del sistema di gestione ESG.
    // Dal 7 settembre 2026 sono TREDICI: si aggiunge `nis2-v1`, e uno solo per DUE
    // percorsi — il sistema di gestione contiene per intero l'autovalutazione, e due set
    // duplicherebbero 518 blocchi identici destinati a divergere.
    expect(await conta(contentSet)).toBe(13);
    // ⚠️ OTTO, e il numero non e' arrotondabile: `PROC-00`...`PROC-07`. Una fase in
    // meno significa un pezzo di metodo che nessuno compilera' perche' non compare.
    expect(await conta(sgesgPhaseDef)).toBe(8);
    // ⚠️ SESSANTATRE, ed e' il numero che il metodo d'origine ha: 7+8+8+8+7+8+9+8. Una
    // scheda in meno significa un pezzo di metodo che nessuno compilera' perche' non
    // compare, e l'estrattore che l'ha persa non lo direbbe da solo.
    expect(await conta(sgesgSchedaDef)).toBe(63);
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

  it("i cataloghi delle Segnalazioni hanno i conteggi del prototipo", async () => {
    // I capi sono dieci e vanno da A a L SENZA J e K: nel decreto non esistono, e
    // «dieci lettere consecutive» sarebbe la correzione ragionevole e sbagliata.
    expect(await conta(wbChapter)).toBe(10);
    expect(await conta(wbRequirement)).toBe(82);
    const lettere = (await db.select().from(wbChapter)).map((c) => c.key).sort();
    expect(lettere).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I", "L"]);
  });

  it("ogni requisito delle Segnalazioni rimanda a un capo e a un articolo", async () => {
    const capi = new Set((await db.select().from(wbChapter)).map((c) => c.key));
    for (const r of await db.select().from(wbRequirement)) {
      expect(capi.has(r.chapterKey), `${r.key} rimanda al capo ${r.chapterKey}`).toBe(true);
      // Il riferimento normativo è ciò che rende il requisito opponibile: un requisito
      // senza articolo è un'opinione, e in un documento che va a un organo di controllo
      // la differenza si vede.
      expect(r.riferimento.length, `${r.key} senza riferimento`).toBeGreaterThan(3);
    }
  });


  // ─────────────────────────────────────────────────────────────────── NIS2
  //
  // ⚠️ Un catalogo solo per due percorsi, e i conteggi sono la sola prova che la
  // partizione non si e' persa per strada. Con `perimetri` mal derivato i numeri
  // totali resterebbero identici mentre un percorso mostrerebbe i requisiti dell'altro.

  it("NIS2: i conteggi del catalogo", async () => {
    expect(await conta(nis2Chapter)).toBe(12);
    expect(await conta(nis2Level)).toBe(5);
    expect(await conta(nis2Requirement)).toBe(126);
    expect(await conta(nis2Control)).toBe(68);
    expect(await conta(nis2Phase)).toBe(5);
    expect(await conta(nis2IndicatorDef)).toBe(19);
    // 11 dell'Allegato I + 12 dell'Allegato II.
    expect(await conta(nis2Sector)).toBe(23);
    expect(await conta(nis2Criterion)).toBe(8);
  });

  it("NIS2: la partizione fra i due percorsi e' quella misurata sui prototipi", async () => {
    const req = await db.select().from(nis2Requirement);
    const soloSistema = req.filter((r) => !r.perimetri.includes("autovalutazione"));
    // ⚠️ DUE, e sono G.11 e G.12. Il sistema di gestione e' un sovrainsieme stretto:
    // se questo numero cresce senza che i prototipi siano cambiati, `perimetri` e'
    // stato derivato male e l'autovalutazione ha perso dei requisiti.
    expect(soloSistema.map((r) => r.key).sort()).toEqual(["G.11", "G.12"]);
    // E nessun requisito e' del solo percorso breve: sarebbe una contraddizione col
    // fatto che uno contiene l'altro.
    expect(req.filter((r) => !r.perimetri.includes("sistema"))).toHaveLength(0);
    // Nessun requisito fuori da entrambi: sarebbe seminato e invisibile.
    for (const r of req) expect(r.perimetri.length, `${r.key} senza perimetro`).toBeGreaterThan(0);
  });

  it("NIS2: ogni requisito e ogni controllo rimandano a un capo che esiste", async () => {
    const capi = new Set((await db.select().from(nis2Chapter)).map((c) => c.key));
    for (const r of await db.select().from(nis2Requirement)) {
      expect(capi.has(r.chapterKey), `${r.key} → ${r.chapterKey}`).toBe(true);
      // Il riferimento normativo e' cio' che rende il requisito opponibile.
      expect(r.rif.length, `${r.key} senza riferimento`).toBeGreaterThan(3);
    }
    for (const c of await db.select().from(nis2Control)) {
      expect(capi.has(c.chapterKey), `${c.key} → ${c.chapterKey}`).toBe(true);
      // ⚠️ Una frequenza a zero renderebbe il controllo perennemente «da verificare»,
      // e una negativa lo renderebbe scaduto il giorno stesso della verifica.
      expect(c.frequenzaGiorni, `${c.key} senza frequenza`).toBeGreaterThan(0);
    }
  });

  it("⚠️ NIS2: le cinque fasi coprono i dodici capi UNA VOLTA CIASCUNO", async () => {
    // Un capo in due fasi conterebbe due volte nell'avanzamento della roadmap; uno in
    // nessuna sparirebbe senza che niente lo dica. Si vede solo contando: nessuna
    // schermata mostra la copertura, e i totali resterebbero plausibili.
    const capi = (await db.select().from(nis2Chapter)).map((c) => c.key).sort();
    const coperti = (await db.select().from(nis2Phase)).flatMap((f) => f.capitoli).sort();
    expect(coperti).toEqual(capi);
  });

  it("⚠️ NIS2: catalogo e motore sono d'accordo sulla scala e sui criteri", async () => {
    // Sono le due cose che vivono in due posti per una ragione — le etichette nel
    // database perche' le legge chi compila, le regole nel motore perche' sono
    // eseguibili — e questo e' il punto in cui possono divergere in silenzio.
    const livelli = (await db.select().from(nis2Level)).sort((a, b) => a.valore - b.valore);
    expect(livelli.map((l) => l.valore)).toEqual(LIVELLI.map((l) => l.valore));
    expect(livelli.map((l) => l.percentuale)).toEqual(LIVELLI.map((l) => l.percentuale));

    for (const c of await db.select().from(nis2Criterion)) {
      const nelMotore = CLASSE_DEL_CRITERIO[c.key as keyof typeof CLASSE_DEL_CRITERIO];
      expect(nelMotore, `${c.key} sconosciuto al motore`).toBeTruthy();
      // ⚠️ Se il catalogo dicesse «essenziale» e il motore «importante», il documento
      // riporterebbe un tetto sanzionatorio e la schermata un altro.
      expect(c.classe, `${c.key}: catalogo dice ${c.classe}, motore dice ${nelMotore}`).toBe(nelMotore);
    }
  });

  it("NIS2: gli allegati non si sovrappongono", async () => {
    const settori = await db.select().from(nis2Sector);
    expect(settori.filter((s) => s.allegato === 1)).toHaveLength(11);
    expect(settori.filter((s) => s.allegato === 2)).toHaveLength(12);
    // Un settore in entrambi gli allegati darebbe una classificazione diversa a
    // seconda dell'ordine in cui si guardano, che e' il modo peggiore di sbagliare.
    expect(new Set(settori.map((s) => s.key)).size).toBe(23);
  });

  it("ogni sorgente appartiene a una categoria esistente", async () => {
    const cats = new Set((await db.select().from(ghgCategory)).map((c) => c.key));
    const srcs = await db.select().from(ghgSourceType);
    for (const s of srcs) expect(cats.has(s.categoryKey), `${s.key}→${s.categoryKey}`).toBe(true);
  });
});
