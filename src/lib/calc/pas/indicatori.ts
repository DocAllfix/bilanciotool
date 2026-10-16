// Gli indicatori derivati di un esercizio: il `derive` del prototipo.
//
// ⚠️ DIVERGE DAL PROTOTIPO su una regola sola, ma è quella che conta: **un derivato esiste solo
// se ci sono TUTTI i suoi ingressi**. Il prototipo legge un campo vuoto come zero, e un ingresso
// mancante non produce zero, produce un numero falso:
//  · senza la retribuzione media delle donne il divario retributivo di genere esce **100%**;
//  · senza la retribuzione più bassa il margine sul minimo contrattuale esce **−100%**;
//  · senza le ore di straordinario le ore lavorate e gli indici infortunistici si calcolano
//    sulle sole ordinarie, e sembrano migliori del vero.
// Numeri così finiscono nel manuale e nel verbale di riesame, che si firmano. Qui manca un
// ingresso, il derivato è `null` e si stampa «—».
//
// E come nel GDPR: «di cui» maggiore del totale (donne 50 su 48 addetti) non dà 104%, dà `null`
// e finisce fra le `incoerenze`.

export type Misure = Readonly<Record<string, number | null | undefined>>;

type Spec = {
  key: string;
  /** Tutti gli ingressi che servono: ne manca uno, il derivato è `null`. */
  ingressi: readonly string[];
  /** Le coppie parte ⊆ totale: se la parte supera il totale, il dato è incoerente. */
  diCui?: readonly [string, string];
  /** Il denominatore, che deve essere maggiore di zero. */
  denominatore: (v: Record<string, number>, settimane: number) => number;
  calcola: (v: Record<string, number>, settimane: number) => number;
  decimali: number;
};

const pct = (parte: string, totale: string): Pick<Spec, "ingressi" | "denominatore" | "calcola" | "decimali"> => ({
  ingressi: [parte, totale],
  denominatore: (v) => v[totale],
  calcola: (v) => (v[parte] / v[totale]) * 100,
  decimali: 1,
});

const ore = (v: Record<string, number>) => v.ore_ord + v.ore_str;

export const DERIVATI = [
  { key: "ore", ingressi: ["ore_ord", "ore_str"], denominatore: () => 1, calcola: ore, decimali: 0 },
  { key: "pctDonne", ...pct("lav_don", "lav_tot"), diCui: ["lav_don", "lav_tot"] },
  { key: "pctInd", ...pct("lav_ind", "lav_tot"), diCui: ["lav_ind", "lav_tot"] },
  { key: "pctStran", ...pct("lav_stran", "lav_tot"), diCui: ["lav_stran", "lav_tot"] },
  {
    key: "pctSomm",
    ingressi: ["lav_somm", "lav_tot"],
    denominatore: (v) => v.lav_tot + v.lav_somm,
    calcola: (v) => (v.lav_somm / (v.lav_tot + v.lav_somm)) * 100,
    decimali: 1,
  },
  { key: "turnover", ...pct("ces", "lav_tot") },
  {
    key: "margCcnl",
    ingressi: ["re_min", "re_ccnl"],
    denominatore: (v) => v.re_ccnl,
    calcola: (v) => ((v.re_min - v.re_ccnl) / v.re_ccnl) * 100,
    decimali: 1,
  },
  {
    key: "gapLw",
    ingressi: ["re_lw", "re_min"],
    denominatore: (v) => v.re_lw,
    calcola: (v) => ((v.re_lw - v.re_min) / v.re_lw) * 100,
    decimali: 1,
  },
  {
    key: "payGap",
    ingressi: ["re_uom", "re_don"],
    denominatore: (v) => v.re_uom,
    calcola: (v) => ((v.re_uom - v.re_don) / v.re_uom) * 100,
    decimali: 1,
  },
  { key: "pctCop", ...pct("cop", "lav_tot"), diCui: ["cop", "lav_tot"] },
  { key: "pctStr", ...pct("ore_str", "ore_ord") },
  {
    key: "oreSett",
    ingressi: ["ore_ord", "ore_str", "lav_tot"],
    denominatore: (v, s) => v.lav_tot * s,
    calcola: (v, s) => ore(v) / v.lav_tot / s,
    decimali: 1,
  },
  { key: "strAdd", ingressi: ["ore_str", "lav_tot"], denominatore: (v) => v.lav_tot, calcola: (v) => v.ore_str / v.lav_tot, decimali: 0 },
  { key: "if_", ingressi: ["inf", "ore_ord", "ore_str"], denominatore: ore, calcola: (v) => (v.inf / ore(v)) * 1e6, decimali: 2 },
  { key: "ig", ingressi: ["gg", "ore_ord", "ore_str"], denominatore: ore, calcola: (v) => (v.gg / ore(v)) * 1e3, decimali: 2 },
  { key: "pctSsl", ...pct("fssl", "lav_tot"), diCui: ["fssl", "lav_tot"] },
  { key: "oreForm", ingressi: ["fo_ore", "lav_tot"], denominatore: (v) => v.lav_tot, calcola: (v) => v.fo_ore / v.lav_tot, decimali: 1 },
  { key: "pctSgs", ...pct("fo_sgs", "lav_tot"), diCui: ["fo_sgs", "lav_tot"] },
  { key: "pctNuovi", ...pct("fo_nuovi", "ass"), diCui: ["fo_nuovi", "ass"] },
] as const satisfies readonly Spec[];

export type ChiaveDerivato = (typeof DERIVATI)[number]["key"];
export type Derivati = Record<ChiaveDerivato, number | null> & { incoerenze: ChiaveDerivato[] };

const valore = (m: Misure, k: string) => {
  const v = m[k];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

const arrotonda = (x: number, d: number) => {
  const f = Math.pow(10, d);
  return Math.round(x * f) / f;
};

/** @param settimane settimane lavorate nell'anno, dai parametri del percorso. */
export function derivati(m: Misure, settimane: number): Derivati {
  const out = { incoerenze: [] as ChiaveDerivato[] } as Derivati;
  for (const d of DERIVATI as readonly (Spec & { key: ChiaveDerivato })[]) {
    const v: Record<string, number> = {};
    let completo = true;
    for (const k of d.ingressi) {
      const x = valore(m, k);
      if (x === null) completo = false;
      else v[k] = x;
    }
    if (!completo || !(settimane > 0) || !(d.denominatore(v, settimane) > 0)) {
      out[d.key] = null;
      continue;
    }
    if (d.diCui && v[d.diCui[0]] > v[d.diCui[1]]) {
      out[d.key] = null;
      out.incoerenze.push(d.key);
      continue;
    }
    out[d.key] = arrotonda(d.calcola(v, settimane), d.decimali);
  }
  return out;
}

/** Le parti «di cui» che superano il loro totale: la validazione le segnala. */
export function parteOltreTotale(m: Misure): string[] {
  return (DERIVATI as readonly Spec[])
    .filter((d) => d.diCui)
    .filter((d) => {
      const p = valore(m, d.diCui![0]);
      const t = valore(m, d.diCui![1]);
      return p !== null && t !== null && p > t;
    })
    .map((d) => d.diCui![0]);
}
