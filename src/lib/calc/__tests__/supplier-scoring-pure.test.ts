import { describe, it, expect } from "vitest";
import { computeSupplier, AREE_PESI, type Risposta } from "@/lib/calc/supplier/scoring";
import DOMANDE from "@/lib/db/seeds/data/supplier-questions.json";
import EFFORT from "@/lib/db/seeds/data/supplier-effort.json";

// Le domande arrivano dal seed estratto automaticamente dal prototipo: cosi' il
// golden non puo' divergere dalla banca domande che il sistema semina davvero.
const QUESTIONS_DEMO = (DOMANDE as { id: string; p: string; w: number }[]).map((q) => ({
  key: q.id,
  areaKey: q.p,
  peso: q.w,
  giorniStimati: (EFFORT as Record<string, number>)[String(q.w)],
}));

// Golden estratto dal prototipo `esg-supplier-ready.html` eseguendone la
// funzione `compute()` sul dataset di esempio: 11 "sì", 6 "parziale", 7 "no".
// I numeri qui sotto sono quelli che il committente vede oggi nel prototipo.

const DEMO: Record<string, Risposta> = {};
for (const k of ["B1", "B4", "E1", "E5", "E7", "S1", "S3", "S4", "G1", "G6", "P2"]) DEMO[k] = "si";
for (const k of ["B2", "E2", "S2", "S5", "G3", "P1"]) DEMO[k] = "parziale";
for (const k of ["E4", "E8", "S6", "S7", "G2", "G4", "P4"]) DEMO[k] = "no";

describe("punteggio dell'autovalutazione fornitore", () => {
  it("la banca domande ha 37 domande su 5 aree, con i pesi del prototipo", () => {
    expect(QUESTIONS_DEMO.length).toBe(37);
    const perArea = (a: string) => QUESTIONS_DEMO.filter((q) => q.areaKey === a).length;
    expect([perArea("base"), perArea("env"), perArea("soc"), perArea("eth"), perArea("proc")])
      .toEqual([5, 9, 9, 8, 6]);
    expect(AREE_PESI).toEqual({ base: 10, env: 25, soc: 25, eth: 25, proc: 15 });
    expect(Object.values(AREE_PESI).reduce((s, v) => s + v, 0)).toBe(100);
  });

  it("riproduce i punteggi del prototipo sul dataset di esempio", () => {
    const r = computeSupplier(QUESTIONS_DEMO, DEMO);
    expect(r.perArea.base.punteggio).toBe(83);
    expect(r.perArea.env.punteggio).toBe(58);
    expect(r.perArea.soc.punteggio).toBe(59);
    expect(r.perArea.eth.punteggio).toBe(50);
    expect(r.perArea.proc.punteggio).toBe(50);
    expect(r.indice).toBe(58);
  });

  it("distingue le domande valutate da quelle con una risposta di merito", () => {
    const r = computeSupplier(QUESTIONS_DEMO, DEMO);
    // Nel dataset di esempio nessuna domanda è "non applicabile", quindi i due
    // conteggi coincidono: è il caso successivo a separarli.
    expect(r.valutate).toBe(24);
    expect(r.risposte).toBe(24);
    expect(r.pctCompletamento).toBe(65);
  });

  it("«non applicabile» conta come valutata ma esce dal punteggio", () => {
    // Due domande della stessa area: una a "sì", una "non applicabile".
    const domande = QUESTIONS_DEMO.filter((q) => q.key === "B1" || q.key === "B2");
    const r = computeSupplier(domande, { B1: "si", B2: "na" });
    expect(r.perArea.base.punteggio).toBe(100); // B2 non abbassa il punteggio
    expect(r.perArea.base.valutate).toBe(2);
    expect(r.perArea.base.risposte).toBe(1);
    expect(r.valutate).toBe(2);
    expect(r.risposte).toBe(1);
  });

  it("un'area senza risposte non vale zero: non esiste", () => {
    const r = computeSupplier(QUESTIONS_DEMO, { B1: "si" });
    expect(r.perArea.base.punteggio).toBe(100);
    // L'ambiente non è stato guardato: dire "zero" significherebbe bocciarlo.
    expect(r.perArea.env.punteggio).toBeNull();
    // E l'indice si rinormalizza sulle sole aree valutate, altrimenti chi ha
    // compilato solo la prima area avrebbe 10 invece di 100.
    expect(r.indice).toBe(100);
  });

  it("senza alcuna risposta l'indice è zero e nessuna area ha punteggio", () => {
    const r = computeSupplier(QUESTIONS_DEMO, {});
    expect(r.indice).toBe(0);
    expect(r.valutate).toBe(0);
    expect(Object.values(r.perArea).every((a) => a.punteggio === null)).toBe(true);
  });

  it("il peso della domanda conta dentro l'area", () => {
    const domande = [
      { key: "X1", areaKey: "base", peso: 3, giorniStimati: 10 },
      { key: "X2", areaKey: "base", peso: 1, giorniStimati: 3 },
    ];
    // La domanda pesante a "no" e la leggera a "sì": 1×100 su 4×100 = 25.
    expect(computeSupplier(domande, { X1: "no", X2: "si" }).perArea.base.punteggio).toBe(25);
    // Scambiando le risposte: 3×100 su 4×100 = 75.
    expect(computeSupplier(domande, { X1: "si", X2: "no" }).perArea.base.punteggio).toBe(75);
  });

  it("la fascia di giudizio segue le soglie del prototipo", () => {
    const fascia = (n: number) => computeSupplier([{ key: "X", areaKey: "base", peso: 1, giorniStimati: 3 }], {}, n).fascia;
    expect(fascia(0).key).toBe("non_pronto");
    expect(fascia(39).key).toBe("non_pronto");
    expect(fascia(40).key).toBe("in_avvio");
    expect(fascia(59).key).toBe("in_avvio");
    expect(fascia(60).key).toBe("adeguato");
    expect(fascia(74).key).toBe("adeguato");
    expect(fascia(75).key).toBe("supplier_ready");
    expect(fascia(89).key).toBe("supplier_ready");
    expect(fascia(90).key).toBe("avanzato");
    expect(fascia(100).key).toBe("avanzato");
  });
});
