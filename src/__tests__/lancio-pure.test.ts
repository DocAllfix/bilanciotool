import { describe, it, expect } from "vitest";
import {
  PIANI,
  ESTENSIONI,
  FINE_LANCIO,
  lancioAttivo,
  prezzoDiVendita,
  euro,
} from "@/lib/prezzi";

// Il prezzo di lancio e il listino barrato.
//
// Qui si sbaglia in un modo solo, ma è quello che si scopre dall'estratto conto di un
// cliente: mostrare un numero e addebitarne un altro. Per questo il prezzo esposto e
// quello mandato a Stripe escono dalla STESSA funzione, e i test lo verificano invece
// di fidarsi.


/**
 * Un piano finto CON promozione.
 *
 * ⚠️ Dal 27 agosto 2026 nessun piano vero ha prezzi di lancio: il listino e' uno solo.
 * Il MECCANISMO pero' resta nel codice, e serve la prossima volta che si fa una
 * promozione — quindi resta provato qui, su dati costruiti apposta, invece di sparire
 * insieme ai dati. Un meccanismo senza test e' un meccanismo che al primo riuso si
 * scopre rotto.
 */
const IN_PROMOZIONE = {
  key: "studio" as const,
  nome: "Finto in promozione",
  descrizione: "Esiste solo in questo test.",
  aziende: 15,
  accessi: 30,
  primoAnno: 200000,
  rinnovo: 160000,
  primoAnnoLancio: 100000,
  rinnovoLancio: 80000,
  lookupAnno1: "finto_anno1",
  lookupRinnovo: "finto_rinnovo",
  lookupAnno1Lancio: "finto_anno1_lancio",
  lookupRinnovoLancio: "finto_rinnovo_lancio",
};

const IERI = new Date(FINE_LANCIO.getTime() - 86_400_000);
const DOMANI = new Date(FINE_LANCIO.getTime() + 86_400_000);

describe("promozione di lancio", () => {
  it("è attiva fino alla data dichiarata, e non oltre", () => {
    expect(lancioAttivo(IERI)).toBe(true);
    expect(lancioAttivo(DOMANI)).toBe(false);
  });

  it("scaduta la data, il barrato sparisce DA SOLO", () => {
    // È l'invariante che tiene onesto il sistema anche se nessuno interviene: alla
    // scadenza si mostra il prezzo vero senza sconto, mai il pieno addebitando il ridotto.
    const dopo = prezzoDiVendita(IN_PROMOZIONE, "anno1", DOMANI)!;
    expect(dopo.listino).toBeUndefined();
    expect(dopo.importo).toBe(IN_PROMOZIONE.primoAnno);
  });
});

describe("il prezzo esposto e quello addebitato sono lo stesso", () => {
  it("durante il lancio si vende al prezzo di lancio, col pieno barrato", () => {
    const p = prezzoDiVendita(IN_PROMOZIONE, "anno1", IERI)!;
    expect(p.importo).toBe(IN_PROMOZIONE.primoAnnoLancio);
    expect(p.listino).toBe(IN_PROMOZIONE.primoAnno);
    expect(p.lookup).toBe(IN_PROMOZIONE.lookupAnno1Lancio);
  });

  it("la chiave Stripe segue il prezzo, non il contrario", () => {
    // Se il codice del prezzo restasse quello pieno mentre l'importo mostrato è ridotto,
    // il cliente vedrebbe 1.450 e si vedrebbe addebitare 2.900. È IL difetto da impedire.
    for (const piano of [IN_PROMOZIONE]) {
      for (const fase of ["anno1", "rinnovo"] as const) {
        const durante = prezzoDiVendita(piano, fase, IERI)!;
        const dopo = prezzoDiVendita(piano, fase, DOMANI)!;
        expect(durante.lookup).not.toBe(dopo.lookup);
        expect(durante.importo).toBeLessThan(dopo.importo);
      }
    }
  });

  it("Enterprise resta a trattativa: nessun prezzo, né pieno né scontato", () => {
    expect(prezzoDiVendita(PIANI.enterprise, "anno1", IERI)).toBeNull();
  });
});

describe("gli importi", () => {
  it("⚠️ oggi NON c'e' nessuna promozione: si vende il listino, senza barrato", () => {
    // Il meccanismo del lancio resta nel codice — serve la prossima volta — ma i dati non
    // hanno piu' prezzi scontati. `prezzoDiVendita` deve quindi restituire il pieno e
    // NESSUN listino da barrare: un barrato senza uno sconto vero e' pubblicita'
    // ingannevole, ed e' vietata anche fra professionisti.
    for (const piano of [PIANI.professional, PIANI.studio, PIANI.studio_plus]) {
      for (const fase of ["anno1", "rinnovo"] as const) {
        const v = prezzoDiVendita(piano, fase)!;
        expect(v.importo).toBe(fase === "anno1" ? piano.primoAnno : piano.rinnovo);
        expect(v.listino, `${piano.key}/${fase}: barrato senza sconto`).toBeUndefined();
      }
    }
  });

  it("il rinnovo costa meno del primo anno, in ogni fascia", () => {
    // La struttura del listino dice al cliente che il secondo anno costa meno: se si
    // ribaltasse, al rinnovo si troverebbe un aumento e disdirebbe.
    for (const piano of [PIANI.professional, PIANI.studio, PIANI.studio_plus]) {
      expect(piano.rinnovo).toBeLessThan(piano.primoAnno);
    }
  });

  it("il rinnovo e' esattamente il 20% in meno del primo anno", () => {
    for (const piano of [PIANI.professional, PIANI.studio, PIANI.studio_plus]) {
      expect(piano.rinnovo).toBe(Math.round(piano.primoAnno * 0.8));
    }
  });
});
