// Lo stato del consenso, provato dove sbagliare costa una contestazione.
//
// La proprietà che questi test difendono è una sola, e vale più di tutte le altre:
// **in caso di dubbio, negato**. Qualunque valore che non sia esattamente un consenso
// esplicito deve produrre «non ha ancora scelto», mai «ha accettato». Un difetto in questa
// direzione non si vede — il sito funziona, i dati arrivano — e significa aver raccolto
// dati senza consenso.

import { describe, it, expect } from "vitest";
import {
  interpreta,
  analiticaAttiva,
  CHIAVE_CONSENSO,
  bannerNascostoSulServer,
  raccoltaSpentaSulServer,
} from "@/features/consenso/stato";

describe("interpreta — cosa c'era scritto nel browser", () => {
  it("riconosce le due scelte esplicite", () => {
    expect(interpreta("accettato")).toBe("accettato");
    expect(interpreta("rifiutato")).toBe("rifiutato");
  });

  it("chi non ha mai scelto non ha accettato", () => {
    expect(interpreta(null)).toBeNull();
  });

  it("un valore incomprensibile vale come «non ha scelto», non come consenso", () => {
    // Puo' succedere: una versione precedente, un'estensione che scrive nell'archiviazione,
    // un utente che modifica a mano. In tutti i casi si torna a chiedere.
    for (const spazzatura of ["", "  ", "si", "true", "1", "granted", "{}", "ACCETTATO ", "null", "undefined"]) {
      expect(interpreta(spazzatura), `«${spazzatura}» non deve valere come consenso`).not.toBe("accettato");
    }
  });
});

describe("analiticaAttiva — chi accende Google Analytics", () => {
  it("solo un consenso esplicito la accende", () => {
    expect(analiticaAttiva("accettato")).toBe(true);
  });

  it("il rifiuto e l'assenza di scelta la tengono spenta", () => {
    expect(analiticaAttiva("rifiutato")).toBe(false);
    expect(analiticaAttiva(null)).toBe(false);
  });
});

// Il difetto vero che questa suite esiste per non far tornare.
//
// Il banner e Analytics leggono lo stesso stato, ma nell'HTML iniziale hanno bisogno di
// difetti OPPOSTI: il banner finge che l'utente abbia scelto (per non lampeggiare),
// Analytics deve comportarsi come se non avesse scelto (per non partire). Usando una sola
// istantanea per entrambi, Analytics ereditava quella del banner e caricava gtag.js prima
// di qualunque scelta — in silenzio, e con i dati che arrivavano regolarmente.
describe("le due istantanee lato server non possono coincidere", () => {
  it("quella della raccolta vale «non ha scelto»", () => {
    expect(raccoltaSpentaSulServer()).toBeNull();
  });

  it("quella della raccolta non abilita niente", () => {
    expect(analiticaAttiva(raccoltaSpentaSulServer())).toBe(false);
  });

  it("quella del banner esiste solo per non farlo lampeggiare", () => {
    // Nasconde il riquadro nell'HTML iniziale, e proprio per questo non deve mai finire
    // in mano a un componente che raccoglie dati.
    expect(bannerNascostoSulServer()).not.toBeNull();
  });

  it("le due sono diverse, e devono restarlo", () => {
    expect(raccoltaSpentaSulServer()).not.toBe(bannerNascostoSulServer());
  });
});

describe("la chiave di archiviazione porta una versione", () => {
  it("finisce con un numero di versione", () => {
    // Serve per il giorno in cui si aggiunge una categoria: cambiando versione la scelta
    // precedente non vale piu' e la domanda si ripresenta, invece di dare per consentito
    // qualcosa su cui nessuno si e' mai espresso.
    expect(CHIAVE_CONSENSO).toMatch(/-v\d+$/);
  });
});
