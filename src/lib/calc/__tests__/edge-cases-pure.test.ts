import { describe, it, expect } from "vitest";
import { computeRow, type DqLevel } from "@/lib/calc/ghg/row";
import { computeInventory } from "@/lib/calc/ghg/totals";
import { computeProgress } from "@/lib/calc/ghg/status";
import { computeGap } from "@/lib/calc/report/gap-analysis";
import { assessMateriality } from "@/lib/calc/report/materiality";
import { nz } from "@/lib/calc/shared/decimal";

// Rami difensivi: input fuori contratto non devono MAI far esplodere il motore.

describe("difese su input fuori contratto", () => {
  it("livello qualità sconosciuto → fallback C (10%)", () => {
    const r = computeRow({ categoryKey: "1", quantita: "100", fe: "1", dq: "X" as DqLevel });
    expect(r.inc.toString()).toBe("10");
    expect(r.dqp).toBe(3);
  });

  it("categoria sconosciuta → confluisce in categoria 1 (contratto prototipo)", () => {
    const c = computeInventory([
      { id: "x", categoryKey: "9", sourceTypeKey: "??", quantita: "1000", fe: "1", dq: "F" },
    ]);
    expect(c.perCategoria["1"].n).toBe(1);
    expect(c.s1.toString()).toBe("1");
  });

  it("numeri come number JS in nz (non solo stringhe)", () => {
    expect(nz(12.5).toString()).toBe("12.5");
  });

  it("progress: totalSources e totalChecklist a zero non dividono per zero", () => {
    const p = computeProgress({
      boundaries: {},
      sourceStates: {},
      totalSources: 0,
      rowsBySource: {},
      usedFactors: [],
      targetsCount: 0,
      checklist: {},
      totalChecklist: 0,
    });
    expect(p.totPct).toBe(0);
  });

  it("gap: collezioni vuote → readyPct 0 senza errori", () => {
    const g = computeGap({
      profilo: {},
      profiloFields: [],
      kpiCorrente: {},
      kpiPrecedente: {},
      totalKpi: 0,
      kpiKeys: [],
      materialTopics: [],
      assessedTopics: 0,
      totalTopics: 0,
      capitoli: [],
      totalCapitoli: 0,
    });
    expect(g.readyPct).toBe(0);
    expect(g.profiloMancanti).toEqual([]);
  });

  it("materialità: punteggi non numerici trattati come assenti", () => {
    const r = assessMateriality({ T01: { imp: "abc", fin: "3" } }, 3);
    expect(r.assessedCount).toBe(0);
    expect(r.materialKeys).toEqual([]);
  });
});
