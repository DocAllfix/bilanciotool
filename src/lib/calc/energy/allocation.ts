import { Decimal, dec, nz } from "@/lib/calc/shared/decimal";
import type { Fattori, VettoreDef, VettoreInput } from "./vectors";

// Ripartizione dell'energia sugli usi finali: è il passaggio che trasforma una
// raccolta di bollette in un bilancio energetico.
//
// Le celle della matrice sono SEMPRE nell'unità del vettore, mai in kWh: la
// quadratura confronta quantità entrate e quantità attribuite, quindi resta
// valida anche se un fattore di conversione viene corretto in seguito.

export type AreaKey = "P" | "A" | "G" | "T";

export type UsoDef = { key: string; areaKey: AreaKey };

export type Cella = { usoKey: string; vettoreKey: string; quantita: string | number | null };

export type UsoResult = {
  kwh: Decimal;
  tep: Decimal;
  co2: Decimal;
  costo: Decimal;
  pct: Decimal; // quota sul ripartito, non sull'ingresso
};

export type AllocationResult = {
  perUso: Map<string, UsoResult>;
  perArea: Record<AreaKey, Decimal>;
  kwhRipartito: Decimal;
  coperturaPct: Decimal;
};

export type QuadraturaVettore = {
  ingresso: Decimal;
  ripartito: Decimal;
  residuo: Decimal;
  scostamentoPct: Decimal;
  ok: boolean;
  attivo: boolean;
};

export type QuadraturaResult = {
  perVettore: Map<string, QuadraturaVettore>;
  ok: number;
  valutati: number;
  pct: Decimal;
};

export type Flusso = { vettoreKey: string; areaKey: AreaKey; kwh: Decimal };

const ZERO = dec(0);
const AREE: AreaKey[] = ["P", "A", "G", "T"];

/** Energia, emissioni e costo di ciascun uso finale, e aggregati per area. */
export function computeAllocation(
  usi: UsoDef[],
  celle: Cella[],
  fattori: Map<string, Fattori>,
  euroPerKwh: Map<string, string | number>,
): AllocationResult {
  const perUso = new Map<string, UsoResult>();
  const perArea: Record<AreaKey, Decimal> = { P: ZERO, A: ZERO, G: ZERO, T: ZERO };
  const indice = new Map(usi.map((u) => [u.key, u]));
  let kwhRipartito = ZERO;

  // Accumulo per uso, ignorando le celle che puntano a chiavi inesistenti.
  const grezzi = new Map<string, { kwh: Decimal; tep: Decimal; co2: Decimal; costo: Decimal }>();
  for (const u of usi) grezzi.set(u.key, { kwh: ZERO, tep: ZERO, co2: ZERO, costo: ZERO });

  for (const c of celle) {
    const acc = grezzi.get(c.usoKey);
    const f = fattori.get(c.vettoreKey);
    if (!acc || !f) continue;
    const q = nz(c.quantita);
    const kwh = q.times(nz(f.kwhUnita));
    acc.kwh = acc.kwh.plus(kwh);
    acc.tep = acc.tep.plus(q.times(nz(f.tepUnita)));
    acc.co2 = acc.co2.plus(q.times(nz(f.feUnita)).div(1000));
    acc.costo = acc.costo.plus(kwh.times(nz(euroPerKwh.get(c.vettoreKey) ?? 0)));
  }

  for (const [key, v] of grezzi) {
    kwhRipartito = kwhRipartito.plus(v.kwh);
    const area = indice.get(key)!.areaKey;
    perArea[area] = perArea[area].plus(v.kwh);
  }
  for (const [key, v] of grezzi) {
    perUso.set(key, { ...v, pct: kwhRipartito.gt(0) ? v.kwh.div(kwhRipartito).times(100) : ZERO });
  }

  return { perUso, perArea, kwhRipartito, coperturaPct: ZERO };
}

