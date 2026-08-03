import { describe, expect, it } from "vitest";
import { computeVectors, type Fattori, type VettoreDef, type VettoreInput } from "@/lib/calc/energy/vectors";
import { computeEnergyEmissions } from "@/lib/calc/energy/emissions";

// GOLDEN del modulo energetico: dataset "Fonderia di esempio S.r.l." del prototipo
// (archivio/bilancio-energetico-v1.html, funzione init()). I totali attesi sono
// verificabili sulla narrativa scritta dentro il prototipo stesso, che dichiara
// 4.531 MWh, 642 tep, 553.640 € di spesa e 0,122 €/kWh di costo medio.

const DEF: VettoreDef[] = [
  { key: "ele", categoria: "E", rinnovabile: false, sub: false },
  { key: "ele_go", categoria: "E", rinnovabile: false, sub: true },
  { key: "fv", categoria: "E", rinnovabile: true, sub: false },
  { key: "gas", categoria: "T", rinnovabile: false, sub: false },
  { key: "gasolio", categoria: "T", rinnovabile: false, sub: false },
  { key: "gpl", categoria: "T", rinnovabile: false, sub: false },
  { key: "biomassa", categoria: "T", rinnovabile: true, sub: false },
  { key: "tlr", categoria: "T", rinnovabile: false, sub: false },
  { key: "vapore", categoria: "T", rinnovabile: false, sub: false },
  { key: "gasolio_t", categoria: "M", rinnovabile: false, sub: false },
];

const FATTORI = new Map<string, Fattori>([
  ["ele", { kwhUnita: "1", tepUnita: "0.000187", feUnita: "0.2565", feMarket: "0.4570" }],
  ["ele_go", { kwhUnita: "1", tepUnita: "0.000187", feUnita: "0" }],
  ["fv", { kwhUnita: "1", tepUnita: "0.000187", feUnita: "0" }],
  ["gas", { kwhUnita: "9.72", tepUnita: "0.000836", feUnita: "1.9755" }],
  ["gasolio", { kwhUnita: "9.95", tepUnita: "0.000902", feUnita: "2.6870" }],
  ["gpl", { kwhUnita: "12.78", tepUnita: "0.001099", feUnita: "2.9840" }],
  ["biomassa", { kwhUnita: "3500", tepUnita: "0.301", feUnita: "0" }],
  ["tlr", { kwhUnita: "1", tepUnita: "0.000086", feUnita: "0.2000" }],
  ["vapore", { kwhUnita: "750", tepUnita: "0.0645", feUnita: "0.2100" }],
  ["gasolio_t", { kwhUnita: "9.95", tepUnita: "0.000902", feUnita: "2.6870" }],
]);

// Consumi e costi dell'esercizio nel seed del prototipo.
const INPUT: VettoreInput[] = [
  { vettoreKey: "ele", quantita: "2280000", costo: "421800" },
  { vettoreKey: "ele_go", quantita: "760000" },
  { vettoreKey: "fv", quantita: "210000", costo: "0" },
  { vettoreKey: "gas", quantita: "186000", costo: "102300" },
  { vettoreKey: "gpl", quantita: "8600", costo: "10320" },
  { vettoreKey: "gasolio_t", quantita: "12400", costo: "19220" },
];

