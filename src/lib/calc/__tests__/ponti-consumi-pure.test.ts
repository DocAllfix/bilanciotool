import { describe, it, expect } from "vitest";
import fattori from "@/lib/db/seeds/data/ghg-emission-factors.json";
import vettori from "@/lib/db/seeds/data/energy-vectors.json";
import kpi from "@/lib/db/seeds/data/report-kpi.json";
import { CORRISPONDENZE, quantitaGhg } from "../ponti/consumi";

// La tabella dei consumi che passano fra percorsi: ogni voce esiste, e NELLA STESSA UNITÀ.
// Un litro proposto in un campo in chilogrammi non produce un errore: produce un numero
// sbagliato in una colonna che si somma.

const unita = (u: string) => ({ l: "litri", litri: "litri" } as Record<string, string>)[u] ?? u;
const F = new Map((fattori as { id: string; um: string }[]).map((f) => [f.id, unita(f.um)]));
const V = new Map((vettori as { k: string; u: string }[]).map((v) => [v.k, unita(v.u)]));
const K = new Map((kpi as { k: string; u: string }[]).map((x) => [x.k, unita(x.u)]));

describe("corrispondenze dei consumi", () => {
  for (const c of CORRISPONDENZE) {
    it(`${c.nome}: fattori, vettore e indicatore esistono, tutti in ${c.um}`, () => {
      for (const f of c.ghg) expect(F.get(f), `fattore ${f}`).toBe(unita(c.um));
      if (c.vettore) expect(V.get(c.vettore), `vettore ${c.vettore}`).toBe(unita(c.um));
      if (c.kpi) expect(K.get(c.kpi), `indicatore ${c.kpi}`).toBe(unita(c.um));
    });
  }

  it("somma le quantità della stessa corrispondenza, e una proposta a zero non è un consumo", () => {
    const q = quantitaGhg([
      { factorKey: "ee_loc", quantita: "400000" },
      { factorKey: "ee_go", quantita: "212000" },
      { factorKey: "gas_smc", quantita: "0" },
      { factorKey: "acciaio", quantita: "12000" },
    ]);
    expect(q.elettricita).toBe("612000");
    expect(q.gas).toBeNull();
    expect(q.benzina).toBeNull();
  });
});
