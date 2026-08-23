// Golden del motore Modello 231, ESTRATTO ESEGUENDO IL PROTOTIPO.
//
// Le funzioni sono quelle di `mog-231-v1.html`, caricate in una sandbox e chiamate su
// casi scelti per toccare ogni ramo del rischio a due stadi.
//
//   node scripts/golden-mog231.mjs

import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import { ritagliaConst, ritagliaFunzione } from "./estrai-registri.mjs";

const SORGENTE = readFileSync("aggiuntenuovimoduli/mog-231-v1.html", "utf8");
const ctx = vm.createContext({ Number, String, Math, Object, Array, JSON, Boolean, RegExp });

for (const nome of ["SPROB", "SIMP", "SADEG", "LIV", "MATRICE", "PESO"]) {
  const c = ritagliaConst(SORGENTE, nome);
  if (!c) throw new Error(`costante ${nome} non trovata`);
  vm.runInContext(`const ${nome} = ${c};`, ctx);
}
for (const nome of ["lvl", "inerente", "residuo", "accettabile"]) {
  const f = ritagliaFunzione(SORGENTE, nome);
  if (!f) throw new Error(`funzione ${nome} non trovata`);
  vm.runInContext(f, ctx);
}

// ─── rischio a due stadi ─────────────────────────────────────────────────────
//
// Primo stadio: probabilità × impatto → rischio inerente.
// Secondo stadio: MATRICE[inerente][adeguatezza dei presidi] → rischio residuo.
const scenari = {};
const PROB = ["", "1 · remota", "2 · possibile", "3 · probabile", "4 · attesa"];
const IMP = ["", "1 · lieve", "2 · moderato", "3 · grave", "4 · molto grave"];
const ADEG = ["", "Assenti", "Parziali", "Adeguati"];
for (const p of PROB) {
  for (const i of IMP) {
    for (const a of ADEG) {
      const chiave = `${p || "(vuoto)"} × ${i || "(vuoto)"} / ${a || "(vuoto)"}`;
      ctx.__s = { prob: p, imp: i, adeg: a };
      scenari[chiave] = {
        inerente: vm.runInContext("inerente(__s)", ctx),
        residuo: vm.runInContext("residuo(__s)", ctx),
        accettabile: vm.runInContext("accettabile(__s)", ctx),
      };
    }
  }
}

// ─── idoneità dei pilastri ───────────────────────────────────────────────────
//
// Stessa forma di ISO 37001: media dei SOLI valutati, «Non applicabile» escluso.
// Il golden serve a misurare — non ad affermare — quanto la nostra scelta diversa
// sposti i numeri.
vm.runInContext(`
  function capStatoProto(stati){
    const v = stati.filter(s => s && s !== "Non applicabile");
    if (!v.length) return 0;
    return Math.round(v.reduce((a, s) => a + (PESO[s] || 0), 0) / v.length);
  }
`, ctx);
const pilastri = {};
for (const [nome, stati] of Object.entries({
  "nessuno valutato su 12": Array(12).fill(""),
  "2 efficaci su 12, il resto intatto": ["Presente ed efficace", "Presente ed efficace", ...Array(10).fill("")],
  "2 efficaci e 10 non applicabili": ["Presente ed efficace", "Presente ed efficace", ...Array(10).fill("Non applicabile")],
  "tutti e 12 efficaci": Array(12).fill("Presente ed efficace"),
  "6 efficaci e 6 assenti": [...Array(6).fill("Presente ed efficace"), ...Array(6).fill("Assente")],
  "12 da rafforzare": Array(12).fill("Presente ma da rafforzare"),
})) {
  ctx.__st = stati;
  pilastri[nome] = { stati, prototipo: vm.runInContext("capStatoProto(__st)", ctx) };
}

const golden = { estrattoDa: "aggiuntenuovimoduli/mog-231-v1.html", scenari, pilastri, pesi: vm.runInContext("PESO", ctx) };
writeFileSync("src/lib/calc/mog231/__tests__/golden.json", JSON.stringify(golden, null, 2) + "\n");

console.log(`golden: ${Object.keys(scenari).length} combinazioni di scenario, ${Object.keys(pilastri).length} casi di pilastro`);
console.log("\n  campioni che contano:");
for (const k of [
  "1 · remota × 1 · lieve / Adeguati",
  "4 · attesa × 4 · molto grave / Adeguati",
  "4 · attesa × 4 · molto grave / (vuoto)",
  "3 · probabile × 3 · grave / (vuoto)",
  "(vuoto) × 3 · grave / Adeguati",
]) {
  const v = scenari[k];
  console.log(`    ${k.padEnd(44)} inerente=${v.inerente || "—"} residuo=${v.residuo || "—"} accettabile=${v.accettabile}`);
}
console.log("\n  pilastri:");
for (const [k, v] of Object.entries(pilastri)) console.log(`    ${k.padEnd(38)} prototipo=${v.prototipo}`);
