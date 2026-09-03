// Applica un file `<corso>/_agg.json` — mappa id-sezione -> paragrafi da aggiungere in coda.
//
// ⚠️ I paragrafi si scrivono in un file JSON, MAI dentro una stringa di shell: gli apostrofi
// di elisione andrebbero persi, e la voce direbbe «elle anno» invece di «l'anno». E'
// successo su ventiquattro punti prima che una guardia lo prendesse.
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";

const corso = process.argv[2];
if (!corso) throw new Error("uso: node applica-agg.mjs <corso>");
const P = `${corso}/script.json`;
const A = `${corso}/_agg.json`;
if (!existsSync(A)) throw new Error(`manca ${A}`);

const d = JSON.parse(readFileSync(P, "utf8"));
const agg = JSON.parse(readFileSync(A, "utf8"));
let n = 0;
for (const [id, par] of Object.entries(agg)) {
  const s = d.sezioni.find((x) => x.id === id);
  if (!s) throw new Error(`sezione non trovata: ${corso}/${id}`);
  s.script += "\n\n" + par.join("\n\n");
  n += par.length;
}
writeFileSync(P, JSON.stringify(d, null, 2) + "\n");
unlinkSync(A);
console.log(`${corso}: ${n} paragrafi aggiunti`);
