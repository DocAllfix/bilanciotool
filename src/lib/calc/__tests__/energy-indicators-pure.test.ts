import { describe, expect, it } from "vitest";
import { dec } from "@/lib/calc/shared/decimal";
import { computeMonthly } from "@/lib/calc/energy/monthly";
import {
  INDICATORI, INDICATORI_KEYS, compareToBase, computeIndicators, driversDa,
  type BaseIndicatori,
} from "@/lib/calc/energy/indicators";
import { computeMeasures } from "@/lib/calc/energy/measures";
import { computeEnergyProgress } from "@/lib/calc/energy/progress";
import type { Fattori, VettoreDef } from "@/lib/calc/energy/vectors";

// Continuazione del golden "Fonderia di esempio". I valori attesi sono dichiarati
// nella narrativa del prototipo: consumo di base 1.344 MWh pari al 54% dell'elettrico,
// consumo specifico da 2.644 a 2.449 kWh/t (miglioramento 7,4%), programma di
// interventi da 656 MWh · 101 tep · 419.000 € di investimento · 93.870 €/anno.

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

describe("computeMonthly — golden Fonderia di esempio", () => {
  const mensili = new Map<string, string[]>([
    ["ele", ["196000", "192000", "205000", "198000", "201000", "193000", "158000", "112000", "197000", "206000", "213000", "209000"]],
    ["gas", ["24000", "22000", "19000", "14000", "11000", "10500", "10000", "6500", "11000", "15000", "20000", "23000"]],
  ]);
  const annui = new Map<string, string>([["ele", "2280000"], ["gas", "186000"]]);
  const m = computeMonthly(DEF, mensili, annui, FATTORI);

  it("i dodici mesi quadrano con il dato annuo", () => {
    expect(m.controlli.get("ele")!.sommaMesi.toString()).toBe("2280000");
    expect(m.controlli.get("gas")!.sommaMesi.toString()).toBe("186000");
    expect(m.controlli.get("ele")!.scostamentoPct!.toString()).toBe("0");
    expect(m.controlli.get("ele")!.ok).toBe(true);
  });

  it("separa le categorie e somma il totale mensile", () => {
    expect(m.perCategoria.E[0].toString()).toBe("196000");
    expect(m.perCategoria.T[0].toString()).toBe("233280"); // 24.000 Smc × 9,72
    expect(m.perMese[0].toString()).toBe("429280");
  });

  it("stima il consumo di base annualizzando il mese elettrico più basso", () => {
    // Agosto 112.000 kWh × 12 = 1.344.000, il 54% dei 2.490.000 kWh elettrici
    expect(m.consumoDiBase!.toString()).toBe("1344000");
    expect(m.consumoDiBase!.div(2490000).times(100).toDecimalPlaces(0).toString()).toBe("54");
  });

  it("non stima il consumo di base con meno di sei mesi valorizzati", () => {
    const pochi = new Map<string, string[]>([["ele", ["100", "200", "300", "", "", "", "", "", "", "", "", ""]]]);
    expect(computeMonthly(DEF, pochi, annui, FATTORI).consumoDiBase).toBeNull();
  });

  it("segnala uno scarto oltre la tolleranza: manca una bolletta", () => {
    const buco = new Map(mensili);
    buco.set("ele", [...mensili.get("ele")!.slice(0, 11), ""]); // dicembre mancante
    const m2 = computeMonthly(DEF, buco, annui, FATTORI);
    expect(m2.controlli.get("ele")!.ok).toBe(false);
    expect(m2.controlli.get("ele")!.scostamentoPct!.toDecimalPlaces(2).toString()).toBe("-9.17");
  });
});

