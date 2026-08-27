import { describe, it, expect } from "vitest";
import { oggiIso } from "@/features/agenda";

// «OGGI» È IL GIORNO ITALIANO, NON QUELLO DEL RUNTIME.
//
// ⚠️ Trovato sul deploy di anteprima il 27 agosto 2026: l'agenda proponeva come data
// predefinita il **26**. Il collaudo lo ha detto con le parole giuste — «la data
// predefinita è 2026-08-26 invece di 2026-08-27» — e la causa era una riga scritta bene
// con un presupposto sbagliato.
//
// `oggiIso` usava `getFullYear/getMonth/getDate`, cioè il fuso LOCALE del processo. Il
// commento diceva «le voci d'agenda le scrive e le legge una persona in Italia», ed è
// vero per chi guarda — ma quel codice gira sul SERVER, e le funzioni di Vercel hanno il
// fuso **UTC**. Fra mezzanotte e le due, ora italiana d'estate, il server sta ancora a
// ieri: «le voci di oggi» mostrava quelle del giorno prima, e la data proposta era
// vecchia di un giorno.
//
// In locale non si vede MAI: la mia macchina è a Roma, e il fuso del processo coincide
// con quello dell'utente. Serve un runtime in un altro fuso per separarli.
//
// ⚠️ La correzione NON è impostare `TZ` sull'ambiente. Funzionerebbe, e tornerebbe a
// rompersi in silenzio il giorno in cui un ambiente nuovo non ce l'ha. Il fuso italiano
// si calcola qui dentro, e non dipende da come è configurato chi esegue.
//
// ⚠️ E nemmeno `Intl`/`toLocale*`: dipendono dai dati ICU del runtime, che è il difetto
// gemello trovato lo stesso giorno sulle date del pannello di condivisione.

describe("oggiIso guarda il calendario italiano", () => {
  it("a mezzogiorno UTC danno lo stesso giorno", () => {
    expect(oggiIso(new Date("2026-08-27T12:00:00Z"))).toBe("2026-08-27");
  });

  it("⚠️ alle 00:30 italiane d'estate è già il giorno nuovo, anche se in UTC è ieri", () => {
    // 27 agosto 00:30 in Italia (CEST, UTC+2) = 26 agosto 22:30 UTC.
    expect(oggiIso(new Date("2026-08-26T22:30:00Z"))).toBe("2026-08-27");
  });

  it("alle 00:30 italiane d'inverno vale lo stesso, con un'ora sola di scarto", () => {
    // 15 gennaio 00:30 in Italia (CET, UTC+1) = 14 gennaio 23:30 UTC.
    expect(oggiIso(new Date("2026-01-14T23:30:00Z"))).toBe("2026-01-15");
  });

  it("alle 23:30 italiane è ancora il giorno che sta finendo", () => {
    // 27 agosto 23:30 in Italia = 27 agosto 21:30 UTC.
    expect(oggiIso(new Date("2026-08-27T21:30:00Z"))).toBe("2026-08-27");
  });

  it("il passaggio all'ora legale: l'ultima domenica di marzo", () => {
    // 2026: l'ora legale entra domenica 29 marzo alle 01:00 UTC.
    // 29 marzo 00:30 UTC = 01:30 in Italia (ancora CET, +1) → è già il 29.
    expect(oggiIso(new Date("2026-03-29T00:30:00Z"))).toBe("2026-03-29");
    // 28 marzo 23:30 UTC = 00:30 del 29 in Italia (+1) → il 29.
    expect(oggiIso(new Date("2026-03-28T23:30:00Z"))).toBe("2026-03-29");
  });

  it("il ritorno all'ora solare: l'ultima domenica di ottobre", () => {
    // 2026: l'ora solare torna domenica 25 ottobre alle 01:00 UTC.
    // 24 ottobre 22:30 UTC = 00:30 del 25 in Italia (ancora CEST, +2) → il 25.
    expect(oggiIso(new Date("2026-10-24T22:30:00Z"))).toBe("2026-10-25");
    // 25 ottobre 23:30 UTC = 00:30 del 26 in Italia (ormai CET, +1) → il 26.
    expect(oggiIso(new Date("2026-10-25T23:30:00Z"))).toBe("2026-10-26");
  });
});
