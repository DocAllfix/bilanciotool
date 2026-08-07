// I piani, le loro capacità e le estensioni comprate.
//
// Fino a ieri i limiti erano gli stessi per ogni studio del mondo: 10 aziende e 5 accessi,
// da `platform_config`. Col listino a quattro livelli diventano una proprietà
// dell'abbonamento, e la somma «capacità del piano + blocchi acquistati» è il numero che
// decide se una richiesta passa. Sbagliarlo significa o vendere capacità che il sistema non
// concede, o concederne a chi non l'ha pagata: si sbaglia in silenzio in tutte e due le
// direzioni, e per questo sta qui, puro e provato.

import { describe, it, expect } from "vitest";
import {
  PIANI,
  ESTENSIONI,
  CHIAVI_PIANO,
  capacitaDelPiano,
  sogliaAvviso,
  limitiEffettivi,
  euro,
} from "@/lib/prezzi";

const RISERVA = { maxActiveCompanies: 10, warnAtCompanies: 8, maxMembers: 5 };

describe("il listino", () => {
  it("ha i quattro livelli, e solo quelli", () => {
    expect(CHIAVI_PIANO).toEqual(["professional", "studio", "studio_plus", "enterprise"]);
  });

  it("le capacità crescono col prezzo", () => {
    expect(PIANI.professional.aziende).toBe(3);
    expect(PIANI.studio.aziende).toBe(10);
    expect(PIANI.studio_plus.aziende).toBe(25);
    expect(PIANI.professional.accessi).toBe(2);
    expect(PIANI.studio.accessi).toBe(5);
    expect(PIANI.studio_plus.accessi).toBe(10);
  });

  it("gli importi stanno in centesimi, mai in euro", () => {
    // Un importo in euro dentro Stripe diventa un addebito cento volte più piccolo, e non
    // se ne accorge nessuno finché non arriva il primo pagamento.
    expect(PIANI.studio.primoAnno).toBe(290000);
    expect(PIANI.studio.rinnovo).toBe(220000);
    for (const k of CHIAVI_PIANO) {
      if (PIANI[k].trattativa) continue;
      expect(PIANI[k].primoAnno % 100, `${k}: importo non tondo`).toBe(0);
      expect(PIANI[k].primoAnno).toBeGreaterThan(PIANI[k].rinnovo);
    }
  });

  it("il rinnovo costa meno del primo anno su tutti i piani vendibili", () => {
    expect(PIANI.professional.rinnovo).toBeLessThan(PIANI.professional.primoAnno);
    expect(PIANI.studio_plus.rinnovo).toBeLessThan(PIANI.studio_plus.primoAnno);
  });

  it("enterprise si tratta: nessun prezzo da vendere da solo", () => {
    expect(PIANI.enterprise.trattativa).toBe(true);
  });

  it("ogni piano vendibile ha le sue chiavi Stripe, distinte", () => {
    const chiavi = CHIAVI_PIANO.filter((k) => !PIANI[k].trattativa).flatMap((k) => [
      PIANI[k].lookupAnno1,
      PIANI[k].lookupRinnovo,
    ]);
    expect(chiavi.every(Boolean)).toBe(true);
    expect(new Set(chiavi).size, "due piani non possono condividere una chiave").toBe(chiavi.length);
  });

  it("le estensioni hanno prezzo e chiave", () => {
    expect(ESTENSIONI.bloccoAziende.aziende).toBe(5);
    expect(ESTENSIONI.bloccoAziende.prezzo).toBe(90000);
    expect(ESTENSIONI.accesso.prezzo).toBe(15000);
    expect(ESTENSIONI.whiteLabel.prezzo).toBe(60000);
  });
});

describe("sogliaAvviso — quando dire «stai per finire»", () => {
  it("avvisa a un quinto dalla fine, non a un numero fisso", () => {
    // Con l'8 fisso di prima, il piano da 3 aziende non avrebbe MAI avvisato e quello da 25
    // avrebbe avvisato al terzo di capacità: l'avviso va in proporzione.
    expect(sogliaAvviso(3)).toBe(2);
    expect(sogliaAvviso(10)).toBe(8);
    expect(sogliaAvviso(25)).toBe(20);
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
    // È il caso di chi sta ancora in demo: non ha comprato niente, e i limiti restano
    // quelli di piattaforma.
    expect(limitiEffettivi({ piano: null, aziendeExtra: 0, accessiExtra: 0 }, RISERVA)).toEqual(RISERVA);
  });

  it("il piano da solo detta le sue capacità", () => {
    expect(limitiEffettivi({ piano: "professional", aziendeExtra: 0, accessiExtra: 0 }, RISERVA)).toEqual({
      maxActiveCompanies: 3,
      warnAtCompanies: 2,
      maxMembers: 2,
    });
  });

  it("i blocchi comprati si sommano alla capacità del piano", () => {
    const l = limitiEffettivi({ piano: "professional", aziendeExtra: 10, accessiExtra: 3 }, RISERVA);
    expect(l.maxActiveCompanies).toBe(13);
    expect(l.maxMembers).toBe(5);
    // 13 aziende: si avvisa a 10, cioè con tre posti liberi — un quinto di 13, arrotondato.
    // La soglia segue il limite VERO, non quello del piano: chi ha comprato capacità in più
    // non deve vedersi l'avviso ancora tarato sul piano nudo.
    expect(l.warnAtCompanies).toBe(10);
  });

  it("enterprise parte dalla capacità più alta e ci somma il negoziato", () => {
    const l = limitiEffettivi({ piano: "enterprise", aziendeExtra: 75, accessiExtra: 40 }, RISERVA);
    expect(l.maxActiveCompanies).toBe(100);
    expect(l.maxMembers).toBe(50);
  });

  it("estensioni malformate non allargano i limiti", () => {
    // Numeri negativi o assurdi non devono poter ridurre o gonfiare la capacità: qualunque
    // valore storto vale zero, e resta la capacità del piano.
    for (const storto of [-5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const l = limitiEffettivi(
        { piano: "studio", aziendeExtra: storto, accessiExtra: storto },
        RISERVA,
      );
      expect(l.maxActiveCompanies, `extra ${storto}`).toBe(10);
      expect(l.maxMembers, `extra ${storto}`).toBe(5);
    }
  });
});

describe("euro — come si scrivono gli importi a schermo", () => {
  it("converte i centesimi senza decimali inutili", () => {
    expect(euro(290000)).toBe("2.900 €");
    expect(euro(90000)).toBe("900 €");
  });
});
