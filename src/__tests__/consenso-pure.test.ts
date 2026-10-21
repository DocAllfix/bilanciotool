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
  interpretaPrecedente,
  analiticaAttiva,
  pubblicitaAttiva,
  daCaselle,
  CHIAVE_CONSENSO,
  bannerNascostoSulServer,
  raccoltaSpentaSulServer,
} from "@/features/consenso/stato";

describe("interpreta — cosa c'era scritto nel browser", () => {
  it("riconosce le quattro scelte esplicite", () => {
    for (const s of ["accettato", "rifiutato", "statistiche", "pubblicita"] as const) {
      expect(interpreta(s)).toBe(s);
    }
  });

  it("chi non ha mai scelto non ha accettato", () => {
    expect(interpreta(null)).toBeNull();
  });

  it("un valore incomprensibile vale come «non ha scelto», non come consenso", () => {
    // Puo' succedere: una versione precedente, un'estensione che scrive nell'archiviazione,
    // un utente che modifica a mano. In tutti i casi si torna a chiedere.
    for (const spazzatura of [
      "",
      "  ",
      "si",
      "true",
      "1",
      "granted",
      "{}",
      "ACCETTATO ",
      "null",
      "undefined",
      "Pubblicità",
      "statistiche,pubblicita",
    ]) {
      expect(interpreta(spazzatura), `«${spazzatura}» non deve valere come consenso`).toBeNull();
    }
  });
});

// ⚠️ La v1 conosceva solo «accettato»/«rifiutato», e «accettato» voleva dire le SOLE
// statistiche: chi l'ha dato non ha mai detto niente su Google Ads.
describe("la scelta della versione precedente", () => {
  it("un vecchio «accettato» non vale più: si torna a chiedere", () => {
    expect(interpretaPrecedente("accettato")).toBeNull();
  });

  it("un vecchio rifiuto resta un rifiuto", () => {
    expect(interpretaPrecedente("rifiutato")).toBe("rifiutato");
  });

  it("niente altro passa", () => {
    for (const v of [null, "", "statistiche", "pubblicita", "x"]) expect(interpretaPrecedente(v)).toBeNull();
  });
});

describe("chi accende che cosa", () => {
  it("Analytics: solo «Accetta» o le sole statistiche", () => {
    expect(analiticaAttiva("accettato")).toBe(true);
    expect(analiticaAttiva("statistiche")).toBe(true);
    expect(analiticaAttiva("pubblicita")).toBe(false);
    expect(analiticaAttiva("rifiutato")).toBe(false);
    expect(analiticaAttiva(null)).toBe(false);
  });

  it("Google Ads: solo «Accetta» o la sola pubblicità", () => {
    expect(pubblicitaAttiva("accettato")).toBe(true);
    expect(pubblicitaAttiva("pubblicita")).toBe(true);
    expect(pubblicitaAttiva("statistiche")).toBe(false);
    expect(pubblicitaAttiva("rifiutato")).toBe(false);
    expect(pubblicitaAttiva(null)).toBe(false);
  });

  it("le caselle di «Personalizza» danno la scelta che dicono", () => {
    expect(daCaselle(false, false)).toBe("rifiutato");
    expect(daCaselle(true, false)).toBe("statistiche");
    expect(daCaselle(false, true)).toBe("pubblicita");
    expect(daCaselle(true, true)).toBe("accettato");
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
    expect(pubblicitaAttiva(raccoltaSpentaSulServer())).toBe(false);
  });

  it("quella del banner esiste solo per non farlo lampeggiare, e non accende niente", () => {
    // Nasconde il riquadro nell'HTML iniziale. Finge un RIFIUTO: se finisse per errore in
    // mano a chi raccoglie, non accenderebbe niente lo stesso.
    expect(bannerNascostoSulServer()).not.toBeNull();
    expect(analiticaAttiva(bannerNascostoSulServer())).toBe(false);
    expect(pubblicitaAttiva(bannerNascostoSulServer())).toBe(false);
  });

  it("le due sono diverse, e devono restarlo", () => {
    expect(raccoltaSpentaSulServer()).not.toBe(bannerNascostoSulServer());
  });
});

describe("la chiave di archiviazione porta una versione", () => {
  it("finisce con un numero di versione, e la pubblicità l'ha fatta salire", () => {
    // Serve per il giorno in cui si aggiunge una categoria: cambiando versione la scelta
    // precedente non vale piu' e la domanda si ripresenta, invece di dare per consentito
    // qualcosa su cui nessuno si e' mai espresso.
    expect(CHIAVE_CONSENSO).toMatch(/-v\d+$/);
    expect(Number(CHIAVE_CONSENSO.match(/-v(\d+)$/)![1])).toBeGreaterThanOrEqual(2);
  });
});