describe("computeIndicators — golden Fonderia di esempio", () => {
  const base2025: BaseIndicatori = {
    kwh: dec("4531208"), tep: dec("641.7622"), co2: dec("1011.2442"), costo: dec("553640"),
    kwhE: dec("2490000"), kwhT: dec("1917828"), kwhM: dec("123380"),
  };
  const base2024: BaseIndicatori = {
    kwh: dec("4706363"), tep: dec("666.512"), co2: dec("1050"), costo: dec("616100"),
    kwhE: dec("2506000"), kwhT: dec("2070018"), kwhM: dec("130345"),
  };
  const driver2025 = driversDa({ prod: "1850", sup: "1200", suptot: "4800", vol: "28000", add: "42", ore: "4200", gg: "1034", fatt: "9600000" });
  const driver2024 = driversDa({ prod: "1780", sup: "1200", suptot: "4800", vol: "28000", add: "40", ore: "4100", gg: "1102", fatt: "8900000" });

  const i2025 = computeIndicators(base2025, driver2025);
  const i2024 = computeIndicators(base2024, driver2024);

  it("calcola il consumo specifico dichiarato nella narrativa", () => {
    expect(i2025.get("cs")!.toDecimalPlaces(0).toString()).toBe("2449"); // 2.449 kWh/t
    expect(i2024.get("cs")!.toDecimalPlaces(0).toString()).toBe("2644"); // 2.644 nell'anno base
  });

  it("il confronto con l'anno base riporta il miglioramento del 7,4%", () => {
    const c = compareToBase(i2025, i2024);
    expect(c.get("cs")!.variazionePct.toDecimalPlaces(1).toString()).toBe("-7.4");
    expect(c.get("cs")!.migliorato).toBe(true);
  });

  it("calcola gli altri indicatori", () => {
    expect(i2025.get("csm2")!.toDecimalPlaces(1).toString()).toBe("944"); // kWh/m²
    expect(i2025.get("csad")!.toDecimalPlaces(0).toString()).toBe("107886"); // kWh/addetto
    expect(i2025.get("cinc")!.toDecimalPlaces(2).toString()).toBe("5.77"); // % sul fatturato
    // termico normalizzato: kwhT / (volume × gradi giorno)
    expect(i2025.get("term")!.toDecimalPlaces(4).toString()).toBe("0.0662"); // 1.917.828 / (28.000 × 1.034)
  });

  it("restituisce null e non zero quando manca il denominatore", () => {
    const senza = computeIndicators(base2025, driversDa({}));
    for (const k of INDICATORI_KEYS) expect(senza.get(k)).toBeNull();
    // uno zero si leggerebbe come consumo specifico nullo, cioè un risultato ottimo
    expect(senza.get("cs")).not.toBe(0);
  });

  it("il confronto salta gli indicatori non calcolabili in entrambi gli anni", () => {
    const parziale = computeIndicators(base2024, driversDa({ prod: "1780" }));
    const c = compareToBase(i2025, parziale);
    expect(c.has("cs")).toBe(true);
    expect(c.has("csm2")).toBe(false); // manca la superficie nell'anno base
  });

  it("ogni indicatore del registro ha una formula", () => {
    expect(INDICATORI_KEYS).toHaveLength(10);
    for (const k of INDICATORI_KEYS) expect(typeof INDICATORI[k]).toBe("function");
  });
});

