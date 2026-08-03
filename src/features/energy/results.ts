import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { energyArea, energyEndUse } from "@/lib/db/schema";
import { toFixedStr, type Decimal } from "@/lib/calc/shared/decimal";
import { computeVectors, type Fattori, type VettoreDef, type VettoreInput } from "@/lib/calc/energy/vectors";
import { computeEnergyEmissions } from "@/lib/calc/energy/emissions";
import {
  computeAllocationWithCoverage, computeFlows, computeQuadratura,
  type AreaKey, type Cella, type UsoDef,
} from "@/lib/calc/energy/allocation";
import { computeMonthly } from "@/lib/calc/energy/monthly";
import { compareToBase, computeIndicators, driversDa, type DriverKey } from "@/lib/calc/energy/indicators";
import { computeMeasures, type MisuraInput } from "@/lib/calc/energy/measures";
import type { VettoreRisolto } from "./vectors";

// Orchestrazione del motore: SOLA LETTURA. Nessun valore calcolato qui viene mai
// scritto, con l'unica eccezione dello snapshot di pubblicazione.
// Le funzioni pure restano ignare del database; questo file fa da cerniera.

export type RisultatiEnergia = ReturnType<typeof calcolaRisultati>;

export type IngressiCalcolo = {
  vettori: VettoreRisolto[];
  inputs: { vettoreKey: string; quantita: string | null; costo: string | null; mensili: string[] }[];
  usi: { key: string; areaKey: AreaKey; attivo: boolean }[];
  celle: { usoKey: string; vettoreKey: string; quantita: string }[];
  driverCorrente: Partial<Record<DriverKey, string>>;
  driverBase: Partial<Record<DriverKey, string>>;
  misure: MisuraInput[];
  residualMix: string;
  /** Totali dell'anno base, se l'esercizio precedente è stato compilato. */
  baseKwh?: { kwh: Decimal; tep: Decimal; co2: Decimal; costo: Decimal; kwhE: Decimal; kwhT: Decimal; kwhM: Decimal } | null;
};

export function calcolaRisultati(i: IngressiCalcolo) {
  const defs: VettoreDef[] = i.vettori.map((v) => ({
    key: v.key,
    categoria: v.categoria,
    rinnovabile: v.rinnovabile,
    sub: v.sub,
  }));
  const fattori = new Map<string, Fattori>(
    i.vettori.map((v) => [
      v.key,
      { kwhUnita: v.kwhUnita, tepUnita: v.tepUnita, feUnita: v.feUnita, feMarket: v.feMarket },
    ]),
  );
  const inputs: VettoreInput[] = i.inputs.map((x) => ({
    vettoreKey: x.vettoreKey,
    quantita: x.quantita,
    costo: x.costo,
  }));

  const { perVettore, totali } = computeVectors(defs, inputs, fattori);
  const emissioni = computeEnergyEmissions(defs, inputs, fattori, i.residualMix);

  // Solo gli usi accesi entrano nel calcolo: quelli spenti conservano le celle
  // ma non pesano sul bilancio.
  const usiAttivi: UsoDef[] = i.usi.filter((u) => u.attivo).map((u) => ({ key: u.key, areaKey: u.areaKey }));
  const chiaviAttive = new Set(usiAttivi.map((u) => u.key));
  const celle: Cella[] = i.celle.filter((c) => chiaviAttive.has(c.usoKey));

  const euroPerKwh = new Map<string, string>();
  for (const [k, r] of perVettore) euroPerKwh.set(k, r.euroPerKwh.toString());

  const ripartizione = computeAllocationWithCoverage(usiAttivi, celle, fattori, euroPerKwh, totali.kwh);
  const quadratura = computeQuadratura(defs, inputs, celle, fattori);
  const flussi = computeFlows(usiAttivi, celle, fattori);

  const mensili = new Map(i.inputs.map((x) => [x.vettoreKey, x.mensili]));
  const annui = new Map(i.inputs.map((x) => [x.vettoreKey, x.quantita]));
  const mensile = computeMonthly(defs, mensili, annui, fattori);

  const indicatori = computeIndicators(totali, driversDa(i.driverCorrente));
  const indicatoriBase = i.baseKwh
    ? computeIndicators(i.baseKwh, driversDa(i.driverBase))
    : new Map<string, Decimal | null>();
  const confronto = compareToBase(indicatori, indicatoriBase);

  const misureCalcolate = computeMeasures(
    i.misure,
    fattori,
    new Map([...perVettore].map(([k, r]) => [k, r.euroPerKwh])),
    totali.kwh,
  );

  return { perVettore, totali, emissioni, ripartizione, quadratura, flussi, mensile, indicatori, indicatoriBase, confronto, misure: misureCalcolate };
}

/** Serializzazione per il confine server→client e per lo snapshot: tutti i
 *  numeri diventano stringhe decimali, nessun Decimal attraversa il confine. */
