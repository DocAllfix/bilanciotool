import { describe, it, expect } from "vitest";
import { ECOVADIS, ECOVADIS_ALT, ecovadisValido, giorniAllaScadenza } from "@/lib/ecovadis";

// Un riconoscimento scaduto esposto in home è peggio che non averlo: sulla
// landing di uno strumento ESG è proprio il tipo di svista che il pubblico
// nota. Questo test diventa rosso PRIMA della scadenza, così la sostituzione
// del badge si programma invece di subirla.

describe("riconoscimento EcoVadis", () => {
  it("è ancora valido oggi", () => {
    expect(ecovadisValido()).toBe(true);
  });

  it("avvisa quando manca meno di un mese alla scadenza", () => {
    const giorni = giorniAllaScadenza();
    expect(
      giorni,
      `La valutazione EcoVadis scade il ${ECOVADIS.validoFino} (fra ${giorni} giorni). ` +
        "Servono la nuova scorecard e il nuovo file badge: aggiorna src/lib/ecovadis.ts " +
        "(medaglia, punteggio, percentile, mese, date) e sostituisci il file in public/brand/ecovadis/. " +
        "Se il rinnovo non arriva in tempo, il blocco in home sparisce da solo.",
    ).toBeGreaterThan(30);
  });

  it("nasconde tutto il giorno dopo la scadenza", () => {
    expect(ecovadisValido(new Date("2027-06-25T12:00:00Z"))).toBe(true);
    expect(ecovadisValido(new Date("2027-06-26T00:00:01Z"))).toBe(false);
  });

  it("descrive il badge senza spacciarlo per una certificazione del software", () => {
    expect(ECOVADIS_ALT).toContain("Evalis Srl");
    expect(ECOVADIS_ALT).not.toMatch(/certificaz/i);
    expect(ECOVADIS_ALT).not.toContain("EvalisDeck");
  });

  it("punta al file consegnato da EcoVadis", () => {
    expect(ECOVADIS.badge).toBe("/brand/ecovadis/ecovadis-platinum-2026.svg");
  });
});
