import { describe, it, expect } from "vitest";
import proposte from "@/lib/db/seeds/data/ateco-proposte.json";
import fattori from "@/lib/db/seeds/data/ghg-emission-factors.json";
import { PROFILI_ATECO } from "@/lib/calc/ateco";
import usiFinali from "@/lib/db/seeds/data/energy-end-uses.json";

// Il catalogo delle proposte per codice ATECO parla la lingua dei cataloghi dei percorsi.
//
// ⚠️ Una chiave che il catalogo del percorso non conosce non produce un errore: produce una
// proposta che non si può inserire, cioè un profilo che propone meno di quello che dichiara,
// in silenzio. Si controlla qui, sul file del seme, prima che arrivi a un database.

const chiaviFattori = new Set((fattori as { id: string }[]).map((f) => f.id));
const profili = new Set(PROFILI_ATECO.map((p) => p.key));

describe("proposte ATECO — GHG", () => {
  const { motivi, profili: perProfilo } = proposte.ghg as { motivi: Record<string, string>; profili: Record<string, string[]> };

  it("ogni profilo ATECO ha le sue voci, e nessun profilo è inventato", () => {
    expect(Object.keys(perProfilo).sort()).toEqual([...profili].sort());
  });

  it("ogni voce è un fattore che il catalogo GHG conosce", () => {
    for (const [p, voci] of Object.entries(perProfilo)) {
      for (const v of voci) expect(chiaviFattori.has(v), `${p}: ${v}`).toBe(true);
    }
  });

  it("al massimo quindici voci per profilo, nessuna ripetuta", () => {
    for (const [p, voci] of Object.entries(perProfilo)) {
      expect(voci.length, p).toBeLessThanOrEqual(15);
      expect(voci.length, p).toBeGreaterThan(0);
      expect(new Set(voci).size, `${p}: voce ripetuta`).toBe(voci.length);
    }
  });

  it("ogni voce proposta porta il suo motivo", () => {
    const usate = new Set(Object.values(perProfilo).flat());
    for (const v of usate) expect(motivi[v]?.length ?? 0, v).toBeGreaterThan(20);
  });
});

describe("proposte ATECO — Bilancio energetico", () => {
  const usi = new Set((usiFinali as { id: string }[]).map((u) => u.id));
  const { motivi, profili: perProfilo } = proposte.energia as { motivi: Record<string, string>; profili: Record<string, string[]> };

  it("ogni profilo ATECO ha i suoi usi finali", () => {
    expect(Object.keys(perProfilo).sort()).toEqual([...profili].sort());
  });

  it("ogni uso proposto esiste nel catalogo, non è ripetuto e ha il motivo", () => {
    for (const [p, elenco] of Object.entries(perProfilo)) {
      expect(new Set(elenco).size, p).toBe(elenco.length);
      for (const u of elenco) {
        expect(usi.has(u), `${p}: ${u}`).toBe(true);
        expect(motivi[u]?.length ?? 0, u).toBeGreaterThan(20);
      }
    }
  });

  it("l'illuminazione c'è sempre: ogni sede la ha", () => {
    for (const [p, elenco] of Object.entries(perProfilo)) {
      expect(elenco.includes("U15"), p).toBe(true);
    }
  });
});