export function serializzaRisultati(r: RisultatiEnergia) {
  const d = (x: Decimal, dp = 6) => toFixedStr(x, dp);
  const dn = (x: Decimal | null, dp = 6) => (x === null ? null : toFixedStr(x, dp));

  return {
    totali: {
      kwh: d(r.totali.kwh), tep: d(r.totali.tep), co2: d(r.totali.co2), costo: d(r.totali.costo),
      kwhE: d(r.totali.kwhE), kwhT: d(r.totali.kwhT), kwhM: d(r.totali.kwhM), gj: d(r.totali.gj),
      rinnovabile: d(r.totali.rinnovabile), pctRinnovabile: d(r.totali.pctRinnovabile, 2),
      euroPerKwh: d(r.totali.euroPerKwh),
    },
    perVettore: [...r.perVettore].map(([key, v]) => ({
      key, quantita: d(v.quantita), kwh: d(v.kwh), tep: d(v.tep), co2: d(v.co2),
      costo: d(v.costo), euroPerKwh: d(v.euroPerKwh),
    })),
    emissioni: {
      scope1: d(r.emissioni.scope1), scope2Location: d(r.emissioni.scope2Location),
      scope2Market: d(r.emissioni.scope2Market), totLocation: d(r.emissioni.totLocation),
      goCoperte: d(r.emissioni.goCoperte),
    },
    ripartizione: {
      perUso: [...r.ripartizione.perUso].map(([key, u]) => ({
        key, kwh: d(u.kwh), tep: d(u.tep), co2: d(u.co2), costo: d(u.costo), pct: d(u.pct, 2),
      })),
      perArea: Object.fromEntries(
        (Object.keys(r.ripartizione.perArea) as AreaKey[]).map((k) => [k, d(r.ripartizione.perArea[k])]),
      ) as Record<AreaKey, string>,
      kwhRipartito: d(r.ripartizione.kwhRipartito),
      coperturaPct: d(r.ripartizione.coperturaPct, 2),
    },
    quadratura: {
      perVettore: [...r.quadratura.perVettore].map(([key, q]) => ({
        key, ingresso: d(q.ingresso), ripartito: d(q.ripartito), residuo: d(q.residuo),
        scostamentoPct: d(q.scostamentoPct, 2), ok: q.ok, attivo: q.attivo,
      })),
      ok: r.quadratura.ok, valutati: r.quadratura.valutati, pct: d(r.quadratura.pct, 0),
    },
    flussi: r.flussi.map((f) => ({ vettoreKey: f.vettoreKey, areaKey: f.areaKey, kwh: d(f.kwh) })),
    mensile: {
      perCategoria: {
        E: r.mensile.perCategoria.E.map((v) => d(v)),
        T: r.mensile.perCategoria.T.map((v) => d(v)),
        M: r.mensile.perCategoria.M.map((v) => d(v)),
      },
      perMese: r.mensile.perMese.map((v) => d(v)),
      totale: d(r.mensile.totale),
      controlli: [...r.mensile.controlli].map(([key, c]) => ({
        key, sommaMesi: d(c.sommaMesi), annuo: d(c.annuo),
        scostamentoPct: dn(c.scostamentoPct, 2), ok: c.ok,
      })),
      consumoDiBase: dn(r.mensile.consumoDiBase),
    },
    indicatori: [...r.indicatori].map(([key, v]) => ({ key, valore: dn(v) })),
    confronto: [...r.confronto].map(([key, c]) => ({
      key, valore: d(c.valore), valoreBase: d(c.valoreBase),
      variazionePct: d(c.variazionePct, 2), migliorato: c.migliorato,
    })),
    misure: {
      righe: r.misure.righe.map((m) => ({
        kwh: d(m.kwh), tep: d(m.tep), co2: d(m.co2), risparmioEuro: d(m.risparmioEuro),
        investimento: d(m.investimento), incentivo: d(m.incentivo), netto: d(m.netto),
        pbtAnni: dn(m.pbtAnni, 2), pctSulTotale: d(m.pctSulTotale, 2),
      })),
      totali: {
        kwh: d(r.misure.totali.kwh), tep: d(r.misure.totali.tep), co2: d(r.misure.totali.co2),
        risparmioEuro: d(r.misure.totali.risparmioEuro), investimento: d(r.misure.totali.investimento),
        netto: d(r.misure.totali.netto), pbtAnni: dn(r.misure.totali.pbtAnni, 2),
        pctSulTotale: d(r.misure.totali.pctSulTotale, 2), quantificate: r.misure.totali.quantificate,
      },
    },
  };
}

export type RisultatiSerializzati = ReturnType<typeof serializzaRisultati>;

/** Cataloghi non-tenant: si leggono con la connessione applicativa, senza GUC. */
export async function loadCatalogoUsi(contentSetId: string) {
  const [aree, usi] = await Promise.all([
    db.select().from(energyArea).where(eq(energyArea.setId, contentSetId)).orderBy(asc(energyArea.ordine)),
    db.select().from(energyEndUse).where(eq(energyEndUse.setId, contentSetId)).orderBy(asc(energyEndUse.ordine)),
  ]);
  return { aree, usi };
}
