// Il golden del Sistema di gestione integrato QAS, estratto ESEGUENDO il prototipo.
//
// ⚠️ Non si ricava a mano. Le funzioni del prototipo si caricano in una sandbox e si
// interrogano sui casi che contano: quello che restituiscono È il golden, difetti
// compresi. I difetti si registrano invece di correggerli in silenzio, e il test poi
// dichiara quali si conservano e quali no — con la ragione.
//
//   node scripts/golden-sgiqas.mjs
//
// Scrive `src/lib/calc/sgiqas/__tests__/golden.json`.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

const html = readFileSync("aggiuntenuovimoduli/sgi-qas-v1.html", "utf8");

/** Ritaglia una funzione dal prototipo per nome, fino alla graffa che la chiude. */
function estrai(nome) {
  const inizio = html.indexOf(`function ${nome}(`);
  if (inizio < 0) throw new Error(`funzione «${nome}» non trovata nel prototipo`);
  let i = html.indexOf("{", inizio);
  let profondita = 0;
  for (; i < html.length; i++) {
    if (html[i] === "{") profondita++;
    else if (html[i] === "}") {
      profondita--;
      if (profondita === 0) return html.slice(inizio, i + 1);
    }
  }
  throw new Error(`funzione «${nome}» senza chiusura`);
}

// Le costanti che le funzioni usano, prese dal prototipo e non riscritte.
const soglia = /const SOGLIA_ASP = (\d+);/.exec(html);
if (!soglia) throw new Error("SOGLIA_ASP non trovata");

const sandbox = {};
createContext(sandbox);
runInContext(
  [
    `const SOGLIA_ASP = ${soglia[1]};`,
    estrai("lvl"),
    estrai("puntAsp"),
    estrai("aspSign"),
    estrai("livRischio"),
    // `statoInd` legge l'ultima rilevazione e il verso: si forniscono dall'esterno, così
    // il caso di prova è esplicito invece di dipendere dallo stato del prototipo.
    "function ultimo(i){ return i.__ultimo; }",
    "function verso(i){ return i.__verso; }",
    estrai("statoInd"),
  ].join("\n"),
  sandbox,
);

const { aspSign, puntAsp, livRischio, statoInd } = sandbox;

// ─── Aspetti ambientali ──────────────────────────────────────────────────────
const asp = (p) => ({ g: "", f: "", s: "", legale: "No", esposto: "No", superamento: "No", cond: "Normale", ...p });

const aspetti = [
  { nome: "gfs pieni sotto soglia", r: asp({ g: "2 · media", f: "2 · media", s: "2 · media" }) },
  { nome: "gfs pieni sopra soglia", r: asp({ g: "4 · alta", f: "3 · alta", s: "3 · alta" }) },
  { nome: "prescrizione legale, gfs pieni", r: asp({ g: "1 · bassa", f: "1 · bassa", s: "1 · bassa", legale: "Sì" }) },
  // ⚠️ IL CASO CHE RIVELA IL DIFETTO: prescrizione legale non presidiata, ma G/F/S non
  // ancora compilati. Il punteggio è zero, e `aspSign` esce PRIMA di guardare gli
  // override: l'aspetto non risulta significativo e sfugge sia al conteggio sia
  // all'allerta.
  { nome: "prescrizione legale con gfs VUOTI", r: asp({ legale: "Sì" }) },
  { nome: "emergenza con gravita alta, gfs vuoti", r: asp({ cond: "Emergenza", g: "" }) },
  { nome: "emergenza con gravita alta e gfs pieni", r: asp({ cond: "Emergenza", g: "3 · alta", f: "1 · bassa", s: "1 · bassa" }) },
  { nome: "esposto della popolazione, gfs vuoti", r: asp({ esposto: "Sì" }) },
  { nome: "tutto vuoto", r: asp({}) },
];

// ─── Rischi SSL ──────────────────────────────────────────────────────────────
const rischi = [];
for (const p of ["", "1 · rara", "2 · possibile", "3 · probabile", "4 · frequente"]) {
  for (const g of ["", "1 · lieve", "2 · media", "3 · grave", "4 · gravissima"]) {
    rischi.push({ p, g, livello: livRischio(p, g) });
  }
}

// ─── Indicatori ──────────────────────────────────────────────────────────────
const ind = (p) => ({ target: "", soglia: "", __verso: 1, __ultimo: null, ...p });

const indicatori = [
  { nome: "nessuna rilevazione", i: ind({ target: "10" }) },
  { nome: "sopra il target, verso positivo", i: ind({ target: "10", __ultimo: { val: "12" } }) },
  { nome: "sotto il target, sopra la soglia", i: ind({ target: "10", soglia: "5", __ultimo: { val: "7" } }) },
  { nome: "sotto la soglia", i: ind({ target: "10", soglia: "5", __ultimo: { val: "3" } }) },
  { nome: "verso negativo, sotto il target", i: ind({ target: "10", __verso: -1, __ultimo: { val: "8" } }) },
  // ⚠️ IL DIFETTO B4: `Number("")` è 0 e `isFinite(0)` è vero, quindi il target vuoto
  // viene letto come target ZERO. Per un indicatore «più è meglio», qualunque valore
  // risulta «a target» — mentre il cruscotto, due righe più in là, conta lo stesso
  // indicatore fra quelli «senza target definito».
  { nome: "TARGET VUOTO, valore qualsiasi", i: ind({ __ultimo: { val: "42" } }) },
  { nome: "target vuoto, verso negativo", i: ind({ __verso: -1, __ultimo: { val: "42" } }) },
  { nome: "solo soglia, nessun target", i: ind({ soglia: "5", __ultimo: { val: "7" } }) },
  { nome: "valore non numerico", i: ind({ target: "10", __ultimo: { val: "n.d." } }) },
];

const golden = {
  generatoIl: new Date().toISOString().slice(0, 10),
  sogliaAspetti: Number(soglia[1]),
  aspetti: aspetti.map((a) => ({ nome: a.nome, punteggio: puntAsp(a.r), esito: aspSign(a.r) })),
  rischi,
  indicatori: indicatori.map((x) => ({ nome: x.nome, stato: statoInd(x.i) })),
};

mkdirSync("src/lib/calc/sgiqas/__tests__", { recursive: true });
writeFileSync("src/lib/calc/sgiqas/__tests__/golden.json", JSON.stringify(golden, null, 2) + "\n");

console.log(`soglia aspetti: ${golden.sogliaAspetti}`);
for (const a of golden.aspetti) console.log(`  aspetto ${a.nome.padEnd(42)} punteggio ${String(a.punteggio).padStart(2)} → ${a.esito || "«»"}`);
for (const i of golden.indicatori) console.log(`  indicatore ${i.nome.padEnd(40)} → ${i.stato}`);
console.log(`rischi: ${golden.rischi.length} combinazioni`);
