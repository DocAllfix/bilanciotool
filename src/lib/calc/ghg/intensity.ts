import { Decimal, nz } from "@/lib/calc/shared/decimal";

// Intensità di emissione (contratto prototipo):
//   per fatturato = totL / (ricavi/1e6)      [tCO2e/M€]
//   per addetto   = totL × 1000 / FTE        [kgCO2e/FTE]
//   per unità     = totL × 1000 / produzione [kgCO2e/unità]
// Denominatore assente o ≤ 0 → null (mai NaN/Infinity nel motore).
export type IntensityInput = {
  ricavi?: string | number | null;
  fte?: string | number | null;
  produzione?: string | number | null;
};

export type IntensityResult = {
  perFatturato: Decimal | null;
  perAddetto: Decimal | null;
  perUnita: Decimal | null;
};

export function computeIntensity(totL: Decimal, meta: IntensityInput): IntensityResult {
  const ric = nz(meta.ricavi);
  const fte = nz(meta.fte);
  const prod = nz(meta.produzione);
  return {
    perFatturato: ric.gt(0) ? totL.div(ric.div(1_000_000)) : null,
    perAddetto: fte.gt(0) ? totL.times(1000).div(fte) : null,
    perUnita: prod.gt(0) ? totL.times(1000).div(prod) : null,
  };
}
