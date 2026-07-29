import { Decimal, dec } from "@/lib/calc/shared/decimal";
import { computeRow, type RowInput } from "./row";

// Aggregazione dell'inventario: contratto della funzione calc() del prototipo.
// Le categorie ISO sono '1'..'6'; scope: 1→cat1, 2→cat2, 3→cat3..6.

export type InventoryRowInput = RowInput & {
  id: string;
  sourceTypeKey: string;
  descrizione?: string | null;
};

export const CATEGORY_KEYS = ["1", "2", "3", "4", "5", "6"] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export type CategoryAggregate = {
  n: number;
  t: Decimal;
  tM: Decimal;
  bio: Decimal;
  incPct: Decimal; // quadratura relativa alla categoria
  dqMedia: Decimal; // ponderata sulle emissioni della categoria
};

export type InventoryResult = {
  s1: Decimal;
  s2l: Decimal;
  s2m: Decimal;
  s3: Decimal;
  totL: Decimal;
  totM: Decimal;
  bio: Decimal;
  incPct: Decimal; // quadratura sul totale location
  incMPct: Decimal; // quadratura sul totale market
  dqMedia: Decimal;
  n: number;
  perCategoria: Record<CategoryKey, CategoryAggregate>;
  top: { id: string; categoryKey: string; descrizione: string; t: Decimal }[];
};

const ZERO = dec(0);

export function computeInventory(rows: InventoryRowInput[]): InventoryResult {
  type Acc = { n: number; t: Decimal; tM: Decimal; bio: Decimal; inc2: Decimal; dqw: Decimal };
  const acc: Record<CategoryKey, Acc> = Object.fromEntries(
    CATEGORY_KEYS.map((k) => [k, { n: 0, t: ZERO, tM: ZERO, bio: ZERO, inc2: ZERO, dqw: ZERO }]),
  ) as Record<CategoryKey, Acc>;

  let bio = ZERO;
  let inc2 = ZERO; // Σ (t·inc/100)² — location
  let incM2 = ZERO; // Σ (tM·inc/100)² — market
  let dqw = ZERO; // Σ dqp·t
  const top: InventoryResult["top"] = [];

  for (const v of rows) {
    const r = computeRow(v);
    const k = (CATEGORY_KEYS.includes(v.categoryKey as CategoryKey) ? v.categoryKey : "1") as CategoryKey;
    const a = acc[k];
    a.n += 1;
    a.t = a.t.plus(r.t);
    a.tM = a.tM.plus(r.tM);
    a.bio = a.bio.plus(r.bio);
    a.inc2 = a.inc2.plus(r.tinc.pow(2));
    a.dqw = a.dqw.plus(r.t.times(r.dqp));

    bio = bio.plus(r.bio);
    inc2 = inc2.plus(r.tinc.pow(2));
    incM2 = incM2.plus(r.tM.times(r.inc).div(100).pow(2));
    dqw = dqw.plus(r.t.times(r.dqp));
    top.push({ id: v.id, categoryKey: v.categoryKey, descrizione: v.descrizione ?? "", t: r.t });
  }

  const s1 = acc["1"].t;
  const s2l = acc["2"].t;
  const s2m = acc["2"].tM;
  const s3 = acc["3"].t.plus(acc["4"].t).plus(acc["5"].t).plus(acc["6"].t);
  const totL = s1.plus(s2l).plus(s3);
  const totM = s1.plus(s2m).plus(s3);

  const perCategoria = Object.fromEntries(
    CATEGORY_KEYS.map((k) => {
      const a = acc[k];
      return [
        k,
        {
          n: a.n,
          t: a.t,
          tM: a.tM,
          bio: a.bio,
          incPct: a.t.gt(0) ? a.inc2.sqrt().div(a.t).times(100) : ZERO,
          dqMedia: a.t.gt(0) ? a.dqw.div(a.t) : ZERO,
        },
      ];
    }),
  ) as Record<CategoryKey, CategoryAggregate>;

  return {
    s1,
    s2l,
    s2m,
    s3,
    totL,
    totM,
    bio,
    incPct: totL.gt(0) ? inc2.sqrt().div(totL).times(100) : ZERO,
    incMPct: totM.gt(0) ? incM2.sqrt().div(totM).times(100) : ZERO,
    dqMedia: totL.gt(0) ? dqw.div(totL) : ZERO,
    n: rows.length,
    perCategoria,
    top: top.sort((a, b) => b.t.comparedTo(a.t)),
  };
}
