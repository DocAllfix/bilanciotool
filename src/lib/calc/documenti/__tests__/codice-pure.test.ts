import { describe, it, expect } from "vitest";
import { ALFABETO, codiceValido, formattaCodice, normalizzaCodice } from "../codice";

describe("l'alfabeto del codice", () => {
  it("non contiene nessuna coppia che si confonde", () => {
    // ⚠️ È l'unica difesa contro la trascrizione sbagliata, e per questo va verificata:
    // il codice si legge da un PDF stampato e si ridigita, o si detta al telefono.
    for (const c of "0O1IL2Z5S8B") {
      expect(ALFABETO.includes(c), `«${c}» è confondibile e non deve stare nell'alfabeto`).toBe(false);
    }
    // E non deve avere doppioni: un alfabeto con una lettera due volte falserebbe il
    // conto dello spazio dei codici.
    expect(new Set(ALFABETO).size).toBe(ALFABETO.length);
  });
});

describe("la forma stampata", () => {
  it("è EV-XXXX-XXXX", () => {
    expect(formattaCodice("ACDEFGHJ")).toBe("EV-ACDE-FGHJ");
    expect(codiceValido("EV-ACDE-FGHJ")).toBe(true);
  });

  it("rifiuta le forme che non lo sono", () => {
    expect(codiceValido("ACDEFGHJ")).toBe(false);
    expect(codiceValido("EV-ACDE-FGH")).toBe(false);
    expect(codiceValido("EV-ACDE-FGH0")).toBe(false); // lo zero non è dell'alfabeto
    expect(codiceValido("SR-ACDE-FGHJ")).toBe(false); // il prefisso dell'attestato
  });
});

describe("quello che una persona digita", () => {
  it("si accetta scritto come capita", () => {
    for (const scritto of [
      "EV-ACDE-FGHJ",
      "ev-acde-fghj",
      "EVACDEFGHJ",
      "  EV ACDE FGHJ  ",
      "EV–ACDE–FGHJ", // trattini lunghi, come li incolla un PDF
    ]) {
      expect(normalizzaCodice(scritto), scritto).toBe("EV-ACDE-FGHJ");
    }
  });

  it("⚠️ una lettera fuori alfabeto si RIFIUTA, non si indovina", () => {
    // Una prima versione convertiva `O` in `D` e `I` in `J` per gentilezza. È il
    // contrario della gentilezza: una lettera indovinata male non produce «non trovato»,
    // produce il codice di UN ALTRO documento — e la pagina confermerebbe con sicurezza
    // il documento sbagliato proprio a chi sta verificando quello vero.
    expect(normalizzaCodice("EV-ACDE-FGH0")).toBeNull();
    expect(normalizzaCodice("EV-ACDE-FGHI")).toBeNull();
    expect(normalizzaCodice("EV-ACDE-FGHS")).toBeNull();
  });

  it("⚠️ un codice che comincia davvero per «EV» sopravvive", () => {
    // `E` e `V` sono lettere dell'alfabeto: togliere il prefisso a occhi chiusi
    // ridurrebbe questo codice a sei caratteri e lo dichiarerebbe inesistente.
    expect(normalizzaCodice("EV-EVAC-DEFG")).toBe("EV-EVAC-DEFG");
    expect(normalizzaCodice("EVEVACDEFG")).toBe("EV-EVAC-DEFG");
    // Senza prefisso, otto caratteri che iniziano per EV restano quelli che sono.
    expect(normalizzaCodice("EVACDEFG")).toBe("EV-EVAC-DEFG");
  });

  it("le lunghezze sbagliate non passano", () => {
    expect(normalizzaCodice("")).toBeNull();
    expect(normalizzaCodice("EV-ACDE-FGH")).toBeNull();
    expect(normalizzaCodice("EV-ACDE-FGHJK")).toBeNull();
  });
});
