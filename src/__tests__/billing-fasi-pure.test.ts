import { describe, it, expect } from "vitest";
import { vociDelRinnovo, type RigaAbbonamento } from "@/features/billing/fasi";
import { PIANI, ESTENSIONI, ESTENSIONI_RITIRATE, LOOKUP_STORICHE } from "@/lib/prezzi";

// Che cosa si paga dal rinnovo in poi.
//
// È la funzione che decide quanto pagherà un cliente per gli anni a venire, e l'errore
// che copre è già successo: la fase di rinnovo conteneva solo il piano, quindi le
// estensioni sparivano al primo rinnovo — soldi non incassati da una parte, capacità
// tolta senza avviso dall'altra.

const RINNOVO = "price_rinnovo_studio";

const riga = (lookup: string | null, opts: Partial<RigaAbbonamento> = {}): RigaAbbonamento => ({
  priceId: `price_${lookup ?? "ignoto"}`,
  lookupKey: lookup,
  quantita: 1,
  ricorrente: true,
  ...opts,
});

describe("le righe della fase di rinnovo", () => {
  it("un piano da solo diventa il solo prezzo di rinnovo", () => {
    const v = vociDelRinnovo([riga(LOOKUP_STORICHE.studio[2])], RINNOVO);
    expect(v).toEqual([{ price: RINNOVO, quantity: 1 }]);
  });

  it("le estensioni si portano dietro, con la loro quantità", () => {
    const v = vociDelRinnovo(
      [
        riga(LOOKUP_STORICHE.studio[2]),
        riga(ESTENSIONI_RITIRATE.bloccoAziendeV1.lookupLancio, { quantita: 3 }),
        riga(ESTENSIONI_RITIRATE.accesso.lookupLancio, { quantita: 4 }),
        riga(ESTENSIONI_RITIRATE.whiteLabel.lookupLancio),
      ],
      RINNOVO,
    );
    expect(v).toEqual([
      { price: RINNOVO, quantity: 1 },
      { price: `price_${ESTENSIONI_RITIRATE.bloccoAziendeV1.lookupLancio}`, quantity: 3 },
      { price: `price_${ESTENSIONI_RITIRATE.accesso.lookupLancio}`, quantity: 4 },
      { price: `price_${ESTENSIONI_RITIRATE.whiteLabel.lookupLancio}`, quantity: 1 },
    ]);
  });

  it("l'estensione comprata al prezzo di lancio resta a quel prezzo", () => {
    // Stesso trattamento del piano, che al rinnovo tiene il ridotto: si porta dietro
    // l'ID del prezzo, non si ricalcola dal listino.
    const v = vociDelRinnovo(
      [riga(LOOKUP_STORICHE.studio[2]), riga(ESTENSIONI_RITIRATE.accesso.lookupLancio, { quantita: 2 })],
      RINNOVO,
    );
    expect(v[1].price).toBe(`price_${ESTENSIONI_RITIRATE.accesso.lookupLancio}`);
  });

  it("un addebito una tantum NON si ripete al rinnovo", () => {
    const v = vociDelRinnovo(
      [
        riga(LOOKUP_STORICHE.studio[2]),
        riga(ESTENSIONI.avvioAssistito.lookup, { ricorrente: false }),
      ],
      RINNOVO,
    );
    expect(v).toEqual([{ price: RINNOVO, quantity: 1 }]);
  });

  it("una riga ricorrente sconosciuta si porta dietro invece di sparire", () => {
    // Aggiunta a mano dal cruscotto di Stripe: il cliente l'ha accettata. Smettere di
    // addebitarla in silenzio è peggio che continuare.
    const v = vociDelRinnovo([riga(LOOKUP_STORICHE.studio[2]), riga("qualcosa_di_ignoto")], RINNOVO);
    expect(v).toHaveLength(2);
    expect(v[1].price).toBe("price_qualcosa_di_ignoto");
  });

  it("⚠️ qualunque variante del piano viene sostituita, ANCHE quelle dei listini vecchi", () => {
    // Le chiavi in vendita oggi e tutte quelle storiche sono lo stesso piano.
    //
    // ⚠️ Questo e' il caso che riguarda chi ha gia' pagato. Se una chiave del listino
    // precedente non venisse riconosciuta come piano, `vociDelRinnovo` la scambierebbe per
    // un'estensione e la porterebbe avanti INSIEME al prezzo di rinnovo nuovo: due piani
    // sulla stessa fattura, fra dodici mesi, su un abbonamento gia' attivo.
    const varianti = [
      PIANI.professional.lookupAnno1,
      PIANI.professional.lookupRinnovo,
      ...LOOKUP_STORICHE.professional,
    ];
    for (const k of varianti) {
      const v = vociDelRinnovo([riga(k!)], RINNOVO);
      expect(v, k).toEqual([{ price: RINNOVO, quantity: 1 }]);
    }
  });

  it("il piano sta davanti, dove lo cerca chi apre la fattura", () => {
    const v = vociDelRinnovo(
      [riga(ESTENSIONI_RITIRATE.accesso.lookupLancio), riga(PIANI.studio.lookupAnno1!)],
      RINNOVO,
    );
    expect(v[0].price).toBe(RINNOVO);
  });

  it("una quantità assente o assurda non azzera la riga", () => {
    const v = vociDelRinnovo(
      [riga(PIANI.studio.lookupAnno1!), riga(ESTENSIONI_RITIRATE.accesso.lookup, { quantita: 0 })],
      RINNOVO,
    );
    expect(v[1].quantity).toBe(1);
  });
});
