import { describe, it, expect } from "vitest";
import { parseGhgExport, parseBilancioExport } from "@/features/import/parser";

// Contratto: docs/formato-export-prototipi.md. Il parser è puro (zod), tollera i
// due formati (archivio completo / singola organizzazione), normalizza i numeri
// a stringa decimale e non esplode mai su campi mancanti.

const ORG_GHG = {
  id: "OABC123",
  nome: "Alfa S.r.l.",
  anno: 2025,
  annoBase: 2024,
  profilo: { forma: "S.r.l.", gwp: "AR6", consolidamento: "Controllo operativo" },
  fe: [{ id: "gas_smc", g: "Combustione fissa", n: "Gas naturale", um: "Smc", fe: 1.9755, cat: "1", src: "1a", f: "DEFRA" }],
  voci: [
    { id: "V1", anno: 2025, cat: "1", src: "1a", sede: "Bari", desc: "Caldaia", feId: "gas_smc", um: "Smc", q: "12.500", fe: 1.9755, feM: "", qGO: "", feB: "", dq: "F", inc: "", ev: "Fatture", note: "" },
    { id: "V2", anno: 2025, cat: "2", src: "2a", desc: "EE", feId: "ee_loc", um: "kWh", q: 100000, fe: 0.2565, feM: 0.457, qGO: 40000, dq: "M" },
  ],
  sorgenti: { "1a": { st: "in" }, "1d": { st: "na", note: "Nessun processo chimico" } },
  anni: { "2025": { ricavi: "5000000", fte: "50" } },
  obiettivi: [{ id: "B1", n: "Riduzione", ambito: "12", anno: "2030", rid: "30", note: "" }],
  verifica: { v1: { st: "ok", note: "" } },
  created: "2025-01-01T00:00:00.000Z",
};

describe("parseGhgExport", () => {
  it("accetta l'archivio completo {org:[...]}", () => {
    const r = parseGhgExport({ org: [ORG_GHG], current: "OABC123" });
    expect(r.organizzazioni).toHaveLength(1);
    expect(r.organizzazioni[0].nome).toBe("Alfa S.r.l.");
  });

  it("accetta la singola organizzazione nuda", () => {
    const r = parseGhgExport(ORG_GHG);
    expect(r.organizzazioni).toHaveLength(1);
  });

  it("normalizza le quantità a stringa decimale (semantica del prototipo)", () => {
    const o = parseGhgExport(ORG_GHG).organizzazioni[0];
    // Fedeltà al contratto: il prototipo legge "12.500" come 12,5 (parseFloat)
    // — il punto senza virgola è SEMPRE decimale, mai separatore delle migliaia.
    // Il separatore migliaia è gestito solo nella forma italiana completa "1.234,56".
    expect(o.voci[0].quantita).toBe("12.5");
    expect(o.voci[1].quantita).toBe("100000");
    expect(o.voci[1].quotaGo).toBe("40000");
    expect(o.voci[0].fe).toBe("1.9755");
    expect(o.voci[0].feMarket).toBeNull(); // "" → null
  });

  it("conserva stati e motivazioni del registro sorgenti", () => {
    const o = parseGhgExport(ORG_GHG).organizzazioni[0];
    expect(o.sorgenti["1d"]).toEqual({ stato: "na", motivazione: "Nessun processo chimico" });
  });

  it("rifiuta un JSON non riconoscibile con errore parlante", () => {
    expect(() => parseGhgExport({ qualcosa: 1 })).toThrow(/non riconosciuto/i);
  });
});

const AZIENDA = {
  id: "OX",
  nome: "Beta S.p.A.",
  anno: 2025,
  profilo: { forma: "S.p.A.", standard: "GRI 2021 — opzione con riferimento", perimetro: "Tutte le sedi", logo: "data:image/png;base64,AAA" },
  fattori: { gas: 1.9755, ele_loc: 0.2565 },
  dati: { "2025": { en_ele: "100000", hr_tot: 50 }, "2024": { en_ele: "90000" } },
  materialita: { T01: { imp: "4", fin: "3" } },
  soglia: 3,
  gestione: { T01: { politica: "Politica energia", azioni: "Fotovoltaico" } },
  narrativa: {
    lettera: { testo: "Testo della lettera", media: [{ t: "ch", ch: "emissioni", cap: "Andamento", w: "full" }] },
    identita: "Solo testo vecchio formato",
  },
  created: "2025-01-01T00:00:00.000Z",
};

describe("parseBilancioExport", () => {
  it("accetta l'archivio {aziende:[...]} e la singola azienda", () => {
    expect(parseBilancioExport({ aziende: [AZIENDA] }).aziende).toHaveLength(1);
    expect(parseBilancioExport(AZIENDA).aziende).toHaveLength(1);
  });

  it("normalizza i KPI a stringa per anno", () => {
    const a = parseBilancioExport(AZIENDA).aziende[0];
    expect(a.kpi["2025"].hr_tot).toBe("50");
    expect(a.kpi["2024"].en_ele).toBe("90000");
  });

  it("gestisce la retro-compatibilità della narrativa (stringa nuda)", () => {
    const a = parseBilancioExport(AZIENDA).aziende[0];
    expect(a.narrativa.identita.testo).toBe("Solo testo vecchio formato");
    expect(a.narrativa.identita.media).toEqual([]);
    expect(a.narrativa.lettera.media[0]).toMatchObject({ tipo: "chart", chartKey: "emissioni" });
  });

  it("separa i dataURL delle immagini per l'upload successivo", () => {
    const a = parseBilancioExport(AZIENDA).aziende[0];
    expect(a.immagini.logoDataUrl).toMatch(/^data:image\/png/);
    expect(a.immagini.coverDataUrl).toBeNull();
  });
});
