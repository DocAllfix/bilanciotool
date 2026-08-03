import { describe, expect, it } from "vitest";
import { computeAllocation, computeFlows, computeQuadratura, type Cella } from "@/lib/calc/energy/allocation";
import type { Fattori, VettoreDef, VettoreInput } from "@/lib/calc/energy/vectors";

// GOLDEN della ripartizione: stessa "Fonderia di esempio" del prototipo.
// I pesi per area sono verificabili sulla narrativa scritta nel prototipo, che
// dichiara due terzi alle attività principali, 14,8% ai servizi generali,
// 12,9% agli ausiliari, e il 63% ai soli forni (U01 + U02).

const DEF: VettoreDef[] = [
  { key: "ele", categoria: "E", rinnovabile: false, sub: false },
  { key: "ele_go", categoria: "E", rinnovabile: false, sub: true },
  { key: "fv", categoria: "E", rinnovabile: true, sub: false },
  { key: "gas", categoria: "T", rinnovabile: false, sub: false },
  { key: "gpl", categoria: "T", rinnovabile: false, sub: false },
  { key: "gasolio_t", categoria: "M", rinnovabile: false, sub: false },
];

const FATTORI = new Map<string, Fattori>([
  ["ele", { kwhUnita: "1", tepUnita: "0.000187", feUnita: "0.2565" }],
  ["ele_go", { kwhUnita: "1", tepUnita: "0.000187", feUnita: "0" }],
  ["fv", { kwhUnita: "1", tepUnita: "0.000187", feUnita: "0" }],
  ["gas", { kwhUnita: "9.72", tepUnita: "0.000836", feUnita: "1.9755" }],
  ["gpl", { kwhUnita: "12.78", tepUnita: "0.001099", feUnita: "2.9840" }],
  ["gasolio_t", { kwhUnita: "9.95", tepUnita: "0.000902", feUnita: "2.6870" }],
]);

const USI = [
  { key: "U01", areaKey: "P" as const }, { key: "U02", areaKey: "P" as const }, { key: "U03", areaKey: "P" as const },
  { key: "U07", areaKey: "A" as const }, { key: "U08", areaKey: "A" as const }, { key: "U10", areaKey: "A" as const },
  { key: "U13", areaKey: "G" as const }, { key: "U15", areaKey: "G" as const }, { key: "U16", areaKey: "G" as const },
  { key: "U19", areaKey: "T" as const }, { key: "U20", areaKey: "T" as const },
];

// Le quantità sono nell'unità del vettore, come nel prototipo.
const CELLE: Cella[] = [
  { usoKey: "U01", vettoreKey: "ele", quantita: "1140000" }, { usoKey: "U01", vettoreKey: "fv", quantita: "120000" },
  { usoKey: "U02", vettoreKey: "ele", quantita: "320000" }, { usoKey: "U02", vettoreKey: "gas", quantita: "131000" },
  { usoKey: "U03", vettoreKey: "ele", quantita: "155000" },
  { usoKey: "U07", vettoreKey: "ele", quantita: "205000" }, { usoKey: "U07", vettoreKey: "fv", quantita: "50000" },
  { usoKey: "U08", vettoreKey: "ele", quantita: "140000" },
  { usoKey: "U10", vettoreKey: "ele", quantita: "190000" },
  { usoKey: "U13", vettoreKey: "gas", quantita: "55000" },
  { usoKey: "U15", vettoreKey: "ele", quantita: "68000" }, { usoKey: "U15", vettoreKey: "fv", quantita: "40000" },
  { usoKey: "U16", vettoreKey: "ele", quantita: "26000" },
  { usoKey: "U19", vettoreKey: "ele", quantita: "36000" }, { usoKey: "U19", vettoreKey: "gpl", quantita: "8600" },
  { usoKey: "U20", vettoreKey: "gasolio_t", quantita: "12400" },
];

const INGRESSO: VettoreInput[] = [
  { vettoreKey: "ele", quantita: "2280000" },
  { vettoreKey: "ele_go", quantita: "760000" },
  { vettoreKey: "fv", quantita: "210000" },
  { vettoreKey: "gas", quantita: "186000" },
  { vettoreKey: "gpl", quantita: "8600" },
  { vettoreKey: "gasolio_t", quantita: "12400" },
];

