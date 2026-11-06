import { describe, it, expect } from "vitest";
import {
  PIANI,
  fasceVendibili,
  prezzoDiVendita,
  costoAnnuoMensile,
  risparmioAnnuo,
  risparmioMensile,
  equivalenteMensile,
  scontoPercentuale,
} from "@/lib/prezzi";

// IL BARRATO DEVE ESSERE VERO.
//
// Il numero barrato accanto all'annuale è quanto costano dodici mesi pagati col mensile:
// un'offerta che esiste e che il cliente può scegliere. Se diventasse un numero scritto a
// mano, il giorno in cui qualcuno cambia il mensile il barrato continuerebbe a promettere
// uno sconto che non c'è — pubblicità ingannevole, su una pagina pubblica.
//
// E gli arrotondamenti non sono mai a nostro favore: risparmio e sconto per DIFETTO, costo
// mensile equivalente per ECCESSO.

describe("mensile contro annuale", () => {
  it("⚠️ il barrato è sempre dodici volte il mensile in vendita", () => {
    for (const k of fasceVendibili()) {
      const p = PIANI[k];
      expect(costoAnnuoMensile(p), k).toBe(prezzoDiVendita(p, "mese")!.importo * 12);
    }
  });

  it("l'annuale costa sempre meno di dodici mesi: altrimenti non c'è niente da barrare", () => {
    for (const k of fasceVendibili()) {
      const p = PIANI[k];
      expect(prezzoDiVendita(p, "anno")!.importo, k).toBeLessThan(costoAnnuoMensile(p)!);
    }
  });

  it("i numeri della pagina, piano per piano", () => {
    // Azienda: 12 × 59 = 708; 708 − 499 = 209 l'anno; 209 / 12 = 17,4166… → 17,41 per difetto.
    expect(costoAnnuoMensile(PIANI.azienda)).toBe(70800);
    expect(risparmioAnnuo(PIANI.azienda)).toBe(20900);
    expect(risparmioMensile(PIANI.azienda)).toBe(1741);
    // 499 / 12 = 41,583… → 41,59 per eccesso.
    expect(equivalenteMensile(PIANI.azienda)).toBe(4159);
    // 209 / 708 = 29,5…% → 29 per difetto.
    expect(scontoPercentuale(PIANI.azienda)).toBe(29);

    expect(costoAnnuoMensile(PIANI.studio)).toBe(178800);
    expect(risparmioAnnuo(PIANI.studio)).toBe(48900);
    expect(scontoPercentuale(PIANI.studio)).toBe(27);

    expect(costoAnnuoMensile(PIANI.studio_plus)).toBe(274800);
    expect(risparmioAnnuo(PIANI.studio_plus)).toBe(75800);
    expect(scontoPercentuale(PIANI.studio_plus)).toBe(27);
  });

  it("⚠️ gli arrotondamenti non esagerano mai la convenienza", () => {
    for (const k of fasceVendibili()) {
      const p = PIANI[k];
      const anno = prezzoDiVendita(p, "anno")!.importo;
      const barrato = costoAnnuoMensile(p)!;
      // Il risparmio mensile, rimoltiplicato, non supera mai il risparmio vero.
      expect(risparmioMensile(p)! * 12, k).toBeLessThanOrEqual(risparmioAnnuo(p)!);
      // Il costo mensile equivalente, rimoltiplicato, non è mai inferiore all'annuale.
      expect(equivalenteMensile(p)! * 12, k).toBeGreaterThanOrEqual(anno);
      // Lo sconto dichiarato non supera mai quello vero.
      expect(scontoPercentuale(p)! / 100, k).toBeLessThanOrEqual((barrato - anno) / barrato);
    }
  });

  it("senza prezzi in vendita non c'è barrato né risparmio", () => {
    for (const k of ["enterprise", "singola", "professional"] as const) {
      expect(costoAnnuoMensile(PIANI[k]), k).toBeNull();
      expect(risparmioAnnuo(PIANI[k]), k).toBeNull();
      expect(scontoPercentuale(PIANI[k]), k).toBeNull();
    }
  });
});