describe("computeVectors — golden Fonderia di esempio", () => {
  const { perVettore, totali } = computeVectors(DEF, INPUT, FATTORI);

  it("converte ogni vettore in energia finale, primaria ed emissioni", () => {
    // ele: 2.280.000 × 1 kWh · × 0,000187 tep · × 0,2565/1000 t
    expect(perVettore.get("ele")!.kwh.toString()).toBe("2280000");
    expect(perVettore.get("ele")!.tep.toString()).toBe("426.36");
    expect(perVettore.get("ele")!.co2.toString()).toBe("584.82");
    // gas: 186.000 Smc × 9,72
    expect(perVettore.get("gas")!.kwh.toString()).toBe("1807920");
    expect(perVettore.get("gas")!.tep.toString()).toBe("155.496");
    expect(perVettore.get("gas")!.co2.toString()).toBe("367.443");
    // gpl: 8.600 kg × 12,78
    expect(perVettore.get("gpl")!.kwh.toString()).toBe("109908");
    // gasolio autotrazione: 12.400 l × 9,95
    expect(perVettore.get("gasolio_t")!.kwh.toString()).toBe("123380");
  });

  it("esclude dai totali il vettore sub (garanzie d'origine), che è un dettaglio di 'ele'", () => {
    // 2.280.000 + 210.000 + 1.807.920 + 109.908 + 123.380. Se ele_go entrasse
    // nei totali, l'energia elettrica risulterebbe contata due volte.
    expect(totali.kwh.toString()).toBe("4531208");
    expect(perVettore.has("ele_go")).toBe(false);
  });

  it("riproduce i totali dichiarati nella narrativa del prototipo", () => {
    expect(totali.kwh.div(1000).toDecimalPlaces(0).toString()).toBe("4531"); // 4.531 MWh
    expect(totali.tep.toDecimalPlaces(0).toString()).toBe("642"); // 642 tep
    expect(totali.costo.toString()).toBe("553640"); // 553.640 €
    expect(totali.euroPerKwh.toDecimalPlaces(3).toString()).toBe("0.122"); // 0,122 €/kWh
  });

  it("ripartisce l'energia per categoria", () => {
    expect(totali.kwhE.toString()).toBe("2490000"); // ele + fv
    expect(totali.kwhT.toString()).toBe("1917828"); // gas + gpl
    expect(totali.kwhM.toString()).toBe("123380"); // gasolio autotrazione
    expect(totali.kwhE.plus(totali.kwhT).plus(totali.kwhM).toString()).toBe(totali.kwh.toString());
  });

  it("converte in gigajoule", () => {
    expect(totali.gj.toDecimalPlaces(1).toString()).toBe("16312.3"); // 4.531.208 × 0,0036
  });

  it("calcola il costo unitario per vettore e lo azzera dove non c'è energia", () => {
    // 421.800 € / 2.280.000 kWh
    expect(perVettore.get("ele")!.euroPerKwh.toDecimalPlaces(6).toString()).toBe("0.185");
    // il fotovoltaico autoconsumato ha costo zero: nessuna divisione per zero
    expect(perVettore.get("fv")!.euroPerKwh.toString()).toBe("0");
  });

  it("non esplode su input assenti o sporchi", () => {
    const { totali: vuoti } = computeVectors(DEF, [], FATTORI);
    expect(vuoti.kwh.toString()).toBe("0");
    expect(vuoti.euroPerKwh.toString()).toBe("0"); // niente NaN da 0/0
    const { totali: sporchi } = computeVectors(
      DEF,
      [{ vettoreKey: "gas", quantita: "1.234,56", costo: null }],
      FATTORI,
    );
    expect(sporchi.kwh.toString()).toBe("11999.9232"); // 1.234,56 Smc × 9,72
  });

  it("ignora i vettori senza definizione nel catalogo", () => {
    const { totali: t } = computeVectors(DEF, [{ vettoreKey: "inesistente", quantita: "999" }], FATTORI);
    expect(t.kwh.toString()).toBe("0");
  });
});

describe("computeEnergyEmissions — golden Fonderia di esempio", () => {
  const e = computeEnergyEmissions(DEF, INPUT, FATTORI, "0.4570");

  it("attribuisce i combustibili allo Scope 1", () => {
    // gas 367,443 + gpl 25,6624 + gasolio autotrazione 33,3188
    expect(e.scope1.toString()).toBe("426.4242");
  });

  it("attribuisce l'elettricità prelevata allo Scope 2 location", () => {
    expect(e.scope2Location.toString()).toBe("584.82");
  });

  it("calcola lo Scope 2 market sulla sola quota non coperta da garanzie d'origine", () => {
    // (2.280.000 − 760.000) × 0,4570 / 1000
    expect(e.scope2Market.toString()).toBe("694.64");
    expect(e.goCoperte.toString()).toBe("760000");
  });

  it("non produce market negativo se le garanzie superano il prelievo", () => {
    const oltre = computeEnergyEmissions(
      DEF,
      [{ vettoreKey: "ele", quantita: "1000" }, { vettoreKey: "ele_go", quantita: "5000" }],
      FATTORI,
      "0.4570",
    );
    expect(oltre.scope2Market.toString()).toBe("0");
    expect(oltre.goCoperte.toString()).toBe("1000"); // limitate al prelievo reale
  });

  it("somma Scope 1 e Scope 2 location nel totale", () => {
    expect(e.totLocation.toString()).toBe("1011.2442");
  });

  it("tratta le emissioni della biomassa come biogeniche (fuori dal totale diretto)", () => {
    const b = computeEnergyEmissions(DEF, [{ vettoreKey: "biomassa", quantita: "100" }], FATTORI, "0.4570");
    expect(b.scope1.toString()).toBe("0");
  });

  it("classifica calore e vapore acquistati in Scope 2, non in Scope 1", () => {
    // SCOSTAMENTO VOLUTO dal prototipo, che li metteva in Scope 1.
    // Teleriscaldamento e vapore sono energia importata: categoria 2 della
    // ISO 14064-1 e Scope 2 del GHG Protocol. Lasciarli in Scope 1 farebbe
    // divergere questo documento dall'inventario GHG della stessa azienda.
    const t = computeEnergyEmissions(
      DEF,
      [{ vettoreKey: "tlr", quantita: "100000" }, { vettoreKey: "vapore", quantita: "50" }],
      FATTORI,
      "0.4570",
    );
    expect(t.scope1.toString()).toBe("0");
    // tlr 100.000 × 0,2/1000 = 20 · vapore 50 × 0,21/1000 = 0,0105
    expect(t.scope2Location.toString()).toBe("20.0105");
  });
});
