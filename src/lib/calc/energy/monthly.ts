import { Decimal, dec, nz } from "@/lib/calc/shared/decimal";
import type { CategoriaVettore, Fattori, VettoreDef } from "./vectors";

// Andamento mensile: facoltativo, ma è ciò che rivela le anomalie stagionali e
// i consumi che restano accesi a stabilimento fermo.
//
// Il confronto fra la somma dei dodici mesi e il dato annuo è un controllo di
// plausibilità: entro il 2% lo scarto è fisiologico (le date di lettura non
// coincidono con l'anno solare), oltre manca una bolletta o un conguaglio.

export type MonthlyResult = {
  perCategoria: Record<CategoriaVettore, Decimal[]>;
  perMese: Decimal[];
  totale: Decimal;
  /** Per vettore: somma dei mesi, dato annuo e scostamento percentuale. */
  controlli: Map<string, { sommaMesi: Decimal; annuo: Decimal; scostamentoPct: Decimal | null; ok: boolean }>;
  /** Consumo elettrico del mese più basso, annualizzato: stima dell'energia che
   *  il sito consuma comunque anche a produzione ferma. `null` se i mesi
   *  valorizzati sono meno di sei, perché il minimo non sarebbe significativo. */
  consumoDiBase: Decimal | null;
};

const ZERO = dec(0);
const MESI = 12;

export function computeMonthly(
  defs: VettoreDef[],
  mensili: Map<string, (string | number | null)[]>,
  annui: Map<string, string | number | null>,
  fattori: Map<string, Fattori>,
  tolleranzaPct: string | number = "2",
): MonthlyResult {
  const perCategoria: Record<CategoriaVettore, Decimal[]> = {
    E: Array.from({ length: MESI }, () => ZERO),
    T: Array.from({ length: MESI }, () => ZERO),
    M: Array.from({ length: MESI }, () => ZERO),
  };
  const controlli = new Map<string, { sommaMesi: Decimal; annuo: Decimal; scostamentoPct: Decimal | null; ok: boolean }>();
  const tolleranza = nz(tolleranzaPct);
  let totale = ZERO;

  for (const d of defs) {
    if (d.sub) continue;
    const f = fattori.get(d.key);
    if (!f) continue;
    const serie = mensili.get(d.key) ?? [];
    const kwhUnita = nz(f.kwhUnita);
    let sommaMesi = ZERO;

    for (let m = 0; m < MESI; m++) {
      const q = nz(serie[m]);
      if (q.isZero()) continue;
      sommaMesi = sommaMesi.plus(q);
      const kwh = q.times(kwhUnita);
      perCategoria[d.categoria][m] = perCategoria[d.categoria][m].plus(kwh);
      totale = totale.plus(kwh);
    }

    const annuo = nz(annui.get(d.key));
    const scostamentoPct = annuo.gt(0) ? sommaMesi.minus(annuo).div(annuo).times(100) : null;
    controlli.set(d.key, {
      sommaMesi,
      annuo,
      scostamentoPct,
      ok: scostamentoPct === null ? sommaMesi.isZero() : scostamentoPct.abs().lte(tolleranza),
    });
  }

  const perMese = Array.from({ length: MESI }, (_, m) =>
    perCategoria.E[m].plus(perCategoria.T[m]).plus(perCategoria.M[m]),
  );

  const mesiElettrici = perCategoria.E.filter((v) => v.gt(0));
  const consumoDiBase =
    mesiElettrici.length >= 6
      ? mesiElettrici.reduce((min, v) => (v.lt(min) ? v : min), mesiElettrici[0]).times(MESI)
      : null;

  return { perCategoria, perMese, totale, controlli, consumoDiBase };
}
