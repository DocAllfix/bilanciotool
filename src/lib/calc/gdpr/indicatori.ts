// Gli indicatori derivati di un esercizio.
//
// ⚠️ DUE DIVERGENZE DAL PROTOTIPO, entrambe sulla stessa idea: un numero che non si conosce
// non è zero.
//  · Il prototipo leggeva un campo vuoto come 0, quindi «autorizzati: 30, formati: vuoto»
//    dava 0% di formati — che è un'affermazione, e falsa. Qui manca uno dei due numeri, il
//    derivato è `null`. (Stessa scelta del bilancio energetico.)
//  · «Di cui» maggiore del totale (formati 35 su 30 autorizzati) dava 116,7%. Qui il
//    derivato è `null` e la coppia finisce fra le `incoerenze`: un dato sbagliato si dice,
//    non si stampa in un documento.

export type Misure = Readonly<Record<string, number | null | undefined>>;

/** Le coppie parte ÷ totale. `diCui`: la parte è un sottoinsieme del totale. */
export const DERIVATI = [
  { key: "pctForm", parte: "aut_form", totale: "aut", diCui: true, unita: "%" },
  { key: "oreForm", parte: "fo_ore", totale: "aut", diCui: false, unita: "ore" },
  { key: "pctNuovi", parte: "nuovi_form", totale: "nuovi", diCui: true, unita: "%" },
  { key: "pctMfa", parte: "acc_mfa", totale: "acc", diCui: true, unita: "%" },
  { key: "pctCif", parte: "disp_cif", totale: "disp", diCui: true, unita: "%" },
  { key: "pctCons", parte: "cons_doc", totale: "cont", diCui: true, unita: "%" },
  { key: "pctOpp", parte: "opp", totale: "cont", diCui: false, unita: "%" },
] as const;

export type ChiaveDerivato = (typeof DERIVATI)[number]["key"];

const valore = (m: Misure, k: string) => {
  const v = m[k];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

const arrotonda1 = (x: number) => Math.round(x * 10) / 10;

export type Derivati = Record<ChiaveDerivato, number | null> & { incoerenze: ChiaveDerivato[] };

export function derivati(m: Misure): Derivati {
  const out = { incoerenze: [] as ChiaveDerivato[] } as Derivati;
  for (const d of DERIVATI) {
    const parte = valore(m, d.parte);
    const totale = valore(m, d.totale);
    if (parte === null || totale === null || totale <= 0) {
      out[d.key] = null;
      continue;
    }
    if (d.diCui && parte > totale) {
      out[d.key] = null;
      out.incoerenze.push(d.key);
      continue;
    }
    const x = parte / totale;
    out[d.key] = arrotonda1(d.unita === "%" ? x * 100 : x);
  }
  return out;
}

/** Le coppie «di cui» il cui valore supera il totale: la validazione le rifiuta. */
export function parteOltreTotale(m: Misure): string[] {
  return DERIVATI.filter((d) => d.diCui)
    .filter((d) => {
      const p = valore(m, d.parte);
      const t = valore(m, d.totale);
      return p !== null && t !== null && p > t;
    })
    .map((d) => d.parte);
}
