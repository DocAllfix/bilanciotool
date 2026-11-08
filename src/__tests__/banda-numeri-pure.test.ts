import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { NUMERI_VETRINA, NORME_VETRINA } from "@/components/landing/numeri-vetrina";
import { MODULI_AZIENDA } from "@/features/companies/moduli";

// La banda dei numeri della vetrina non porta cifre scritte a mano.
//
// ⚠️ Diceva «30 indicatori calcolati in automatico» quando il motore ne calcola 25, e
// «5 documenti pubblicabili» quando erano diventati trentotto. Un numero sulla home è il
// primo che un cliente ripete: si conta, e questa guardia impedisce che torni scritto.

// ⚠️ Dal 7 novembre 2026 la banda dei contatori animati non c'è più (era il cliché
// dell'«hero-metric»): i numeri stanno in una riga sotto la griglia dei percorsi, nel corpo
// della home (`landing.tsx`). La regola resta la stessa: si contano, non si scrivono.
const HOME = readFileSync("src/components/landing/landing.tsx", "utf8");
const BANDA = HOME.slice(HOME.indexOf("I PERCORSI */"), HOME.indexOf("L'UNICITÀ */"));

describe("i numeri della vetrina", () => {
  it("la sezione dei percorsi si trova davvero, e i suoi numeri vengono dal registro", () => {
    expect(BANDA.length).toBeGreaterThan(500);
    // Dal 7 novembre 2026 la sezione dice solo quanti sono i percorsi: il resto dei numeri
    // (requisiti, procedure) è uscito con la semplificazione chiesta dal committente.
    expect(BANDA).toContain("NV.percorsi");
  });

  it("nessuna cifra scritta a mano nei numeri né nei passi della home", () => {
    // Le tuple della vecchia banda: `[49, "", …]` è la forma che non deve tornare.
    expect(BANDA.match(/\[\s*\d+\s*,/g) ?? []).toEqual([]);
    // Nemmeno nei testi: «16 percorsi» scritto a mano diventa falso al diciassettesimo.
    expect(HOME).not.toMatch(/>\s*\d+ percorsi/);
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
});
