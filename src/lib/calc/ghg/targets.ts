import { Decimal, dec, nz } from "@/lib/calc/shared/decimal";
import type { InventoryResult } from "./totals";

// Obiettivi di riduzione (contratto prototipo, vista "Anno base e obiettivi").

export type TargetScope = "1" | "2" | "12" | "3" | "tot";

export function scopeValue(inv: InventoryResult, ambito: TargetScope): Decimal {
  switch (ambito) {
    case "1":
      return inv.s1;
    case "2":
      return inv.s2l;
    case "12":
      return inv.s1.plus(inv.s2l);
    case "3":
      return inv.s3;
    case "tot":
      return inv.totL;
  }
}

export function computeTargetProgress(input: {
  base: Decimal;
  attuale: Decimal;
  riduzionePct: string | number;
}): { traguardo: Decimal; percorsoPct: Decimal } {
  const { base, attuale } = input;
  const rid = nz(input.riduzionePct);
  const traguardo = base.times(dec(1).minus(rid.div(100)));
  const delta = base.minus(traguardo);
  if (!base.gt(traguardo) || delta.isZero()) return { traguardo, percorsoPct: dec(0) };
  const pct = base.minus(attuale).div(delta).times(100);
  return { traguardo, percorsoPct: Decimal.min(100, Decimal.max(0, pct)) };
}

// Variazione % rispetto all'anno base; null se l'anno base non ha emissioni.
export function baseVariationPct(attuale: Decimal, base: Decimal): Decimal | null {
  if (!base.gt(0)) return null;
  return attuale.minus(base).div(base).times(100);
}