const COSTI = new Map<string, string>([["ele", "0.185"], ["gas", "0.0566"]]);

describe("computeAllocation — golden Fonderia di esempio", () => {
  const a = computeAllocation(USI, CELLE, FATTORI, COSTI);

  it("converte ogni uso finale in kWh sommando i vettori che lo alimentano", () => {
    expect(a.perUso.get("U01")!.kwh.toString()).toBe("1260000"); // 1.140.000 ele + 120.000 fv
    expect(a.perUso.get("U02")!.kwh.toString()).toBe("1593320"); // 320.000 ele + 131.000 × 9,72
    expect(a.perUso.get("U13")!.kwh.toString()).toBe("534600"); // 55.000 Smc × 9,72
    expect(a.perUso.get("U19")!.kwh.toString()).toBe("145908"); // 36.000 ele + 8.600 × 12,78
    expect(a.perUso.get("U20")!.kwh.toString()).toBe("123380"); // 12.400 l × 9,95
  });

  it("aggrega per area funzionale riproducendo i pesi della narrativa", () => {
    expect(a.perArea.P.toString()).toBe("3008320");
    expect(a.perArea.A.toString()).toBe("585000");
    expect(a.perArea.G.toString()).toBe("668600");
    expect(a.perArea.T.toString()).toBe("269288");
    // due terzi alle attività principali, 12,9% agli ausiliari, 14,8% ai generali
    expect(a.perArea.P.div(a.kwhRipartito).times(100).toDecimalPlaces(1).toString()).toBe("66.4");
    expect(a.perArea.A.div(a.kwhRipartito).times(100).toDecimalPlaces(1).toString()).toBe("12.9");
    expect(a.perArea.G.div(a.kwhRipartito).times(100).toDecimalPlaces(1).toString()).toBe("14.8");
  });

  it("i due forni pesano il 63% del sito", () => {
    const forni = a.perUso.get("U01")!.kwh.plus(a.perUso.get("U02")!.kwh);
    expect(forni.div(a.kwhRipartito).times(100).toDecimalPlaces(1).toString()).toBe("63");
  });

  it("calcola la percentuale di ciascun uso sul ripartito", () => {
    expect(a.perUso.get("U02")!.pct.toDecimalPlaces(1).toString()).toBe("35.2");
    const somma = [...a.perUso.values()].reduce((s, u) => s.plus(u.pct), a.perUso.get("U01")!.pct.times(0));
    expect(somma.toDecimalPlaces(6).toString()).toBe("100");
  });

  it("valorizza il costo di ciascun uso dal costo unitario del vettore", () => {
    // U13 è solo gas: 55.000 Smc × 9,72 kWh × 0,0566 €/kWh
    expect(a.perUso.get("U13")!.costo.toDecimalPlaces(2).toString()).toBe("30258.36");
  });

  it("non produce NaN quando non c'è nulla di ripartito", () => {
    const vuota = computeAllocation(USI, [], FATTORI, COSTI);
    expect(vuota.kwhRipartito.toString()).toBe("0");
    expect(vuota.coperturaPct.toString()).toBe("0");
    expect(vuota.perUso.get("U01")!.pct.toString()).toBe("0");
  });

  it("ignora le celle che puntano a usi o vettori inesistenti", () => {
    const sporca = computeAllocation(
      USI,
      [...CELLE, { usoKey: "U99", vettoreKey: "ele", quantita: "999" }, { usoKey: "U01", vettoreKey: "boh", quantita: "999" }],
      FATTORI,
      COSTI,
    );
    expect(sporca.kwhRipartito.toString()).toBe("4531208");
  });
});

