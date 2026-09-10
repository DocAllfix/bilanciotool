import { describe, expect, it } from "vitest";

import {
  H_PRE_NOTIFICA,
  H_NOTIFICA,
  MESI_RELAZIONE,
  piuOre,
  piuMesiDaIstante,
  scadenze,
  statoTermine,
  type Incidente,
} from "@/lib/calc/nis2/termini";
import golden from "./nis2-golden.json";

// I TERMINI DELL'ART. 25 DEL D.LGS. 138/2024, e l'aritmetica che li produce.
//
// Sono l'unica cosa PERENTORIA del modulo: 24 ore per la pre-notifica, 72 per la
// notifica, un mese per la relazione finale. Tutto il resto di NIS2 si recupera; un
// termine mancato no.
//
// ⚠️ E' QUI CHE DIVERGIAMO DAL PROTOTIPO, DI PROPOSITO E CON DUE NUMERI MISURATI.
//
// Il prototipo somma le ore con `setHours(d.getHours() + 24)`, che aggiunge 24 all'ORA
// DELL'OROLOGIO e non 24 ore. Misurato nel fuso italiano:
//
//   28 marzo 2026, 23:00  +24h → 29 marzo 23:00   = 23 ORE REALI   (un'ora tolta)
//   24 ottobre 2026, 23:00 +24h → 25 ottobre 23:00 = 25 ORE REALI
//
// Su un termine perentorio un'ora in meno e' una violazione, e chi la subisce non ha modo
// di accorgersene: il prodotto gli dice che e' nei termini.
//
// E somma i mesi con `setMonth(+1)`, che TRABOCCA:
//
//   31 gennaio + 1 mese → 3 marzo      (deve essere il 28 febbraio)
//   31 marzo   + 1 mese → 1 maggio     (deve essere il 30 aprile)
//   31 agosto  + 1 mese → 1 ottobre    (deve essere il 30 settembre)
//
// Qui: le ore sono millisecondi UTC, esatte ovunque giri il codice; i mesi si agganciano
// all'ultimo giorno, come calcolano date-fns, Luxon e l'`INTERVAL` di Postgres — e come
// calcolerebbe un avvocato.

const ISTANTE = "2026-09-06T08:00:00.000Z";

describe("le costanti sono quelle del decreto", () => {
  it("24 ore, 72 ore, un mese", () => {
    expect(H_PRE_NOTIFICA).toBe(24);
    expect(H_NOTIFICA).toBe(72);
    expect(MESI_RELAZIONE).toBe(1);
  });

  it("coincidono con quelle del prototipo", () => {
    expect(golden.termini.ore.preNotifica).toBe(H_PRE_NOTIFICA);
    expect(golden.termini.ore.notifica).toBe(H_NOTIFICA);
    expect(golden.termini.ore.mesiRelazione).toBe(MESI_RELAZIONE);
  });
});

describe("piuOre · millisecondi UTC, non ore d'orologio", () => {
  it("somma esattamente, anche attraverso il passaggio all'ora legale", () => {
    // 28 marzo 2026 23:00 italiane = 22:00 UTC. Ventiquattro ore dopo sono le 22:00 UTC
    // del 29, cioe' MEZZANOTTE del 30 in Italia — non le 23:00 del 29.
    const dopo = piuOre("2026-03-28T22:00:00.000Z", 24);
    expect(dopo).toBe("2026-03-29T22:00:00.000Z");
    expect(new Date(dopo!).getTime() - new Date("2026-03-28T22:00:00.000Z").getTime())
      .toBe(24 * 3_600_000);
  });

  it("e anche attraverso il ritorno all'ora solare", () => {
    const da = "2026-10-24T21:00:00.000Z";
    const dopo = piuOre(da, 24)!;
    expect(new Date(dopo).getTime() - new Date(da).getTime()).toBe(24 * 3_600_000);
  });

  it("⚠️ dove il prototipo sbagliava, ora sono 24 ore vere", () => {
    // Il golden registra che cosa faceva il prototipo. Non lo si imita.
    const suoRisultato = golden.termini.oreDalProtipo[0];
    expect(suoRisultato.da).toBe("2026-03-28T23:00");
    expect(suoRisultato.piu24).toBe("2026-03-29T23:00"); // 23 ore reali, in Italia
    // Il nostro, sullo stesso istante, cade un'ora piu' in la'.
    expect(piuOre("2026-03-28T21:00:00.000Z", 24)).toBe("2026-03-29T21:00:00.000Z");
  });

  it("un istante che non e' un istante non produce un termine", () => {
    expect(piuOre("", 24)).toBeNull();
    expect(piuOre(null, 24)).toBeNull();
    expect(piuOre("non una data", 24)).toBeNull();
  });
});

