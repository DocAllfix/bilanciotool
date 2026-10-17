import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { MODULI } from "@/features/companies/moduli";

// Il CHECK sui percorsi assegnabili e il registro dei moduli dicono la stessa cosa.
//
// ⚠️ Il vincolo è scritto nella migrazione, il registro nel codice: un diciassettesimo
// percorso aggiunto al registro e dimenticato qui non si potrebbe ASSEGNARE, e l'errore
// arriverebbe al primo amministratore che ci prova, come un 500. Si legge l'ultima
// migrazione che riscrive il vincolo, non una copia.

function moduliDelVincolo(): string[] {
  const dir = "src/lib/db/migrations";
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort().reverse()) {
    const sql = readFileSync(`${dir}/${f}`, "utf8");
    const i = sql.indexOf('"assegnazione_percorso_modulo_ck"');
    if (i < 0) continue;
    const coda = sql.slice(i, sql.indexOf(")\n", sql.indexOf("IN (", i)) + 1);
    return [...coda.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
  }
  throw new Error("vincolo assegnazione_percorso_modulo_ck non trovato in nessuna migrazione");
}

describe("percorsi assegnabili", () => {
  it("il vincolo elenca esattamente i moduli del registro", () => {
    expect([...moduliDelVincolo()].sort()).toEqual([...MODULI].sort());
  });
});
