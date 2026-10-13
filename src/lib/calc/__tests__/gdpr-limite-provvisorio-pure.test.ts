import { describe, it, expect } from "vitest";
import { limiteNotifica, limiteProvvisorio, rischioDaValutare, statoViolazione } from "@/lib/calc/gdpr/termini";
import { REGISTRI_VUOTI, statoRegistri } from "@/lib/calc/gdpr/registri";
import type { Violazione } from "@/lib/calc/gdpr/tipi";

// Le 72 ore PRIMA della valutazione del rischio.
//
// ⚠️ Il termine dell'art. 33 decorre dalla conoscenza. Il prototipo, finché il rischio era
// in bianco, non mostrava nessuna scadenza: nascondeva l'orologio a chi stava ancora
// decidendo. Segnalato dalla sessione che ha scritto il corso, che per dire il vero al
// cliente avrebbe dovuto scrivere «la scadenza non compare ma il termine corre».

const v = (p: Partial<Violazione>): Violazione => ({
  conoscenzaIl: "2026-10-24T07:30:00.000Z",
  rischio: "",
  notificataIl: null,
  comunicataIl: null,
  chiusaIl: null,
  interessati: null,
  ...p,
});
const ADESSO = new Date("2026-10-25T10:00:00.000Z");

describe("il limite provvisorio", () => {
  it("col rischio in bianco il limite c'è, ed è di 72 ore VERE a cavallo del cambio d'ora", () => {
    // Conosciuta il 24 ottobre alle 09:30 italiane (ora legale); il 25 l'ora torna solare.
    expect(limiteProvvisorio(v({}))).toBe("2026-10-27T07:30:00.000Z");
    expect(rischioDaValutare(v({}))).toBe(true);
  });

  it("non cambia gli stati: la notifica non è ancora «dovuta», quindi nessuno stato", () => {
    expect(limiteNotifica(v({}))).toBeNull();
    expect(statoViolazione(v({}), ADESSO)).toBeNull();
  });

  it("valutato il rischio, il provvisorio sparisce: «improbabile» toglie la scadenza, «rischio» la rende vera", () => {
    expect(limiteProvvisorio(v({ rischio: "Improbabile" }))).toBeNull();
    expect(limiteNotifica(v({ rischio: "Improbabile" }))).toBeNull();
    expect(limiteProvvisorio(v({ rischio: "Rischio" }))).toBeNull();
    expect(limiteNotifica(v({ rischio: "Rischio" }))).toBe("2026-10-27T07:30:00.000Z");
  });

  it("senza conoscenza non c'è niente da contare", () => {
    expect(limiteProvvisorio(v({ conoscenzaIl: null }))).toBeNull();
  });

  it("il quadro le conta finché non sono chiuse, e non le mette fra le notifiche scadute", () => {
    const r = { ...REGISTRI_VUOTI, violazioni: [v({}), v({ chiusaIl: "2026-10-25" }), v({ rischio: "Rischio" })] };
    const g = statoRegistri(r, 2026, "2026-10-25", ADESSO);
    expect(g.rischioDaValutare).toBe(1);
    expect(g.notificheInCorso).toBe(1);
    expect(g.notificheScadute).toBe(0);
  });
});
