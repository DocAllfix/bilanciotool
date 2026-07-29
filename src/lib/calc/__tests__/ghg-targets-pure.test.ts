import { describe, it, expect } from "vitest";
import { computeTargetProgress, baseVariationPct, scopeValue } from "@/lib/calc/ghg/targets";
import { computeInventory } from "@/lib/calc/ghg/totals";
import { dec } from "@/lib/calc/shared/decimal";

// Contratto prototipo (vObt): base per ambito dall'anno base, traguardo =
// base×(1−rid%), percorso compiuto = clamp((base−attuale)/(base−traguardo)×100, 0, 100).

const inv = computeInventory([
  { id: "a", categoryKey: "1", sourceTypeKey: "1a", quantita: "100000", fe: "1", dq: "F" }, // 100 t
  { id: "b", categoryKey: "2", sourceTypeKey: "2a", quantita: "50000", fe: "1", dq: "F" }, // 50 t
  { id: "c", categoryKey: "4", sourceTypeKey: "4a", quantita: "30000", fe: "1", dq: "F" }, // 30 t
]);

describe("scopeValue — valore per ambito obiettivo", () => {
  it("mappa 1, 2, 12, 3 e tot come il prototipo", () => {
    expect(scopeValue(inv, "1").toString()).toBe("100");
    expect(scopeValue(inv, "2").toString()).toBe("50");
    expect(scopeValue(inv, "12").toString()).toBe("150");
    expect(scopeValue(inv, "3").toString()).toBe("30");
    expect(scopeValue(inv, "tot").toString()).toBe("180");
  });
});

describe("computeTargetProgress", () => {
  it("riduzione 30% su base 100: attuale 85 → metà percorso", () => {
    const p = computeTargetProgress({ base: dec(100), attuale: dec(85), riduzionePct: "30" });
    expect(p.traguardo.toString()).toBe("70");
    expect(p.percorsoPct.toString()).toBe("50");
  });
  it("obiettivo già raggiunto o superato → 100, mai oltre", () => {
    const p = computeTargetProgress({ base: dec(100), attuale: dec(60), riduzionePct: "30" });
    expect(p.percorsoPct.toString()).toBe("100");
  });
  it("emissioni cresciute → 0, mai negativo", () => {
    const p = computeTargetProgress({ base: dec(100), attuale: dec(120), riduzionePct: "30" });
    expect(p.percorsoPct.toString()).toBe("0");
  });
  it("riduzione 0% (base=traguardo) → 0 senza divisione per zero", () => {
    const p = computeTargetProgress({ base: dec(100), attuale: dec(90), riduzionePct: "0" });
    expect(p.percorsoPct.toString()).toBe("0");
  });
});

describe("baseVariationPct", () => {
  it("variazione % sull'anno base", () => {
    expect(baseVariationPct(dec(80), dec(100))!.toString()).toBe("-20");
    expect(baseVariationPct(dec(110), dec(100))!.toString()).toBe("10");
  });
  it("anno base a zero → null (nessun confronto possibile)", () => {
    expect(baseVariationPct(dec(80), dec(0))).toBeNull();
  });
});
