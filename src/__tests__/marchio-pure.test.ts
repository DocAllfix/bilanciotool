import { describe, it, expect } from "vitest";
import {
  MARCHIO_NOSTRO,
  marchioDaCongelare,
  marchioDelloSnapshot,
} from "@/features/documents/marchio";

// Il marchio del documento: quale nome compare in fondo alle cinque carte.
//
// Il punto delicato non e' la scelta, e' la DURATA. Il marchio si decide una volta
// sola, alla pubblicazione, e da li' non si muove piu': un documento consegnato al
// cliente non puo' cambiare intestazione il giorno in cui l'estensione scade.

describe("marchio da congelare alla pubblicazione", () => {
  it("senza white-label porta il nostro marchio", () => {
    expect(marchioDaCongelare({ whiteLabel: false, nomeStudio: "Studio Rossi" })).toEqual(
      MARCHIO_NOSTRO,
    );
  });

  it("con white-label porta il nome dello studio, e non e' il nostro", () => {
    expect(marchioDaCongelare({ whiteLabel: true, nomeStudio: "Studio Rossi" })).toEqual({
      nome: "Studio Rossi",
      nostro: false,
    });
  });

  it("ritaglia gli spazi intorno al nome", () => {
    expect(marchioDaCongelare({ whiteLabel: true, nomeStudio: "  Studio Rossi  " }).nome).toBe(
      "Studio Rossi",
    );
  });

  it("con white-label ma senza un nome utilizzabile ripiega sul nostro", () => {
    // Un documento senza marchio non deve esistere: meglio il nostro che il vuoto.
    for (const nomeStudio of ["", "   ", null, undefined]) {
      expect(marchioDaCongelare({ whiteLabel: true, nomeStudio })).toEqual(MARCHIO_NOSTRO);
    }
  });

  it("tronca un nome smisurato invece di sfondare il piede della pagina", () => {
    const m = marchioDaCongelare({ whiteLabel: true, nomeStudio: "A".repeat(200) });
    expect(m.nome.length).toBeLessThanOrEqual(80);
    expect(m.nostro).toBe(false);
  });
});

describe("marchio letto dallo snapshot", () => {
  it("legge quello congelato", () => {
    expect(marchioDelloSnapshot({ marchio: { nome: "Studio Rossi", nostro: false } })).toEqual({
      nome: "Studio Rossi",
      nostro: false,
    });
  });

  it("gli snapshot pubblicati prima dell'estensione portano il nostro, ed e' giusto cosi'", () => {
    expect(marchioDelloSnapshot({ generatoIl: "2026-01-01" })).toEqual(MARCHIO_NOSTRO);
  });

  it("un campo malformato non fa uscire un documento senza intestazione", () => {
    for (const dati of [null, undefined, "boh", { marchio: null }, { marchio: {} }, { marchio: { nome: 42 } }]) {
      expect(marchioDelloSnapshot(dati)).toEqual(MARCHIO_NOSTRO);
    }
  });

  it("un marchio congelato resta identico se l'estensione viene spenta", () => {
    // La prova sta tutta qui: rileggere lo snapshot non consulta l'abbonamento.
    const dati = { marchio: marchioDaCongelare({ whiteLabel: true, nomeStudio: "Studio Rossi" }) };
    expect(marchioDelloSnapshot(dati)).toEqual({ nome: "Studio Rossi", nostro: false });
  });
});
