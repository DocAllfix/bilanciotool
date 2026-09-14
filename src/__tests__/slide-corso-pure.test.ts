import { describe, it, expect } from "vitest";
import { costruisciSlideCorso } from "@/features/formazione/presentazione";
import type { Sezione } from "@/features/formazione/tipi";
import type { VoceSlide } from "@/features/formazione/slide-distillate";

// LA PRESENTAZIONE DI UN CORSO: sezioni distillate e sezioni che non lo sono ancora.
//
// ⚠️ I file `slide.json` arrivano un corso alla volta, e dentro un corso possono coprire
// solo alcune sezioni. La presentazione non deve né rompersi né mentire in quel mezzo: una
// sezione con le voci distillate si mostra con quelle, una senza resta com'era.
//
// ⚠️ E il momento di una slide distillata è ESATTO: quello del paragrafo da cui parte.

const sez = (id: string, blocchi: Sezione["blocchi"] = []): Sezione => ({
  id,
  titolo: `Titolo ${id}`,
  minuti: 3,
  sommario: "…",
  blocchi,
});

const SEZIONI = [
  sez("dove-sei"),
  sez("chi-rientra", [{ tipo: "avviso", tono: "nota", testo: "vecchio avviso" }]),
];

const MAPPA: Record<string, VoceSlide[]> = {
  "nis2/chi-rientra": [
    { sezione: "chi-rientra", p: 0, inizia: "Prima", layout: "evidenza", titolo: "Rientra?" },
    { sezione: "chi-rientra", p: 2, inizia: "La", layout: "punti", titolo: "{capiNis2} capi", punti: [{ d: "uno" }] },
  ],
};

const MARCHE: Record<string, { p: number; s: number }[]> = {
  "nis2/chi-rientra": [
    { p: 0, s: 0.05 },
    { p: 1, s: 20 },
    { p: 2, s: 41.5 },
  ],
};

const risultato = () =>
  costruisciSlideCorso(SEZIONI, {
    corso: "nis2",
    idComuni: ["dove-sei"],
    mappa: MAPPA,
    numeri: { capiNis2: 12 },
    marche: (chiave) => MARCHE[chiave] ?? [],
  });

describe("costruisciSlideCorso", () => {
  it("una sezione distillata diventa una slide per voce, al posto dei suoi blocchi", () => {
    const { slide } = risultato();
    const proprie = slide.filter((s) => s.sezione.id === "chi-rientra");
    expect(proprie).toHaveLength(2);
    expect(proprie.map((s) => s.distillata?.layout)).toEqual(["evidenza", "punti"]);
    // Il vecchio avviso non compare più: la sezione ora parla con le voci distillate.
    expect(proprie.some((s) => s.blocchi.length > 0)).toBe(false);
  });

  it("una sezione senza voci resta com'era", () => {
    const { slide } = risultato();
    const comune = slide.filter((s) => s.sezione.id === "dove-sei");
    expect(comune).toHaveLength(1);
    expect(comune[0].distillata).toBeUndefined();
  });

  it("⚠️ i segnaposto diventano numeri PRIMA di arrivare al componente", () => {
    const { slide } = risultato();
    expect(slide.find((s) => s.distillata?.layout === "punti")?.distillata?.titolo).toBe("12 capi");
  });

  it("⚠️ il momento di ogni slide distillata è quello del SUO paragrafo", () => {
    const { slide, momenti } = risultato();
    const i = slide.findIndex((s) => s.distillata?.layout === "punti");
    expect(momenti[i]).toBe(41.5);
    expect(momenti[i - 1]).toBe(0.05);
  });

  it("numerazione e apertura di sezione restano coerenti sul corso intero", () => {
    const { slide } = risultato();
    expect(slide.map((s) => s.numero)).toEqual([1, 2, 3]);
    expect(slide.every((s) => s.totale === 3)).toBe(true);
    expect(slide.map((s) => s.apreSezione)).toEqual([true, true, false]);
  });

  it("senza marche la sezione distillata non inventa momenti", () => {
    const { slide, momenti } = costruisciSlideCorso(SEZIONI, {
      corso: "nis2",
      idComuni: ["dove-sei"],
      mappa: MAPPA,
      numeri: { capiNis2: 12 },
      marche: () => [],
    });
    const i = slide.findIndex((s) => s.distillata);
    expect(momenti[i]).toBeNull();
  });
});
