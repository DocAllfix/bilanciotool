import { describe, expect, it } from "vitest";

import {
  andamento,
  periodoCorrente,
  scostamento,
  statoIndicatore,
  ultimaRilevazione,
  type Indicatore,
} from "@/lib/calc/nis2/indicatori";
import golden from "./nis2-golden.json";

// GLI INDICATORI DEL SISTEMA: 19 di base, 8 ambiti, target, soglia e verso.
//
// ⚠️ IL VERSO DI MIGLIORAMENTO E' IL CUORE, e senza di lui il resto e' rumore. Per il
// «tasso di clic nelle simulazioni di phishing» scendere e' un risultato; per la
// «copertura MFA» e' un disastro. Lo stesso numero, la stessa variazione, due giudizi
// opposti — e' la stessa regola gia' scritta per lo storico delle aziende.
//
// ⚠️ E un target ASSENTE non e' un target a zero. In SGI QAS il prototipo faceva
// `Number("") === 0` e un indicatore senza target risultava «a target» qualunque valore
// avesse: il ramo della soglia era irraggiungibile. Qui il prototipo NIS2 lo fa gia'
// giusto (`isFinite`), e la regola si conserva invece di reintrodurre il difetto per
// somiglianza con l'altro modulo.

const base: Indicatore = {
  target: 100,
  soglia: 80,
  verso: "crescente",
  rilevazioni: [
    { periodo: "2026-01", valore: 60 },
    { periodo: "2026-02", valore: 75 },
    { periodo: "2026-03", valore: 90 },
  ],
};

describe("ultimaRilevazione", () => {
  it("la piu' recente per PERIODO, non l'ultima inserita", () => {
    // ⚠️ L'ordine di inserimento non e' l'ordine del tempo: chi recupera il dato di
    // gennaio a marzo lo inserisce per ultimo, e l'indicatore mostrerebbe gennaio come
    // valore corrente.
    const disordinate: Indicatore = {
      ...base,
      rilevazioni: [
        { periodo: "2026-03", valore: 90 },
        { periodo: "2026-01", valore: 60 },
      ],
    };
    expect(ultimaRilevazione(disordinate)?.periodo).toBe("2026-03");
  });

  it("salta le rilevazioni senza valore", () => {
    const conVuoti: Indicatore = {
      ...base,
      rilevazioni: [...base.rilevazioni, { periodo: "2026-04", valore: null }],
    };
    expect(ultimaRilevazione(conVuoti)?.periodo).toBe("2026-03");
  });

  it("nessuna rilevazione: null", () => {
    expect(ultimaRilevazione({ ...base, rilevazioni: [] })).toBeNull();
  });
});

describe("statoIndicatore", () => {
  it("sopra il target: a target — come nel prototipo", () => {
    expect(statoIndicatore({ ...base, rilevazioni: [{ periodo: "2026-03", valore: 100 }] })).toBe("a_target");
  });

  it("fra soglia e target: in attenzione", () => {
    expect(statoIndicatore(base)).toBe("in_attenzione");
    expect(golden.indicatori.base.stato).toBe("mid");
  });

  it("sotto la soglia: fuori target", () => {
    expect(statoIndicatore({ ...base, rilevazioni: [{ periodo: "2026-03", valore: 50 }] })).toBe("fuori_target");
  });

  it("⚠️ senza target ma con soglia, decide la soglia — non «a target» per finta", () => {
    const s = statoIndicatore({ ...base, target: null });
    expect(s).toBe("a_target"); // 90 >= 80
    expect(golden.indicatori.senzaTarget.stato).toBe("ok");
    expect(statoIndicatore({ ...base, target: null, rilevazioni: [{ periodo: "x", valore: 50 }] }))
      .toBe("fuori_target");
  });

  it("senza target e senza soglia non si giudica", () => {
    expect(statoIndicatore({ ...base, target: null, soglia: null })).toBe("non_rilevato");
  });

  it("senza rilevazioni non si giudica", () => {
    expect(statoIndicatore({ ...base, rilevazioni: [] })).toBe("non_rilevato");
    expect(golden.indicatori.senzaRilevazioni.stato).toBe("nd");
  });

  it("il verso rovescia il giudizio, a parita' di numeri", () => {
    // Stesso valore, stesso target: per un indicatore da far scendere e' un successo.
    expect(statoIndicatore({ ...base, verso: "decrescente" })).toBe("a_target");
    expect(golden.indicatori.decrescente.stato).toBe("ok");
  });
});

describe("andamento", () => {
  it("+1 se migliora, -1 se peggiora, 0 se fermo o senza confronto", () => {
    expect(andamento(base)).toBe(1);
    expect(golden.indicatori.base.andamento).toBe(1);
    expect(andamento({ ...base, verso: "decrescente" })).toBe(-1);
    expect(golden.indicatori.decrescente.andamento).toBe(-1);
    expect(andamento({ ...base, rilevazioni: [{ periodo: "2026-01", valore: 60 }] })).toBe(0);
    expect(andamento({ ...base, rilevazioni: [
      { periodo: "2026-01", valore: 60 }, { periodo: "2026-02", valore: 60 },
    ] })).toBe(0);
  });
});

describe("scostamento dal target, in percentuale col segno del merito", () => {
  it("negativo quando manca al target", () => {
    expect(scostamento(base)).toBe(-10);
    expect(golden.indicatori.base.scostamento).toBe(-10);
  });

  it("positivo quando lo supera", () => {
    expect(scostamento({ ...base, rilevazioni: [{ periodo: "x", valore: 110 }] })).toBe(10);
  });

  it("⚠️ senza target non c'e' scostamento, e non e' zero", () => {
    // Zero direbbe «esattamente a target», che e' l'opposto di «non c'e' un target».
    expect(scostamento({ ...base, target: null })).toBeNull();
    expect(golden.indicatori.senzaTarget.scostamento).toBeNull();
  });

  it("un target a zero non si usa come divisore", () => {
    expect(scostamento({ ...base, target: 0 })).toBeNull();
  });

  it("senza rilevazioni: null", () => {
    expect(scostamento({ ...base, rilevazioni: [] })).toBeNull();
  });
});

describe("periodoCorrente", () => {
  const q = new Date("2026-05-17T10:00:00.000Z");

  it("dipende dalla frequenza dichiarata", () => {
    expect(periodoCorrente("annuale", q)).toBe("2026");
    expect(periodoCorrente("semestrale", q)).toBe("2026-S1");
    expect(periodoCorrente("trimestrale", q)).toBe("2026-T2");
    expect(periodoCorrente("mensile", q)).toBe("2026-05");
  });

  it("⚠️ e' il periodo ITALIANO, non quello del fuso in cui gira il processo", () => {
    // Alle 00:30 del primo luglio, ora di Roma, in UTC e' ancora il 30 giugno: il
    // semestre proposto sarebbe il primo invece del secondo, e la rilevazione finirebbe
    // nel periodo sbagliato senza che nessuno se ne accorga.
    expect(periodoCorrente("semestrale", new Date("2026-06-30T22:30:00.000Z"))).toBe("2026-S2");
    expect(periodoCorrente("mensile", new Date("2026-06-30T22:30:00.000Z"))).toBe("2026-07");
  });
});
