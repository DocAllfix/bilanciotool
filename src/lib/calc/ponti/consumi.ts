import { dec, nz, toFixedStr } from "@/lib/calc/shared/decimal";

// Gli stessi consumi, in tre percorsi: inventario GHG, bilancio energetico, indicatori del
// bilancio di sostenibilità. Una tabella SOLA dice quale voce corrisponde a quale, così le
// proposte fra percorsi non possono confondere un'unità con un'altra.
//
// ⚠️ SOLO CORRISPONDENZE NELLA STESSA UNITÀ. Biomassa (t nel bilancio energetico, kg nel GHG)
// e vapore (t contro kWh) restano fuori: convertirli richiederebbe un potere calorifico o
// un'entalpia che il prodotto non conosce, e un numero convertito male in una colonna che si
// somma è peggio di un campo vuoto.
//
// ⚠️ È UNA TABELLA DI PROPOSTE, non di sincronizzazione: il dato resta dove nasce, e gli altri
// percorsi lo propongono accanto al campo vuoto, con la fonte. Un dato in due posti è un dato
// in nessun posto.

export type Corrispondenza = {
  key: string;
  nome: string;
  um: string;
  /** Fattori GHG le cui quantità si sommano (stessa unità). */
  ghg: readonly string[];
  /** Vettore del bilancio energetico, se c'è. */
  vettore?: string;
  /** Indicatore del bilancio di sostenibilità, se c'è. */
  kpi?: string;
};

export const CORRISPONDENZE: readonly Corrispondenza[] = [
  { key: "elettricita", nome: "Energia elettrica prelevata dalla rete", um: "kWh", ghg: ["ee_loc", "ee_go"], vettore: "ele", kpi: "en_ele" },
  { key: "gas", nome: "Gas naturale", um: "Smc", ghg: ["gas_smc"], vettore: "gas", kpi: "en_gas" },
  { key: "gasolio", nome: "Gasolio per riscaldamento", um: "litri", ghg: ["gasolio_ris"], vettore: "gasolio", kpi: "en_gasolio" },
  { key: "gpl", nome: "GPL", um: "kg", ghg: ["gpl_kg"], vettore: "gpl", kpi: "en_gpl" },
  { key: "olio", nome: "Olio combustibile", um: "kg", ghg: ["olio_comb"], vettore: "olio" },
  { key: "teleriscaldamento", nome: "Teleriscaldamento", um: "kWh", ghg: ["teleris"], vettore: "tlr" },
  { key: "gasolio_auto", nome: "Gasolio per autotrazione", um: "litri", ghg: ["gasolio_auto"], vettore: "gasolio_t", kpi: "en_flotta_d" },
  { key: "benzina", nome: "Benzina per autotrazione", um: "litri", ghg: ["benzina_auto"], vettore: "benzina", kpi: "en_flotta_b" },
  { key: "acqua_prelevata", nome: "Acqua prelevata", um: "m³", ghg: ["acqua_p"], kpi: "ac_prel" },
  { key: "acqua_scaricata", nome: "Acque reflue", um: "m³", ghg: ["acqua_r"], kpi: "ac_scar" },
];

/**
 * La somma delle quantità GHG per corrispondenza. `null` se nessuna voce del fattore esiste:
 * zero voci non è zero consumo, è un dato che manca. Le voci a quantità zero (proposte non
 * compilate) non contano: una proposta non è un consumo.
 */
export function quantitaGhg(righe: readonly { factorKey: string | null; quantita: string }[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const c of CORRISPONDENZE) {
    const r = righe.filter((x) => x.factorKey && c.ghg.includes(x.factorKey) && nz(x.quantita).gt(0));
    out[c.key] = r.length ? toFixedStr(r.reduce((s, x) => s.plus(nz(x.quantita)), dec(0)), 3) : null;
  }
  return out;
}
