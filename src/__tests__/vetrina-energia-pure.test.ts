import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  VETTORI_CATALOGO, FATTORI, USI_CATALOGO, AREE, USI_ATTIVI, RESIDUAL_MIX,
  scenarioIniziale, calcola,
} from "@/features/vetrina/energia";
import { VETTORI, RIPARTIZIONE } from "@/features/demo/scenario-energia";
import { computeVectors } from "@/lib/calc/energy/vectors";
import { numero, percentuale } from "@/features/vetrina/formato";
import { rigaPosti } from "@/features/vetrina/posti";
import { VETRINE, moduloDellaVetrina } from "@/features/vetrina/registro";

// La vetrina pubblica del Bilancio energetico gira nel browser, senza database e senza
// account. Questi controlli difendono l'unica cosa che la rende legittima: che mostri gli
// STESSI numeri del prodotto.
//
// Se divergesse, non lo scoprirebbe nessuno di noi: lo scoprirebbe il consulente che prova
// la vetrina, si registra, riapre la dimostrativa e trova consumi diversi — cioè proprio la
// persona che stavamo cercando di convincere.

describe("i cataloghi della vetrina", () => {
  it("vengono dai JSON del seme, con le cardinalità del seme", () => {
    // Gli stessi numeri che `seed-counts.db.test.ts` pretende sul database.
    expect(VETTORI_CATALOGO).toHaveLength(12);
    expect(USI_CATALOGO).toHaveLength(20);
    expect(AREE).toHaveLength(4);
    expect(FATTORI.size).toBe(12);
  });

  it("ogni vettore ha il proprio fattore, e i sottovettori sono marcati", () => {
    for (const v of VETTORI_CATALOGO) {
      expect(FATTORI.get(v.key), `manca il fattore di ${v.key}`).toBeDefined();
    }
    // `ele_go` è un DETTAGLIO dell'elettrica: entra nel market-based, mai nei totali,
    // altrimenti l'energia elettrica si conta due volte.
    expect(VETTORI_CATALOGO.find((v) => v.key === "ele_go")?.sub).toBe(true);
    expect(VETTORI_CATALOGO.find((v) => v.key === "fv")?.rinnovabile).toBe(true);
  });

  it("⚠️ il residual mix è lo stesso che il seme scrive nel database", () => {
    // Due copie di un fattore divergono in silenzio, e lo scarto si vedrebbe solo nelle
    // emissioni market-based: il posto dove nessuno guarda.
    const seme = readFileSync("scripts/seed.mjs", "utf8");
    const m = seme.match(/const RESIDUAL_MIX = "([\d.]+)"/);
    expect(m, "nel seme non si trova più RESIDUAL_MIX: la guardia va riscritta").toBeTruthy();
    expect(RESIDUAL_MIX).toBe(m![1]);
  });
});

describe("lo scenario di partenza", () => {
  it("è quello della dimostrativa, non una copia", () => {
    const s = scenarioIniziale();
    expect(s.vettori.map((v) => v.vettoreKey)).toEqual(VETTORI.map(([k]) => k));
    expect(s.celle).toHaveLength(RIPARTIZIONE.length);
    // 612.000 kWh elettrici: lo stesso numero dell'inventario GHG della dimostrativa.
    expect(s.vettori.find((v) => v.vettoreKey === "ele")?.quantita).toBe("612000");
  });

  it("accende solo gli usi finali che l'azienda ha davvero", () => {
    expect(USI_ATTIVI.length).toBeGreaterThan(0);
    expect(USI_ATTIVI.length).toBeLessThan(USI_CATALOGO.length);
    // Nessun forno fusorio: i semilavorati arrivano già colati.
    expect(USI_ATTIVI).not.toContain("U01");
  });
});

