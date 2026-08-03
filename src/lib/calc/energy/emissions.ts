import { Decimal, dec, nz } from "@/lib/calc/shared/decimal";
import type { Fattori, VettoreDef, VettoreInput } from "./vectors";

// Emissioni associate ai consumi energetici, isolate in un file proprio perché
// devono concordare con l'inventario GHG della stessa azienda: se i due moduli
// classificassero diversamente lo stesso vettore, i due documenti mostrerebbero
// numeri diversi e il ponte fra i percorsi perderebbe senso.
//
// Attribuzione (ISO 14064-1 · GHG Protocol):
//   Scope 1 = combustione diretta in loco (gas, gasolio, GPL, olio, autotrazione)
//   Scope 2 = energia importata: elettricità prelevata, teleriscaldamento, vapore
//   biogeniche = biomassa, riportata a zero nel totale diretto
//
// SCOSTAMENTO VOLUTO dal prototipo (docs/politica-arrotondamento.md): il
// prototipo attribuiva teleriscaldamento e vapore acquistati allo Scope 1.
// Sono energia importata, quindi categoria 2 della norma: corretti qui.

export type EmissioniEnergetiche = {
  scope1: Decimal;
  scope2Location: Decimal;
  scope2Market: Decimal;
  totLocation: Decimal;
  goCoperte: Decimal; // kWh coperti da garanzie d'origine, limitati al prelievo
};

const ZERO = dec(0);

/** Vettori di energia importata: la loro emissione è Scope 2, non Scope 1. */
const IMPORTATI = new Set(["ele", "tlr", "vapore"]);

export function computeEnergyEmissions(
  defs: VettoreDef[],
  inputs: VettoreInput[],
  fattori: Map<string, Fattori>,
  residualMix: string | number,
): EmissioniEnergetiche {
  const perInput = new Map(inputs.map((i) => [i.vettoreKey, i]));
  let scope1 = ZERO;
  let scope2Location = ZERO;

  for (const d of defs) {
    if (d.sub) continue;
    const f = fattori.get(d.key);
    if (!f) continue;
    const co2 = nz(perInput.get(d.key)?.quantita).times(nz(f.feUnita)).div(1000);
    if (co2.isZero()) continue;
    if (IMPORTATI.has(d.key)) scope2Location = scope2Location.plus(co2);
    else if (!d.rinnovabile) scope1 = scope1.plus(co2);
    // I vettori rinnovabili non importati (fotovoltaico, biomassa) restano fuori:
    // il fotovoltaico non emette, la biomassa è biogenica e va rendicontata a parte.
  }

  // Market-based: la quota coperta da garanzie d'origine è a emissione nulla,
  // il resto si valorizza al mix residuo nazionale.
  const sub = defs.find((d) => d.sub);
  const prelievo = nz(perInput.get("ele")?.quantita);
  const go = sub ? nz(perInput.get(sub.key)?.quantita) : ZERO;
  const goCoperte = Decimal.min(go, prelievo);
  const scoperte = prelievo.minus(goCoperte);
  const scope2Market = scoperte.gt(0) ? scoperte.times(nz(residualMix)).div(1000) : ZERO;

  return {
    scope1,
    scope2Location,
    scope2Market,
    totLocation: scope1.plus(scope2Location),
    goCoperte,
  };
}
