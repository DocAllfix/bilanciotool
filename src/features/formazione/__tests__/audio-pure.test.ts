import { describe, expect, it } from "vitest";

import { momentiDelleSlide, chiaveTraccia } from "../audio";

const marche = (n: number) => Array.from({ length: n }, (_, i) => ({ p: i, s: i * 10 }));

describe("chiaveTraccia", () => {
  it("manda le sezioni comuni su UNA traccia sola, non su una per corso", () => {
    // Sette file per dodici corsi: duplicarli significherebbe dodici copie da rigenerare
    // a ogni ritocco, ed e' la ragione per cui le sezioni comuni esistono.
    expect(chiaveTraccia("energetico", "dove-sei", true)).toBe("comuni/dove-sei");
    expect(chiaveTraccia("bilancio", "dove-sei", true)).toBe("comuni/dove-sei");
  });

  it("manda le sezioni proprie sulla traccia del loro corso", () => {
    expect(chiaveTraccia("energetico", "passo-3-usi", false)).toBe("energetico/passo-3-usi");
  });
});

describe("momentiDelleSlide", () => {
  it("fa partire la prima slide sulla prima marca, non a zero per convenzione", () => {
    // La voce non attacca all'istante zero: c'e' sempre un attimo di silenzio, e mostrare
    // la slide prima che si senta qualcosa fa sembrare che l'audio non parta.
    expect(momentiDelleSlide(1, [{ p: 0, s: 0.42 }])).toEqual([0.42]);
  });

  it("quando slide e paragrafi coincidono, ogni slide ha la sua marca", () => {
    expect(momentiDelleSlide(5, marche(5))).toEqual([0, 10, 20, 30, 40]);
  });

  it("distribuisce le slide sui paragrafi quando i paragrafi sono di piu'", () => {
    expect(momentiDelleSlide(2, marche(4))).toEqual([0, 20]);
    expect(momentiDelleSlide(3, marche(7))).toEqual([0, 20, 40]);
  });

  it("restituisce momenti sempre CRESCENTI, anche con piu' slide che paragrafi", () => {
    // ⚠️ Due slide sullo stesso istante vorrebbero dire che una non si vede mai. Oggi non
    // succede su nessuna delle 27 sezioni, ma dipende da come sono scritti i copioni: se
    // domani qualcuno spezza meno paragrafi, deve degradare invece di far sparire una slide.
    const m = momentiDelleSlide(5, marche(3));
    expect(m).not.toBeNull();
    if (!m) return;
    expect(m).toHaveLength(5);
    for (let i = 1; i < m.length; i++) expect(m[i]).toBeGreaterThan(m[i - 1]);
  });

  it("senza marche non promette niente", () => {
    expect(momentiDelleSlide(3, [])).toBeNull();
  });
});
