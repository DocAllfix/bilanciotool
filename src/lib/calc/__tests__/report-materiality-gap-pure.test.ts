import { describe, it, expect } from "vitest";
import { assessMateriality } from "@/lib/calc/report/materiality";
import { computeGap } from "@/lib/calc/report/gap-analysis";

// Contratti dal prototipo: un tema è materiale se supera la soglia su ALMENO UNA
// delle due dimensioni; un tema è "valutato" se ha il punteggio d'impatto.

describe("assessMateriality", () => {
  const scores = {
    T01: { imp: 4, fin: 2 }, // materiale per impatto
    T02: { imp: 2, fin: 5 }, // materiale per finanza
    T03: { imp: 2, fin: 2 }, // sotto soglia
    T07: { imp: 3, fin: 3 }, // materiale su entrambe (soglia 3)
  };

  it("soglia 3: materialità su almeno una dimensione", () => {
    const r = assessMateriality(scores, 3);
    expect(r.materialKeys).toEqual(["T01", "T02", "T07"]);
    expect(r.assessedCount).toBe(4);
  });

  it("soglia 4: si restringe", () => {
    const r = assessMateriality(scores, 4);
    expect(r.materialKeys).toEqual(["T01", "T02"]);
  });

  it("soglia decimale (3,5) supportata", () => {
    const r = assessMateriality(scores, 3.5);
    expect(r.materialKeys).toEqual(["T01", "T02"]);
  });

  it("temi senza punteggio d'impatto: non valutati, mai materiali", () => {
    const r = assessMateriality({ T05: { fin: 5 } }, 3);
    expect(r.materialKeys).toEqual([]);
    expect(r.assessedCount).toBe(0);
  });
});

describe("computeGap", () => {
  const base = {
    profilo: { forma: "Srl", sede: "Bari" } as Record<string, string | undefined>,
    profiloFields: ["forma", "piva", "sede", "settore", "ateco", "sitiop", "mercati"],
    kpiCorrente: { en_ele: "1", hr_tot: "50" } as Record<string, string>,
    kpiPrecedente: { en_ele: "2" } as Record<string, string>,
    totalKpi: 50,
    kpiKeys: ["en_ele", "hr_tot", "en_gas"],
    materialTopics: [
      { key: "T01", politica: "p", azioni: "a" },
      { key: "T07", politica: "", azioni: "a" },
    ],
    assessedTopics: 4,
    totalTopics: 18,
    capitoli: [
      { key: "lettera", parole: 120, media: 1 },
      { key: "metodo", parole: 10, media: 0 },
    ],
    totalCapitoli: 7,
  };

  it("individua le lacune per blocco", () => {
    const g = computeGap(base);
    expect(g.profiloMancanti).toEqual(["piva", "settore", "ateco", "sitiop", "mercati"]);
    expect(g.kpiMancanti).toContain("en_gas");
    expect(g.kpiMancanti).not.toContain("en_ele");
    expect(g.kpiSenzaConfronto).toEqual(["hr_tot"]); // presente oggi, manca l'anno prima
    expect(g.gestioneMancante).toEqual(["T07"]); // manca la politica
    expect(g.capitoliDaCompletare).toEqual(["metodo"]); // sotto le 80 parole... soglia sul testo
    expect(g.mediaTotali).toBe(1);
  });

  it("readyPct: media dei cinque blocchi come il prototipo", () => {
    // s1=2/7, s2=min(1,4/18), s3=2/50, s4=1/2 (un tema completo su 2), s5=1/2 capitoli ok su 7 → 1/7
    const g = computeGap(base);
    const atteso = Math.round(((2 / 7 + 4 / 18 + 2 / 50 + 1 / 2 + 1 / 7) / 5) * 100);
    expect(g.readyPct).toBe(atteso);
  });

  it("tutto completo → 100", () => {
    const g = computeGap({
      profilo: Object.fromEntries(base.profiloFields.map((k) => [k, "x"])),
      profiloFields: base.profiloFields,
      kpiCorrente: { a: "1", b: "2" },
      kpiPrecedente: { a: "1", b: "2" },
      totalKpi: 2,
      kpiKeys: ["a", "b"],
      materialTopics: [{ key: "T01", politica: "p", azioni: "a" }],
      assessedTopics: 18,
      totalTopics: 18,
      capitoli: Array.from({ length: 7 }, (_, i) => ({ key: `c${i}`, parole: 100, media: 1 })),
      totalCapitoli: 7,
    });
    expect(g.readyPct).toBe(100);
  });
});
