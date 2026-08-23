import { describe, it, expect } from "vitest";
import golden from "./golden.json";
import {
  ANNI_CONSERVAZIONE,
  GG_AVVISO,
  MESI_RISCONTRO,
  avvisoEntro,
  cancellazioneEntro,
  piuGiorni,
  piuMesi,
  riscontroEntro,
} from "../termini";

// ⚠️ SCOSTAMENTO VOLUTO, e qui non è una raffinatezza: sono termini PERENTORI di legge,
// e un giorno in meno è una violazione.
//
// Il prototipo interpreta la data a mezzanotte UTC e poi la manipola in ora LOCALE.
// Misurato eseguendo il suo codice con due fusi (`scripts/golden-segnalazioni.mjs`), lo
// stesso identico input dà due risposte diverse:
//
//   avviso su 2026-03-25     UTC → 1 aprile    Roma → 31 marzo
//   riscontro su 2026-02-28  UTC → 28 maggio   Roma → 27 maggio
//
// Chi lavora in Italia riceve sempre quella più corta. Qui si calcola interamente in
// UTC: il risultato non dipende da dove si trova il browser.
//
// Il secondo difetto è il traboccamento di fine mese: `30 novembre + 3 mesi` dà **2
// marzo**, due giorni oltre la fine di febbraio. Qui si aggancia all'ultimo giorno del
// mese di arrivo, che è ciò che fanno date-fns, Luxon e l'`INTERVAL` di Postgres — e
// ciò che calcolerebbe un avvocato.
//
// ⚠️ Nel caso del 31 gennaio i due difetti si ANNULLAVANO a vicenda (Roma dava 30
// aprile, che è la risposta giusta per la ragione sbagliata). È il motivo per cui
// correggerne uno solo avrebbe peggiorato le cose.

describe("il prototipo dava due risposte diverse per fuso", () => {
  it("il golden lo registra: quattro divergenze misurate", () => {
    expect(golden.divergenze.length).toBe(4);
  });

  it("il nostro risultato non dipende dal fuso", () => {
    // Non si simula il fuso: si calcola in UTC per costruzione, e questo test dice che
    // la funzione non legge mai l'orologio locale.
    const prima = avvisoEntro("2026-03-25");
    const dopo = avvisoEntro("2026-03-25");
    expect(prima).toBe(dopo);
    expect(prima).toBe("2026-04-01");
  });
});

describe("i termini di legge", () => {
  it("le tre costanti sono quelle del decreto", () => {
    expect(GG_AVVISO).toBe(7); // art. 5 c. 1 lett. a)
    expect(MESI_RISCONTRO).toBe(3); // art. 5 c. 1 lett. d)
    expect(ANNI_CONSERVAZIONE).toBe(5); // art. 14 c. 1
  });

  it("l'avviso è a sette giorni, anche attraverso il cambio d'ora", () => {
    expect(avvisoEntro("2026-03-20")).toBe("2026-03-27");
    // Il cambio d'ora è il 29 marzo: qui il prototipo perdeva un giorno.
    expect(avvisoEntro("2026-03-25")).toBe("2026-04-01");
    expect(avvisoEntro("2026-03-29")).toBe("2026-04-05");
    // E il ritorno all'ora solare, il 25 ottobre.
    expect(avvisoEntro("2026-10-22")).toBe("2026-10-29");
  });

  it("i mesi si agganciano all'ultimo giorno, non traboccano", () => {
    expect(piuMesi("2026-01-31", 3)).toBe("2026-04-30"); // aprile ne ha 30
    expect(piuMesi("2026-11-30", 3)).toBe("2027-02-28"); // febbraio ne ha 28
    expect(piuMesi("2024-11-29", 3)).toBe("2025-02-28"); // il 2025 non è bisestile
    expect(piuMesi("2026-05-31", 3)).toBe("2026-08-31"); // agosto ne ha 31: nessun aggancio
  });

  it("gli anni si agganciano allo stesso modo", () => {
    // 29 febbraio + 5 anni: il 2031 non è bisestile.
    expect(cancellazioneEntro("2024-02-29")).toBe("2029-02-28");
    expect(cancellazioneEntro("2026-08-23")).toBe("2031-08-23");
  });
});

describe("il riscontro decorre dall'avviso EFFETTIVAMENTE reso", () => {
  it("se l'avviso c'è, i tre mesi partono da lì", () => {
    // È la regola più sottile del decreto, e il prototipo la aveva giusta: si conserva.
    expect(riscontroEntro("2026-01-10", "2026-01-12")).toBe("2026-04-12");
  });

  it("se l'avviso manca, partono dalla scadenza dei sette giorni", () => {
    // Non dalla data della segnalazione: chi non dà l'avviso non guadagna tempo, ma
    // nemmeno lo perde oltre quello che la norma gli concede.
    expect(riscontroEntro("2026-01-10", null)).toBe("2026-04-17");
    expect(avvisoEntro("2026-01-10")).toBe("2026-01-17");
  });

  it("senza data della segnalazione non c'è termine", () => {
    expect(avvisoEntro(null)).toBeNull();
    expect(riscontroEntro(null, null)).toBeNull();
    expect(cancellazioneEntro(null)).toBeNull();
  });

  it("una data impossibile non produce un termine inventato", () => {
    // `new Date("2026-02-31")` scivola al 3 marzo: da un termine perentorio non deve
    // uscire una data che nessuno ha scritto.
    expect(avvisoEntro("2026-02-31")).toBeNull();
    expect(piuGiorni("non è una data", 7)).toBeNull();
  });
});
