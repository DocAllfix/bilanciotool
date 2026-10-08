import { describe, it, expect } from "vitest";
import { percorsoEscluso } from "@/components/legal/analytics-percorsi";
import { immaginiDellaPagina, nelleOrigini } from "@/features/blog/verifica";
import { parseGhgExport } from "@/features/import/parser";
import { impostazioniSchema } from "@/features/report/validation";

// I reperti dell'audit di sicurezza del 7 ottobre 2026 (run-2) che si provano senza
// database. Ogni blocco ha un caso che il difetto lasciava passare e uno che deve
// continuare a funzionare: un rimedio che rompe l'uso normale non è un rimedio.

const SITO = "https://evalisdeck.it";
const CMS = "https://cms.evalisdeck.it";

describe("analisi: le pagine con un token nell'indirizzo non si misurano", () => {
  it.each([
    "/reimposta-password",
    "/documenti-cliente/abc123",
    "/accept-invitation/inv-1",
    "/documento/snap/az",
  ])("%s è esclusa", (p) => {
    expect(percorsoEscluso(p)).toBe(true);
  });

  it.each(["/", "/prezzi", "/blog/un-articolo", "/documenti", "/reimposta"])("%s si misura", (p) => {
    expect(percorsoEscluso(p)).toBe(false);
  });
});

describe("verifica del blog: si va in rete solo verso il sito e il CMS", () => {
  it("un indirizzo assoluto verso un host interno viene scartato", () => {
    expect(nelleOrigini("http://127.0.0.1/blog/tag/x", SITO, [SITO])).toBeNull();
    expect(nelleOrigini("http://169.254.169.254/wp-content/uploads/a.png", SITO, [SITO, CMS])).toBeNull();
  });

  it("un host che comincia come il sito non è il sito", () => {
    expect(nelleOrigini("https://evalisdeck.it.altro.com/blog/tag/x", SITO, [SITO])).toBeNull();
  });

  it("relativi e assoluti del sito restano", () => {
    expect(nelleOrigini("/blog/tag/x", SITO, [SITO])).toBe(`${SITO}/blog/tag/x`);
    expect(nelleOrigini(`${SITO}/blog/autore/r`, SITO, [SITO])).toBe(`${SITO}/blog/autore/r`);
  });

  it("le immagini del CMS si misurano, quelle altrove no", () => {
    const html =
      `<img src="/wp-content/uploads/a.png">` +
      `<img src="${CMS}/wp-content/uploads/b.png">` +
      `<img src="http://10.0.0.1/wp-content/uploads/c.png">`;
    expect(immaginiDellaPagina(html, SITO, CMS)).toEqual([
      `${SITO}/wp-content/uploads/a.png`,
      `${CMS}/wp-content/uploads/b.png`,
    ]);
  });
});

describe("import GHG: i tetti fermano l'abuso e non l'uso", () => {
  const voce = (anno: number) => ({ anno, cat: "1", src: "1a", q: "1", fe: "1" });
  const base = { nome: "Gamma S.r.l.", anno: 2025, voci: [voce(2025), voce(2024)] };

  it("un export normale passa", () => {
    expect(parseGhgExport(base).organizzazioni[0].voci).toHaveLength(2);
  });

  it("trentuno anni diversi: respinto, e il messaggio dice perché", () => {
    const voci = Array.from({ length: 31 }, (_, i) => voce(1995 + i));
    expect(() => parseGhgExport({ ...base, voci })).toThrow(/più di 30 anni/);
  });

  it("trenta anni passano ancora", () => {
    const voci = Array.from({ length: 29 }, (_, i) => voce(1995 + i));
    expect(() => parseGhgExport({ ...base, voci })).not.toThrow();
  });

  it("un campo del profilo enorme: respinto", () => {
    expect(() => parseGhgExport({ ...base, profilo: { nota: "x".repeat(10_001) } })).toThrow(/caratteri/);
  });

  it("un anno fuori dagli esercizi ammessi: respinto", () => {
    expect(() => parseGhgExport({ ...base, voci: [voce(1000000)] })).toThrow();
  });
});

describe("impostazioni del bilancio: solo standard e perimetro", () => {
  it("una colonna in più viene respinta", () => {
    expect(impostazioniSchema.safeParse({ perimetro: "x", companyId: "altro" }).success).toBe(false);
    expect(impostazioniSchema.safeParse({ anno: 2030 }).success).toBe(false);
  });

  it("uno standard fuori elenco viene respinto, quelli ammessi passano", () => {
    expect(impostazioniSchema.safeParse({ standard: "inventato" }).success).toBe(false);
    expect(impostazioniSchema.safeParse({ standard: "ESRS (VSME) volontario" }).success).toBe(true);
    expect(impostazioniSchema.safeParse({ perimetro: "Sede" }).success).toBe(true);
  });
});
