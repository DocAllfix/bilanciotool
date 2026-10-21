// Il conteggio degli arrivi da campagna: che cosa entra, e soprattutto che cosa NO.
//
// È senza consenso perché non conserva niente di chi arriva. Questi test difendono proprio
// quella condizione: il valore del gclid non esce, le pagine con un token non si contano,
// e ciò che arriva alla rotta da chiunque viene ripulito.

import { describe, it, expect } from "vitest";
import { arrivoDaIndirizzo, normalizzaArrivo, NESSUNO } from "@/lib/calc/arrivi";

describe("dall'indirizzo all'arrivo", () => {
  it("un clic da Google Ads con i parametri di campagna", () => {
    expect(arrivoDaIndirizzo("?gclid=ABC123&utm_source=google&utm_medium=cpc&utm_campaign=Bilancio GHG", "/")).toEqual({
      sorgente: "google",
      mezzo: "cpc",
      campagna: "bilancio_ghg",
      clicAds: true,
      pagina: "/",
    });
  });

  it("un clic da Google Ads senza utm: sorgente e mezzo si deducono", () => {
    expect(arrivoDaIndirizzo("?gclid=ABC123", "/prezzi")).toEqual({
      sorgente: "google",
      mezzo: "cpc",
      campagna: NESSUNO,
      clicAds: true,
      pagina: "/prezzi",
    });
  });

  it("gbraid e wbraid valgono come clic di Google Ads", () => {
    expect(arrivoDaIndirizzo("?gbraid=x", "/")?.clicAds).toBe(true);
    expect(arrivoDaIndirizzo("?wbraid=x", "/")?.clicAds).toBe(true);
  });

  it("una campagna non di Google", () => {
    expect(arrivoDaIndirizzo("?utm_source=linkedin&utm_medium=social", "/blog/articolo")).toMatchObject({
      sorgente: "linkedin",
      mezzo: "social",
      campagna: NESSUNO,
      clicAds: false,
    });
  });

  it("una visita qualunque non si conta", () => {
    expect(arrivoDaIndirizzo("", "/")).toBeNull();
    expect(arrivoDaIndirizzo("?ref=x&q=bilancio", "/")).toBeNull();
    expect(arrivoDaIndirizzo("?utm_medium=cpc", "/")).toBeNull();
    expect(arrivoDaIndirizzo("?gclid=", "/")).toBeNull();
  });

  it("⚠️ il valore del gclid non esce mai", () => {
    const a = arrivoDaIndirizzo("?gclid=SEGRETO-DEL-CLIC&utm_source=google", "/");
    expect(JSON.stringify(a)).not.toContain("SEGRETO");
  });

  it("⚠️ le pagine con un token nell'indirizzo non si contano", () => {
    expect(arrivoDaIndirizzo("?utm_source=email", "/reimposta-password")).toBeNull();
    expect(arrivoDaIndirizzo("?utm_source=email", "/documenti-cliente/tok-123")).toBeNull();
    expect(arrivoDaIndirizzo("?utm_source=email", "/accept-invitation/abc")).toBeNull();
    expect(arrivoDaIndirizzo("?utm_source=email", "/documento/abc")).toBeNull();
  });
});

describe("ciò che arriva alla rotta si ripulisce", () => {
  const base = { sorgente: "google", mezzo: "cpc", campagna: "x", clicAds: true, pagina: "/" };

  it("i valori si accorciano", () => {
    const a = normalizzaArrivo({ ...base, sorgente: "s".repeat(500), campagna: "c".repeat(500), pagina: "/" + "p".repeat(500) })!;
    expect(a.sorgente.length).toBe(60);
    expect(a.campagna.length).toBe(80);
    expect(a.pagina.length).toBe(120);
  });

  it("i caratteri strani diventano trattini", () => {
    expect(normalizzaArrivo({ ...base, campagna: "<script>alert(1)</script>" })!.campagna).not.toMatch(/[<>()/]/);
  });

  it("parametri e frammento della pagina si tolgono", () => {
    expect(normalizzaArrivo({ ...base, pagina: "/prezzi?gclid=SEGRETO#x" })!.pagina).toBe("/prezzi");
  });

  it("ciò che non è un arrivo viene rifiutato", () => {
    expect(normalizzaArrivo(null)).toBeNull();
    expect(normalizzaArrivo("testo")).toBeNull();
    expect(normalizzaArrivo({ ...base, sorgente: "" })).toBeNull();
    expect(normalizzaArrivo({ ...base, pagina: "https://altro.it/" })).toBeNull();
    expect(normalizzaArrivo({ ...base, clicAds: "sì" })).toBeNull();
  });
});