describe("computeQuadratura — il controllo che regge tutto il documento", () => {
  const q = computeQuadratura(DEF, INGRESSO, CELLE, FATTORI);

  it("chiude a zero su tutti i vettori del dataset golden", () => {
    // La narrativa del prototipo dichiara residuo nullo su tutti e cinque i vettori.
    for (const k of ["ele", "fv", "gas", "gpl", "gasolio_t"]) {
      expect(q.perVettore.get(k)!.residuo.toString()).toBe("0");
      expect(q.perVettore.get(k)!.ok).toBe(true);
    }
    expect(q.valutati).toBe(5);
    expect(q.ok).toBe(5);
    expect(q.pct.toString()).toBe("100");
  });

  it("confronta QUANTITÀ e non kWh, quindi è immune ai cambi di fattore", () => {
    const altroFattore = new Map(FATTORI);
    altroFattore.set("gas", { kwhUnita: "11.5", tepUnita: "0.000836", feUnita: "1.9755" });
    const q2 = computeQuadratura(DEF, INGRESSO, CELLE, altroFattore);
    // Cambiare il potere calorifico sposta i kWh ma non può rompere la quadratura
    // di un esercizio già chiuso: è la ragione per cui le celle sono in unità di vettore.
    expect(q2.perVettore.get("gas")!.residuo.toString()).toBe("0");
  });

  it("segnala un residuo positivo quando manca un'utenza", () => {
    const parziale = CELLE.filter((c) => c.usoKey !== "U10"); // tolta la ventilazione
    const q3 = computeQuadratura(DEF, INGRESSO, parziale, FATTORI);
    const ele = q3.perVettore.get("ele")!;
    expect(ele.residuo.toString()).toBe("190000");
    expect(ele.ok).toBe(false);
    expect(ele.scostamentoPct.toDecimalPlaces(2).toString()).toBe("8.33");
  });

  it("segnala un residuo negativo quando la stessa energia è contata due volte", () => {
    const doppia = [...CELLE, { usoKey: "U03", vettoreKey: "ele", quantita: "100000" }];
    const q4 = computeQuadratura(DEF, INGRESSO, doppia, FATTORI);
    expect(q4.perVettore.get("ele")!.residuo.toString()).toBe("-100000");
    expect(q4.perVettore.get("ele")!.ok).toBe(false);
  });

  it("tollera uno scostamento entro il 2 per cento", () => {
    const quasi = CELLE.map((c) =>
      c.usoKey === "U03" && c.vettoreKey === "ele" ? { ...c, quantita: "125000" } : c,
    ); // 30.000 kWh in meno su 2.280.000 = 1,32%
    const q5 = computeQuadratura(DEF, INGRESSO, quasi, FATTORI);
    expect(q5.perVettore.get("ele")!.ok).toBe(true);
  });

  it("considera attivo un vettore ripartito anche senza dato di ingresso", () => {
    const q6 = computeQuadratura(DEF, [], CELLE, FATTORI);
    const ele = q6.perVettore.get("ele")!;
    expect(ele.attivo).toBe(true);
    expect(ele.ok).toBe(false); // c'è energia attribuita che non risulta entrata
  });

  it("non considera attivi i vettori né entrati né ripartiti", () => {
    expect(computeQuadratura(DEF, [], [], FATTORI).valutati).toBe(0);
  });
});

describe("computeFlows — matrice per il diagramma di flusso", () => {
  it("aggrega i flussi da ciascun vettore verso le aree funzionali", () => {
    const flussi = computeFlows(USI, CELLE, FATTORI);
    const eleP = flussi.find((f) => f.vettoreKey === "ele" && f.areaKey === "P")!;
    expect(eleP.kwh.toString()).toBe("1615000"); // 1.140.000 + 320.000 + 155.000
    const gasG = flussi.find((f) => f.vettoreKey === "gas" && f.areaKey === "G")!;
    expect(gasG.kwh.toString()).toBe("534600");
    // nessun flusso a zero: il diagramma non deve disegnare archi invisibili
    expect(flussi.every((f) => f.kwh.gt(0))).toBe(true);
  });

  it("la somma dei flussi è l'energia ripartita", () => {
    const flussi = computeFlows(USI, CELLE, FATTORI);
    const tot = flussi.reduce((s, f) => s.plus(f.kwh), flussi[0].kwh.times(0));
    expect(tot.toString()).toBe("4531208");
  });
});
