import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { NUMERI_VETRINA, NORME_VETRINA } from "@/components/landing/numeri-vetrina";
import { MODULI_AZIENDA } from "@/features/companies/moduli";
import { migliaia } from "@/components/landing/scroll-reveal";

// La banda dei numeri della vetrina non porta cifre scritte a mano.
//
// ⚠️ Diceva «30 indicatori calcolati in automatico» quando il motore ne calcola 25, e
// «5 documenti pubblicabili» quando erano diventati trentotto. Un numero sulla home è il
// primo che un cliente ripete: si conta, e questa guardia impedisce che torni scritto.

const HOME = readFileSync("src/app/(marketing)/page.tsx", "utf8");
const BANDA = HOME.slice(HOME.indexOf("STRIP NUMERI"), HOME.indexOf("I PERCORSI */"));

describe("banda dei numeri della vetrina", () => {
  it("la banda si trova davvero", () => {
    expect(BANDA.length).toBeGreaterThan(500);
    expect(BANDA).toContain("NV.");
  });

  it("nessuna cifra scritta a mano nella banda né nei passi della home", () => {
    // Le tuple della banda: `[49, "", …]` è la forma che non deve tornare.
    expect(BANDA.match(/\[\s*\d+\s*,/g) ?? []).toEqual([]);
    expect(HOME).not.toMatch(/\b\d+ indicatori derivati/);
    expect(HOME).not.toMatch(/\b\d+ dei quali calcolati/);
  });

  it("il corpus conta TUTTI i file di procedure e moduli del seme", () => {
    const d = "src/lib/db/seeds/data/";
    const atteso = readdirSync(d)
      .filter((f) => /-(procedures|modules)\.json$/.test(f))
      .reduce((s, f) => s + (JSON.parse(readFileSync(d + f, "utf8")) as unknown[]).length, 0);
    // Un modulo nuovo col suo corpus che non entra nell'elenco farebbe scendere il numero
    // in silenzio: qui il conto si rifà da capo, dalla cartella.
    expect(NUMERI_VETRINA.corpus).toBe(atteso);
  });

  it("i numeri sono quelli del prodotto, non zero", () => {
    for (const [k, v] of Object.entries(NUMERI_VETRINA)) expect(v, k).toBeGreaterThan(0);
    expect(NUMERI_VETRINA.percorsi).toBe(MODULI_AZIENDA.length);
  });

  it("ogni percorso ha la sua norma nell'elenco", () => {
    for (const m of MODULI_AZIENDA) {
      expect(NORME_VETRINA.some((n) => n === m.norma || n.startsWith(`${m.norma} `)), m.norma).toBe(true);
    }
    expect(new Set(NORME_VETRINA).size).toBe(NORME_VETRINA.length);
  });

  it("le migliaia col punto, come in italiano", () => {
    expect(migliaia(1007)).toBe("1.007");
    expect(migliaia(511)).toBe("511");
    expect(migliaia(1234567)).toBe("1.234.567");
  });
});