describe("piuMesiDaIstante · i mesi si agganciano, non traboccano", () => {
  // I quattro casi misurati sul prototipo: tre traboccano, il quarto va bene per caso.
  const casi = [
    { da: "2026-01-31T10:00:00.000Z", nostro: "2026-02-28", protipo: "2026-03-03" },
    { da: "2026-03-31T10:00:00.000Z", nostro: "2026-04-30", protipo: "2026-05-01" },
    { da: "2026-08-31T10:00:00.000Z", nostro: "2026-09-30", protipo: "2026-10-01" },
    { da: "2026-12-31T10:00:00.000Z", nostro: "2027-01-31", protipo: "2027-01-31" },
  ];

  it.each(casi)("$da + 1 mese → $nostro (il prototipo diceva $protipo)", (c) => {
    expect(piuMesiDaIstante(c.da, 1)!.slice(0, 10)).toBe(c.nostro);
  });

  it("il golden conferma che il prototipo faceva davvero cosi'", () => {
    // ⚠️ Se un domani il prototipo venisse corretto, questa asserzione diventerebbe rossa
    // e il commento in testa al file smetterebbe di dire il vero. E' il modo di accorgersi
    // che una divergenza dichiarata non e' piu' una divergenza.
    const dal = Object.fromEntries(golden.termini.mesiDalProtipo.map((m) => [m.da, m.piuUnMese]));
    expect(dal["2026-01-31T10:00"]).toBe("2026-03-03T10:00");
    expect(dal["2026-03-31T10:00"]).toBe("2026-05-01T10:00");
  });

  it("l'ora del giorno si conserva", () => {
    // Un mese da una notifica delle 14:30 scade alle 14:30, non a mezzanotte.
    expect(piuMesiDaIstante("2026-01-15T13:30:00.000Z", 1)).toBe("2026-02-15T13:30:00.000Z");
  });

  it("il 29 febbraio di un anno bisestile", () => {
    expect(piuMesiDaIstante("2028-01-31T10:00:00.000Z", 1)!.slice(0, 10)).toBe("2028-02-29");
  });
});

describe("scadenze · i tre termini di un incidente", () => {
  const incidente: Incidente = {
    significativo: true,
    conoscenzaIl: ISTANTE,
    preNotificaIl: null,
    notificaIl: null,
    relazioneIl: null,
  };

  it("pre-notifica a 24 ore, notifica a 72, dalla conoscenza", () => {
    const s = scadenze(incidente);
    expect(s.preNotifica).toBe("2026-09-07T08:00:00.000Z");
    expect(s.notifica).toBe("2026-09-09T08:00:00.000Z");
  });

  it("gli stessi due termini del prototipo, letti sul suo orologio", () => {
    // Il prototipo lavora in ora locale; il confronto si fa sull'istante, non sulla
    // stringa. 2026-09-06T08:00 italiane = 06:00 UTC.
    const s = scadenze({ ...incidente, conoscenzaIl: "2026-09-06T06:00:00.000Z" });
    expect(s.preNotifica!.slice(0, 10)).toBe(golden.termini.preNotifica.slice(0, 10));
    expect(s.notifica!.slice(0, 10)).toBe(golden.termini.notifica.slice(0, 10));
  });

  it("⚠️ la relazione finale decorre dalla NOTIFICA, non dalla conoscenza", () => {
    // Senza notifica non c'e' termine per la relazione, ed e' cosi' anche nel prototipo:
    // farla decorrere dalla conoscenza inventerebbe una scadenza che il decreto non pone.
    expect(scadenze(incidente).relazione).toBeNull();
    expect(golden.termini.relazione).toBe("");

    const conNotifica = scadenze({ ...incidente, notificaIl: "2026-09-08T10:00:00.000Z" });
    expect(conNotifica.relazione).toBe("2026-10-08T10:00:00.000Z");
  });

  it("un incidente non significativo non ha termini", () => {
    const s = scadenze({ ...incidente, significativo: false });
    expect(s).toEqual({ preNotifica: null, notifica: null, relazione: null });
  });
});

