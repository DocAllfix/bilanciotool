import { describe, it, expect } from "vitest";
import {
  CHIAVI_PIANO,
  FONDATORI,
  LOOKUP_STORICHE,
  PERIODI,
  PIANI,
  chiavePiano,
  periodoDellaChiave,
} from "@/lib/prezzi";

// CHI HA GIA' PAGATO NON DEVE ACCORGERSI CHE ABBIAMO CAMBIATO LISTINO.
//
// ⚠️ Su Stripe i prezzi sono IMMUTABILI: cambiare un importo significa creare una chiave
// nuova, e gli abbonamenti in corso continuano a puntare a quella vecchia per sempre. Il
// 6 novembre 2026 il listino è cambiato di nuovo (annuale e mensile, fasce ritirate), e in
// produzione c'è un abbonamento vivo che punta a `evalisdeck_singola_anno1_v1`.
//
// `capacitaDaAbbonamento` ricava il piano dalle righe dell'abbonamento: chiave non
// riconosciuta = nessun piano = **capacità azzerata**, al prossimo evento Stripe, a un
// cliente che paga regolarmente. Non darebbe nessun errore.

describe("le chiavi Stripe dei listini precedenti", () => {
  it("⚠️ ogni chiave storica risolve ancora al proprio piano", () => {
    for (const k of CHIAVI_PIANO) {
      for (const lookup of LOOKUP_STORICHE[k]) {
        expect(chiavePiano(lookup), `«${lookup}» non risolve più a «${k}»`).toBe(k);
      }
    }
  });

  it("⚠️ le chiavi del listino di ottobre e di settembre sono fra le storiche", () => {
    // Sono quelle che il listino precedente vendeva: chi le ha pagate deve ritrovarle.
    for (const [lookup, piano] of [
      ["evalisdeck_singola_anno1_v1", "singola"],
      ["evalisdeck_singola_rinnovo_v1", "singola"],
      ["evalisdeck_azienda_anno1_v1", "azienda"],
      ["evalisdeck_professional_anno1_v2", "professional"],
      ["evalisdeck_studio_anno1_v2", "studio"],
      ["evalisdeck_studio_rinnovo_v2", "studio"],
      ["evalisdeck_studio_plus_anno1_v2", "studio_plus"],
    ] as const) {
      expect(chiavePiano(lookup), lookup).toBe(piano);
    }
  });

  it("le chiavi del Programma Fondatori concedono ancora la loro fascia", () => {
    expect(chiavePiano(FONDATORI.lookupAnno1)).toBe(FONDATORI.piano);
    expect(chiavePiano(FONDATORI.lookupRinnovo)).toBe(FONDATORI.piano);
    expect(PIANI[FONDATORI.piano].aziende).toBe(15);
  });

  it("le chiavi in vendita oggi risolvono al proprio piano e al proprio periodo", () => {
    for (const k of CHIAVI_PIANO) {
      const v = PIANI[k].vendita;
      if (!v) continue;
      for (const periodo of PERIODI) {
        expect(chiavePiano(v[periodo].lookup), `${k} ${periodo}`).toBe(k);
        expect(periodoDellaChiave(v[periodo].lookup), `${k} ${periodo}`).toBe(periodo);
      }
    }
  });

  it("una chiave storica non dice un periodo: non la vendiamo più", () => {
    expect(periodoDellaChiave("evalisdeck_studio_anno1_v2")).toBeNull();
    expect(periodoDellaChiave(null)).toBeNull();
  });

  it("una chiave sconosciuta non risolve a nessun piano", () => {
    // Il ramo che conta al contrario: un'estensione scambiata per un piano cambierebbe la
    // capacità di chi l'ha comprata.
    expect(chiavePiano("evalisdeck_blocco_aziende_v2")).toBeNull();
    expect(chiavePiano("qualcosa_che_non_esiste")).toBeNull();
    expect(chiavePiano(null)).toBeNull();
    expect(chiavePiano("")).toBeNull();
  });

  it("nessuna chiave storica coincide con una in vendita oggi", () => {
    const inVendita = new Set(
      CHIAVI_PIANO.flatMap((k) => {
        const v = PIANI[k].vendita;
        return v ? PERIODI.map((p) => v[p].lookup) : [];
      }),
    );
    for (const k of CHIAVI_PIANO) {
      for (const lookup of LOOKUP_STORICHE[k]) {
        expect(inVendita.has(lookup), `«${lookup}» è sia storica che in vendita`).toBe(false);
      }
    }
  });

  it("⚠️ nessuna capienza è DIMINUITA rispetto al listino precedente", () => {
    // Le capienze si leggono da `PIANI[piano]`: cambiare il listino cambia anche ciò che
    // possono fare gli abbonati in corso. Verso il basso sarebbe togliere a qualcuno
    // un'azienda su cui sta lavorando, senza avvisarlo.
    const precedenti: Record<string, { aziende: number; accessi: number }> = {
      singola: { aziende: 1, accessi: 3 },
      azienda: { aziende: 1, accessi: 10 },
      professional: { aziende: 5, accessi: 15 },
      studio: { aziende: 15, accessi: 30 },
      studio_plus: { aziende: 30, accessi: 60 },
      enterprise: { aziende: 30, accessi: 60 },
    };
    for (const k of CHIAVI_PIANO) {
      expect(PIANI[k].aziende, `${k}: aziende`).toBeGreaterThanOrEqual(precedenti[k].aziende);
      expect(PIANI[k].accessi, `${k}: accessi`).toBeGreaterThanOrEqual(precedenti[k].accessi);
    }
  });
});
