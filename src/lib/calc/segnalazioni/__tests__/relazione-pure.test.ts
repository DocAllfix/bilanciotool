import { describe, it, expect } from "vitest";
import { giorniA } from "../termini";
import { statistiche, statoTermine, urgenza, type FascicoloTermini } from "../relazione";

const base: FascicoloTermini = {
  numero: 1,
  anonima: false,
  recapito: null,
  codice: null,
  dataRicezione: "2026-01-10",
  avvisoReso: null,
  riscontroReso: null,
  stato: "Ricevuta",
  esito: null,
  canale: "Scritto informatico",
  qualita: null,
  dataChiusura: null,
  cancellata: null,
  monitoraggioAperto: null,
  ritIdentitaConoscibile: null,
  ritSovraordinato: null,
  ritContestoRistretto: null,
  ritPrecedenti: null,
  ritRapportoPrecario: null,
  ritGiaEsposto: null,
};
const f = (p: Partial<FascicoloTermini>): FascicoloTermini => ({ ...base, ...p });

describe("i giorni si contano in UTC", () => {
  it("il conto non dipende dal fuso, e attraversa il cambio d'ora", () => {
    expect(giorniA("2026-01-17", "2026-01-10")).toBe(7);
    // 25 marzo → 1 aprile attraversa il 29, giorno del cambio d'ora: sono sette giorni.
    expect(giorniA("2026-04-01", "2026-03-25")).toBe(7);
    expect(giorniA("2026-01-05", "2026-01-10")).toBe(-5);
    expect(giorniA(null, "2026-01-10")).toBeNull();
    expect(giorniA("non è una data", "2026-01-10")).toBeNull();
  });
});

describe("lo stato di un termine", () => {
  it("reso entro la scadenza: nei termini", () => {
    // Il giorno stesso della scadenza vale: il confronto è inclusivo.
    expect(statoTermine(f({ avvisoReso: "2026-01-17" }), "avviso", "2026-02-01")).toBe("fatto");
    expect(statoTermine(f({ avvisoReso: "2026-01-12" }), "avviso", "2026-02-01")).toBe("fatto");
  });

  it("reso dopo la scadenza: fuori termine, e non «fatto»", () => {
    // ⚠️ «Tardivo» è uno stato a sé e non si arrotonda a «fatto»: su un termine
    // perentorio il ritardo è il fatto da riferire, e una relazione che dicesse «100%
    // di avvisi resi» avendone reso metà in ritardo sarebbe falsa.
    expect(statoTermine(f({ avvisoReso: "2026-01-18" }), "avviso", "2026-02-01")).toBe("tardivo");
  });

  it("non ancora reso: in corso, in scadenza, scaduto", () => {
    expect(statoTermine(f({}), "avviso", "2026-01-11")).toBe("termini");
    // La soglia di preallarme dell'avviso è di DUE giorni.
    expect(statoTermine(f({}), "avviso", "2026-01-15")).toBe("scadenza");
    expect(statoTermine(f({}), "avviso", "2026-01-17")).toBe("scadenza");
    // Il giorno dopo la scadenza è scaduto, non prima.
    expect(statoTermine(f({}), "avviso", "2026-01-18")).toBe("scaduto");
  });

  it("il riscontro ha una soglia di preallarme diversa: quindici giorni", () => {
    // Le due soglie sono asimmetriche di proposito e si conservano: sette giorni si
    // recuperano in un pomeriggio, tre mesi no.
    expect(statoTermine(f({}), "riscontro", "2026-03-01")).toBe("termini");
    expect(statoTermine(f({}), "riscontro", "2026-04-10")).toBe("scadenza");
    expect(statoTermine(f({}), "riscontro", "2026-04-18")).toBe("scaduto");
  });

  it("⚠️ la segnalazione non contattabile non ha termini, e non è «scaduta»", () => {
    // Anonima e senza recapito né codice: l'avviso e il riscontro non sono
    // materialmente possibili. Contarla fra le scadute farebbe risultare inadempiente
    // chi non poteva adempiere, e in una relazione all'organo di controllo è un'accusa.
    const irraggiungibile = f({ anonima: true, recapito: null, codice: null });
    expect(statoTermine(irraggiungibile, "avviso", "2027-01-01")).toBe("na");
    expect(statoTermine(irraggiungibile, "riscontro", "2027-01-01")).toBe("na");
    // Con un codice di riscontro invece si può, e i termini tornano a correre.
    expect(statoTermine(f({ anonima: true, codice: "A7X2" }), "avviso", "2027-01-01")).toBe("scaduto");
  });

  it("senza data di ricezione non c'è nessun termine da valutare", () => {
    expect(statoTermine(f({ dataRicezione: null }), "avviso", "2026-02-01")).toBe("na");
  });
});

describe("l'urgenza ordina il lavoro", () => {
  it("chiusa e archiviata vanno in fondo, anche se erano in ritardo", () => {
    expect(urgenza(f({ stato: "Chiusa" }), "2027-01-01")).toBe(3);
    expect(urgenza(f({ stato: "Archiviata" }), "2027-01-01")).toBe(3);
  });

  it("prima le scadute, poi quelle in scadenza, poi il resto", () => {
    expect(urgenza(f({}), "2026-01-18")).toBe(0);
    expect(urgenza(f({}), "2026-01-15")).toBe(1);
    expect(urgenza(f({}), "2026-01-11")).toBe(2);
  });
});

