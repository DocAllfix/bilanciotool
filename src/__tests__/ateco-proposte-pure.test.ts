import { describe, it, expect } from "vitest";
import proposte from "@/lib/db/seeds/data/ateco-proposte.json";
import fattori from "@/lib/db/seeds/data/ghg-emission-factors.json";
import { PROFILI_ATECO } from "@/lib/calc/ateco";
import usiFinali from "@/lib/db/seeds/data/energy-end-uses.json";
import reati231 from "@/lib/db/seeds/data/mog231-reati.json";
import trattamentiGdpr from "@/lib/db/seeds/data/gdpr-trattamenti-tipo.json";
import registriQas from "@/lib/db/seeds/data/sgiqas-registri.json";

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

describe("proposte ATECO — Modello 231", () => {
  const reati = new Set((reati231 as { id: string }[]).map((r) => r.id));
  const m = proposte.mog231 as { motivi: Record<string, string>; sempre: string[]; profili: Record<string, string[]> };

  it("ogni profilo ATECO ha la sua voce (anche vuota)", () => {
    expect(Object.keys(m.profili).sort()).toEqual([...profili].sort());
  });

  it("ogni reato proposto esiste nel catalogo e ha il suo motivo", () => {
    for (const r of [...m.sempre, ...Object.values(m.profili).flat(), "25-septies"]) {
      expect(reati.has(r), r).toBe(true);
      expect(m.motivi[r]?.length ?? 0, r).toBeGreaterThan(20);
    }
  });

  it("nessun reato è proposto due volte per lo stesso profilo", () => {
    for (const [p, elenco] of Object.entries(m.profili)) {
      const tutti = [...m.sempre, ...elenco];
      expect(new Set(tutti).size, p).toBe(tutti.length);
    }
  });
});

describe("proposte ATECO — GDPR", () => {
  const tipi = new Set((trattamentiGdpr as { key: string }[]).map((t) => t.key));
  const g = proposte.gdpr as { motivi: Record<string, string>; profili: Record<string, string[]> };

  it("ogni profilo ATECO e ogni profilo speciale ha la sua voce", () => {
    expect(Object.keys(g.profili).sort()).toEqual([...profili, "_50", "_dipendenti", "_sempre", "_sito"].sort());
  });

  it("ogni trattamento proposto esiste nel catalogo GDPR e ha il motivo", () => {
    for (const t of Object.values(g.profili).flat()) {
      expect(tipi.has(t), t).toBe(true);
      expect(g.motivi[t]?.length ?? 0, t).toBeGreaterThan(20);
    }
  });
});

describe("proposte ATECO — Sistema integrato QAS", () => {
  type Aspetto = { att: string; fase: string; asp: string; imp: string };
  type Pericolo = { area: string; att: string; per: string; danno: string };
  type Gruppo = { motivo: string; aspetti: Aspetto[]; pericoli: Pericolo[] };
  const q = (proposte as unknown as { qas: { comuni: Gruppo; gruppi: Record<string, Gruppo>; profili: Record<string, string> } }).qas;
  const opzioni = (registro: string, colonna: string) => {
    const r = (registriQas as { registerId: string; colonne: { chiave: string; opzioni: string[] | null }[] }[])
      .find((x) => x.registerId === registro);
    return new Set(r?.colonne.find((c) => c.chiave === colonna)?.opzioni ?? []);
  };

  it("ogni profilo ATECO punta a un gruppo che esiste", () => {
    expect(Object.keys(q.profili).sort()).toEqual([...profili].sort());
    for (const [p, g] of Object.entries(q.profili)) expect(q.gruppi[g], `${p}: ${g}`).toBeTruthy();
  });

  // ⚠️ Una fase o un aspetto fuori elenco non solleva: entra nel registro come valore che la
  // tendina non sa mostrare, e la riga sembra vuota proprio dove dovrebbe dire qualcosa.
  it("fase e aspetto sono valori ammessi dal registro degli aspetti ambientali", () => {
    const fasi = opzioni("aspetti", "fase");
    const aspetti = opzioni("aspetti", "asp");
    expect(fasi.size).toBeGreaterThan(0);
    for (const g of [q.comuni, ...Object.values(q.gruppi)]) {
      for (const a of g.aspetti) {
        expect(fasi.has(a.fase), a.fase).toBe(true);
        expect(aspetti.has(a.asp), a.asp).toBe(true);
      }
    }
  });

  it("ogni gruppo ha un motivo, e ogni riga dice qualcosa", () => {
    for (const [k, g] of Object.entries({ comune: q.comuni, ...q.gruppi })) {
      expect(g.motivo?.length ?? 0, k).toBeGreaterThan(15);
      for (const a of g.aspetti) expect(a.att && a.imp, k).toBeTruthy();
      for (const p of g.pericoli) expect(p.area && p.att && p.per && p.danno, k).toBeTruthy();
    }
  });
});
