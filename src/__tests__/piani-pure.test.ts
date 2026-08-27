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
    expect(PIANI.professional.aziende).toBe(5);
    expect(PIANI.studio.aziende).toBe(15);
    expect(PIANI.studio_plus.aziende).toBe(30);
    // Gli accessi sono «inclusi»: tetti alti che nessuno studio vero raggiunge, ma non
    // infiniti — un limite che il prodotto non applica e' un limite che non esiste.
    expect(PIANI.professional.accessi).toBe(15);
    expect(PIANI.studio.accessi).toBe(30);
    expect(PIANI.studio_plus.accessi).toBe(60);
  });

  it("gli importi stanno in centesimi, mai in euro", () => {
    // Un importo in euro dentro Stripe diventa un addebito cento volte più piccolo, e non
    // se ne accorge nessuno finché non arriva il primo pagamento.
    expect(PIANI.studio.primoAnno).toBe(129000);
    expect(PIANI.studio.rinnovo).toBe(103200);
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

  it("l'unica estensione ricorrente in vendita è il blocco di aziende", () => {
    // ⚠️ Accessi e marchio dello studio sono INCLUSI in ogni fascia dal 27 agosto 2026:
    // le loro chiavi vivono in `ESTENSIONI_RITIRATE`, riconosciute ma non piu' vendibili.
    expect(ESTENSIONI.bloccoAziende.aziende).toBe(5);
    expect(ESTENSIONI.bloccoAziende.prezzo).toBe(35000);
    expect(Object.keys(ESTENSIONI).sort()).toEqual(["avvioAssistito", "bloccoAziende"]);
  });

  it("⚠️ il blocco non conviene mai piu' della fascia superiore", () => {
    // Se convenisse, un cliente accumulerebbe blocchi invece di salire — e resterebbe a
    // pagare piu' del dovuto senza accorgersene, il che e' peggio di un prezzo alto.
    // Il blocco costa 70 € ad azienda, cioe' ESATTAMENTE il costo marginale del salto da
    // 5 a 15 aziende: comprare blocchi non conviene mai piu' che salire di fascia, ed e'
    // pari fino alla prima. Contro il salto da 15 a 30 (60 € ad azienda) e' piu' caro,
    // quindi chi cresce molto viene spinto a salire, com'e' giusto.
    const perAzienda = ESTENSIONI.bloccoAziende.prezzo / ESTENSIONI.bloccoAziende.aziende;
    const saltoAStudio = (PIANI.studio.primoAnno - PIANI.professional.primoAnno) / (PIANI.studio.aziende - PIANI.professional.aziende);
    const saltoAPlus = (PIANI.studio_plus.primoAnno - PIANI.studio.primoAnno) / (PIANI.studio_plus.aziende - PIANI.studio.aziende);
    expect(perAzienda).toBeGreaterThanOrEqual(saltoAStudio);
    expect(perAzienda).toBeGreaterThan(saltoAPlus);
  });
});

describe("sogliaAvviso — quando dire «stai per finire»", () => {
  it("avvisa a un quinto dalla fine, non a un numero fisso", () => {
    // Con l'8 fisso di prima, il piano da 3 aziende non avrebbe MAI avvisato e quello da 25
    // avrebbe avvisato al terzo di capacità: l'avviso va in proporzione.
    expect(sogliaAvviso(5)).toBe(4);
    expect(sogliaAvviso(15)).toBe(12);
    expect(sogliaAvviso(30)).toBe(24);
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
      maxActiveCompanies: 5,
      warnAtCompanies: 4,
      maxMembers: 15,
    });
  });

  it("i blocchi comprati si sommano alla capacità del piano", () => {
    const l = limitiEffettivi({ piano: "professional", aziendeExtra: 10, accessiExtra: 3 }, RISERVA);
    expect(l.maxActiveCompanies).toBe(15);
    // ⚠️ `accessiExtra` non si vende piu', ma continua a sommarsi: chi l'aveva comprato
    // non deve perderlo perche' abbiamo smesso di venderlo.
    expect(l.maxMembers).toBe(18);
    // 15 aziende: si avvisa a 12, cioè con tre posti liberi — un quinto di 15.
    // La soglia segue il limite VERO, non quello del piano: chi ha comprato capacità in più
    // non deve vedersi l'avviso ancora tarato sul piano nudo.
    expect(l.warnAtCompanies).toBe(12);
  });

  it("enterprise parte dalla capacità più alta e ci somma il negoziato", () => {
    const l = limitiEffettivi({ piano: "enterprise", aziendeExtra: 70, accessiExtra: 40 }, RISERVA);
    expect(l.maxActiveCompanies).toBe(100);
    expect(l.maxMembers).toBe(100);
  });

  it("estensioni malformate non allargano i limiti", () => {
    // Numeri negativi o assurdi non devono poter ridurre o gonfiare la capacità: qualunque
    // valore storto vale zero, e resta la capacità del piano.
    for (const storto of [-5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const l = limitiEffettivi(
        { piano: "studio", aziendeExtra: storto, accessiExtra: storto },
        RISERVA,
      );
      expect(l.maxActiveCompanies, `extra ${storto}`).toBe(15);
      expect(l.maxMembers, `extra ${storto}`).toBe(30);
    }
  });
});

describe("euro — come si scrivono gli importi a schermo", () => {
  it("converte i centesimi senza decimali inutili", () => {
    expect(euro(129000)).toBe("1.290 €");
    expect(euro(35000)).toBe("350 €");
  });
});
