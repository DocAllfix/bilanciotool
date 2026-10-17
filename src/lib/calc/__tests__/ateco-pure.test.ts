import { describe, it, expect } from "vitest";
import { PROFILI_ATECO, divisioneAteco, profiloAteco } from "../ateco";

describe("codice ATECO", () => {
  it("legge le forme che si incontrano davvero", () => {
    expect(divisioneAteco("25.62")).toBe(25);
    expect(divisioneAteco("25.62.00")).toBe(25);
    expect(divisioneAteco("2562")).toBe(25);
    expect(divisioneAteco("C 25.62")).toBe(25);
    expect(divisioneAteco("c25.62")).toBe(25);
    expect(divisioneAteco(" 25 ")).toBe(25);
    expect(divisioneAteco("01.11")).toBe(1);
  });

  it("rifiuta ciò che non è un codice, invece di inventare un profilo", () => {
    for (const x of ["", null, undefined, "abc", "Meccanica", "25.62.00.1", "04.10", "99.00", "0", "Z 25"]) {
      expect(divisioneAteco(x), String(x)).toBeNull();
    }
  });

  it("⚠️ si legge la divisione e non la lettera: lo stesso codice nelle due versioni dà lo stesso profilo", () => {
    // ATECO 2007 «J 62.01» e ATECO 2025 «K 62.10»: la lettera è cambiata, la divisione no.
    expect(profiloAteco("J 62.01")?.key).toBe("ict_editoria");
    expect(profiloAteco("K 62.10")?.key).toBe("ict_editoria");
  });

  it("gli esempi di riferimento cadono nel profilo atteso", () => {
    expect(profiloAteco("25.62")?.key).toBe("metalli");
    expect(profiloAteco("10.71")?.key).toBe("alimentare");
    expect(profiloAteco("41.20")?.key).toBe("costruzioni");
    expect(profiloAteco("49.41")?.key).toBe("trasporti");
    expect(profiloAteco("69.20")?.key).toBe("professionali");
    expect(profiloAteco("86.10")?.key).toBe("sanita");
  });

  it("gli intervalli sono in ordine e non si sovrappongono", () => {
    for (let i = 1; i < PROFILI_ATECO.length; i++) {
      expect(PROFILI_ATECO[i].da, PROFILI_ATECO[i].key).toBeGreaterThan(PROFILI_ATECO[i - 1].a);
    }
    expect(new Set(PROFILI_ATECO.map((p) => p.key)).size).toBe(PROFILI_ATECO.length);
  });
});

describe("sezione ATECO 2007 dalla divisione", () => {
  it("si legge dalla divisione, anche quando la lettera scritta è quella del 2025", async () => {
    const { sezioneDellaDivisione } = await import("../ateco");
    expect(sezioneDellaDivisione(divisioneAteco("K 62.10")!)).toBe("J");
    expect(sezioneDellaDivisione(divisioneAteco("25.62")!)).toBe("C");
    expect(sezioneDellaDivisione(divisioneAteco("41.20")!)).toBe("F");
    expect(sezioneDellaDivisione(4)).toBeNull();
  });
});