describe("il calcolo della vetrina", () => {
  const s = scenarioIniziale();
  const r = calcola(s.vettori, s.celle);

  it("i totali sono quelli del motore, non ricalcolati a parte", () => {
    const atteso = computeVectors(
      VETTORI_CATALOGO,
      s.vettori.map((v) => ({ vettoreKey: v.vettoreKey, quantita: v.quantita, costo: v.costo })),
      FATTORI,
    );
    expect(r.totali.kwh.toString()).toBe(atteso.totali.kwh.toString());
    expect(r.totali.tep.toString()).toBe(atteso.totali.tep.toString());
    expect(r.totali.co2.toString()).toBe(atteso.totali.co2.toString());
  });

  it("lo scenario quadra: ogni vettore ripartito per intero", () => {
    // È il controllo che il passo 3 mostra per primo, ed è la ragione per cui i numeri
    // d'esempio sono stati scelti così: chi apre la vetrina deve vedere un bilancio sano.
    for (const [k, q] of r.quadratura.perVettore) {
      if (!q.attivo) continue;
      expect(Number(q.residuo.toString()), `${k} non quadra`).toBe(0);
      expect(q.ok, `${k} fuori tolleranza`).toBe(true);
    }
    expect(r.quadratura.ok).toBe(r.quadratura.valutati);
  });

  it("la copertura degli usi finali è piena", () => {
    expect(Number(r.ripartizione.coperturaPct.toString())).toBeGreaterThan(99.9);
  });

  it("cambiando un consumo cambiano i totali, nella direzione giusta", () => {
    const doppio = s.vettori.map((v) => (v.vettoreKey === "ele" ? { ...v, quantita: "1224000" } : v));
    const r2 = calcola(doppio, s.celle);
    expect(Number(r2.totali.kwh.toString())).toBeGreaterThan(Number(r.totali.kwh.toString()));
    // E la quadratura se ne accorge: il ripartito non segue da solo, ed è il senso del
    // controllo — la vetrina deve saper dire «questo bilancio non chiude», come il prodotto.
    expect(r2.quadratura.perVettore.get("ele")?.ok).toBe(false);
    expect(r2.quadratura.ok).toBeLessThan(r2.quadratura.valutati);
  });

  it("le emissioni distinguono location e market, e il market usa le garanzie d'origine", () => {
    const loc = Number(r.emissioni.scope2Location.toString());
    const mkt = Number(r.emissioni.scope2Market.toString());
    expect(loc).toBeGreaterThan(0);
    // 180.000 kWh su 612.000 sono coperti da garanzie: il market-based deve venire diverso.
    expect(mkt).not.toBe(loc);
  });
});

describe("la purezza della vetrina", () => {
  it("⚠️ non importa il database, l'ambiente o una server action", () => {
    // Gira nel browser su una pagina pubblica: un import di troppo qui porta `postgres` nel
    // bundle e fa fallire il build con «Can't resolve 'fs'» — è già successo coi compensi.
    const src = readFileSync("src/features/vetrina/energia.ts", "utf8");
    // ⚠️ Si vieta il CLIENT del database, non il percorso: i cataloghi JSON stanno sotto
    // `@/lib/db/seeds/data/` e sono dati, non connessioni. Una guardia scritta sul prefisso
    // avrebbe dichiarato impura una vetrina che è pura — ed è quello che ha fatto al primo
    // colpo.
    for (const vietato of ['from "@/lib/db"', '@/lib/db/tenant', '@/lib/db/schema', '@/lib/env', '"use server"', "next/headers"]) {
      expect(src.includes(vietato), `la vetrina importa ${vietato}`).toBe(false);
    }
  });

  it("⚠️ non contiene numeri scritti a mano", () => {
    // I fattori vengono dai JSON, i consumi dallo scenario condiviso. L'unica cifra ammessa
    // è il residual mix, che ha la propria guardia qui sopra.
    const src = readFileSync("src/features/vetrina/energia.ts", "utf8")
      .split("\n")
      .filter((r) => !r.trimStart().startsWith("//") && !r.trimStart().startsWith("*"))
      .join("\n")
      .replace(/"0\.4570"/g, "");
    const cifre = src.match(/\b\d[\d.,]*\b/g) ?? [];
    expect(cifre, `cifre scritte a mano: ${cifre.join(", ")}`).toHaveLength(0);
  });
});

describe("i numeri leggibili della vetrina", () => {
  it("raggruppa le migliaia senza toLocaleString", () => {
    // La stessa ragione di `euro()`: su una pagina statica l'HTML lo scrive Node e
    // l'idratazione il browser, e due ICU diverse raggrupperebbero in due modi.
    expect(numero(1017000)).toBe("1.017.000");
    expect(numero(612000)).toBe("612.000");
    expect(numero(-1234.56, 2)).toBe("-1.234,56");
    expect(numero(0)).toBe("0");
    expect(numero(null)).toBe("—");
    expect(numero("non un numero")).toBe("—");
    expect(percentuale(99.94)).toBe("99,9%");
  });

  it("⚠️ il formattatore non usa toLocale*", () => {
    const src = readFileSync("src/features/vetrina/formato.ts", "utf8")
      .split("\n")
      .filter((r) => !r.trimStart().startsWith("//"))
      .join("\n");
    expect(src.includes("toLocale")).toBe(false);
  });
});

describe("la frase sui posti al prezzo d'introduzione", () => {
  it("dice quanti ne restano, e li accorda", () => {
    expect(rigaPosti(5, 5)).toBe("Prezzo d'introduzione: restano 5 posti su 5, poi si va a listino.");
    expect(rigaPosti(1, 5)).toBe("Prezzo d'introduzione: resta 1 posto su 5, poi si va a listino.");
  });

  it("⚠️ esauriti i posti TACE, invece di promettere un prezzo che non c'è più", () => {
    // È la regola che rende onesta l'urgenza: il sistema non deve poter diventare bugiardo
    // per inerzia, come il barrato che sparisce da solo alla scadenza della promozione.
    expect(rigaPosti(0, 5)).toBeNull();
    expect(rigaPosti(-2, 5)).toBeNull();
  });

  it("se il contatore non risponde non inventa niente", () => {
    expect(rigaPosti(null, 5)).toBeNull();
  });
});
