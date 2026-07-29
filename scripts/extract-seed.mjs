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

// Ritaglia il blocco `const NAME=...;` dal sorgente e lo valuta in un sandbox.
function extractConst(source, name) {
  const start = source.indexOf(`const ${name}=`);
  if (start < 0) throw new Error(`Costante ${name} non trovata`);
  // fine del literal: il primo `];` o `};` a profondità zero dal segno di uguale
  let i = source.indexOf("=", start) + 1;
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
  const literal = source.slice(source.indexOf("=", start) + 1, i + 1);
  return vm.runInNewContext(`(${literal})`, {}, { timeout: 5000 });
}

const ghgHtml = readFileSync(join(root, "archivio", "gestionale-ghg-14064.html"), "utf8");
const bilHtml = readFileSync(join(root, "archivio", "percorso-bilancio-v4.html"), "utf8");

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
};

for (const [file, data] of Object.entries(out)) {
  writeFileSync(join(outDir, file), JSON.stringify(data, null, 1) + "\n");
  const n = Array.isArray(data) ? data.length : Object.keys(data).length;
  console.log(`${file}: ${n} elementi`);
}
