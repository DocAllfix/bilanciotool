import { Decimal, dec, nz } from "@/lib/calc/shared/decimal";

// KPI derivati del bilancio (contratto derive() del prototipo).
// Fedeltà: denominatore mancante → 0, mai NaN/Infinity. Precisione piena,
// l'arrotondamento è compito della presentazione/snapshot.

export type ConversionFactors = {
  gas: string; // kgCO2e/Smc
  gasolio: string; // kgCO2e/l
  benzina: string; // kgCO2e/l
  gpl: string; // kgCO2e/kg
  eleLoc: string; // kgCO2e/kWh location
  eleMkt: string; // kgCO2e/kWh residual mix
  kwhSmc: string; // kWh/Smc
  kwhLGasolio: string; // kWh/l
  kwhLBenzina: string; // kWh/l
  kwhKgGpl: string; // kWh/kg
};

export const DEFAULT_CONVERSION_FACTORS: ConversionFactors = {
  gas: "1.9755",
  gasolio: "2.687",
  benzina: "2.313",
  gpl: "2.984",
  eleLoc: "0.2565",
  eleMkt: "0.457",
  kwhSmc: "10.55",
  kwhLGasolio: "9.96",
  kwhLBenzina: "8.78",
  kwhKgGpl: "12.79",
};

export type KpiInput = Record<string, string | number | null | undefined>;

const ZERO = dec(0);
const pct = (num: Decimal, den: Decimal): Decimal => (den.gt(0) ? num.div(den).times(100) : ZERO);
const ratio = (num: Decimal, den: Decimal): Decimal => (den.gt(0) ? num.div(den) : ZERO);

export function deriveKpi(dati: KpiInput, f: ConversionFactors) {
  const n = (k: string) => nz(dati[k]);
  const F = (k: keyof ConversionFactors) => dec(f[k]);

  const scope1 = n("en_gas")
    .times(F("gas"))
    .plus(n("en_gasolio").times(F("gasolio")))
    .plus(n("en_flotta_d").times(F("gasolio")))
    .plus(n("en_flotta_b").times(F("benzina")))
    .plus(n("en_gpl").times(F("gpl")))
    .div(1000);
  const scope2Loc = n("en_ele").times(F("eleLoc")).div(1000);
  const scope2Mkt = Decimal.max(0, n("en_ele").minus(n("en_ele_go"))).times(F("eleMkt")).div(1000);

  const energiaTotaleKwh = n("en_ele")
    .plus(n("en_auto"))
    .plus(n("en_gas").times(F("kwhSmc")))
    .plus(n("en_gasolio").plus(n("en_flotta_d")).times(F("kwhLGasolio")))
    .plus(n("en_flotta_b").times(F("kwhLBenzina")))
    .plus(n("en_gpl").times(F("kwhKgGpl")));
  const rinnovabile = n("en_ele_go").plus(n("en_auto"));

  const rifiutiTotali = n("ri_np").plus(n("ri_p"));
  const hr = n("hr_tot");
  const ric = n("ec_ric");
  const totScope12Loc = scope1.plus(scope2Loc);

  return {
    scope1,
    scope2Loc,
    scope2Mkt,
    totScope12Loc,
    totScope12Mkt: scope1.plus(scope2Mkt),
    energiaTotaleKwh,
    energiaTotaleGj: energiaTotaleKwh.times("0.0036"),
    pctRinnovabile: pct(rinnovabile, energiaTotaleKwh),
    intensitaCo2: ric.gt(0) ? totScope12Loc.div(ric.div(1_000_000)) : ZERO,
    energiaPerAddetto: ratio(energiaTotaleKwh, hr),
    acquaPrelevata: n("ac_prel"),
    rifiutiTotali,
    pctRecupero: pct(n("ri_rec"), rifiutiTotali),
    pctMaterialiRiciclati: pct(n("ma_ric"), n("ma_tot")),
    pctDonne: pct(n("hr_don"), hr),
    pctIndeterminato: pct(n("hr_ind"), hr),
    turnoverUscita: pct(n("hr_ces"), hr),
    turnoverIngresso: pct(n("hr_ass"), hr),
    indiceFrequenza: n("si_ore").gt(0) ? n("si_inf").div(n("si_ore")).times(1_000_000) : ZERO,
    indiceGravita: n("si_ore").gt(0) ? n("si_gg").div(n("si_ore")).times(1000) : ZERO,
    oreFormazionePerAddetto: ratio(n("fo_ore"), hr),
    payGapPct: n("re_uom").gt(0) ? n("re_uom").minus(n("re_don")).div(n("re_uom")).times(100) : ZERO,
    pctFornitoriLocali: pct(n("ec_loc"), n("ec_for")),
    pctFornitoriEsg: pct(n("go_forq"), n("ec_for")),
    pctDonneCda: pct(n("go_cdad"), n("go_cda")),
  };
}

export type DerivedKpi = ReturnType<typeof deriveKpi>;
