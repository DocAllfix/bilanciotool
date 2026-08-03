// Estrae le costanti metodologiche DIRETTAMENTE dal sorgente dei prototipi HTML
// (zero trascrizione manuale = zero errori di copiatura) e le scrive come JSON
// in src/lib/db/seeds/data/. Rilanciabile: sovrascrive i JSON in modo deterministico.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src", "lib", "db", "seeds", "data");
mkdirSync(outDir, { recursive: true });

// Ritaglia il blocco `const NAME = ...;` dal sorgente e lo valuta in un sandbox.
// Gli spazi attorno all'uguale sono facoltativi: i prototipi GHG e Bilancio scrivono
// `const CAT=`, quelli di supplier e SoA `const Q = `.
function extractConst(source, name) {
  const decl = new RegExp(`const\\s+${name}\\s*=`).exec(source);
  if (!decl) throw new Error(`Costante ${name} non trovata`);
  // Fine del literal: la parentesi che riporta la profondità a zero. Se la
  // dichiarazione prosegue (es. `const C = [...].map(...)`) la coda viene
  // scartata di proposito: al seed servono le righe grezze, non i derivati.
  const inizio = decl.index + decl[0].length;
  let i = inizio;
  let depth = 0;
  let inStr = null;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") inStr = ch;
    else if (ch === "[" || ch === "{" || ch === "(") depth++;
    else if (ch === "]" || ch === "}" || ch === ")") {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) throw new Error(`Literal di ${name} non chiuso`);
  const literal = source.slice(inizio, i + 1);
  return vm.runInNewContext(`(${literal})`, {}, { timeout: 5000 });
}

const ghgHtml = readFileSync(join(root, "archivio", "gestionale-ghg-14064.html"), "utf8");
const bilHtml = readFileSync(join(root, "archivio", "percorso-bilancio-v4.html"), "utf8");
const eneHtml = readFileSync(join(root, "archivio", "bilancio-energetico-v1.html"), "utf8");
const supHtml = readFileSync(join(root, "archivio", "esg-supplier-ready.html"), "utf8");

const out = {
  // Prototipo GHG (ISO 14064-1)
  "ghg-categories.json": extractConst(ghgHtml, "CAT"),
  "ghg-sources.json": extractConst(ghgHtml, "SRC"),
  "ghg-emission-factors.json": extractConst(ghgHtml, "FE_LIB"),
  "ghg-dq-levels.json": extractConst(ghgHtml, "DQ"),
  "ghg-gwp-sets.json": extractConst(ghgHtml, "GWP_SET"),
  "ghg-checklist.json": extractConst(ghgHtml, "VER"),
  // Prototipo Bilancio (GRI/ESRS)
  "report-topics.json": extractConst(bilHtml, "TOPICS"),
  "report-topic-guides.json": extractConst(bilHtml, "GUIDE"),
  "report-scales.json": extractConst(bilHtml, "SCALA"),
  "report-kpi-sections.json": extractConst(bilHtml, "SEZ"),
  "report-kpi.json": extractConst(bilHtml, "KPI"),
  "report-narrative-templates.json": extractConst(bilHtml, "NARR"),
  "report-conversion-factors.json": extractConst(bilHtml, "FATTORI_DEF"),
  // Prototipo Bilancio energetico (EN 16247 / ISO 50001)
  "energy-vectors.json": extractConst(eneHtml, "VETTORI"),
  "energy-vector-factors.json": extractConst(eneHtml, "FATTORI_DEF"),
  "energy-areas.json": extractConst(eneHtml, "AREE"),
  "energy-end-uses.json": extractConst(eneHtml, "USI"),
  "energy-end-uses-default.json": extractConst(eneHtml, "USI_DEF"),
  "energy-use-guides.json": extractConst(eneHtml, "GU"),
  "energy-methods.json": extractConst(eneHtml, "METODI"),
  "energy-drivers.json": extractConst(eneHtml, "DRIVER"),
  "energy-narrative-templates.json": extractConst(eneHtml, "NARR"),
  // ENPI contiene valori-funzione (le formule): JSON.stringify li scarta in
  // silenzio, lasciando esattamente il catalogo di etichette che serve. Le
  // formule vivono in src/lib/calc/energy/indicators.ts e un test verifica che
  // catalogo e registro abbiano le stesse chiavi.
  "energy-indicators.json": extractConst(eneHtml, "ENPI"),
  // Prototipo ESG Supplier Ready (ESRS / GRI / ISO 20400)
  "supplier-areas.json": extractConst(supHtml, "PILLARS"),
  "supplier-questions.json": extractConst(supHtml, "Q"),
  "supplier-bands.json": extractConst(supHtml, "BANDS"),
  "supplier-effort.json": extractConst(supHtml, "EFFORT"),
};

for (const [file, data] of Object.entries(out)) {
  writeFileSync(join(outDir, file), JSON.stringify(data, null, 1) + "\n");
  const n = Array.isArray(data) ? data.length : Object.keys(data).length;
  console.log(`${file}: ${n} elementi`);
}
