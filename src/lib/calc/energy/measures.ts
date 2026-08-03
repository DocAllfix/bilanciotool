import { Decimal, dec, nz } from "@/lib/calc/shared/decimal";
import type { Fattori } from "./vectors";

// Interventi di miglioramento. Il valore economico e il tempo di ritorno si
// calcolano dal costo unitario del vettore ricavato al passo 2: non si inseriscono
// a mano e quindi non possono essere ottimistici per distrazione.
//
// SCOSTAMENTO VOLUTO dal prototipo: quando il risparmio economico è nullo il
// tempo di ritorno è `null` e non `0`. Uno zero si legge come "ritorno immediato",
// che è il contrario di ciò che significa.

export type MisuraInput = {
  vettoreKey: string;
  quantita?: string | number | null; // risparmio annuo nell'unità del vettore
  investimento?: string | number | null;
  incentivo?: string | number | null;
};

export type MisuraResult = {
  kwh: Decimal;
  tep: Decimal;
  co2: Decimal;
  risparmioEuro: Decimal;
  investimento: Decimal;
  incentivo: Decimal;
  netto: Decimal;
  pbtAnni: Decimal | null;
  pctSulTotale: Decimal;
};

export type TotaliMisure = {
  kwh: Decimal;
  tep: Decimal;
  co2: Decimal;
  risparmioEuro: Decimal;
  investimento: Decimal;
  netto: Decimal;
  pbtAnni: Decimal | null;
  pctSulTotale: Decimal;
  quantificate: number;
};

const ZERO = dec(0);

export function computeMeasure(
  m: MisuraInput,
  f: Fattori | undefined,
  euroPerKwh: Decimal,
  kwhTotale: Decimal,
): MisuraResult {
  const q = nz(m.quantita);
  const kwh = f ? q.times(nz(f.kwhUnita)) : ZERO;
  const investimento = nz(m.investimento);
  const incentivo = nz(m.incentivo);
  const netto = Decimal.max(ZERO, investimento.minus(incentivo));
  const risparmioEuro = kwh.times(euroPerKwh);
  return {
    kwh,
    tep: f ? q.times(nz(f.tepUnita)) : ZERO,
    co2: f ? q.times(nz(f.feUnita)).div(1000) : ZERO,
    risparmioEuro,
    investimento,
    incentivo,
    netto,
    pbtAnni: risparmioEuro.gt(0) ? netto.div(risparmioEuro) : null,
    pctSulTotale: kwhTotale.gt(0) ? kwh.div(kwhTotale).times(100) : ZERO,
  };
}

/** I totali ricevono i costi già calcolati una volta sola: il prototipo
 *  ricalcolava l'intero bilancio per ogni singolo intervento. */
export function computeMeasures(
  misure: MisuraInput[],
  fattori: Map<string, Fattori>,
  euroPerKwh: Map<string, Decimal>,
  kwhTotale: Decimal,
): { righe: MisuraResult[]; totali: TotaliMisure } {
  const righe = misure.map((m) =>
    computeMeasure(m, fattori.get(m.vettoreKey), euroPerKwh.get(m.vettoreKey) ?? ZERO, kwhTotale),
  );

  const somma = (sel: (r: MisuraResult) => Decimal) => righe.reduce((s, r) => s.plus(sel(r)), ZERO);
  const risparmioEuro = somma((r) => r.risparmioEuro);
  const netto = somma((r) => r.netto);
  const kwh = somma((r) => r.kwh);

  return {
    righe,
    totali: {
      kwh,
      tep: somma((r) => r.tep),
      co2: somma((r) => r.co2),
      risparmioEuro,
      investimento: somma((r) => r.investimento),
      netto,
      pbtAnni: risparmioEuro.gt(0) ? netto.div(risparmioEuro) : null,
      pctSulTotale: kwhTotale.gt(0) ? kwh.div(kwhTotale).times(100) : ZERO,
      quantificate: righe.filter((r) => r.kwh.gt(0)).length,
    },
  };
}
