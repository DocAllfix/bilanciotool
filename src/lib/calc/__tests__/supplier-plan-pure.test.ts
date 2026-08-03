import { describe, it, expect } from "vitest";
import { computeSupplier, type Risposta } from "@/lib/calc/supplier/scoring";
import { buildPlan, computeUpside } from "@/lib/calc/supplier/plan";
import { codiceVerifica, validoFino } from "@/lib/calc/supplier/attestation";
import DOMANDE from "@/lib/db/seeds/data/supplier-questions.json";
import EFFORT from "@/lib/db/seeds/data/supplier-effort.json";

const QUESTIONS = (DOMANDE as { id: string; p: string; w: number }[]).map((q) => ({
  key: q.id,
  areaKey: q.p,
  peso: q.w,
  giorniStimati: (EFFORT as Record<string, number>)[String(q.w)],
}));

const DEMO: Record<string, Risposta> = {};
for (const k of ["B1", "B4", "E1", "E5", "E7", "S1", "S3", "S4", "G1", "G6", "P2"]) DEMO[k] = "si";
for (const k of ["B2", "E2", "S2", "S5", "G3", "P1"]) DEMO[k] = "parziale";
for (const k of ["E4", "E8", "S6", "S7", "G2", "G4", "P4"]) DEMO[k] = "no";

describe("piano di adeguamento", () => {
  const esito = computeSupplier(QUESTIONS, DEMO);

  it("riproduce i punti recuperabili del prototipo", () => {
    // Golden ottenuto eseguendo `upside()` del prototipo sul dataset di esempio.
    const punti = (key: string) => computeUpside(QUESTIONS, DEMO, esito, key);
    expect(punti("P4")).toBe(4.3);
    expect(punti("G4")).toBe(4.2);
    expect(punti("E4")).toBe(3.8);
    expect(punti("E8")).toBe(3.8);
    expect(punti("G2")).toBe(6.3);
    expect(punti("S6")).toBe(3.2);
  });

  it("una domanda già a «sì» o «non applicabile» non ha nulla da recuperare", () => {
    expect(computeUpside(QUESTIONS, DEMO, esito, "B1")).toBe(0);
    const conNa = { ...DEMO, E9: "na" as Risposta };
    const e2 = computeSupplier(QUESTIONS, conNa);
    expect(computeUpside(QUESTIONS, conNa, e2, "E9")).toBe(0);
  });

  it("il piano elenca le sole lacune, ordinate per punti guadagnati al giorno", () => {
    const piano = buildPlan(QUESTIONS, DEMO, esito);
    // 6 "parziale" + 7 "no" = 13 lacune; i "sì" e le non risposte restano fuori.
    expect(piano.length).toBe(13);
    expect(piano.every((v) => DEMO[v.key] === "no" || DEMO[v.key] === "parziale")).toBe(true);
    expect(piano[0].key).toBe("P4");
    const resa = piano.map((v) => v.punti / v.giorni);
    expect([...resa]).toEqual([...resa].sort((a, b) => b - a));
  });

  it("i punti complessivamente recuperabili sono quelli del prototipo", () => {
    const piano = buildPlan(QUESTIONS, DEMO, esito);
    const totale = piano.reduce((s, v) => s + v.punti, 0);
    expect(Number(totale.toFixed(1))).toBe(42.7);
  });

  it("l'azione proposta dipende dalla risposta data", () => {
    const piano = buildPlan(QUESTIONS, DEMO, esito);
    const no = piano.find((v) => v.key === "G2")!;
    const parziale = piano.find((v) => v.key === "B2")!;
    expect(no.azione).toMatch(/^Predisporre e formalizzare/);
    expect(parziale.azione).toMatch(/^Completare e aggiornare/);
  });

  it("senza lacune il piano è vuoto", () => {
    const tutte: Record<string, Risposta> = {};
    for (const q of QUESTIONS) tutte[q.key] = "si";
    const e = computeSupplier(QUESTIONS, tutte);
    expect(e.indice).toBe(100);
    expect(buildPlan(QUESTIONS, tutte, e)).toEqual([]);
  });
});

describe("attestato", () => {
  it("il codice di verifica è stabile a parità di dati", () => {
    const a = codiceVerifica("snap-1", "co-1", 58, 1);
    const b = codiceVerifica("snap-1", "co-1", 58, 1);
    expect(a).toBe(b);
    expect(a).toMatch(/^SR-[0-9A-Z]{7}$/);
  });

  it("cambia se cambia anche uno solo degli elementi che lo compongono", () => {
    const base = codiceVerifica("snap-1", "co-1", 58, 1);
    expect(codiceVerifica("snap-2", "co-1", 58, 1)).not.toBe(base);
    expect(codiceVerifica("snap-1", "co-2", 58, 1)).not.toBe(base);
    expect(codiceVerifica("snap-1", "co-1", 59, 1)).not.toBe(base);
    expect(codiceVerifica("snap-1", "co-1", 58, 2)).not.toBe(base);
  });

  it("la validità è di dodici mesi dall'emissione", () => {
    expect(validoFino("2026-03-15T10:00:00.000Z")).toBe("2027-03-15");
    // Anno bisestile: il 29 febbraio non esiste nel 2027.
    expect(validoFino("2028-02-29T00:00:00.000Z")).toBe("2029-03-01");
  });
});