describe("statoTermine", () => {
  const base: Incidente = {
    significativo: true,
    conoscenzaIl: ISTANTE,
    preNotificaIl: null,
    notificaIl: null,
    relazioneIl: null,
  };
  // Scadenza della pre-notifica: 2026-09-07T08:00Z.
  const adesso = (s: string) => new Date(s);

  it("adempiuto in tempo → nei termini", () => {
    const i = { ...base, preNotificaIl: "2026-09-07T07:00:00.000Z" };
    expect(statoTermine(i, "preNotifica", adesso("2026-09-08T00:00:00.000Z"))).toBe("nei_termini");
  });

  it("adempiuto in ritardo → fuori termine, e resta scritto", () => {
    // ⚠️ Non diventa «nei termini» perche' e' stato fatto: un adempimento tardivo e' un
    // fatto che il documento deve riportare, ed e' cio' che l'Autorita' guarda.
    const i = { ...base, preNotificaIl: "2026-09-07T09:00:00.000Z" };
    expect(statoTermine(i, "preNotifica", adesso("2026-09-08T00:00:00.000Z"))).toBe("fuori_termine");
  });

  it("non adempiuto e termine passato → scaduto", () => {
    expect(statoTermine(base, "preNotifica", adesso("2026-09-07T09:00:00.000Z"))).toBe("scaduto");
  });

  it("non adempiuto, poche ore alla scadenza → in scadenza", () => {
    // La finestra d'allarme e' un quarto del termine: sei ore sulle ventiquattro.
    expect(statoTermine(base, "preNotifica", adesso("2026-09-07T04:00:00.000Z"))).toBe("in_scadenza");
  });

  it("non adempiuto, ancora tempo → in corso", () => {
    expect(statoTermine(base, "preNotifica", adesso("2026-09-06T10:00:00.000Z"))).toBe("in_corso");
  });

  it("non significativo → non applicabile", () => {
    expect(statoTermine({ ...base, significativo: false }, "preNotifica", adesso(ISTANTE)))
      .toBe("non_applicabile");
  });

  it("gli stessi tre stati che dava il prototipo sul suo caso", () => {
    // Conoscenza a ieri: pre-notifica in scadenza, notifica in corso, relazione non
    // applicabile perche' la notifica non c'e' ancora.
    const i = { ...base, conoscenzaIl: "2026-09-06T06:00:00.000Z" };
    // ⚠️ LO STESSO ISTANTE congelato nel golden, non uno simile: due momenti diversi
    // possono cadere in due finestre diverse, e il confronto direbbe «divergono»
    // mentre sta parlando di due cose.
    const oggi = adesso(golden.adessoCongelato);
    const nostri = {
      pre: statoTermine(i, "preNotifica", oggi),
      not: statoTermine(i, "notifica", oggi),
      rel: statoTermine(i, "relazione", oggi),
    };
    const suoi = Object.fromEntries(golden.termini.stati.map((s) => [s.quale, s.stato]));
    expect(nostri.pre).toBe("in_scadenza");
    expect(suoi.pre).toBe("scadenza");
    expect(nostri.not).toBe("in_corso");
    expect(suoi.not).toBe("termini");
    expect(nostri.rel).toBe("non_applicabile");
    expect(suoi.rel).toBe("na");
  });
});
