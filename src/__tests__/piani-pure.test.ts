import { describe, it, expect } from "vitest";
import {
  CHIAVI_PIANO,
  PIANI,
  PERIODI,
  euro,
  fasceVendibili,
  fasceConsulenti,
  inVendita,
  prezzoDiVendita,
  prezzoMinimoMensile,
  quanteFasceInLettere,
  sogliaAvviso,
  limitiEffettivi,
  aziendeTesto,
  type Limiti,
} from "@/lib/prezzi";

// IL LISTINO DEL 6 NOVEMBRE 2026, deciso dal committente.
//
// Tre piani in vendita, annuale o mensile, sempre allo stesso prezzo. Questi numeri sono la
// specifica: se cambiano, cambia ciò che Stripe addebita, e il test deve dirlo.

const RISERVA: Limiti = { maxActiveCompanies: 10, warnAtCompanies: 8, maxMembers: 5 };

describe("il listino in vendita", () => {
  it("si vendono Azienda e le due fasce Consulenti, in quest'ordine", () => {
    expect(fasceVendibili()).toEqual(["azienda", "studio", "studio_plus"]);
    expect(fasceConsulenti()).toEqual(["studio", "studio_plus"]);
    expect(quanteFasceInLettere()).toBe("Tre");
  });

  it("gli importi sono quelli decisi, in centesimi", () => {
    const attesi: Record<string, [number, number]> = {
      azienda: [49900, 5900],
      studio: [129900, 14900],
      studio_plus: [199000, 22900],
    };
    for (const [k, [anno, mese]] of Object.entries(attesi)) {
      const p = PIANI[k as keyof typeof PIANI];
      expect(prezzoDiVendita(p, "anno")?.importo, `${k} annuale`).toBe(anno);
      expect(prezzoDiVendita(p, "mese")?.importo, `${k} mensile`).toBe(mese);
    }
    expect(euro(199000)).toBe("1.990 €");
    expect(prezzoMinimoMensile()).toBe(5900);
  });

  it("le capienze sono quelle di sempre", () => {
    expect([PIANI.azienda.aziende, PIANI.azienda.accessi]).toEqual([1, 10]);
    expect([PIANI.studio.aziende, PIANI.studio.accessi]).toEqual([15, 30]);
    expect([PIANI.studio_plus.aziende, PIANI.studio_plus.accessi]).toEqual([30, 60]);
    expect(PIANI.azienda.usoInterno).toBe(true);
    expect(PIANI.azienda.pubblico).toBe("azienda");
  });

  it("⚠️ i piani ritirati e Enterprise NON hanno un prezzo da addebitare", () => {
    // È l'interruttore della vendita: senza `vendita`, il checkout non trova niente da
    // mettere in cassa nemmeno se qualcuno forza la richiesta.
    for (const k of ["singola", "professional", "enterprise"] as const) {
      expect(inVendita(k), k).toBe(false);
      for (const periodo of PERIODI) expect(prezzoDiVendita(PIANI[k], periodo), `${k} ${periodo}`).toBeNull();
    }
  });

  it("ogni chiave Stripe in vendita è unica e dice il proprio periodo", () => {
    const chiavi = fasceVendibili().flatMap((k) => PERIODI.map((p) => prezzoDiVendita(PIANI[k], p)!.lookup));
    expect(new Set(chiavi).size).toBe(chiavi.length);
    for (const k of fasceVendibili()) {
      expect(PIANI[k].vendita!.anno.lookup).toMatch(/_anno_v\d+$/);
      expect(PIANI[k].vendita!.mese.lookup).toMatch(/_mese_v\d+$/);
    }
  });

  it("le chiavi di piano non si perdono: il CHECK del database le contiene tutte", () => {
    expect([...CHIAVI_PIANO].sort()).toEqual(["azienda", "enterprise", "professional", "singola", "studio", "studio_plus"]);
  });
});

describe("sogliaAvviso — quando dire «stai per finire»", () => {
  it("avvisa a un quinto dalla fine, non a un numero fisso", () => {
    expect(sogliaAvviso(5)).toBe(4);
    expect(sogliaAvviso(15)).toBe(12);
    expect(sogliaAvviso(30)).toBe(24);
    expect(sogliaAvviso(PIANI.azienda.aziende)).toBe(1);
  });

  it("non avvisa mai a zero né sopra il limite", () => {
    for (const limite of [1, 2, 3, 5, 10, 25, 40]) {
      const s = sogliaAvviso(limite);
      expect(s, `limite ${limite}`).toBeGreaterThanOrEqual(1);
      expect(s, `limite ${limite}`).toBeLessThanOrEqual(limite);
    }
  });
});

describe("limitiEffettivi — capacità del piano più quello che si è comprato", () => {
  it("senza piano si torna ai valori di riserva", () => {
    expect(limitiEffettivi({ piano: null, aziendeExtra: 0, accessiExtra: 0 }, RISERVA)).toEqual(RISERVA);
  });

  it("il piano da solo detta le sue capacità, anche se ritirato", () => {
    // ⚠️ Un piano ritirato dalla vendita resta riconosciuto: chi l'ha pagato lo conserva.
    expect(limitiEffettivi({ piano: "professional", aziendeExtra: 0, accessiExtra: 0 }, RISERVA)).toEqual({
      maxActiveCompanies: 5,
      warnAtCompanies: 4,
      maxMembers: 15,
    });
    expect(limitiEffettivi({ piano: "singola" }, RISERVA).maxActiveCompanies).toBe(1);
  });

  it("le estensioni comprate in passato si sommano ancora", () => {
    // ⚠️ Blocchi e accessi non si vendono più, ma chi li ha comprati non deve perderli.
    const l = limitiEffettivi({ piano: "studio", aziendeExtra: 10, accessiExtra: 3 }, RISERVA);
    expect(l.maxActiveCompanies).toBe(25);
    expect(l.maxMembers).toBe(33);
    expect(l.warnAtCompanies).toBe(20);
  });

  it("enterprise parte dalla capacità più alta e ci somma il negoziato", () => {
    const l = limitiEffettivi({ piano: "enterprise", aziendeExtra: 70, accessiExtra: 40 }, RISERVA);
    expect(l.maxActiveCompanies).toBe(100);
    expect(l.maxMembers).toBe(100);
  });

  it("estensioni malformate non allargano i limiti", () => {
    for (const storto of [-5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const l = limitiEffettivi({ piano: "studio", aziendeExtra: storto, accessiExtra: storto }, RISERVA);
      expect(l.maxActiveCompanies, `extra ${storto}`).toBe(15);
      expect(l.maxMembers, `extra ${storto}`).toBe(30);
    }
  });
});

describe("euro e aziendeTesto — come si scrivono a schermo", () => {
  it("converte i centesimi senza decimali inutili, e con entrambi quando ci sono", () => {
    expect(euro(129900)).toBe("1.299 €");
    expect(euro(5900)).toBe("59 €");
    expect(euro(4159)).toBe("41,59 €");
    expect(euro(4150)).toBe("41,50 €");
  });

  it("il singolare di azienda", () => {
    expect(aziendeTesto(1)).toBe("1 azienda");
    expect(aziendeTesto(15)).toBe("15 aziende");
  });
});
