import { describe, it, expect } from "vitest";
import golden from "./golden.json";
import { PESI, completamento, gruppoDelCriterio, percentualeCriteri } from "../punteggio";

// Il punteggio di completamento SA8000/2026 e il raggruppamento dei criteri, contro il
// golden ESTRATTO eseguendo il prototipo (`scripts/golden-sa8000.mjs`).

describe("il golden viene dal prototipo", () => {
  it("porta i pesi e i conteggi veri", () => {
    expect(golden.criteri).toBe(112);
    expect(golden.perSezione).toEqual({ F: 5, M: 42, D: 65 });
    expect(Object.values(golden.pesi).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
});

describe("il completamento è una media pesata su cinque voci", () => {
  it("i pesi sono quelli del prototipo", () => {
    expect(PESI).toEqual(golden.pesi);
  });

  it("ogni voce da sola vale il proprio peso", () => {
    const zero = { anagrafica: 0, procedure: 0, moduli: 0, criteri: 0, registri: 0 };
    expect(completamento({ ...zero, anagrafica: 100 })).toBe(15);
    expect(completamento({ ...zero, procedure: 100 })).toBe(30);
    expect(completamento({ ...zero, moduli: 100 })).toBe(15);
    expect(completamento({ ...zero, criteri: 100 })).toBe(25);
    expect(completamento({ ...zero, registri: 100 })).toBe(15);
    // Gli stessi casi, come li dà il prototipo.
    for (const p of golden.punteggi) {
      const v = {
        "solo anagrafica": { ...zero, anagrafica: 100 },
        "solo procedure": { ...zero, procedure: 100 },
        "solo moduli": { ...zero, moduli: 100 },
        "solo criteri": { ...zero, criteri: 100 },
        "solo registri": { ...zero, registri: 100 },
        "tutto a zero": zero,
        "tutto al cento": { anagrafica: 100, procedure: 100, moduli: 100, criteri: 100, registri: 100 },
        "meta ovunque": { anagrafica: 50, procedure: 50, moduli: 50, criteri: 50, registri: 50 },
      }[p.nome];
      if (v) expect(completamento(v), p.nome).toBe(p.valore);
    }
  });

  it("le procedure pesano il doppio dei moduli, ed è voluto", () => {
    // Una procedura è il sistema; un modulo è il foglio che la applica. Approvare una
    // procedura è la decisione, compilare un modulo è la conseguenza.
    expect(PESI.procedure).toBe(2 * PESI.moduli);
  });
});

describe("i criteri: «parziale» pesa ZERO", () => {
  it("solo «ok» conta, e «na» esce dal denominatore", () => {
    // ⚠️ SCOSTAMENTO DAL SGI QAS, e si conserva. Là un requisito «parzialmente conforme»
    // vale 50; qui un criterio «parziale» vale ZERO. Sono due prototipi dello stesso
    // autore che trattano la stessa idea in modi opposti, e la fedeltà a ciascuno è la
    // regola di questo progetto: allineare i due cambierebbe i punteggi SA8000 che il
    // committente ha già visto.
    //
    // La ragione metodologica regge: SA8000 è una certificazione sociale, e un criterio
    // attuato a metà non protegge a metà un lavoratore.
    expect(percentualeCriteri(["ok", "ok", "parziale", "no"])).toBe(50);
    expect(percentualeCriteri(["ok", "parziale"])).toBe(50);
    expect(percentualeCriteri(["parziale", "parziale"])).toBe(0);
  });

  it("«non applicabile» esce dal denominatore, e non alza il punteggio", () => {
    expect(percentualeCriteri(["ok", "na"])).toBe(100);
    expect(percentualeCriteri(["ok", "no", "na"])).toBe(50);
  });

  it("senza nessun criterio applicabile il risultato è zero, non cento", () => {
    // Dividere per zero darebbe NaN, e «tutti non applicabili» non è «tutto a posto».
    expect(percentualeCriteri(["na", "na"])).toBe(0);
    expect(percentualeCriteri([])).toBe(0);
  });

  it("un criterio non ancora valutato pesa zero e resta nel denominatore", () => {
    expect(percentualeCriteri(["ok", null])).toBe(50);
  });
});

describe("il raggruppamento dei criteri fondazionali", () => {
  it("⚠️ il prototipo produce cinque gruppi che non esistono", () => {
    // Misurato: `k.c.split(".")[0]` su «F1» restituisce «F1», che in `grp` non c'è. I
    // cinque criteri fondazionali finiscono in cinque riquadri separati, mentre
    // `grp.F` = «Criteri fondazionali (F1–F5)» esiste ed è scritto per questo.
    expect(golden.gruppiOrfani).toEqual(["F1", "F2", "F3", "F4", "F5"]);
    expect(golden.criteriOrfani).toBe(5);
  });

  it("qui i fondazionali stanno insieme, e gli altri restano dove erano", () => {
    // I codici con il punto conservano il gruppo del prototipo…
    expect(gruppoDelCriterio("M1.1")).toBe("M1");
    expect(gruppoDelCriterio("M10.3")).toBe("M10");
    expect(gruppoDelCriterio("D7.2")).toBe("D7");
    // …e quelli senza punto ricadono sulla lettera della sezione, che è il gruppo vero.
    expect(gruppoDelCriterio("F1")).toBe("F");
    expect(gruppoDelCriterio("F5")).toBe("F");
  });
});
