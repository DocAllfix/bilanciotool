import { describe, it, expect } from "vitest";
import { generateDraft, DRAFT_KEYS } from "@/lib/calc/report/narrative-drafts";
import { deriveKpi, DEFAULT_CONVERSION_FACTORS } from "@/lib/calc/report/derived-kpi";

// Bozze template-based (niente AI): frasi parametriche compilate dai dati reali.
// L'utente parte da una bozza sensata e la riscrive; il testo non contiene mai
// placeholder rotti, "undefined" o "NaN".

const ctx = {
  nome: "Alfa S.r.l.",
  anno: 2025,
  settore: "componenti meccanici",
  sede: "Bari",
  dipendenti: "50",
  materialiCount: 7,
  totalTopics: 18,
  soglia: 3,
  standard: "GRI 2021 — opzione con riferimento",
  derived: deriveKpi(
    { en_ele: "100000", en_gas: "12500", hr_tot: "50", hr_don: "18", si_ore: "80000", si_inf: "2", fo_ore: "600", ec_ric: "5000000" },
    DEFAULT_CONVERSION_FACTORS,
  ),
};

describe("generateDraft", () => {
  it("produce una bozza per ognuno dei 7 capitoli", () => {
    expect(DRAFT_KEYS).toHaveLength(7);
    for (const key of DRAFT_KEYS) {
      const testo = generateDraft(key, ctx);
      expect(testo.length, key).toBeGreaterThan(80);
      expect(testo, key).not.toMatch(/undefined|NaN|\[object/);
    }
  });

  it("la lettera cita azienda ed esercizio", () => {
    const t = generateDraft("lettera", ctx);
    expect(t).toContain("Alfa S.r.l.");
    expect(t).toContain("2025");
  });

  it("la nota metodologica cita standard e soglia di materialità", () => {
    const t = generateDraft("metodo", ctx);
    expect(t).toContain("GRI 2021");
    expect(t).toContain("18");
    expect(t).toMatch(/soglia/i);
  });

  it("i numeri sono formattati all'italiana", () => {
    const t = generateDraft("identita", ctx);
    expect(t).toContain("50"); // dipendenti
    const m = generateDraft("metodo", ctx);
    // emissioni scope1+2 del contesto: 24,69375 + 25,65 = 50,34375 → "50,34"
    expect(m).toMatch(/50,34/);
  });

  it("dati mancanti: frasi con segnaposto editoriale, mai numeri rotti", () => {
    const vuoto = { ...ctx, derived: deriveKpi({}, DEFAULT_CONVERSION_FACTORS), dipendenti: "", materialiCount: 0 };
    for (const key of DRAFT_KEYS) {
      const t = generateDraft(key, vuoto);
      expect(t, key).not.toMatch(/undefined|NaN/);
    }
  });
});
