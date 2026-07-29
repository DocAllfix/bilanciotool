import { describe, it, expect } from "vitest";
import { computeProgress, BOUNDARY_FIELDS_FOR_PROGRESS } from "@/lib/calc/ghg/status";

// Contratto: funzione stato() del prototipo. Percentuali per passo:
//  a1 confini (8 campi), a2 sorgenti valutate /26, a3 sorgenti incluse con voci,
//  a4 fattori usati con fonte, a5 voci presenti, a6 obiettivi, a7 checklist ok /15,
//  a8 metodologia+significatività (1 / 0,5 / 0).
// Particolarità EREDITATA dal prototipo: il totale è (a1+a2+a3+a4+a6+a7+a8)/7 —
// a5 NON entra nel totale (è ridondante con a3). La conserviamo per fedeltà golden.

const base = {
  boundaries: {} as Record<string, string>,
  sourceStates: {} as Record<string, "in" | "out" | "na">,
  totalSources: 26,
  rowsBySource: {} as Record<string, number>,
  usedFactors: [] as { key: string; fonte: string | null }[],
  targetsCount: 0,
  checklist: {} as Record<string, "ok" | "par" | "no">,
  totalChecklist: 15,
};

describe("computeProgress", () => {
  it("tutto vuoto → 0%", () => {
    const p = computeProgress(base);
    expect(p.totPct).toBe(0);
    expect(p.a1).toBe(0);
  });

  it("confini: 4 campi su 8 → a1 = 0,5", () => {
    const p = computeProgress({
      ...base,
      boundaries: { forma: "Srl", sede: "Bari", settore: "Meccanica", ateco: "25.62" },
    });
    expect(p.a1).toBeCloseTo(0.5, 10);
  });

  it("sorgenti: 13 valutate su 26 → a2 = 0,5; incluse con voci → a3", () => {
    const sourceStates = Object.fromEntries(
      Array.from({ length: 13 }, (_, i) => [`s${i}`, i < 2 ? "in" : "out"]),
    ) as Record<string, "in" | "out" | "na">;
    const p = computeProgress({ ...base, sourceStates, rowsBySource: { s0: 3 } });
    expect(p.a2).toBeCloseTo(0.5, 10);
    expect(p.a3).toBeCloseTo(0.5, 10); // 1 delle 2 incluse ha voci
  });

  it("nessuna sorgente inclusa ma voci presenti → a3 = 1 (contratto prototipo)", () => {
    const p = computeProgress({ ...base, rowsBySource: { s9: 1 } });
    expect(p.a3).toBe(1);
    expect(p.a5).toBe(1);
  });

  it("fattori: con fonte / senza fonte", () => {
    const p = computeProgress({
      ...base,
      usedFactors: [
        { key: "gas", fonte: "DEFRA 2025" },
        { key: "x", fonte: null },
      ],
    });
    expect(p.a4).toBeCloseTo(0.5, 10);
  });

  it("a8: metodologia E significatività = 1; solo una = 0,5", () => {
    expect(computeProgress({ ...base, boundaries: { metodologia: "m", significativita: "s" } }).a8).toBe(1);
    expect(computeProgress({ ...base, boundaries: { metodologia: "m" } }).a8).toBe(0.5);
  });

  it("totale: media dei 7 contributi (a5 escluso), arrotondato a intero", () => {
    const full = computeProgress({
      boundaries: Object.fromEntries([...BOUNDARY_FIELDS_FOR_PROGRESS, "metodologia", "significativita"].map((k) => [k, "x"])),
      sourceStates: Object.fromEntries(Array.from({ length: 26 }, (_, i) => [`s${i}`, "in"])) as Record<string, "in">,
      totalSources: 26,
      rowsBySource: Object.fromEntries(Array.from({ length: 26 }, (_, i) => [`s${i}`, 1])),
      usedFactors: [{ key: "gas", fonte: "DEFRA" }],
      targetsCount: 1,
      checklist: Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`v${i + 1}`, "ok"])) as Record<string, "ok">,
      totalChecklist: 15,
    });
    expect(full.totPct).toBe(100);
  });
});
