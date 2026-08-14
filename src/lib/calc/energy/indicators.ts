import { Decimal, dec, nz } from "@/lib/calc/shared/decimal";
import type { TotaliVettori } from "./vectors";

// Indicatori di prestazione energetica (EnPI). Un consumo assoluto non dice se
// il sito lavora bene: dice quanto ha prodotto. Gli indicatori rapportano
// l'energia alle variabili che la determinano.
//
// Le formule sono funzioni e non possono stare nel catalogo di seed: qui vive il
// registro, chiavato sulle stesse `key` di `energy_indicator`. Un test verifica
// che catalogo e registro coincidano, così non si può seminare un indicatore
// senza formula né lasciare una formula orfana.
//
// SCOSTAMENTO VOLUTO dal prototipo: un indicatore senza denominatore restituisce
// `null` e non `0`. Uno zero si leggerebbe come "consumo specifico nullo", cioè
// un risultato eccellente, mentre il dato semplicemente manca; e il grafico di
// confronto deve saltare l'indicatore, non disegnarlo a fondo scala.

export type BaseIndicatori = Pick<TotaliVettori, "kwh" | "tep" | "co2" | "costo" | "kwhE" | "kwhT" | "kwhM">;

export type DriverKey = "prod" | "sup" | "suptot" | "vol" | "add" | "ore" | "gg" | "fatt";
export type Driver = Record<DriverKey, Decimal>;

export const DRIVER_KEYS: DriverKey[] = ["prod", "sup", "suptot", "vol", "add", "ore", "gg", "fatt"];

/** Costruisce i driver da valori grezzi, con zero per quelli assenti. */
export function driversDa(valori: Partial<Record<DriverKey, string | number | null>>): Driver {
  return Object.fromEntries(DRIVER_KEYS.map((k) => [k, nz(valori[k])])) as Driver;
}

/** Rapporto che restituisce null quando il denominatore manca o non è positivo. */
const su = (num: Decimal, den: Decimal): Decimal | null => (den.gt(0) ? num.div(den) : null);

export const INDICATORI: Record<string, (b: BaseIndicatori, d: Driver) => Decimal | null> = {
  cs: (b, d) => su(b.kwh, d.prod),
  csp: (b, d) => su(b.tep, d.prod),
  cse: (b, d) => su(b.kwhE, d.prod),
  csm2: (b, d) => su(b.kwh, d.suptot),
  term: (b, d) => (d.vol.gt(0) && d.gg.gt(0) ? b.kwhT.div(d.vol.times(d.gg)) : null),
  csad: (b, d) => su(b.kwh, d.add),
  csor: (b, d) => su(b.kwh, d.ore),
  cco2: (b, d) => su(b.co2.times(1000), d.prod),
  ceur: (b, d) => su(b.costo, d.prod),
  cinc: (b, d) => {
    const r = su(b.costo, d.fatt);
    return r === null ? null : r.times(100);
  },
};

export const INDICATORI_KEYS = Object.keys(INDICATORI);

export function computeIndicators(b: BaseIndicatori, d: Driver): Map<string, Decimal | null> {
  return new Map(INDICATORI_KEYS.map((k) => [k, INDICATORI[k](b, d)]));
}

export type ConfrontoIndicatore = {
  valore: Decimal;
  valoreBase: Decimal;
  variazionePct: Decimal;
  /** Tutti gli indicatori sono "minore è meglio": una variazione negativa migliora. */
  migliorato: boolean;
};

/** Confronto con l'anno base, sui soli indicatori calcolabili in entrambi gli anni. */
export function compareToBase(
  corrente: Map<string, Decimal | null>,
  base: Map<string, Decimal | null>,
): Map<string, ConfrontoIndicatore> {
  const out = new Map<string, ConfrontoIndicatore>();
  for (const k of INDICATORI_KEYS) {
    const c = corrente.get(k) ?? null;
    const b = base.get(k) ?? null;
    if (c === null || b === null || !b.gt(0) || !c.gt(0)) continue;
    const variazionePct = c.minus(b).div(b).times(100);
    out.set(k, { valore: c, valoreBase: b, variazionePct, migliorato: variazionePct.lt(0) });
  }
  return out;
}
