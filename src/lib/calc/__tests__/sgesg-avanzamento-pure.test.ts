import { describe, it, expect } from "vitest";
import { avanzamento } from "../sgesg/avanzamento";

const OTTO = ["proc00", "proc01", "proc02", "proc03", "proc04", "proc05", "proc06", "proc07"];

describe("avanzamento del programma ESG", () => {
  it("senza nessuna fase toccata e' tutto da avviare, e si riparte dalla prima", () => {
    const a = avanzamento(OTTO, []);
    expect(a).toMatchObject({ totali: 8, concluse: 0, inCorso: 0, daAvviare: 8, percentuale: 0, prossima: "proc00" });
  });

  it("una fase dovuta e non valutata pesa ZERO, non viene ignorata", () => {
    // ⚠️ E' la regola condivisa dei moduli di conformita', ed e' il punto del test.
    // Mediando sulle sole fasi toccate, «tre concluse su tre toccate» darebbe 100 —
    // lo stesso numero di «tutte e otto concluse». Tre situazioni opposte, un numero
    // solo, su un lavoro che si consegna a un cliente.
    const treToccate = avanzamento(OTTO, [
      { key: "proc00", stato: "conclusa" },
      { key: "proc01", stato: "conclusa" },
      { key: "proc02", stato: "conclusa" },
    ]);
    const tutte = avanzamento(OTTO, OTTO.map((key) => ({ key, stato: "conclusa" as const })));

    expect(treToccate.percentuale).toBe(38);
    expect(tutte.percentuale).toBe(100);
    expect(treToccate.percentuale).not.toBe(tutte.percentuale);
  });

  it("«in corso» non conta come conclusa, e diventa la prossima", () => {
    const a = avanzamento(OTTO, [
      { key: "proc00", stato: "conclusa" },
      { key: "proc01", stato: "in_corso" },
    ]);
    expect(a.concluse).toBe(1);
    expect(a.inCorso).toBe(1);
    expect(a.daAvviare).toBe(6);
    expect(a.prossima).toBe("proc01");
  });

  it("la prossima e' la prima NON conclusa in ordine di catalogo, anche saltando avanti", () => {
    // Chi ha chiuso la 00 e la 03 lavorando fuori ordine deve tornare alla 01, non
    // alla 04: l'ordine del metodo e' quello del catalogo, non quello in cui si e'
    // lavorato.
    const a = avanzamento(OTTO, [
      { key: "proc00", stato: "conclusa" },
      { key: "proc03", stato: "conclusa" },
    ]);
    expect(a.prossima).toBe("proc01");
    expect(a.concluse).toBe(2);
  });

  it("con tutte concluse non c'e' una prossima", () => {
    const a = avanzamento(OTTO, OTTO.map((key) => ({ key, stato: "conclusa" as const })));
    expect(a.prossima).toBeNull();
    expect(a.daAvviare).toBe(0);
  });

  it("una fase che il catalogo non conosce non conta, e non fa superare il 100%", () => {
    // ⚠️ Puo' succedere davvero: il programma congela il set alla creazione, e una
    // fase tolta da una versione successiva del metodo resterebbe come riga orfana.
    // Contarla darebbe 9 su 8.
    const a = avanzamento(OTTO, [
      ...OTTO.map((key) => ({ key, stato: "conclusa" as const })),
      { key: "proc99-inesistente", stato: "conclusa" },
    ]);
    expect(a.concluse).toBe(8);
    expect(a.percentuale).toBe(100);
  });

  it("un catalogo vuoto da' zero, non NaN", () => {
    const a = avanzamento([], []);
    expect(a.percentuale).toBe(0);
    expect(Number.isNaN(a.percentuale)).toBe(false);
    expect(a.prossima).toBeNull();
  });
});
