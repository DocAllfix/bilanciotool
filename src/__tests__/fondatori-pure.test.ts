import { describe, it, expect } from "vitest";
import { ESTENSIONI, FONDATORI, PIANI, chiavePiano, prezzoDiVendita, rinnovoPerLeRighe, importoDelPreavviso } from "@/lib/prezzi";

// IL PROGRAMMA FONDATORI, E LO SCONTO CHE DEVE RESTARE.
//
// ⚠️ La clausola della lettera d'intenti — «sconto permanente del 20% sul prezzo di
// listino dei rinnovi» — è ambigua, perché il rinnovo di listino è GIÀ il primo anno meno
// 20%. Letta sull'importo pieno, il Fondatore pagherebbe esattamente quanto chiunque
// altro e la clausola non promettterebbe nulla: una contropartita vuota per una
// videochiamata al mese, una testimonianza con nome e fotografia e un caso studio.
// Il committente ha deciso il 27 agosto 2026: si calcola sul prezzo di rinnovo.
//
// ⚠️ E il difetto che questi test esistono per fermare non si vede scrivendo il codice:
// si vede al TREDICESIMO MESE. Se la fase 2 dello Schedule portasse il rinnovo di
// listino invece di quello del Fondatore, lo sconto sparirebbe da solo, in silenzio, su
// un accordo firmato. È la stessa forma del difetto che il 13 agosto faceva sparire le
// estensioni al rinnovo, e che sarebbe uscito solo dopo un anno su abbonamenti in corso.

const FASCIA = PIANI[FONDATORI.piano];

describe("il Programma Fondatori", () => {
  it("concede la fascia «fino a 15 aziende», come dice la lettera", () => {
    expect(FASCIA.aziende).toBe(15);
  });

  it("⚠️ il rinnovo è il 20% sotto il rinnovo di listino, non sotto il primo anno", () => {
    const rinnovoDiListino = prezzoDiVendita(FASCIA, "rinnovo")!.importo;
    expect(FONDATORI.rinnovo).toBe(Math.round(rinnovoDiListino * 0.8));
    // La controprova che dice perché: NON deve coincidere col rinnovo di chiunque altro.
    expect(FONDATORI.rinnovo).toBeLessThan(rinnovoDiListino);
  });

  it("il primo anno è simbolico, e molto sotto il listino", () => {
    expect(FONDATORI.primoAnno).toBe(30000);
    expect(FONDATORI.primoAnno).toBeLessThan(FASCIA.primoAnno / 3);
  });

  it("⚠️ le sue chiavi risolvono alla fascia: senza, l'account andrebbe in sola lettura", () => {
    // `ricostruisciCapacita` ricava il piano dalle righe dell'abbonamento. Una chiave del
    // Programma non riconosciuta significa NESSUN piano, cioè capacità azzerata a un
    // Fondatore che sta lavorando — e senza nessun errore da nessuna parte.
    expect(chiavePiano(FONDATORI.lookupAnno1)).toBe(FONDATORI.piano);
    expect(chiavePiano(FONDATORI.lookupRinnovo)).toBe(FONDATORI.piano);
  });

  it("⚠️ un abbonamento del Programma rinnova al prezzo del Programma", () => {
    const v = rinnovoPerLeRighe([FONDATORI.lookupAnno1], FONDATORI.piano)!;
    expect(v.importo).toBe(FONDATORI.rinnovo);
    expect(v.lookup).toBe(FONDATORI.lookupRinnovo);
  });

  it("⚠️ e continua a rinnovare a quel prezzo anche dal terzo anno", () => {
    // Dal terzo anno la riga dell'abbonamento è quella della fase 2, cioè il rinnovo del
    // Fondatore. Deve continuare a risolvere a se stesso: è così che «permanente» sta in
    // piedi senza codice che lo faccia rispettare ogni anno.
    const v = rinnovoPerLeRighe([FONDATORI.lookupRinnovo], FONDATORI.piano)!;
    expect(v.lookup).toBe(FONDATORI.lookupRinnovo);
    expect(v.importo).toBe(FONDATORI.rinnovo);
  });

  it("un abbonamento normale NON prende lo sconto del Programma", () => {
    // Il ramo che conta al contrario: se qualunque riga desse lo sconto, lo prenderebbero
    // tutti e il Programma non avrebbe più niente da offrire.
    const v = rinnovoPerLeRighe([PIANI.studio.lookupAnno1 ?? null], "studio")!;
    expect(v.importo).toBe(prezzoDiVendita(PIANI.studio, "rinnovo")!.importo);
    expect(v.lookup).not.toBe(FONDATORI.lookupRinnovo);
  });

  it("le estensioni comprate da un Fondatore non gli tolgono lo sconto", () => {
    const v = rinnovoPerLeRighe(
      [FONDATORI.lookupAnno1, "evalisdeck_blocco_aziende_v2", null],
      FONDATORI.piano,
    )!;
    expect(v.lookup).toBe(FONDATORI.lookupRinnovo);
  });
});

// Il preavviso di rinnovo, sette giorni prima dell'addebito. Diceva il rinnovo di LISTINO
// a tutti: a un Fondatore 1.032 € invece di 825,60 €, e a chi aveva comprato blocchi il
// solo piano. Un preavviso con la cifra sbagliata è peggio del silenzio: è la ragione per
// cui un cliente apre una contestazione con la banca.
describe("l'importo annunciato dal preavviso di rinnovo", () => {
  const riga = (lookup: string | null, importoUnitario: number | null, quantita = 1, ricorrente = true) => ({
    lookup, importoUnitario, quantita, ricorrente,
  });

  it("⚠️ a un Fondatore annuncia il prezzo del Programma, non il listino", () => {
    expect(importoDelPreavviso("studio", [riga(FONDATORI.lookupAnno1, FONDATORI.primoAnno)])).toBe(FONDATORI.rinnovo);
    expect(importoDelPreavviso("studio", [riga(FONDATORI.lookupRinnovo, FONDATORI.rinnovo)])).toBe(FONDATORI.rinnovo);
  });

  it("somma i blocchi aziende, che al rinnovo si pagano", () => {
    const v = importoDelPreavviso("studio", [
      riga(PIANI.studio.lookupAnno1!, PIANI.studio.primoAnno),
      riga(ESTENSIONI.bloccoAziende.lookup, ESTENSIONI.bloccoAziende.prezzo, 2),
    ]);
    expect(v).toBe(PIANI.studio.rinnovo + 2 * ESTENSIONI.bloccoAziende.prezzo);
  });

  it("non somma gli addebiti una tantum, che al rinnovo non si ripetono", () => {
    const v = importoDelPreavviso("studio", [
      riga(PIANI.studio.lookupAnno1!, PIANI.studio.primoAnno),
      riga(ESTENSIONI.avvioAssistito.lookup, ESTENSIONI.avvioAssistito.min, 1, false),
    ]);
    expect(v).toBe(PIANI.studio.rinnovo);
  });

  it("senza righe da Stripe (studio attivato a mano) annuncia il rinnovo della fascia", () => {
    expect(importoDelPreavviso("singola", null)).toBe(PIANI.singola.rinnovo);
  });

  it("se una riga ricorrente non ha importo, non inventa un numero", () => {
    expect(importoDelPreavviso("studio", [riga(PIANI.studio.lookupAnno1!, 1), riga("sconosciuta", null)])).toBeNull();
  });
});