/** Come sopra, ma con la copertura sul totale entrato nel sito. */
export function computeAllocationWithCoverage(
  usi: UsoDef[],
  celle: Cella[],
  fattori: Map<string, Fattori>,
  euroPerKwh: Map<string, string | number>,
  kwhIngresso: Decimal,
): AllocationResult {
  const a = computeAllocation(usi, celle, fattori, euroPerKwh);
  return {
    ...a,
    coperturaPct: kwhIngresso.gt(0) ? a.kwhRipartito.div(kwhIngresso).times(100) : ZERO,
  };
}

/** Confronto fra quantità entrata e quantità attribuita, vettore per vettore.
 *  Un residuo positivo significa un'utenza non ancora considerata; uno negativo
 *  che la stessa energia è stata contata due volte. */
export function computeQuadratura(
  defs: VettoreDef[],
  ingressi: VettoreInput[],
  celle: Cella[],
  fattori: Map<string, Fattori>,
  tolleranzaPct: string | number = "2",
): QuadraturaResult {
  const perInput = new Map(ingressi.map((i) => [i.vettoreKey, i]));
  const perVettore = new Map<string, QuadraturaVettore>();
  const tolleranza = nz(tolleranzaPct);
  let ok = 0;
  let valutati = 0;

  for (const d of defs) {
    if (d.sub) continue;
    if (!fattori.has(d.key)) continue;
    const ingresso = nz(perInput.get(d.key)?.quantita);
    const ripartito = celle
      .filter((c) => c.vettoreKey === d.key)
      .reduce((s, c) => s.plus(nz(c.quantita)), ZERO);
    const residuo = ingresso.minus(ripartito);
    const scostamentoPct = ingresso.gt(0) ? residuo.div(ingresso).times(100) : ZERO;
    const attivo = ingresso.gt(0) || ripartito.gt(0);
    // Senza dato di ingresso il vettore è chiuso solo se non c'è nulla di attribuito.
    const chiuso = ingresso.gt(0) ? scostamentoPct.abs().lte(tolleranza) : ripartito.isZero();
    if (attivo) {
      valutati++;
      if (chiuso) ok++;
    }
    perVettore.set(d.key, { ingresso, ripartito, residuo, scostamentoPct, ok: chiuso, attivo });
  }

  return { perVettore, ok, valutati, pct: valutati > 0 ? dec(ok).div(valutati).times(100) : ZERO };
}

/** Flussi vettore → area funzionale per il diagramma di flusso.
 *  Restituisce solo i flussi con energia: un arco a zero non va disegnato. */
export function computeFlows(usi: UsoDef[], celle: Cella[], fattori: Map<string, Fattori>): Flusso[] {
  const area = new Map(usi.map((u) => [u.key, u.areaKey]));
  const somme = new Map<string, Decimal>();

  for (const c of celle) {
    const a = area.get(c.usoKey);
    const f = fattori.get(c.vettoreKey);
    if (!a || !f) continue;
    const chiave = `${c.vettoreKey}|${a}`;
    const kwh = nz(c.quantita).times(nz(f.kwhUnita));
    somme.set(chiave, (somme.get(chiave) ?? ZERO).plus(kwh));
  }

  const flussi: Flusso[] = [];
  for (const [chiave, kwh] of somme) {
    if (!kwh.gt(0)) continue;
    const [vettoreKey, areaKey] = chiave.split("|");
    flussi.push({ vettoreKey, areaKey: areaKey as AreaKey, kwh });
  }
  // Ordine stabile: prima i flussi più grossi, poi per chiave, così il diagramma
  // non cambia disposizione fra due generazioni con gli stessi dati.
  return flussi.sort(
    (a, b) => b.kwh.comparedTo(a.kwh) || a.vettoreKey.localeCompare(b.vettoreKey) || AREE.indexOf(a.areaKey) - AREE.indexOf(b.areaKey),
  );
}
