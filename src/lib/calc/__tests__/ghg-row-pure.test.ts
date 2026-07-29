import { describe, it, expect } from "vitest";
import { computeRow, DQ_LEVELS } from "@/lib/calc/ghg/row";

// Contratto: funzione riga() del prototipo gestionale-ghg-14064.html.
//   t   = q × fe ÷ 1000                                  [tCO2e]
//   tM  = cat 2: max(0, q − qGO) × feM ÷ 1000, else t    [market-based]
//   bio = q × feB ÷ 1000                                 [CO2 biogenica, fuori totale]
//   inc = incertezza esplicita, altrimenti default del livello dq
//   tinc = t × inc ÷ 100 (contributo assoluto per la quadratura)
//   dqp = punteggio qualità 5..1 (M,F,C,E,S)

describe("DQ_LEVELS — scala qualità del dato", () => {
  it("cinque livelli con incertezze di default 2/5/10/20/30 e punteggi 5..1", () => {
    expect(DQ_LEVELS.M).toMatchObject({ inc: "2", punti: 5 });
    expect(DQ_LEVELS.F).toMatchObject({ inc: "5", punti: 4 });
    expect(DQ_LEVELS.C).toMatchObject({ inc: "10", punti: 3 });
    expect(DQ_LEVELS.E).toMatchObject({ inc: "20", punti: 2 });
    expect(DQ_LEVELS.S).toMatchObject({ inc: "30", punti: 1 });
  });
});

describe("computeRow", () => {
  it("gas naturale: 12.500 Smc × 1,9755 = 24,69375 tCO2e (golden dal prototipo)", () => {
    const r = computeRow({ categoryKey: "1", quantita: "12500", fe: "1.9755", dq: "F" });
    expect(r.t.toString()).toBe("24.69375");
    expect(r.tM.toString()).toBe("24.69375"); // non-cat2: market = location
    expect(r.bio.isZero()).toBe(true);
    expect(r.inc.toString()).toBe("5"); // default F
    expect(r.tinc.toString()).toBe("1.2346875");
    expect(r.dqp).toBe(4);
  });

  it("cat 2 con GO: 100.000 kWh loc 0,2565, GO 40.000, residual 0,457", () => {
    const r = computeRow({
      categoryKey: "2",
      quantita: "100000",
      fe: "0.2565",
      feMarket: "0.457",
      quotaGo: "40000",
      dq: "M",
    });
    expect(r.t.toString()).toBe("25.65");
    expect(r.tM.toString()).toBe("27.42"); // (100000−40000)×0,457÷1000
  });

  it("cat 2: GO oltre il consumo → market-based zero, mai negativo", () => {
    const r = computeRow({ categoryKey: "2", quantita: "10000", fe: "0.2565", feMarket: "0.457", quotaGo: "50000", dq: "F" });
    expect(r.tM.isZero()).toBe(true);
  });

  it("cat 2 senza fattore market esplicito usa il fattore location (contratto prototipo)", () => {
    const r = computeRow({ categoryKey: "2", quantita: "1000", fe: "0.25", feMarket: null, dq: "F" });
    expect(r.tM.toString()).toBe("0.25");
  });

  it("biomassa: quota fossile nei totali, biogenica separata (pellet 10 t)", () => {
    const r = computeRow({ categoryKey: "1", quantita: "10000", fe: "0.016", feBiogenic: "1.83", dq: "C" });
    expect(r.t.toString()).toBe("0.16");
    expect(r.bio.toString()).toBe("18.3");
  });

  it("incertezza esplicita prevale sul default del livello", () => {
    const r = computeRow({ categoryKey: "1", quantita: "100", fe: "1", dq: "S", incertezza: "12" });
    expect(r.inc.toString()).toBe("12");
    expect(r.tinc.toString()).toBe("0.012"); // 0,1 t × 12%
  });

  it("input sporchi (virgole, vuoti) non esplodono mai", () => {
    const r = computeRow({ categoryKey: "1", quantita: "1.234,5", fe: "2,687", dq: "F", incertezza: "" });
    expect(r.t.toString()).toBe("3.3171015"); // 1234,5 × 2,687 ÷ 1000
    expect(r.inc.toString()).toBe("5");
  });
});
