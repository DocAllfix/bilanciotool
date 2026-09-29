// La vetrina pubblica del Bilancio energetico: cataloghi, scenario e calcolo.
//
// ⚠️ PURO, E DEVE RESTARLO. Questo modulo gira nel BROWSER, su una pagina che chiunque apre
// senza account: non può importare il database, l'ambiente o una server action. Importa solo
// i JSON dei cataloghi — gli stessi file da cui il seme popola le tabelle — e le funzioni di
// `src/lib/calc/energy`, che a loro volta importano solo l'aritmetica decimale.
//
// ⚠️ E NON CONTIENE UN SOLO NUMERO SCRITTO A MANO. I fattori (kWh, tep, fattore di emissione)
// vengono dai JSON, i consumi d'esempio da `scenario-energia.ts` — che è lo stesso file da cui
// il seme scrive la dimostrativa. È l'unico modo perché la vetrina non possa mostrare numeri
// diversi dal prodotto: se divergessero, il primo a notarlo sarebbe il consulente che si
// registra dopo averla provata, e non si fiderebbe più di nessuno dei due.

import vettoriJson from "@/lib/db/seeds/data/energy-vectors.json";
import fattoriJson from "@/lib/db/seeds/data/energy-vector-factors.json";
import usiJson from "@/lib/db/seeds/data/energy-end-uses.json";
import areeJson from "@/lib/db/seeds/data/energy-areas.json";
import guideJson from "@/lib/db/seeds/data/energy-use-guides.json";

import { computeVectors, type Fattori, type VettoreDef, type VettoreInput } from "@/lib/calc/energy/vectors";
import {
  computeAllocationWithCoverage, computeQuadratura, computeFlows,
  type AreaKey, type Cella, type UsoDef,
} from "@/lib/calc/energy/allocation";
import { computeEnergyEmissions } from "@/lib/calc/energy/emissions";
import { VETTORI, RIPARTIZIONE, USI, ANNO_SCENARIO } from "@/features/demo/scenario-energia";

/* ───────────────────────────────── i cataloghi ───────────────────────────────── */

export type VettoreVetrina = VettoreDef & { nome: string; unita: string; colore?: string };
export type UsoVetrina = UsoDef & { nome: string; guida?: string };
export type AreaVetrina = { key: AreaKey; nome: string; descrizione: string; colore: string };

type VettoreRiga = { k: string; n: string; u: string; c: string; rin?: boolean; sub?: boolean; col?: string };
type UsoRiga = { id: string; a: string; n: string };

export const VETTORI_CATALOGO: VettoreVetrina[] = (vettoriJson as VettoreRiga[]).map((v) => ({
  key: v.k,
  categoria: v.c as VettoreDef["categoria"],
  rinnovabile: Boolean(v.rin),
  sub: Boolean(v.sub),
  nome: v.n,
  unita: v.u,
  colore: v.col,
}));

export const FATTORI: Map<string, Fattori> = new Map(
  Object.entries(fattoriJson as Record<string, { kwh: number; tep: number; fe: number }>).map(([k, f]) => [
    k,
    { kwhUnita: f.kwh, tepUnita: f.tep, feUnita: f.fe },
  ]),
);

export const USI_CATALOGO: UsoVetrina[] = (usiJson as UsoRiga[]).map((u) => ({
  key: u.id,
  areaKey: u.a as AreaKey,
  nome: u.n,
  guida: (guideJson as Record<string, { def?: string }>)[u.id]?.def,
}));

export const AREE: AreaVetrina[] = Object.entries(
  areeJson as Record<string, { n: string; d: string; c: string }>,
).map(([k, a]) => ({ key: k as AreaKey, nome: a.n, descrizione: a.d, colore: a.c }));

/* ─────────────────────────────────── lo scenario ─────────────────────────────── */

export type RigaVettore = { vettoreKey: string; quantita: string; costo: string };

/** Lo scenario di partenza: gli stessi consumi della dimostrativa. Si torna qui col comando
 *  «ricomincia dall'esempio», ed è ciò che la persona trova appena arriva — un modulo vuoto
 *  non insegna niente a chi non sa ancora che cosa sia un vettore energetico. */
export function scenarioIniziale(): { vettori: RigaVettore[]; celle: Cella[]; anno: number } {
  return {
    vettori: VETTORI.map(([vettoreKey, quantita, costo]) => ({ vettoreKey, quantita, costo: costo ?? "" })),
    celle: RIPARTIZIONE.map(([usoKey, vettoreKey, quantita]) => ({ usoKey, vettoreKey, quantita })),
    anno: ANNO_SCENARIO,
  };
}

/** Il residual mix elettrico per le emissioni market-based.
 *
 * ⚠️ Lo stesso valore che `scripts/seed.mjs` scrive su `ele` (`RESIDUAL_MIX = "0.4570"`, dal
 * prototipo). Non lo si può importare — quello è uno script di seme — quindi lo tiene
 * allineato una guardia: `vetrina-energia-pure.test.ts` legge il valore dal sorgente del seme
 * e lo confronta con questo. Due copie di un fattore divergono in silenzio, e la differenza
 * si vedrebbe solo nelle emissioni market-based, cioè dove nessuno guarda.
 */
export const RESIDUAL_MIX = "0.4570";

/** Gli usi finali accesi nello scenario: gli altri restano spenti, come nella dimostrativa,
 *  perché un'azienda non ha tutti e venti gli usi e mostrarli tutti attivi sarebbe falso. */
export const USI_ATTIVI: string[] = USI.filter(([, attivo]) => attivo).map(([uso]) => uso);

/* ─────────────────────────────────── il calcolo ──────────────────────────────── */

export type RisultatiVetrina = ReturnType<typeof calcola>;

/**
 * Tutto ciò che la vetrina mostra, calcolato con le funzioni del prodotto.
 *
 * Restituisce numeri già in forma leggibile (`number`) perché a valle c'è solo disegno: i
 * `Decimal` restano dentro il calcolo, dove servono a non perdere centesimi e chilowattora.
 */
export function calcola(vettori: RigaVettore[], celle: Cella[]) {
  const inputs: VettoreInput[] = vettori.map((v) => ({
    vettoreKey: v.vettoreKey,
    quantita: v.quantita,
    costo: v.costo,
  }));

  const { perVettore, totali } = computeVectors(VETTORI_CATALOGO, inputs, FATTORI);
  const emissioni = computeEnergyEmissions(VETTORI_CATALOGO, inputs, FATTORI, RESIDUAL_MIX);

  // Il costo unitario di ogni vettore serve a dare un valore in euro a ciascun uso finale:
  // si passa quello CALCOLATO (costo diviso kWh), non un prezzo medio inventato. È la stessa
  // catena di `features/energy/results.ts`.
  const euroPerKwh = new Map<string, string>();
  for (const [k, r] of perVettore) euroPerKwh.set(k, r.euroPerKwh.toString());

  // Solo gli usi accesi: venti usi tutti attivi direbbero che l'azienda ha anche il forno
  // fusorio e la cogenerazione, e la ripartizione mostrerebbe venti righe vuote.
  const usiAttivi = USI_CATALOGO.filter((u) => USI_ATTIVI.includes(u.key));
  const ripartizione = computeAllocationWithCoverage(usiAttivi, celle, FATTORI, euroPerKwh, totali.kwh);
  const quadratura = computeQuadratura(VETTORI_CATALOGO, inputs, celle, FATTORI);
  const flussi = computeFlows(usiAttivi, celle, FATTORI);

  return { perVettore, totali, emissioni, ripartizione, quadratura, flussi };
}
