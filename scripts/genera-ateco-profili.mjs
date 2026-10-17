// Genera `docs/ateco-profili.md` dal catalogo delle proposte, per la revisione del committente.
//
//   node scripts/genera-ateco-profili.mjs
//
// ⚠️ IL DOCUMENTO SI DERIVA, NON SI SCRIVE. Una copia leggibile scritta a mano divergerebbe dal
// catalogo alla prima correzione, e il committente approverebbe una cosa diversa da quella che
// il prodotto fa. Le correzioni si fanno in `src/lib/db/seeds/data/ateco-proposte.json`, poi si
// rigenera questo file.

import { readFileSync, writeFileSync } from "node:fs";

const proposte = JSON.parse(readFileSync("src/lib/db/seeds/data/ateco-proposte.json", "utf8"));
const fattori = new Map(JSON.parse(readFileSync("src/lib/db/seeds/data/ghg-emission-factors.json", "utf8")).map((f) => [f.id, f]));
const sorgenti = new Map(JSON.parse(readFileSync("src/lib/db/seeds/data/ghg-sources.json", "utf8")).map((s) => [s.id, s.n]));

// I nomi e gli intervalli dei profili stanno in TypeScript (`src/lib/calc/ateco.ts`): si leggono
// dal sorgente invece di ricopiarli, con un'espressione che si ferma se non trova niente.
const ts = readFileSync("src/lib/calc/ateco.ts", "utf8");
const profili = [...ts.matchAll(/\{ key: "([a-z_]+)", nome: "([^"]+)", da: (\d+), a: (\d+) \}/g)].map((m) => ({
  key: m[1],
  nome: m[2],
  da: Number(m[3]),
  a: Number(m[4]),
}));
if (profili.length < 20) throw new Error(`profili letti da ateco.ts: ${profili.length}, troppo pochi`);

const div = (n) => String(n).padStart(2, "0");
const righe = [
  "# Proposte per codice ATECO — da rivedere",
  "",
  "Documento generato da `scripts/genera-ateco-profili.mjs` a partire dal catalogo",
  "`src/lib/db/seeds/data/ateco-proposte.json`. **Non si modifica a mano**: le correzioni vanno nel",
  "catalogo, poi si rigenera.",
  "",
  "## Come funziona",
  "",
  "- Il codice ATECO si legge per **divisione** (le prime due cifre), non per lettera: dal 2025 le",
  "  lettere delle sezioni sono cambiate, le divisioni no.",
  "- Ogni voce entra nel percorso **a quantità zero**, marcata «proposta» col motivo qui sotto. Il",
  "  totale non cambia finché il consulente non scrive un numero.",
  "- Una voce modificata o confermata non si tocca più, nemmeno se l'ATECO cambia.",
  "- Se esiste l'esercizio precedente, si riprendono le sue voci e il codice ATECO non si usa.",
  "",
  "## Inventario GHG: voci tipiche per profilo",
  "",
];
for (const p of profili) {
  const voci = proposte.ghg.profili[p.key] ?? [];
  righe.push(`### ${p.nome} (divisioni ${div(p.da)}${p.a !== p.da ? `–${div(p.a)}` : ""})`, "");
  voci.forEach((k, i) => {
    const f = fattori.get(k);
    righe.push(`${i + 1}. **${f?.n ?? k}** (${sorgenti.get(f?.src) ?? f?.src}, ${f?.um ?? ""})`);
  });
  righe.push("");
}
righe.push("## I motivi", "", "Ogni voce porta questo testo accanto, nel percorso.", "");
const usate = [...new Set(Object.values(proposte.ghg.profili).flat())].sort();
for (const k of usate) righe.push(`- **${fattori.get(k)?.n ?? k}**: ${proposte.ghg.motivi[k]}`);
righe.push("");

writeFileSync("docs/ateco-profili.md", righe.join("\n"));
console.log(`docs/ateco-profili.md: ${profili.length} profili, ${usate.length} voci distinte`);
