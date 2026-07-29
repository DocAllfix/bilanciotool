import { describe, it, expect } from "vitest";
import { deriveKpi, DEFAULT_CONVERSION_FACTORS } from "@/lib/calc/report/derived-kpi";

// Contratto: funzione derive() del prototipo percorso-bilancio-v4.html.
// Fedeltà golden: denominatori mancanti → 0 (non null), come nel prototipo.
// Fattori di conversione di default identici (FATTORI_DEF).

const DATI = {
  en_ele: "100000", // kWh rete
  en_ele_go: "40000", // di cui GO
  en_auto: "20000", // autoprodotta
  en_gas: "12500", // Smc
  en_gasolio: "1000", // litri riscaldamento
  en_flotta_d: "3000", // litri diesel flotta
  en_flotta_b: "500", // litri benzina flotta
  en_gpl: "0",
  ac_prel: "1250",
  ri_np: "80",
  ri_p: "20",
  ri_rec: "75",
  ma_tot: "500",
  ma_ric: "120",
  hr_tot: "50",
  hr_don: "18",
  hr_ind: "45",
  hr_ass: "6",
  hr_ces: "4",
  si_ore: "80000",
  si_inf: "2",
  si_gg: "45",
  fo_ore: "600",
  re_don: "28000",
  re_uom: "31000",
  ec_ric: "5000000",
  ec_for: "120",
  ec_loc: "96",
  go_forq: "30",
  go_cda: "5",
  go_cdad: "2",
};

describe("deriveKpi — golden dal prototipo", () => {
  const d = deriveKpi(DATI, DEFAULT_CONVERSION_FACTORS);

  it("Scope 1 da combustibili: gas+gasolio+flotta+gpl", () => {
    // 12500×1,9755 + 1000×2,687 + 3000×2,687 + 500×2,313 = 24693,75+2687+8061+1156,5 = 36598,25 kg
    expect(d.scope1.toString()).toBe("36.59825");
  });

  it("Scope 2 location e market con GO", () => {
    expect(d.scope2Loc.toString()).toBe("25.65"); // 100000×0,2565/1000
    expect(d.scope2Mkt.toString()).toBe("27.42"); // 60000×0,457/1000
    expect(d.totScope12Loc.toString()).toBe("62.24825");
  });

  it("energia totale in kWh e quota rinnovabile", () => {
    // 100000 + 20000 + 12500×10,55 + 4000×9,96 + 500×8,78 = 100000+20000+131875+39840+4390 = 296105
    expect(d.energiaTotaleKwh.toString()).toBe("296105");
    // rinnovabile = GO 40000 + autoprodotta 20000 = 60000 → 20,26...%
    expect(d.pctRinnovabile.toNumber()).toBeCloseTo(20.263, 2);
    expect(d.energiaTotaleGj.toNumber()).toBeCloseTo(1065.978, 2); // ×0,0036
  });

  it("intensità: carbonica per M€ e consumo per addetto", () => {
    expect(d.intensitaCo2.toNumber()).toBeCloseTo(12.4497, 3); // 62,24825/5
    expect(d.energiaPerAddetto.toNumber()).toBeCloseTo(5922.1, 1); // 296105/50
  });

  it("rifiuti e materiali", () => {
    expect(d.rifiutiTotali.toString()).toBe("100");
    expect(d.pctRecupero.toString()).toBe("75");
    expect(d.pctMaterialiRiciclati.toString()).toBe("24");
  });

  it("persone: quote e turnover", () => {
    expect(d.pctDonne.toString()).toBe("36");
    expect(d.pctIndeterminato.toString()).toBe("90");
    expect(d.turnoverUscita.toString()).toBe("8");
    expect(d.turnoverIngresso.toString()).toBe("12");
  });

  it("sicurezza: indici di frequenza e gravità", () => {
    expect(d.indiceFrequenza.toString()).toBe("25"); // 2/80000×1e6
    expect(d.indiceGravita.toNumber()).toBeCloseTo(0.5625, 4); // 45/80000×1e3
  });

  it("formazione e pay gap", () => {
    expect(d.oreFormazionePerAddetto.toString()).toBe("12");
    expect(d.payGapPct.toNumber()).toBeCloseTo(9.677, 2); // (31000−28000)/31000
  });

  it("fornitori e governance", () => {
    expect(d.pctFornitoriLocali.toString()).toBe("80");
    expect(d.pctFornitoriEsg.toString()).toBe("25");
    expect(d.pctDonneCda.toString()).toBe("40");
  });

  it("denominatori mancanti → 0 come il prototipo, mai NaN", () => {
    const v = deriveKpi({}, DEFAULT_CONVERSION_FACTORS);
    expect(v.scope1.isZero()).toBe(true);
    expect(v.pctRinnovabile.isZero()).toBe(true);
    expect(v.payGapPct.isZero()).toBe(true);
    expect(v.indiceFrequenza.isZero()).toBe(true);
  });
});
