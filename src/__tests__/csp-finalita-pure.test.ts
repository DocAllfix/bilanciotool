// La CSP per finalità: chi acconsente a una sola non deve poter parlare con l'altra.
//
// I due tag di Google sono combinati (misurato il 21 ottobre 2026): caricando Analytics
// parte anche Google Ads, e viceversa. La sola difesa è una politica più stretta nel
// browser. Questi test provano la regola; `qa -- consenso` prova che il browser la applica.

import { describe, it, expect } from "vitest";
import { ORIGINI_PUBBLICITA, ORIGINI_STATISTICHE, TUTTE, direttiveVariabili, fontiDaAmbiente, restrizione } from "@/lib/csp";

const FONTI = fontiDaAmbiente({ SUPABASE_URL: "https://progetto.supabase.co/x", NEXT_PUBLIC_APP_URL: "https://evalisdeck.it" });
const host = (elenco: string) => elenco.split(" ");

describe("l'intestazione permette entrambe le finalità", () => {
  const d = direttiveVariabili(FONTI, TUTTE);
  it("Google Ads è permesso (il difetto del 21 ottobre: col consenso, la CSP lo bloccava)", () => {
    for (const h of host(ORIGINI_PUBBLICITA.connect)) expect(d.connect).toContain(h);
    for (const h of host(ORIGINI_PUBBLICITA.img)) expect(d.img).toContain(h);
    expect(d.connect).toContain("https://ad.doubleclick.net");
    expect(d.connect).toContain("https://pagead2.googlesyndication.com");
  });
  it("Analytics è permesso", () => {
    for (const h of host(ORIGINI_STATISTICHE.connect)) expect(d.connect).toContain(h);
  });
  it("i Segnali Google no, nemmeno qui", () => {
    expect(`${d.connect} ${d.img}`).not.toContain("stats.g.doubleclick.net");
    expect(`${d.connect} ${d.img}`).not.toMatch(/\*\.doubleclick\.net/);
  });
  it("le origini dell'ambiente restano", () => {
    expect(d.connect).toContain("https://progetto.supabase.co");
    expect(d.img).toContain("https://evalisdeck.it");
  });
});

describe("la restrizione nel browser", () => {
  it("con entrambe le finalità non serve", () => {
    expect(restrizione(FONTI, TUTTE)).toBeNull();
  });

  it("con le sole statistiche, nessun indirizzo di Google Ads", () => {
    const r = restrizione(FONTI, { statistiche: true, pubblicita: false })!;
    for (const h of new Set([...host(ORIGINI_PUBBLICITA.connect), ...host(ORIGINI_PUBBLICITA.img), ...host(ORIGINI_PUBBLICITA.script)])) {
      expect(r, h).not.toContain(h);
    }
    expect(r).toContain("frame-src 'none'");
    for (const h of host(ORIGINI_STATISTICHE.connect)) expect(r).toContain(h);
  });

  it("con la sola pubblicità, nessun indirizzo di Analytics", () => {
    const r = restrizione(FONTI, { statistiche: false, pubblicita: true })!;
    expect(r).not.toContain("google-analytics.com");
    expect(r).not.toContain("analytics.google.com");
    expect(r).toContain("https://ad.doubleclick.net");
  });

  it("gtag si scarica comunque, per l'una e per l'altra", () => {
    for (const c of [
      { statistiche: true, pubblicita: false },
      { statistiche: false, pubblicita: true },
    ]) {
      expect(restrizione(FONTI, c)).toContain("script-src 'self' 'unsafe-inline' https://www.googletagmanager.com");
    }
  });

  it("non tocca le origini del prodotto: archivio e immagini restano raggiungibili", () => {
    const r = restrizione(FONTI, { statistiche: true, pubblicita: false })!;
    expect(r).toMatch(/connect-src 'self' https:\/\/progetto\.supabase\.co/);
    expect(r).toContain("https://cms.evalisdeck.it");
  });

  it("contiene solo direttive valide in un meta", () => {
    // `frame-ancestors`, `report-uri` e `sandbox` in un meta sono ignorate: se ci finissero,
    // si crederebbe protetto qualcosa che il browser non applica.
    const r = restrizione(FONTI, { statistiche: true, pubblicita: false })!;
    expect(r).not.toMatch(/frame-ancestors|report-uri|sandbox/);
  });
});

describe("le origini dell'ambiente", () => {
  it("senza archivio non si aggiunge niente", () => {
    expect(fontiDaAmbiente({}).archivio).toBeNull();
    expect(fontiDaAmbiente({}).canonica).toBe("https://evalisdeck.it");
  });
  it("un indirizzo storto non fa fallire il build", () => {
    expect(fontiDaAmbiente({ SUPABASE_URL: "non un url", NEXT_PUBLIC_APP_URL: "::" })).toEqual({
      archivio: null,
      canonica: "https://evalisdeck.it",
    });
  });
});
