import { describe, it, expect } from "vitest";
import { conformita } from "@/lib/calc/pas/conformita";
import { derivati, parteOltreTotale } from "@/lib/calc/pas/indicatori";
import { livello } from "@/lib/calc/pas/rischio";
import { statoFornitori } from "@/lib/calc/pas/fornitori";
import { REGISTRI_VUOTI, riesamiDelVerbale, statoRegistri } from "@/lib/calc/pas/registri";

// I difetti del prototipo PAS che il motore corregge, uno per prova. Ciascuno è scritto in
// `docs/politica-arrotondamento.md`; qui si prova che il numero giusto esce, e che quello
// sbagliato del prototipo non può tornare senza far diventare rossa una prova.

const SETTIMANE = 46;

describe("PAS 24000: difetti del prototipo corretti", () => {
  it("1 · un requisito conforme su 98 non vale 100: i non valutati pesano zero", () => {
    const stati = Array.from({ length: 98 }, (_, i) => (i === 0 ? ("c" as const) : null));
    // Il prototipo: 1 ÷ 1 = 100%. Qui: 100 ÷ 98 = 1.
    expect(conformita(stati).indice).toBe(1);
  });

  it("1 · «non pertinente» esce dal denominatore, non pesa zero", () => {
    const stati = Array.from({ length: 98 }, (_, i) => (i === 0 ? ("c" as const) : ("na" as const)));
    expect(conformita(stati).indice).toBe(100);
  });

  it("1 · il parziale pesa metà, il non conforme zero", () => {
    expect(conformita(["c", "p", "n", "na"]).indice).toBe(50);
  });

  it("1 · nessun requisito valutato: indice assente, non zero", () => {
    expect(conformita([null, null]).indice).toBeNull();
  });

  it("3 · divario di genere senza la retribuzione delle donne: assente, non 100%", () => {
    const d = derivati({ re_uom: 25800 }, SETTIMANE);
    expect(d.payGap).toBeNull();
  });

  it("3 · margine sul CCNL senza la retribuzione più bassa: assente, non −100%", () => {
    expect(derivati({ re_ccnl: 1545 }, SETTIMANE).margCcnl).toBeNull();
    expect(derivati({ re_min: 1580, re_ccnl: 1545 }, SETTIMANE).margCcnl).toBe(2.3);
  });

  it("3 · indici infortunistici senza lo straordinario: assenti, non calcolati sulle sole ordinarie", () => {
    const d = derivati({ inf: 4, gg: 62, ore_ord: 148000 }, SETTIMANE);
    expect([d.if_, d.ig, d.ore]).toEqual([null, null, null]);
    const pieni = derivati({ inf: 4, gg: 62, ore_ord: 148000, ore_str: 9800 }, SETTIMANE);
    expect([pieni.if_, pieni.ig, pieni.ore]).toEqual([25.35, 0.39, 157800]);
  });

  it("3 · un denominatore zero non produce zero né infinito", () => {
    const d = derivati({ lav_tot: 0, lav_don: 0, ass: 0, fo_nuovi: 0 }, SETTIMANE);
    expect([d.pctDonne, d.pctNuovi, d.turnover]).toEqual([null, null, null]);
  });

  it("3 · «di cui» oltre il totale: incoerente, non 104%", () => {
    const m = { lav_tot: 48, lav_don: 50 };
    const d = derivati(m, SETTIMANE);
    expect(d.pctDonne).toBeNull();
    expect(d.incoerenze).toContain("pctDonne");
    expect(parteOltreTotale(m)).toEqual(["lav_don"]);
  });

  it("4 · i reclami da sollecitare si contano sul giorno italiano passato da fuori, a calendario", () => {
    const r = { ...REGISTRI_VUOTI, reclami: [{ data: "2026-09-11", chiusoIl: null }] };
    // Dall'11 settembre al 12 ottobre sono 31 giorni: oltre i 30.
    expect(statoRegistri(r, 2026, "2026-10-12", 30).reclamiDaSollecitare).toBe(1);
    // L'11 ottobre sono 30 giorni esatti: non ancora.
    expect(statoRegistri(r, 2026, "2026-10-11", 30).reclamiDaSollecitare).toBe(0);
  });

  it("4 · a cavallo del cambio d'ora i giorni non perdono né guadagnano un'unità", () => {
    const r = { ...REGISTRI_VUOTI, reclami: [{ data: "2026-10-20", chiusoIl: "2026-10-30" }] };
    // Il 25 ottobre torna l'ora solare: con gli istanti locali il conto darebbe 9,96.
    expect(statoRegistri(r, 2026, "2026-11-01", 30).giorniMediChiusura).toBe(10);
  });

  it("6 · il riesame precedente è sempre PRIMA dell'esercizio, mai dopo", () => {
    const riesami = [{ data: "2024-11-20" }, { data: "2026-03-10" }];
    // Nel 2025 nessun riesame: il prototipo avrebbe preso quello del 2026 come «precedente».
    expect(riesamiDelVerbale(riesami, 2025)).toEqual({ corrente: null, precedente: { data: "2024-11-20" } });
    expect(riesamiDelVerbale(riesami, 2026)).toEqual({ corrente: { data: "2026-03-10" }, precedente: { data: "2024-11-20" } });
  });

  it("rischio: un punteggio fuori scala non produce un livello", () => {
    expect(livello({ probabilita: 7, gravita: 2 })).toBeNull();
    expect(livello({ probabilita: 3, gravita: null })).toBeNull();
    expect(livello({ probabilita: 3, gravita: 5 })).toBe(15);
  });

  it("fornitori: senza fornitori le quote sono assenti, non zero", () => {
    const s = statoFornitori([]);
    expect([s.quotaClausola, s.quotaQuestionario, s.quotaVerificati]).toEqual([null, null, null]);
  });
});
