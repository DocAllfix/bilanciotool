import { describe, it, expect, afterEach } from "vitest";
import { conformita } from "@/lib/calc/gdpr/conformita";
import { livello, classe } from "@/lib/calc/gdpr/rischio";
import { statoFornitori, contrattoIncoerente } from "@/lib/calc/gdpr/fornitori";
import { derivati, parteOltreTotale } from "@/lib/calc/gdpr/indicatori";
import { scadenzaRichiesta, limiteNotifica, statoViolazione, statoRichiesta, annoViolazione } from "@/lib/calc/gdpr/termini";
import { PARAMETRI_PREDEFINITI, type Fornitore } from "@/lib/calc/gdpr/tipi";
import requisiti from "@/lib/db/seeds/data/gdpr-requisiti.json";

// Un test per ogni difetto del prototipo corretto nel motore (vedi
// `docs/politica-arrotondamento.md`, sezione GDPR). Ognuno è scritto sul caso che il
// prototipo sbagliava, perché un test sul caso facile passerebbe anche col difetto.

describe("difetto 1 — l'indice non media i soli valutati", () => {
  it("tre conformi su novantanove non fanno 100", () => {
    const stati = requisiti.map((_, i) => (i < 3 ? "c" : null)) as ("c" | null)[];
    expect(conformita(stati).indice).toBe(3);
  });

  it("«non pertinente» esce dal denominatore, non abbassa l'indice", () => {
    // Venti requisiti: dieci conformi, dieci non pertinenti. Pertinenti tutti conformi.
    const stati = [...Array(10).fill("c"), ...Array(10).fill("na")];
    expect(conformita(stati).indice).toBe(100);
  });

  it("il parziale pesa metà", () => {
    expect(conformita(["c", "p"]).indice).toBe(75);
  });

  it("senza nessuna valutazione l'indice non c'è, non è zero", () => {
    expect(conformita([null, null, null]).indice).toBeNull();
    expect(conformita(["na", "na"]).indice).toBeNull();
  });
});

describe("difetto 2 — le 72 ore sono ore vere, nel fuso italiano", () => {
  const fusi = ["UTC", "Europe/Rome", "America/New_York"];
  const prima = process.env.TZ;
  afterEach(() => {
    process.env.TZ = prima;
  });

  it("a cavallo dell'ora legale: 72 ore vere, non 72 ore d'orologio", () => {
    // Conoscenza venerdì 27 marzo 2026 alle 10:00 di Roma (UTC+1). Domenica 29 l'orologio
    // va avanti di un'ora: 72 ore vere dopo, a Roma sono le 11:00 di lunedì 30.
    const v = { conoscenzaIl: "2026-03-27T09:00:00.000Z", rischio: "Rischio" as const };
    expect(limiteNotifica(v)).toBe("2026-03-30T09:00:00.000Z");
  });

  it("lo stesso risultato in qualunque fuso giri il processo", () => {
    const v = {
      conoscenzaIl: "2026-07-02T06:15:00.000Z",
      rischio: "Rischio" as const,
      notificataIl: null,
      comunicataIl: null,
      chiusaIl: null,
      interessati: 10,
    };
    const risultati = fusi.map((tz) => {
      process.env.TZ = tz;
      return [limiteNotifica(v), statoViolazione(v, new Date("2026-07-05T06:14:00.000Z")), statoViolazione(v, new Date("2026-07-05T06:16:00.000Z")), annoViolazione(v)];
    });
    for (const r of risultati) expect(r).toEqual(["2026-07-05T06:15:00.000Z", "open", "over", 2026]);
  });

  it("la violazione conosciuta la notte di capodanno appartiene all'anno ITALIANO", () => {
    // 31 dicembre 2025 alle 23:30 UTC sono le 00:30 del primo gennaio a Roma.
    expect(annoViolazione({ conoscenzaIl: "2025-12-31T23:30:00.000Z" })).toBe(2026);
  });

  it("notifica non dovuta se il rischio è improbabile o non valutato", () => {
    expect(limiteNotifica({ conoscenzaIl: "2026-07-02T06:15:00.000Z", rischio: "Improbabile" })).toBeNull();
    expect(limiteNotifica({ conoscenzaIl: "2026-07-02T06:15:00.000Z", rischio: "" })).toBeNull();
  });
});

