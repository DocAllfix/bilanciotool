import { describe, it, expect } from "vitest";
import { propostaDimensioneNis2, propostaObbligoSegnalazioni, propostaRuoloPrivacy } from "../proposte-compliance";

describe("proposte di compliance", () => {
  it("dimensione NIS2: soglie su addetti o fatturato, e il motivo lo dice", () => {
    expect(propostaDimensioneNis2(48, "5200000.00")?.valore).toBe("micro");
    expect(propostaDimensioneNis2(60, null)?.valore).toBe("media");
    expect(propostaDimensioneNis2(20, "12000000")?.valore).toBe("media");
    expect(propostaDimensioneNis2(300, null)?.valore).toBe("grande");
    expect(propostaDimensioneNis2(null, "51000000")?.valore).toBe("grande");
    expect(propostaDimensioneNis2(48, "5200000.00")?.motivo).toMatch(/48 addetti e 5,2 milioni/);
    expect(propostaDimensioneNis2(null, null)).toBeNull();
  });

  it("obbligo del canale: 50 addetti prima del 231, e senza nessuno dei due niente", () => {
    expect(propostaObbligoSegnalazioni(60, true)?.valore).toBe("Almeno 50 lavoratori subordinati");
    expect(propostaObbligoSegnalazioni(10, true)?.valore).toMatch(/modello 231/);
    expect(propostaObbligoSegnalazioni(10, false)).toBeNull();
    expect(propostaObbligoSegnalazioni(null, false)).toBeNull();
  });

  it("ruolo privacy della SoA: dal ruolo del sistema GDPR e dai trattamenti censiti", () => {
    expect(propostaRuoloPrivacy("Titolare del trattamento", [])?.valore).toBe("titolare");
    expect(propostaRuoloPrivacy("Titolare e responsabile per conto di clienti", ["Titolare"])?.valore).toBe("entrambi");
    expect(propostaRuoloPrivacy(null, ["Titolare", "Responsabile"])?.valore).toBe("entrambi");
    expect(propostaRuoloPrivacy(null, ["Responsabile"])?.valore).toBe("responsabile");
    expect(propostaRuoloPrivacy("Titolare del trattamento", ["Responsabile"])?.valore).toBe("entrambi");
    expect(propostaRuoloPrivacy(null, ["Contitolare"])?.valore).toBe("titolare");
    // Senza percorso GDPR non si propone niente: «nessuno» sarebbe una deduzione dal silenzio.
    expect(propostaRuoloPrivacy(null, [])).toBeNull();
  });
});
