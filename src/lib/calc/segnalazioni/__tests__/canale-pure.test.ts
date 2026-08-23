import { describe, it, expect } from "vitest";
import {
  FORME_CANALE,
  condivisioneAmmessa,
  consultazioneSindacale,
  statoCanale,
} from "../canale";

// ⚠️ Questo controllo NON esiste nel prototipo, ed è il motivo per cui il canale qui è
// un'entità e non tre caselle di testo.
//
// Nel prototipo «Canale scritto informatico», «Canale orale» e «Modalità per l'incontro
// diretto» erano tre campi liberi nell'anagrafica, e nessuno verificava che fossero
// riempiti: un ente con la sola casella di posta compilava il primo, lasciava vuoti gli
// altri due, e il sistema lo dichiarava a posto. L'art. 4 c. 1 le pretende tutte e tre.

const tutte = FORME_CANALE.map((forma) => ({ forma, attiva: true }));

describe("le tre forme dell'art. 4 c. 1", () => {
  it("con tutte e tre attive il canale è conforme", () => {
    const s = statoCanale(tutte);
    expect(s.conforme).toBe(true);
    expect(s.mancanti).toEqual([]);
    expect(s.coperte).toEqual(["Scritta", "Orale", "Incontro diretto"]);
  });

  it("la sola forma scritta non basta, e si dice quale manca", () => {
    // Il caso reale: la casella di posta dedicata, e nient'altro.
    const s = statoCanale([{ forma: "Scritta", attiva: true }]);
    expect(s.conforme).toBe(false);
    expect(s.mancanti).toEqual(["Orale", "Incontro diretto"]);
  });

  it("⚠️ «dichiarata ma spenta» non è «assente», ed è peggio", () => {
    // Un canale descritto e mai attivato è più insidioso di uno che non c'è: sulla carta
    // risulta previsto dalla procedura, e il rimedio è diverso — non «istituirlo» ma
    // «accenderlo». Un controllo che li confondesse direbbe al consulente di fare la
    // cosa sbagliata.
    const s = statoCanale([
      { forma: "Scritta", attiva: true },
      { forma: "Orale", attiva: false },
    ]);
    expect(s.conforme).toBe(false);
    expect(s.dichiarateNonAttive).toEqual(["Orale"]);
    expect(s.mancanti).toEqual(["Incontro diretto"]);
    // «Orale» non è fra le coperte: esiste la riga, non esiste il canale.
    expect(s.coperte).toEqual(["Scritta"]);
  });

  it("due canali della stessa forma coprono quella forma una volta sola", () => {
    // La piattaforma informatica E l'indirizzo postale sono entrambi forma scritta: è
    // legittimo, e non deve contare doppio né comparire due volte.
    const s = statoCanale([
      { forma: "Scritta", attiva: true },
      { forma: "Scritta", attiva: true },
      { forma: "Orale", attiva: true },
      { forma: "Incontro diretto", attiva: true },
    ]);
    expect(s.conforme).toBe(true);
    expect(s.coperte).toEqual(["Scritta", "Orale", "Incontro diretto"]);
  });

  it("una forma spenta E una accesa della stessa specie: vale l'accesa", () => {
    const s = statoCanale([
      { forma: "Scritta", attiva: false },
      { forma: "Scritta", attiva: true },
      { forma: "Orale", attiva: true },
      { forma: "Incontro diretto", attiva: true },
    ]);
    expect(s.conforme).toBe(true);
    expect(s.dichiarateNonAttive).toEqual([]);
  });

  it("senza canali sono mancanti tutte e tre, non zero", () => {
    // Il vuoto è il caso di partenza di ogni azienda nuova: se producesse un elenco
    // vuoto di lacune, il quadro direbbe «nessun problema» al primo giorno.
    const s = statoCanale([]);
    expect(s.conforme).toBe(false);
    expect(s.mancanti).toEqual(["Scritta", "Orale", "Incontro diretto"]);
  });

  it("le forme escono sempre nell'ordine del decreto", () => {
    const s = statoCanale([
      { forma: "Incontro diretto", attiva: true },
      { forma: "Orale", attiva: true },
    ]);
    expect(s.coperte).toEqual(["Orale", "Incontro diretto"]);
  });
});

describe("la consultazione sindacale precede l'attivazione", () => {
  it("consultazione prima del canale: in regola", () => {
    expect(consultazioneSindacale("2026-01-10", ["2026-02-01", "2026-02-03"])).toBe("ok");
  });

  it("⚠️ consultazione DOPO il canale: tardiva, e l'omissione è contestabile", () => {
    // Art. 4 c. 1: la procedura si adotta «sentite le rappresentanze o le organizzazioni
    // sindacali». Sentirle a canale acceso non è la stessa cosa, e la data lo dice.
    expect(consultazioneSindacale("2026-03-01", ["2026-02-01"])).toBe("tardiva");
  });

  it("stesso giorno: si accetta", () => {
    // Il confronto è inclusivo, come per i termini: fatto l'ultimo giorno utile, è
    // fatto. Qui non c'è una data di scadenza, c'è una precedenza, e nulla vieta che
    // consultazione e attivazione stiano nello stesso verbale.
    expect(consultazioneSindacale("2026-02-01", ["2026-02-01"])).toBe("ok");
  });

  it("consultazione mai registrata, con un canale attivo: assente", () => {
    expect(consultazioneSindacale(null, ["2026-02-01"])).toBe("assente");
  });

  it("nessun canale ancora attivato: non c'è niente da verificare", () => {
    // Non «assente»: un'azienda che non ha ancora acceso nulla non è in difetto, e un
    // avviso rosso al primo giorno insegna a ignorare gli avvisi.
    expect(consultazioneSindacale(null, [])).toBe("nonVerificabile");
    expect(consultazioneSindacale("2026-01-10", [])).toBe("nonVerificabile");
  });

  it("una data di attivazione illeggibile non produce un verdetto", () => {
    // Le date sbagliate non si indovinano: si ignorano, e se non ne resta nessuna il
    // verdetto è «non verificabile». Trattarle come «tardive» accuserebbe di una
    // violazione chi ha solo scritto male una data.
    expect(consultazioneSindacale("2026-01-10", ["ieri"])).toBe("nonVerificabile");
    expect(consultazioneSindacale("ieri", ["2026-02-01"])).toBe("assente");
  });
});

describe("il canale condiviso con altri enti", () => {
  it("fino a 249 lavoratori è ammesso", () => {
    // Art. 4 c. 4: la condivisione è riservata agli enti fino a 249 lavoratori.
    expect(condivisioneAmmessa("249")).toBe(true);
    expect(condivisioneAmmessa("48")).toBe(true);
  });

  it("da 250 in su non lo è", () => {
    expect(condivisioneAmmessa("250")).toBe(false);
    expect(condivisioneAmmessa("1200")).toBe(false);
  });

  it("senza il numero non si può dire, e non si dice", () => {
    // `null` e non `false`: dichiarare non ammessa una condivisione solo perché il campo
    // degli addetti è vuoto è un'accusa fondata sul nulla.
    expect(condivisioneAmmessa(null)).toBeNull();
    expect(condivisioneAmmessa("")).toBeNull();
    expect(condivisioneAmmessa("circa duecento")).toBeNull();
  });

  it("le forme italiane del numero si leggono", () => {
    // Il campo è testo libero nel prototipo e resta testo: «1.200» e «1200» sono lo
    // stesso numero per chiunque tranne che per `Number`.
    expect(condivisioneAmmessa("1.200")).toBe(false);
    expect(condivisioneAmmessa(" 120 ")).toBe(true);
  });
});
