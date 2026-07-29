import { describe, it, expect } from "vitest";
import { computeInventory } from "@/lib/calc/ghg/totals";
import { computeIntensity } from "@/lib/calc/ghg/intensity";
import type { InventoryRowInput } from "@/lib/calc/ghg/totals";

// Scenario golden derivato applicando a mano le formule del prototipo (calc()):
//  r1 cat1 gas naturale   12.500 Smc × 1,9755 → 24,69375 t · F(5%)  → tinc 1,2346875
//  r2 cat2 elettricità    100.000 kWh × 0,2565 → 25,65 t loc · GO 40.000, residual 0,457 → 27,42 t mkt · M(2%) → tinc 0,513
//  r3 cat1 pellet         10.000 kg × 0,016 → 0,16 t + biogenica 18,3 t · C(10%) → tinc 0,016
//  r4 cat1 R410A          12 kg × 2088 → 25,056 t · S(30%) → tinc 7,5168
const ROWS: InventoryRowInput[] = [
  { id: "r1", categoryKey: "1", sourceTypeKey: "1a", descrizione: "Gas naturale", quantita: "12500", fe: "1.9755", dq: "F" },
  { id: "r2", categoryKey: "2", sourceTypeKey: "2a", descrizione: "Energia elettrica", quantita: "100000", fe: "0.2565", feMarket: "0.457", quotaGo: "40000", dq: "M" },
  { id: "r3", categoryKey: "1", sourceTypeKey: "1a", descrizione: "Pellet", quantita: "10000", fe: "0.016", feBiogenic: "1.83", dq: "C" },
  { id: "r4", categoryKey: "1", sourceTypeKey: "1c", descrizione: "R410A", quantita: "12", fe: "2088", dq: "S" },
];

describe("computeInventory — golden prototipo", () => {
  const c = computeInventory(ROWS);

  it("totali per scope: s1, s2 location e market, s3", () => {
    expect(c.s1.toString()).toBe("49.90975");
    expect(c.s2l.toString()).toBe("25.65");
    expect(c.s2m.toString()).toBe("27.42");
    expect(c.s3.isZero()).toBe(true);
  });

  it("totale location e market-based", () => {
    expect(c.totL.toString()).toBe("75.55975");
    expect(c.totM.toString()).toBe("77.32975");
  });

  it("CO2 biogenica fuori dai totali, riportata a parte", () => {
    expect(c.bio.toString()).toBe("18.3");
    expect(c.totL.plus(c.bio).toString()).not.toBe(c.totL.toString());
  });

  it("incertezza combinata in quadratura sul totale location", () => {
    // sqrt(1,2346875² + 0,513² + 0,016² + 7,5168²) / 75,55975 × 100 ≈ 10,10 %
    expect(c.incPct.toNumber()).toBeCloseTo(10.1, 1);
  });

  it("qualità media ponderata sulle emissioni", () => {
    // (4×24,69375 + 5×25,65 + 3×0,16 + 1×25,056) / 75,55975 ≈ 3,34
    expect(c.dqMedia.toNumber()).toBeCloseTo(3.34, 2);
  });

  it("aggregati per categoria: numeri di voci e totali", () => {
    expect(c.perCategoria["1"].n).toBe(3);
    expect(c.perCategoria["1"].t.toString()).toBe("49.90975");
    expect(c.perCategoria["2"].n).toBe(1);
    expect(c.perCategoria["2"].tM.toString()).toBe("27.42");
    expect(c.perCategoria["3"].n).toBe(0);
  });

  it("voci ordinate per rilevanza (top)", () => {
    expect(c.top.map((x) => x.id)).toEqual(["r2", "r4", "r1", "r3"]);
  });

  it("inventario vuoto: tutto a zero senza errori", () => {
    const v = computeInventory([]);
    expect(v.totL.isZero()).toBe(true);
    expect(v.incPct.isZero()).toBe(true);
    expect(v.dqMedia.isZero()).toBe(true);
  });
});

describe("computeIntensity", () => {
  const c = computeInventory(ROWS);
  it("per fatturato (tCO2e/M€), per addetto (kg/FTE), per unità di prodotto", () => {
    const i = computeIntensity(c.totL, { ricavi: "2500000", fte: "25", produzione: "1000" });
    expect(i.perFatturato!.toNumber()).toBeCloseTo(30.2239, 3); // 75,55975 / 2,5
    expect(i.perAddetto!.toNumber()).toBeCloseTo(3022.39, 1); // ×1000 / 25
    expect(i.perUnita!.toNumber()).toBeCloseTo(75.55975, 4); // ×1000 / 1000
  });
  it("denominatori assenti o zero → null, mai divisioni per zero", () => {
    const i = computeIntensity(c.totL, { ricavi: "", fte: "0", produzione: null });
    expect(i.perFatturato).toBeNull();
    expect(i.perAddetto).toBeNull();
    expect(i.perUnita).toBeNull();
  });
});
