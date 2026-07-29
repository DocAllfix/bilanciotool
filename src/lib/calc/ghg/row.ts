import { Decimal, dec, nz } from "@/lib/calc/shared/decimal";

// Scala qualità del dato (ISO 14064-1 §8.2, contratto del prototipo):
// incertezza di default sovrascrivibile per riga, punteggio per la media ponderata.
export type DqLevel = "M" | "F" | "C" | "E" | "S";
export const DQ_LEVELS: Record<DqLevel, { nome: string; inc: string; punti: number }> = {
  M: { nome: "Misurato", inc: "2", punti: 5 },
  F: { nome: "Documentale", inc: "5", punti: 4 },
  C: { nome: "Calcolato", inc: "10", punti: 3 },
  E: { nome: "Estrapolato", inc: "20", punti: 2 },
  S: { nome: "Stimato", inc: "30", punti: 1 },
};

export type RowInput = {
  categoryKey: string; // '1'..'6'
  quantita: string | number | null;
  fe: string | number | null;
  feMarket?: string | number | null; // cat 2; null/'' → usa fe
  quotaGo?: string | number | null; // cat 2
  feBiogenic?: string | number | null; // non-cat-2
  dq: DqLevel;
  incertezza?: string | number | null; // % override
};

export type RowResult = {
  t: Decimal; // tCO2e location-based
  tM: Decimal; // tCO2e market-based (= t fuori dalla cat 2)
  bio: Decimal; // t CO2 biogenica (fuori totale)
  inc: Decimal; // incertezza % applicata
  tinc: Decimal; // contributo assoluto d'incertezza (per la quadratura)
  dqp: number; // punteggio qualità 5..1
};

export function computeRow(v: RowInput): RowResult {
  const q = nz(v.quantita);
  const fe = nz(v.fe);
  const feM = v.feMarket === null || v.feMarket === undefined || v.feMarket === "" ? fe : nz(v.feMarket);
  const qGO = nz(v.quotaGo);
  const feB = nz(v.feBiogenic);
  const mille = dec(1000);

  const t = q.times(fe).div(mille);
  const tM = v.categoryKey === "2" ? Decimal.max(0, q.minus(qGO)).times(feM).div(mille) : t;
  const bio = q.times(feB).div(mille);

  const d = DQ_LEVELS[v.dq] ?? DQ_LEVELS.C;
  const inc = v.incertezza === null || v.incertezza === undefined || v.incertezza === "" ? dec(d.inc) : nz(v.incertezza);
  const tinc = t.times(inc).div(100);

  return { t, tM, bio, inc, tinc, dqp: d.punti };
}
