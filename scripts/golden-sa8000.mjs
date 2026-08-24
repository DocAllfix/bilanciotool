// Il golden di SA8000/2026, estratto ESEGUENDO il prototipo.
//
// Due cose da misurare, non da dedurre:
//  1. il punteggio di completamento, che è una media PESATA su cinque voci;
//  2. il raggruppamento dei criteri, che nel prototipo è rotto per i fondazionali.
//
//   node scripts/golden-sa8000.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const html = readFileSync("aggiuntenuovimoduli/sgs-sa8000-2026-v1.html", "utf8");
const CRIT = JSON.parse(/id="criteri">([\s\S]*?)<\/script>/.exec(html)[1]);

// ─── I pesi, ritagliati dal prototipo e non riscritti ────────────────────────
const riga = /tot: Math\.round\(\(([^)]*?)\)\)/.exec(html.replace(/\s+/g, " "));
if (!riga) throw new Error("formula del totale non trovata");
const pesi = [...riga[1].matchAll(/\* \.(\d+)/g)].map((m) => Number("0." + m[1]));
if (pesi.length !== 5) throw new Error(`attesi cinque pesi, trovati ${pesi.length}`);

// ─── Il raggruppamento: dove il prototipo sbaglia ────────────────────────────
//
// Il prototipo raggruppa con `k.c.split(".")[0]`. Per «M1.1» dà «M1», che esiste in
// `grp`. Per «F1» dà «F1», che NON esiste — e i cinque criteri fondazionali finiscono in
// cinque riquadri separati, mentre `grp.F` = «Criteri fondazionali (F1–F5)» c'è e non
// viene mai usato.
const gruppoProto = (c) => c.split(".")[0];
const raggruppamento = {};
for (const k of CRIT.crit) {
  const g = gruppoProto(k.c);
  raggruppamento[g] = (raggruppamento[g] ?? 0) + 1;
}
const orfani = Object.keys(raggruppamento).filter((g) => !CRIT.grp[g]);

// ─── Casi del punteggio ──────────────────────────────────────────────────────
//
// La formula del prototipo, applicata a stati costruiti a mano: interessa il PESO di
// ciascuna voce e il fatto che «parziale» valga zero.
const punteggio = (v) =>
  Math.round(v.ana * pesi[0] + v.pro * pesi[1] + v.mod * pesi[2] + v.crit * pesi[3] + v.reg * pesi[4]);

const casi = [
  { nome: "tutto a zero", v: { ana: 0, pro: 0, mod: 0, crit: 0, reg: 0 } },
  { nome: "tutto al cento", v: { ana: 100, pro: 100, mod: 100, crit: 100, reg: 100 } },
  { nome: "solo anagrafica", v: { ana: 100, pro: 0, mod: 0, crit: 0, reg: 0 } },
  { nome: "solo procedure", v: { ana: 0, pro: 100, mod: 0, crit: 0, reg: 0 } },
  { nome: "solo moduli", v: { ana: 0, pro: 0, mod: 100, crit: 0, reg: 0 } },
  { nome: "solo criteri", v: { ana: 0, pro: 0, mod: 0, crit: 100, reg: 0 } },
  { nome: "solo registri", v: { ana: 0, pro: 0, mod: 0, crit: 0, reg: 100 } },
  { nome: "meta ovunque", v: { ana: 50, pro: 50, mod: 50, crit: 50, reg: 50 } },
];

const golden = {
  generatoIl: new Date().toISOString().slice(0, 10),
  pesi: { anagrafica: pesi[0], procedure: pesi[1], moduli: pesi[2], criteri: pesi[3], registri: pesi[4] },
  criteri: CRIT.crit.length,
  perSezione: CRIT.crit.reduce((a, k) => ((a[k.s] = (a[k.s] ?? 0) + 1), a), {}),
  gruppi: Object.keys(CRIT.grp).length,
  sezioni: CRIT.sez,
  // ⚠️ Il difetto misurato: i gruppi che il prototipo produce e che non esistono.
  gruppiOrfani: orfani,
  criteriOrfani: orfani.reduce((a, g) => a + raggruppamento[g], 0),
  punteggi: casi.map((c) => ({ nome: c.nome, valore: punteggio(c.v) })),
};

mkdirSync("src/lib/calc/sa8000/__tests__", { recursive: true });
writeFileSync("src/lib/calc/sa8000/__tests__/golden.json", JSON.stringify(golden, null, 2) + "\n");

console.log("pesi:", JSON.stringify(golden.pesi));
console.log("criteri:", golden.criteri, "per sezione", JSON.stringify(golden.perSezione));
console.log("gruppi:", golden.gruppi, "· ORFANI:", golden.gruppiOrfani.join(", ") || "nessuno",
  `(${golden.criteriOrfani} criteri)`);
for (const p of golden.punteggi) console.log(`  ${p.nome.padEnd(20)} → ${p.valore}`);
