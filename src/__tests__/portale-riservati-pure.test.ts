import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { TIPI_DOCUMENTO, TIPI_RISERVATI, riservato } from "@/features/documents/tipi";

// La guardia dei documenti che non devono uscire dal portale cliente.
//
// ⚠️ Oggi `TIPI_RISERVATI` è VUOTO, e un test dell'esclusione sarebbe vacuo: passerebbe
// senza provare niente, che è esattamente ciò che questo progetto ha imparato a non
// scrivere. Quindi qui non si prova l'esclusione — si prova che **non la si possa
// dimenticare** il giorno in cui il primo tipo riservato esiste.
//
// Il tipo riservato che arriverà è il fascicolo di una segnalazione ex D.Lgs. 24/2023:
// contiene l'identità di chi si è esposto, e rivelarla senza consenso espresso è vietato
// dall'art. 12. Il collegamento del portale è per AZIENDA, non per documento: senza il
// filtro, quel documento comparirebbe da solo dentro i collegamenti già consegnati.

/** Il sorgente della query del portale, letto come testo: qui si verifica il CABLAGGIO. */
const QUERY_PORTALE = readFileSync("src/features/condivisione/index.ts", "utf8");

describe("i documenti riservati non escono dal portale cliente", () => {
  it("ogni tipo riservato è un tipo di documento vero", () => {
    for (const t of TIPI_RISERVATI) {
      expect(TIPI_DOCUMENTO, `«${t}» non è un tipo di documento`).toContain(t);
    }
  });

  it("il filtro è nella QUERY del portale, non altrove", () => {
    // Non nell'interfaccia, e non al momento della pubblicazione: quello varrebbe solo
    // per i documenti futuri e lascerebbe fuori quelli già archiviati.
    // ⚠️ Si cerca l'ESPRESSIONE, non il nome della funzione. Una prima versione di
    // questo test cercava «notInArray» e basta: togliendo la riga dal `where`, l'import
    // restava e il test passava lo stesso. Un controllo che non può diventare rosso non
    // è un controllo, e questo lo era.
    expect(QUERY_PORTALE).toMatch(/notInArray\(documentSnapshot\.tipo/);
    expect(QUERY_PORTALE).toContain("TIPI_RISERVATI");
  });

  it("`riservato()` risponde per ogni tipo esistente", () => {
    for (const t of TIPI_DOCUMENTO) {
      expect(typeof riservato(t)).toBe("boolean");
    }
  });

  it("⚠️ quando il primo tipo riservato arriva, serve la prova sul database", () => {
    // Questo test è la sveglia. Finché l'insieme è vuoto passa e lo dice; appena
    // qualcuno vi aggiunge un tipo, diventa ROSSO e chiede il test che manca: pubblicare
    // un documento di quel tipo e verificare che NON compaia dietro un collegamento
    // cliente già esistente, provato rompendolo.
    //
    // Senza questa sveglia il filtro resterebbe non verificato, e un filtro non
    // verificato su un dato del genere è un filtro di cui nessuno sa se funziona.
    expect(
      TIPI_RISERVATI.length,
      "TIPI_RISERVATI non è più vuoto: aggiungi `condivisione-riservati.db.test.ts` che " +
        "pubblica un documento di quel tipo e verifica che non compaia dietro un " +
        "collegamento cliente, poi togli questa asserzione.",
    ).toBe(0);
  });
});
