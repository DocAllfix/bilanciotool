import { describe, it, expect } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Colophon } from "@/components/documento/colophon";

// Il giorno di emissione nel colophon, che sta in fondo a TUTTI i documenti.
//
// ⚠️ Era il giorno UTC (`pubblicatoIl.slice(0, 10)`): un documento pubblicato in Italia fra
// mezzanotte e le due dichiarava il giorno prima, mentre la copertina dello stesso PDF
// diceva quello giusto. Trovato guardando un PDF emesso all'1:50 del 13 ottobre 2026.

const rendi = (pubblicatoIl: string) =>
  renderToStaticMarkup(
    h(Colophon, {
      codice: "EV-TEST-0000",
      emittente: "EvalisDeck",
      tipo: "registro_trattamenti",
      anno: 0,
      versione: 1,
      edizione: "gdpr-v1",
      pubblicatoIl,
      urlVerifica: "https://evalisdeck.it/verifica",
    }),
  );

describe("il colophon dice il giorno italiano", () => {
  it("all'1:50 italiana del 13 (in UTC è ancora il 12) dice 13", () => {
    expect(rendi("2026-10-12T23:50:00.000Z")).toContain("il 13/10/2026");
  });

  it("d'inverno lo scarto è di un'ora: alle 00:30 del 15 gennaio dice 15", () => {
    expect(rendi("2026-01-14T23:30:00.000Z")).toContain("il 15/01/2026");
  });

  it("di giorno non cambia niente", () => {
    expect(rendi("2026-10-13T10:00:00.000Z")).toContain("il 13/10/2026");
  });
});
