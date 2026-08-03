import { Decimal, dec, nz } from "@/lib/calc/shared/decimal";

// Energia in ingresso: conversione dei vettori in energia finale (kWh), energia
// primaria (tep) ed emissioni, più i totali del sito.
//
// Il vettore "sub" (elettricità coperta da garanzie d'origine) è un DETTAGLIO di
// quello principale: entra nel calcolo delle emissioni market-based e della quota
// rinnovabile, mai nei totali, altrimenti l'energia elettrica si conta due volte.

export type Fattori = {
  kwhUnita: string | number;
  tepUnita: string | number;
  feUnita: string | number;
  feMarket?: string | number | null;
};

export type CategoriaVettore = "E" | "T" | "M";

export type VettoreDef = {
  key: string;
  categoria: CategoriaVettore;
  rinnovabile: boolean;
  sub: boolean;
};

export type VettoreInput = {
  vettoreKey: string;
  quantita?: string | number | null;
  costo?: string | number | null;
};

export type VettoreResult = {
  quantita: Decimal;
  kwh: Decimal;
  tep: Decimal;
  co2: Decimal; // tonnellate
  costo: Decimal;
  euroPerKwh: Decimal;
};

export type TotaliVettori = {
  kwh: Decimal;
  tep: Decimal;
  co2: Decimal;
  costo: Decimal;
  kwhE: Decimal;
  kwhT: Decimal;
  kwhM: Decimal;
  gj: Decimal;
  rinnovabile: Decimal;
  pctRinnovabile: Decimal;
  euroPerKwh: Decimal;
};

const ZERO = dec(0);

/** Conversione di un singolo vettore. Il costo unitario è ZERO quando non c'è
 *  energia: mai una divisione per zero, mai un NaN che si propaga nei totali. */
export function computeVector(input: VettoreInput, f: Fattori): VettoreResult {
  const quantita = nz(input.quantita);
  const kwh = quantita.times(nz(f.kwhUnita));
  const costo = nz(input.costo);
  return {
    quantita,
    kwh,
    tep: quantita.times(nz(f.tepUnita)),
    co2: quantita.times(nz(f.feUnita)).div(1000),
    costo,
    euroPerKwh: kwh.gt(0) ? costo.div(kwh) : ZERO,
  };
}

export function computeVectors(
  defs: VettoreDef[],
  inputs: VettoreInput[],
  fattori: Map<string, Fattori>,
): { perVettore: Map<string, VettoreResult>; totali: TotaliVettori } {
  const perInput = new Map(inputs.map((i) => [i.vettoreKey, i]));
  const perVettore = new Map<string, VettoreResult>();

  let kwh = ZERO, tep = ZERO, co2 = ZERO, costo = ZERO;
  let kwhE = ZERO, kwhT = ZERO, kwhM = ZERO, rinnovabile = ZERO;

  for (const d of defs) {
    if (d.sub) continue; // il dettaglio non entra nei totali
    const f = fattori.get(d.key);
    if (!f) continue;
    const r = computeVector(perInput.get(d.key) ?? { vettoreKey: d.key }, f);
    perVettore.set(d.key, r);

    kwh = kwh.plus(r.kwh);
    tep = tep.plus(r.tep);
    co2 = co2.plus(r.co2);
    costo = costo.plus(r.costo);
    if (d.categoria === "E") kwhE = kwhE.plus(r.kwh);
    else if (d.categoria === "T") kwhT = kwhT.plus(r.kwh);
    else kwhM = kwhM.plus(r.kwh);
    if (d.rinnovabile) rinnovabile = rinnovabile.plus(r.kwh);
  }

  // L'elettricità con garanzia d'origine è rinnovabile pur essendo prelevata
  // dalla rete: si somma alla quota verde, limitata al prelievo effettivo.
  const sub = defs.find((d) => d.sub);
  if (sub) {
    const principale = defs.find((d) => !d.sub && d.categoria === sub.categoria);
    const go = nz(perInput.get(sub.key)?.quantita);
    const prelievo = principale ? nz(perInput.get(principale.key)?.quantita) : ZERO;
    const coperte = Decimal.min(go, prelievo);
    const fSub = fattori.get(sub.key);
    if (fSub) rinnovabile = rinnovabile.plus(coperte.times(nz(fSub.kwhUnita)));
  }

  return {
    perVettore,
    totali: {
      kwh,
      tep,
      co2,
      costo,
      kwhE,
      kwhT,
      kwhM,
      gj: kwh.times("0.0036"),
      rinnovabile,
      pctRinnovabile: kwh.gt(0) ? rinnovabile.div(kwh).times(100) : ZERO,
      euroPerKwh: kwh.gt(0) ? costo.div(kwh) : ZERO,
    },
  };
}
