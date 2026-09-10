import { describe, expect, it } from "vitest";

import {
  GIORNO_REGISTRAZIONE,
  MESI_MISURE,
  MESI_NOTIFICA,
  giorniA,
  terminiRoadmap,
} from "@/lib/calc/nis2/roadmap";
import golden from "./nis2-golden.json";

// ⚠️ IL TERZO DIFETTO DI DATA DEL PROTOTIPO, misurato prima di scrivere il rimedio.
//
// `addM` legge `new Date("2026-01-15")` come mezzanotte UTC, ci somma i mesi in ora
// LOCALE e ristampa in UTC. Misurato lanciando lo stesso codice sotto due fusi:
//
//     2026-01-15 + 9 mesi, Europe/Rome → 2026-10-14
//     2026-01-15 + 9 mesi, UTC         → 2026-10-15
//
// Lo stesso dato produce due scadenze diverse a seconda di dove gira il codice: il
// portatile del consulente dice una cosa e le funzioni su Vercel — che girano in UTC —
// ne dicono un'altra. Su un termine posto dall'Autorita' non e' un dettaglio.

describe("le costanti sono quelle del decreto", () => {
  it("nove mesi per la notifica, diciotto per le misure, 28 febbraio per la registrazione", () => {
    expect(MESI_NOTIFICA).toBe(9);
    expect(MESI_MISURE).toBe(18);
    expect(GIORNO_REGISTRAZIONE).toBe("02-28");
  });
});

describe("terminiRoadmap", () => {
  const adesso = new Date("2026-09-07T10:00:00.000Z");

  it("nove e diciotto mesi dalla comunicazione", () => {
    const t = terminiRoadmap({ comunicazione: "2026-01-15" }, adesso);
    expect(t.notifica).toBe("2026-10-15");
    expect(t.misure).toBe("2027-07-15");
  });

  it("⚠️ il prototipo diceva un giorno prima, e dipendeva dal fuso", () => {
    expect(golden.roadmap.not).toBe("2026-10-14");
    expect(golden.roadmap.mis).toBe("2027-07-14");
    // Il nostro non dipende da niente: è lo stesso sotto qualunque fuso, e questo test
    // gira anche sotto `TZ=UTC` e `TZ=Pacific/Auckland` nel gate.
    expect(terminiRoadmap({ comunicazione: "2026-01-15" }, adesso).notifica).toBe("2026-10-15");
  });

  it("i mesi si agganciano all'ultimo giorno invece di traboccare", () => {
    // 31 maggio + 9 mesi = 28 febbraio, non il 3 marzo.
    expect(terminiRoadmap({ comunicazione: "2026-05-31" }, adesso).notifica).toBe("2027-02-28");
  });

  it("senza comunicazione non ci sono termini, e non sono zero", () => {
    const t = terminiRoadmap({ comunicazione: null }, adesso);
    expect(t.notifica).toBeNull();
    expect(t.misure).toBeNull();
  });

  it("una data che non e' una data non produce un termine", () => {
    expect(terminiRoadmap({ comunicazione: "2026-02-31" }, adesso).notifica).toBeNull();
  });

  it("i mesi si possono personalizzare, perche' alcuni settori hanno termini propri", () => {
    const t = terminiRoadmap({ comunicazione: "2026-01-15", mesiNotifica: 12 }, adesso);
    expect(t.notifica).toBe("2027-01-15");
  });

  it("la registrazione annuale: quella di quest'anno se non e' passata", () => {
    expect(terminiRoadmap({ comunicazione: null }, new Date("2026-01-10T10:00:00.000Z")).registrazione)
      .toBe("2026-02-28");
    expect(terminiRoadmap({ comunicazione: null }, new Date("2026-03-01T10:00:00.000Z")).registrazione)
      .toBe("2027-02-28");
  });

  it("il giorno della scadenza conta ancora come quest'anno", () => {
    expect(terminiRoadmap({ comunicazione: null }, new Date("2026-02-28T12:00:00.000Z")).registrazione)
      .toBe("2026-02-28");
  });

  it("⚠️ la registrazione scade il 28 febbraio ITALIANO", () => {
    // Il 28 febbraio alle 00:30 a Roma, in UTC e' ancora il 27: leggendo il fuso del
    // processo un ente vedrebbe la scadenza di quest'anno mentre gliene resta un giorno.
    expect(terminiRoadmap({ comunicazione: null }, new Date("2026-02-27T23:30:00.000Z")).registrazione)
      .toBe("2026-02-28");
    // E il primo marzo alle 00:30 a Roma la prossima e' gia' quella dell'anno dopo.
    expect(terminiRoadmap({ comunicazione: null }, new Date("2026-02-28T23:30:00.000Z")).registrazione)
      .toBe("2027-02-28");
  });
});

describe("giorniA", () => {
  const adesso = new Date("2026-09-07T14:00:00.000Z");

  it("conta i giorni interi, non le ore", () => {
    expect(giorniA("2026-09-08", adesso)).toBe(1);
    expect(giorniA("2026-09-06", adesso)).toBe(-1);
  });

  it("⚠️ una scadenza di OGGI vale zero per tutta la giornata", () => {
    // In millisecondi fra «adesso» e la mezzanotte del termine diventerebbe -1 nel
    // pomeriggio, e lo scadenzario direbbe «un giorno di ritardo» a chi e' in tempo.
    expect(giorniA("2026-09-07", adesso)).toBe(0);
    // ⚠️ 21:00 UTC, cioe' le 23:00 italiane del 7. Non 23:00 UTC: a settembre l'Italia e'
    // due ore avanti, quindi quello sarebbe gia' l'una di notte dell'8 — e la prima
    // versione di questo test lo asseriva come «ancora oggi», sbagliando lei e non il
    // codice. Il conto e' sul giorno italiano, ed e' quello che si vuole.
    expect(giorniA("2026-09-07", new Date("2026-09-07T21:00:00.000Z"))).toBe(0);
    expect(giorniA("2026-09-07", new Date("2026-09-07T22:30:00.000Z"))).toBe(-1);
  });

  it("senza scadenza, o con una data storta, non risponde", () => {
    expect(giorniA(null, adesso)).toBeNull();
    expect(giorniA("mai", adesso)).toBeNull();
  });
});