describe("computeMeasures — golden del programma di miglioramento", () => {
  const euroPerKwh = new Map([
    ["ele", dec("421800").div("2280000")],
    ["gas", dec("102300").div("1807920")],
  ]);
  const misure = [
    { vettoreKey: "ele", quantita: "42000", investimento: "38000", incentivo: "0" },
    { vettoreKey: "ele", quantita: "61000", investimento: "46000", incentivo: "0" },
    { vettoreKey: "ele", quantita: "74000", investimento: "28000", incentivo: "0" },
    { vettoreKey: "gas", quantita: "22000", investimento: "95000", incentivo: "18000" },
    { vettoreKey: "ele", quantita: "230000", investimento: "190000", incentivo: "0" },
    { vettoreKey: "ele", quantita: "35000", investimento: "22000", incentivo: "0" },
  ];
  const { righe, totali } = computeMeasures(misure, FATTORI, euroPerKwh, dec("4531208"));

  it("riproduce i totali dichiarati nella narrativa", () => {
    expect(totali.kwh.toString()).toBe("655840"); // 656 MWh
    expect(totali.tep.toDecimalPlaces(0).toString()).toBe("101"); // 101 tep
    expect(totali.investimento.toString()).toBe("419000"); // 419.000 €
    expect(totali.risparmioEuro.toDecimalPlaces(0).toString()).toBe("93870"); // 93.870 €/anno
    expect(totali.pctSulTotale.toDecimalPlaces(1).toString()).toBe("14.5"); // 14,5% del consumo
  });

  it("converte il risparmio nell'unità del vettore", () => {
    expect(righe[3].kwh.toString()).toBe("213840"); // 22.000 Smc × 9,72
  });

  it("scala l'investimento netto dell'incentivo atteso", () => {
    expect(righe[3].netto.toString()).toBe("77000"); // 95.000 − 18.000
    expect(righe[0].netto.toString()).toBe("38000"); // senza incentivo
  });

  it("calcola il tempo di ritorno sull'investimento netto", () => {
    // LED: 38.000 € / (42.000 kWh × 0,185 €/kWh)
    expect(righe[0].pbtAnni!.toDecimalPlaces(1).toString()).toBe("4.9");
  });

  it("restituisce null e non zero quando non c'è risparmio economico", () => {
    // Uno zero si leggerebbe come "ritorno immediato", il contrario del vero.
    const { righe: r } = computeMeasures(
      [{ vettoreKey: "ele", quantita: "0", investimento: "10000" }],
      FATTORI, euroPerKwh, dec("4531208"),
    );
    expect(r[0].pbtAnni).toBeNull();
  });

  it("non esplode su un vettore fuori catalogo", () => {
    const { totali: t } = computeMeasures(
      [{ vettoreKey: "boh", quantita: "100", investimento: "1" }],
      FATTORI, euroPerKwh, dec("4531208"),
    );
    expect(t.kwh.toString()).toBe("0");
    expect(t.quantificate).toBe(0);
  });
});

describe("computeEnergyProgress", () => {
  it("il percorso vuoto è a zero", () => {
    const p = computeEnergyProgress({
      profiloCompilati: 0, vettoriValorizzati: 0, vettoriConCosto: 0,
      vettoriQuadrati: 0, vettoriDaQuadrare: 0, usiAttivi: 0, usiConMetodo: 0,
      driverCompilati: 0, interventiCompleti: 0, capitoliScritti: 0, capitoliTotali: 7,
    });
    expect(p.totPct).toBe(0);
  });

  it("il percorso completo è al cento per cento", () => {
    const p = computeEnergyProgress({
      profiloCompilati: 7, vettoriValorizzati: 5, vettoriConCosto: 5,
      vettoriQuadrati: 5, vettoriDaQuadrare: 5, usiAttivi: 11, usiConMetodo: 11,
      driverCompilati: 8, interventiCompleti: 3, capitoliScritti: 7, capitoliTotali: 7,
    });
    expect(p.totPct).toBe(100);
  });

  it("inserire i consumi senza i costi vale metà del passo", () => {
    const p = computeEnergyProgress({
      profiloCompilati: 0, vettoriValorizzati: 5, vettoriConCosto: 0,
      vettoriQuadrati: 0, vettoriDaQuadrare: 5, usiAttivi: 0, usiConMetodo: 0,
      driverCompilati: 0, interventiCompleti: 0, capitoliScritti: 0, capitoliTotali: 7,
    });
    expect(p.s2).toBe(0.5);
  });

  it("la quadratura pesa più del metodo di determinazione", () => {
    const soloQuadratura = computeEnergyProgress({
      profiloCompilati: 0, vettoriValorizzati: 5, vettoriConCosto: 0,
      vettoriQuadrati: 5, vettoriDaQuadrare: 5, usiAttivi: 11, usiConMetodo: 0,
      driverCompilati: 0, interventiCompleti: 0, capitoliScritti: 0, capitoliTotali: 7,
    });
    expect(soloQuadratura.s3).toBeCloseTo(0.65, 5);
  });

  it("non supera il cento per cento con più interventi del previsto", () => {
    const p = computeEnergyProgress({
      profiloCompilati: 7, vettoriValorizzati: 1, vettoriConCosto: 1,
      vettoriQuadrati: 1, vettoriDaQuadrare: 1, usiAttivi: 1, usiConMetodo: 1,
      driverCompilati: 8, interventiCompleti: 12, capitoliScritti: 7, capitoliTotali: 7,
    });
    expect(p.s5).toBe(1);
    expect(p.totPct).toBe(100);
  });
});
