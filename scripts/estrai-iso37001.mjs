// Le collezioni di dominio di ISO 37001, estratte dal prototipo.
//
// Il corpus (12 procedure, 47 moduli, 12 registri) e' gia' stato estratto in Fase A.
// Qui mancavano le quattro DIMENSIONI del rischio con la loro scala e i sei FATTORI:
// sono contenuto consulenziale — dicono al consulente cosa distingue un 2 da un 3 —
// e vanno nel catalogo versionato, non nel codice.
//
// Capitoli e requisiti erano gia' in `iso37001-capi.json` e `iso37001-req.json`: si
// riusano quelli, non si riestraggono, cosi' non possono divergere.
//
//   node scripts/estrai-iso37001.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { ritagliaConst } from "./estrai-registri.mjs";
import vm from "node:vm";

const SORGENTE = readFileSync("aggiuntenuovimoduli/sgpc-iso37001-v1.html", "utf8");
const ctx = vm.createContext({});

function costante(nome) {
  const c = ritagliaConst(SORGENTE, nome);
  if (!c) throw new Error(`costante ${nome} non trovata`);
  return vm.runInContext(`(${c})`, ctx);
}

const DIM = costante("DIM");
const FLAGS = costante("FLAGS");

// La forma e' quella della tabella, non quella del prototipo: `k` -> `key`, e la
// scala resta un array di quattro stringhe, dal meno al piu' esposto.
const dimensioni = DIM.map((d, i) => {
  if (!Array.isArray(d.s) || d.s.length !== 4) {
    throw new Error(`la dimensione ${d.k} non ha quattro gradini ma ${d.s?.length}`);
  }
  return { key: d.k, etichetta: d.l, descrizione: d.d, scala: d.s, ordine: i + 1 };
});

const fattori = FLAGS.map((f, i) => ({ key: f.k, etichetta: f.l, ordine: i + 1 }));

const perRiga = (righe) => "[\n" + righe.map((r) => "  " + JSON.stringify(r)).join(",\n") + "\n]\n";

writeFileSync("src/lib/db/seeds/data/iso37001-dimensioni.json", perRiga(dimensioni));
writeFileSync("src/lib/db/seeds/data/iso37001-fattori.json", perRiga(fattori));

console.log(`dimensioni: ${dimensioni.length} (${dimensioni.map((d) => d.key).join(", ")})`);
console.log(`fattori:    ${fattori.length} (${fattori.map((f) => f.key).join(", ")})`);
