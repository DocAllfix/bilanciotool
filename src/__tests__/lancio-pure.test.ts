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
    const dopo = prezzoDiVendita(PIANI.studio, "anno1", DOMANI)!;
    expect(dopo.listino).toBeUndefined();
    expect(dopo.importo).toBe(PIANI.studio.primoAnno);
  });
});

describe("il prezzo esposto e quello addebitato sono lo stesso", () => {
  it("durante il lancio si vende al prezzo di lancio, col pieno barrato", () => {
    const p = prezzoDiVendita(PIANI.studio, "anno1", IERI)!;
    expect(p.importo).toBe(PIANI.studio.primoAnnoLancio);
    expect(p.listino).toBe(PIANI.studio.primoAnno);
    expect(p.lookup).toBe(PIANI.studio.lookupAnno1Lancio);
  });

  it("la chiave Stripe segue il prezzo, non il contrario", () => {
    // Se il codice del prezzo restasse quello pieno mentre l'importo mostrato è ridotto,
    // il cliente vedrebbe 1.450 e si vedrebbe addebitare 2.900. È IL difetto da impedire.
    for (const piano of [PIANI.professional, PIANI.studio, PIANI.studio_plus]) {
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
  it("il lancio è la metà esatta del listino", () => {
    for (const piano of [PIANI.professional, PIANI.studio, PIANI.studio_plus]) {
      expect(piano.primoAnnoLancio! * 2).toBe(piano.primoAnno);
      expect(piano.rinnovoLancio! * 2).toBe(piano.rinnovo);
    }
    for (const e of [ESTENSIONI.bloccoAziende, ESTENSIONI.accesso, ESTENSIONI.whiteLabel]) {
      expect(e.prezzoLancio * 2).toBe(e.prezzo);
    }
    expect(ESTENSIONI.avvioAssistito.minLancio * 2).toBe(ESTENSIONI.avvioAssistito.min);
  });

  it("il rinnovo resta sotto il primo anno anche in lancio", () => {
    // La struttura del listino dice al cliente che il secondo anno costa meno: se lo
    // sconto la ribaltasse, al rinnovo si troverebbe un aumento e disdirebbe.
    for (const piano of [PIANI.professional, PIANI.studio, PIANI.studio_plus]) {
      expect(piano.rinnovoLancio!).toBeLessThan(piano.primoAnnoLancio!);
    }
  });

  it("gli importi sono in centesimi, e si leggono in euro", () => {
    expect(PIANI.studio.primoAnnoLancio).toBe(145000);
    expect(euro(PIANI.studio.primoAnnoLancio!)).toBe("1.450 €");
  });
});
