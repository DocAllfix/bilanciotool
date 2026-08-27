import { describe, it, expect } from "vitest";
import { CHIAVI_PIANO, LOOKUP_STORICHE, PIANI, chiavePiano } from "@/lib/prezzi";

// CHI HA GIA' PAGATO NON DEVE ACCORGERSI CHE ABBIAMO CAMBIATO LISTINO.
//
// ⚠️ Su Stripe i prezzi sono IMMUTABILI: cambiare un importo significa creare una chiave
// nuova, e gli abbonamenti in corso continuano a puntare a quella vecchia per sempre.
// Il 27 agosto 2026 il listino è passato a fasce 5/15/30 con chiavi `_v2`, mentre otto
// abbonamenti attivi puntavano alle `_v1`.
//
// `chiavePiano` traduce una chiave Stripe nel piano che rappresenta, e da quella
// traduzione dipendono due cose che non possono sbagliare:
//
//   1. `ricostruisciCapacita` ricava il piano dalle righe dell'abbonamento. Chiave non
//      riconosciuta = nessun piano = **capacità azzerata**, al prossimo evento Stripe, a
//      un cliente che paga regolarmente. Non darebbe nessun errore: darebbe un account in
//      sola lettura a chi ha l'abbonamento in corso.
//
//   2. `vociDelRinnovo` SOSTITUISCE la riga del piano col prezzo di rinnovo e porta avanti
//      tutto il resto. Una riga di piano non riconosciuta verrebbe scambiata per
//      un'estensione e portata avanti INSIEME al rinnovo nuovo: **due piani sulla stessa
//      fattura**. E si vedrebbe fra dodici mesi, su abbonamenti già attivi — esattamente
//      come le estensioni che sparivano al rinnovo, trovate il 13 agosto.
//
// Nessuna delle due si manifesta scrivendo il codice: si manifestano a un rinnovo.

describe("le chiavi Stripe dei listini precedenti", () => {
  it("⚠️ ogni chiave storica risolve ancora al proprio piano", () => {
    for (const k of CHIAVI_PIANO) {
      for (const lookup of LOOKUP_STORICHE[k]) {
        expect(chiavePiano(lookup), `«${lookup}» non risolve più a «${k}»`).toBe(k);
      }
    }
  });

  it("le chiavi in vendita oggi risolvono al proprio piano", () => {
    for (const k of CHIAVI_PIANO) {
      const p = PIANI[k];
      if (p.trattativa) continue;
      expect(chiavePiano(p.lookupAnno1), `${k}: primo anno`).toBe(k);
      expect(chiavePiano(p.lookupRinnovo), `${k}: rinnovo`).toBe(k);
    }
  });

  it("una chiave sconosciuta non risolve a nessun piano", () => {
    // Il ramo che conta al contrario: se qualunque stringa risolvesse, un'estensione
    // verrebbe scambiata per un piano e il rinnovo la cancellerebbe.
    expect(chiavePiano("evalisdeck_blocco_aziende_v2")).toBeNull();
    expect(chiavePiano("qualcosa_che_non_esiste")).toBeNull();
    expect(chiavePiano(null)).toBeNull();
    expect(chiavePiano("")).toBeNull();
  });

  it("nessuna chiave storica coincide con una in vendita oggi", () => {
    // Se coincidessero, l'importo sarebbe cambiato sotto la stessa chiave — cosa che
    // Stripe non consente — e il prezzo mostrato divergerebbe da quello addebitato.
    const inVendita = new Set(
      CHIAVI_PIANO.flatMap((k) => [PIANI[k].lookupAnno1, PIANI[k].lookupRinnovo].filter(Boolean) as string[]),
    );
    for (const k of CHIAVI_PIANO) {
      for (const lookup of LOOKUP_STORICHE[k]) {
        expect(inVendita.has(lookup), `«${lookup}» è sia storica che in vendita`).toBe(false);
      }
    }
  });

  it("⚠️ nessuna capienza è DIMINUITA rispetto al listino precedente", () => {
    // Le capienze si leggono da `PIANI[piano]`, quindi cambiare il listino cambia anche
    // ciò che possono fare gli abbonati in corso. Verso l'alto è un regalo; verso il
    // basso sarebbe togliere a qualcuno un'azienda su cui sta lavorando, senza avvisarlo.
    const precedenti: Record<string, { aziende: number; accessi: number }> = {
      professional: { aziende: 3, accessi: 2 },
      studio: { aziende: 10, accessi: 5 },
      studio_plus: { aziende: 25, accessi: 10 },
      enterprise: { aziende: 25, accessi: 10 },
    };
    for (const k of CHIAVI_PIANO) {
      expect(PIANI[k].aziende, `${k}: aziende`).toBeGreaterThanOrEqual(precedenti[k].aziende);
      expect(PIANI[k].accessi, `${k}: accessi`).toBeGreaterThanOrEqual(precedenti[k].accessi);
    }
  });
});
