import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Il corpus dei sei moduli di conformita', estratto dai prototipi.
//
// I conteggi sono ESATTI e verificati sull'estrazione: valgono da golden, come per
// i cinque moduli gia' in produzione. Un'estrazione che ne cambia uno ha rotto
// qualcosa, e senza questo test lo scoprirebbe il cliente.

const DATI = join(process.cwd(), "src", "lib", "db", "seeds", "data");
const leggi = (f: string) => JSON.parse(readFileSync(join(DATI, `${f}.json`), "utf8"));

type Blocco = { id: string; k: string };
type Documento = { code: string; ordine: number; blocks: Blocco[] };

/** Conteggi attesi: documenti, blocchi e collezioni di dominio. */
const ATTESI = {
  mog231: { procedure: 18, moduli: 54, blocchi: 761, extra: { capi: 10, req: 81, reati: 25, fam: 10 } },
  iso37001: { procedure: 12, moduli: 47, blocchi: 674, extra: { capi: 7, req: 91 } },
  sgiqas: { procedure: 18, moduli: 56, blocchi: 714, extra: { capi: 7, req: 107, norme: 3 } },
  sa8000: { procedure: 22, moduli: 104, blocchi: 2793, extra: { crit: 112, grp: 18, sez: 3, map: 112 } },
  filiera: { procedure: 14, moduli: 56, blocchi: 1045, extra: { fasi: 6, dim: 4, aree: 7, flags: 5 } },
  wb: { procedure: 12, moduli: 34, blocchi: 502, extra: { capi: 10, req: 82 } },
} as const;

describe("corpus dei moduli di conformita'", () => {
  for (const [dom, atteso] of Object.entries(ATTESI)) {
    describe(dom, () => {
      const procedure: Documento[] = leggi(`${dom}-procedures`);
      const moduli: Documento[] = leggi(`${dom}-modules`);

      it("ha il numero esatto di procedure e moduli", () => {
        expect(procedure).toHaveLength(atteso.procedure);
        expect(moduli).toHaveLength(atteso.moduli);
      });

      it("ha il numero esatto di blocchi", () => {
        const n = [...procedure, ...moduli].reduce((a, d) => a + d.blocks.length, 0);
        expect(n).toBe(atteso.blocchi);
      });

      it("ha le collezioni di dominio complete", () => {
        for (const [k, n] of Object.entries(atteso.extra)) {
          const c = leggi(`${dom}-${k}`);
          expect(Array.isArray(c) ? c.length : Object.keys(c).length, `${dom}-${k}`).toBe(n);
        }
      });

      // B7: la chiave del blocco e' l'ancora delle personalizzazioni del cliente.
      // Un blocco senza chiave, o due blocchi con la stessa chiave nello stesso
      // documento, mandano il testo su misura di qualcuno sul blocco sbagliato.
      it("ogni blocco ha una chiave, unica nel suo documento", () => {
        for (const d of [...procedure, ...moduli]) {
          const chiavi = d.blocks.map((b) => b.id);
          expect(chiavi.every(Boolean), `${d.code}: blocco senza chiave`).toBe(true);
          expect(new Set(chiavi).size, `${d.code}: chiavi duplicate`).toBe(chiavi.length);
        }
      });

      it("l'ordine e' progressivo e parte da uno", () => {
        expect(procedure.map((d) => d.ordine)).toEqual(procedure.map((_, i) => i + 1));
        expect(moduli.map((d) => d.ordine)).toEqual(moduli.map((_, i) => i + 1));
      });
    });
  }

  // Le chiavi si derivano dal CONTENUTO del blocco, non dalla posizione. Questo test
  // inchioda la funzione: chi la cambia -- anche "migliorandola" -- fa scivolare tutte
  // le personalizzazioni di tutti i clienti, in silenzio. Se diventa rosso, la
  // domanda giusta non e' «aggiorno il valore atteso» ma «perche' sto cambiando
  // l'identita' dei blocchi gia' seminati».
  it("le chiavi dei blocchi sono quelle attese, e non cambiano", () => {
    const iso: Documento[] = leggi("iso37001-procedures");
    expect(iso[0].code).toBe("PAC-01");
    expect(iso[0].blocks[0].id).toBe("7b1fbb5d");
    expect(iso[0].blocks[iso[0].blocks.length - 1].id).toBe("011b43b2");

    const wb: Documento[] = leggi("wb-procedures");
    expect(wb[0].code).toBe("PWB-01");
    expect(wb[0].blocks[0].id).toBe("c6f785f3");
  });

  it("ogni modulo punta a una procedura che esiste", () => {
    for (const dom of Object.keys(ATTESI)) {
      const codici = new Set((leggi(`${dom}-procedures`) as Documento[]).map((p) => p.code));
      const orfani = (leggi(`${dom}-modules`) as (Documento & { pro: string })[])
        .filter((m) => !codici.has(m.pro))
        .map((m) => m.code);
      expect(orfani, `${dom}: moduli orfani`).toEqual([]);
    }
  });

  it("ogni requisito punta a un capitolo e a una procedura che esistono", () => {
    for (const dom of ["mog231", "iso37001", "sgiqas", "wb"]) {
      const capi = new Set((leggi(`${dom}-capi`) as { id: string }[]).map((c) => c.id));
      const pro = new Set((leggi(`${dom}-procedures`) as Documento[]).map((p) => p.code));
      const req = leggi(`${dom}-req`) as { id: string; cap: string; pro: string }[];
      expect(req.filter((r) => !capi.has(r.cap)).map((r) => r.id), `${dom}: capo assente`).toEqual([]);
      expect(req.filter((r) => !pro.has(r.pro)).map((r) => r.id), `${dom}: procedura assente`).toEqual([]);
    }
  });

  it("il totale e' quello dichiarato nel piano", () => {
    const doc = Object.keys(ATTESI).reduce(
      (a, d) => a + leggi(`${d}-procedures`).length + leggi(`${d}-modules`).length,
      0,
    );
    const blocchi = Object.values(ATTESI).reduce((a, x) => a + x.blocchi, 0);
    expect(doc).toBe(447);
    expect(blocchi).toBe(6489);
  });
});