describe("il mese delle richieste aggancia il fine mese (come il prototipo)", () => {
  it("31 gennaio + 1 mese = 28 febbraio; con la proroga = 30 aprile", () => {
    expect(scadenzaRichiesta({ ricevutaIl: "2026-01-31", proroga: false })).toBe("2026-02-28");
    expect(scadenzaRichiesta({ ricevutaIl: "2026-01-31", proroga: true })).toBe("2026-04-30");
  });

  it("il giorno della scadenza è ancora in termine, quello dopo no", () => {
    const r = { ricevutaIl: "2026-01-31", proroga: false, riscontroIl: null };
    expect(statoRichiesta(r, "2026-02-28")).toBe("open");
    expect(statoRichiesta(r, "2026-03-01")).toBe("over");
  });

  it("una data impossibile non produce una scadenza", () => {
    expect(scadenzaRichiesta({ ricevutaIl: "2026-02-31", proroga: false })).toBeNull();
  });
});

describe("difetti 5 e 6 — un numero che non si conosce non è zero", () => {
  it("un denominatore mancante dà null, non 0%", () => {
    const d = derivati({ aut: 30 });
    expect(d.pctForm).toBeNull();
    expect(derivati({ aut_form: 10 }).pctForm).toBeNull();
    expect(derivati({ aut: 0, aut_form: 0 }).pctForm).toBeNull();
  });

  it("«di cui» oltre il totale è un'incoerenza, non il 116,7%", () => {
    const d = derivati({ aut: 30, aut_form: 35 });
    expect(d.pctForm).toBeNull();
    expect(d.incoerenze).toEqual(["pctForm"]);
    expect(parteOltreTotale({ aut: 30, aut_form: 35, acc: 10, acc_mfa: 4 })).toEqual(["aut_form"]);
  });

  it("le ore per autorizzato non sono una parte del totale: possono superarlo", () => {
    expect(derivati({ aut: 10, fo_ore: 25 }).oreForm).toBe(2.5);
  });
});

describe("difetto 7 — «Non dovuto» vale solo per il titolare autonomo", () => {
  const f = (qualifica: string, contratto: Fornitore["contratto"]): Fornitore => ({
    nome: qualifica, qualifica, contratto, garanzia: "Nessun trasferimento", verificatoIl: null, esito: "",
  });

  it("un responsabile con «Non dovuto» è incoerente e conta come senza contratto", () => {
    const r = f("Responsabile (art. 28)", "Non dovuto");
    expect(contrattoIncoerente(r)).toBe(true);
    expect(statoFornitori([r]).senzaContratto).toEqual(["Responsabile (art. 28)"]);
  });

  it("il titolare autonomo con «Non dovuto» è coerente e non chiede contratto", () => {
    const t = f("Titolare autonomo", "Non dovuto");
    expect(contrattoIncoerente(t)).toBe(false);
    expect(statoFornitori([t]).senzaContratto).toEqual([]);
    expect(statoFornitori([t]).quotaContratti).toBeNull();
  });
});

describe("difetto 9 — un rischio a metà non è un rischio valutato", () => {
  it("con un solo punteggio, o fuori scala, il livello è da valutare", () => {
    expect(livello({ probabilita: 3, gravita: null })).toBeNull();
    expect(livello({ probabilita: 7, gravita: 2 })).toBeNull();
    expect(livello({ probabilita: 2.5, gravita: 2 })).toBeNull();
    expect(livello({ probabilita: 3, gravita: 5 })).toBe(15);
  });

  it("le classi seguono i parametri: alto da 15, medio da 8", () => {
    expect([15, 14, 8, 7].map((v) => classe(v, PARAMETRI_PREDEFINITI))).toEqual(["alto", "medio", "medio", "basso"]);
    expect(classe(null, PARAMETRI_PREDEFINITI)).toBeNull();
  });
});
