import { describe, expect, it } from "vitest";

import { costruisciSlide } from "../presentazione";
import type { Sezione } from "../tipi";

const sez = (id: string, blocchi: Sezione["blocchi"]): Sezione => ({
  id,
  titolo: "T " + id,
  minuti: 3,
  sommario: "S " + id,
  blocchi,
});

describe("costruisciSlide", () => {
  it("tiene fuori la prosa, e RAGGRUPPA i blocchi leggeri su una slide sola", () => {
    // ⚠️ Un blocco per slide lasciava mezzo schermo vuoto: in una vista a schermo pieno il
    // vuoto non e' respiro, e' una schermata che sembra non aver finito di caricarsi.
    const s = sez("a", [
      { tipo: "prosa", testo: "uno" },
      { tipo: "formula", testo: "x = y" },
      { tipo: "prosa", testo: "due" },
      { tipo: "avviso", tono: "nota", testo: "attento" },
    ]);

    const slide = costruisciSlide([s]);

    expect(slide).toHaveLength(1);
    expect(slide[0].blocchi.map((b) => b.tipo)).toEqual(["formula", "avviso"]);
  });

  it("spezza quando la tela e' piena, invece di impilare all'infinito", () => {
    const tabellona = {
      tipo: "tabella" as const,
      intestazioni: ["a"],
      righe: Array.from({ length: 8 }, (_, i) => [String(i)]),
    };
    const slide = costruisciSlide([sez("a", [tabellona, tabellona])]);
    expect(slide).toHaveLength(2);
  });

  it("la riproduzione dell'interfaccia sta da sola: e' il momento firmato", () => {
    const slide = costruisciSlide([
      sez("a", [
        { tipo: "formula", testo: "x" },
        { tipo: "interfaccia", vista: { genere: "passi", passi: [{ nome: "P", stato: "corso" }] } },
      ]),
    ]);
    expect(slide).toHaveLength(2);
    expect(slide[1].blocchi.map((b) => b.tipo)).toEqual(["interfaccia"]);
  });

  it("dà comunque UNA slide a una sezione tutta prosa, invece di saltarla", () => {
    // ⚠️ Saltarla romperebbe la sincronia: la voce leggerebbe una sezione che non compare,
    // e chi guarda si troverebbe la slide successiva mentre sente la precedente. Cinque
    // sezioni su ventuno sono quasi tutte prosa: non è un caso limite.
    const slide = costruisciSlide([sez("a", [{ tipo: "prosa", testo: "solo parole" }])]);

    expect(slide).toHaveLength(1);
    expect(slide[0].blocchi).toEqual([]);
    expect(slide[0].sezione.id).toBe("a");
  });

  it("porta su ogni slide la sezione da cui viene e l'indice del blocco DENTRO la sezione", () => {
    // L'indice del blocco è la chiave con cui le marche temporali dell'audio fanno
    // avanzare la slide: deve contare i blocchi della sezione, non le slide del corso.
    const grande = { tipo: "tabella" as const, intestazioni: ["a"], righe: Array.from({ length: 8 }, () => ["x"]) };
    const slide = costruisciSlide([
      sez("a", [{ tipo: "formula", testo: "1" }]),
      sez("b", [{ tipo: "prosa", testo: "x" }, grande, grande]),
    ]);

    expect(slide.map((x) => [x.sezione.id, x.indiceBlocco])).toEqual([
      ["a", 0],
      ["b", 1],
      ["b", 2],
    ]);
  });

  it("numera le slide da 1 e dichiara il totale, per la barra di avanzamento", () => {
    const slide = costruisciSlide([
      sez("a", [{ tipo: "formula", testo: "1" }]),
      sez("b", [{ tipo: "formula", testo: "2" }]),
    ]);

    expect(slide.map((x) => x.numero)).toEqual([1, 2]);
    expect(slide.every((x) => x.totale === 2)).toBe(true);
  });

  it("dice, per ogni slide, se è la PRIMA della sua sezione", () => {
    // Serve al lettore audio: la traccia parte solo sulla prima slide di una sezione,
    // perché una sezione è una traccia sola. Sulle altre la slide avanza dentro l'audio
    // che sta già suonando, e farlo ripartire lo manderebbe da capo.
    const grande = { tipo: "tabella" as const, intestazioni: ["a"], righe: Array.from({ length: 8 }, () => ["x"]) };
    const slide = costruisciSlide([sez("a", [grande, grande]), sez("b", [{ tipo: "formula", testo: "3" }])]);

    expect(slide.map((x) => x.apreSezione)).toEqual([true, false, true]);
  });

  it("non lascia mai un corso senza slide", () => {
    expect(costruisciSlide([])).toEqual([]);
    expect(costruisciSlide([sez("a", [])])).toHaveLength(1);
  });
});