describe("le statistiche della relazione periodica", () => {
  const oggi = "2026-06-01";

  it("zero segnalazioni non è un risultato, ed è dichiarato", () => {
    // ⚠️ È il rilievo metodologico più importante del prototipo e si conserva: un canale
    // senza segnalazioni è più spesso un canale che nessuno conosce o di cui nessuno si
    // fida. Una relazione che presentasse lo zero come un successo direbbe il falso
    // all'organo di controllo.
    const s = statistiche([], oggi);
    expect(s.totali).toBe(0);
    expect(s.zeroDaInterpretare).toBe(true);
  });

  it("conta aperte, concluse ed esiti", () => {
    const s = statistiche(
      [
        f({ numero: 1, stato: "In istruttoria" }),
        f({ numero: 2, stato: "Chiusa", esito: "Fondata" }),
        f({ numero: 3, stato: "Chiusa", esito: "Non fondata" }),
        f({ numero: 4, stato: "Archiviata", esito: "Manifestamente infondata" }),
      ],
      oggi,
    );
    expect(s.totali).toBe(4);
    expect(s.aperte).toBe(1);
    expect(s.concluse).toBe(3);
    expect(s.zeroDaInterpretare).toBe(false);
    expect(s.perEsito).toEqual({
      Fondata: 1,
      "Parzialmente fondata": 0,
      "Non fondata": 1,
      "Manifestamente infondata": 1,
    });
  });

  it("⚠️ la percentuale dei termini si calcola sui soli DOVUTI", () => {
    // Le non contattabili escono dal denominatore: includerle abbasserebbe la
    // percentuale di chi ha fatto tutto il possibile.
    const s = statistiche(
      [
        f({ numero: 1, avvisoReso: "2026-01-15" }),
        f({ numero: 2, avvisoReso: "2026-01-30" }),
        f({ numero: 3, anonima: true }),
      ],
      oggi,
    );
    expect(s.avvisi.dovuti).toBe(2);
    expect(s.avvisi.neiTermini).toBe(1);
    expect(s.avvisi.tardivi).toBe(1);
    expect(s.avvisi.scaduti).toBe(0);
    expect(s.avvisi.percentuale).toBe(50);
  });

  it("senza nessun termine dovuto la percentuale è `null`, non zero", () => {
    // Zero direbbe «non ne ha reso nessuno», che è un'accusa; `null` dice «non ce
    // n'erano», che è un fatto.
    const s = statistiche([f({ anonima: true })], oggi);
    expect(s.avvisi.dovuti).toBe(0);
    expect(s.avvisi.percentuale).toBeNull();
  });

  it("i canali si contano, e le anonime pure", () => {
    const s = statistiche(
      [
        f({ numero: 1, canale: "Scritto informatico" }),
        f({ numero: 2, canale: "Scritto informatico", anonima: true, codice: "K1" }),
        f({ numero: 3, canale: "Canale esterno ANAC" }),
        f({ numero: 4, canale: null }),
      ],
      oggi,
    );
    expect(s.perCanale["Scritto informatico"]).toBe(2);
    expect(s.perCanale["Canale esterno ANAC"]).toBe(1);
    expect(s.perCanale["Orale telefonico"]).toBe(0);
    expect(s.anonime).toBe(1);
    expect(s.senzaCanale).toBe(1);
  });

  it("i soggetti esterni all'organizzazione si contano a parte", () => {
    // Sono la prova che il canale è raggiungibile da chi la legge protegge oltre i
    // dipendenti: se non arriva mai niente da fornitori, candidati o ex dipendenti, il
    // canale probabilmente non è pubblicato dove loro possono vederlo.
    const s = statistiche(
      [
        f({ numero: 1, qualita: "Dipendente" }),
        f({ numero: 2, qualita: "Fornitore o appaltatore" }),
        f({ numero: 3, qualita: "Ex dipendente" }),
        f({ numero: 4, qualita: "Candidato" }),
        f({ numero: 5, qualita: "Lavoratore di appaltatore" }),
      ],
      oggi,
    );
    expect(s.daEsterni).toBe(4);
  });

  it("il monitoraggio dovuto e non aperto è una lacuna, e si nomina", () => {
    const aRischio = {
      ritIdentitaConoscibile: "Sì",
      ritSovraordinato: "Sì",
      ritContestoRistretto: "No",
      ritPrecedenti: "No",
      ritRapportoPrecario: "No",
      ritGiaEsposto: "No",
    };
    const s = statistiche(
      [
        f({ numero: 1, ...aRischio, monitoraggioAperto: "Sì" }),
        f({ numero: 2, ...aRischio, monitoraggioAperto: null }),
        // Sesto fattore mancante: il livello non c'è, quindi il monitoraggio non è
        // ancora dovuto — e la relazione non deve dire che manca qualcosa.
        f({ numero: 3, ...aRischio, ritGiaEsposto: null }),
      ],
      oggi,
    );
    expect(s.monitoraggiAperti).toBe(1);
    expect(s.monitoraggiDovutiNonAperti).toBe(1);
  });

  it("i fascicoli oltre i cinque anni si contano solo se non cancellati", () => {
    const s = statistiche(
      [
        f({ numero: 1, stato: "Chiusa", dataChiusura: "2020-01-01", cancellata: null }),
        f({ numero: 2, stato: "Chiusa", dataChiusura: "2020-01-01", cancellata: "Sì" }),
        f({ numero: 3, stato: "Chiusa", dataChiusura: "2025-01-01", cancellata: null }),
      ],
      oggi,
    );
    expect(s.daCancellare).toBe(1);
  });
});
