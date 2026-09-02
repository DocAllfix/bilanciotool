// Porta i copioni agli accenti veri: perche' -> perché, e' -> è, piu' -> più.
//
// ⚠️ NON e' una decisione sulla pronuncia. L'altra sessione ha verificato sintetizzando che
// `perché` e `perche'` producono lo stesso suono e che le lettere accentate sono dentro la
// lista bianca: e' igiene del testo. Serve perche' Azure emette DUE marche temporali per
// `perche'` (la parola e l'apostrofo), e in italiano quel caso capita ogni tre righe.
//
// LA REGOLA E' STRUTTURALE, NON UN ELENCO DI PAROLE.
// Vocale + apostrofo = accento troncato, si accenta.
// Consonante + apostrofo = elisione (l', dell', un', com', quest', mezz'), resta com'e'.
// Un elenco di nomi andrebbe aggiornato alla prima parola nuova, e non protesterebbe.
//
// Due eccezioni, entrambe verificabili:
//  - `po'` e' gia' scritto giusto in italiano (troncamento di "poco"), non si tocca;
//  - le parole che finiscono in `-che'` vogliono l'accento ACUTO (perché, finché), non il
//    grave: e' l'unico punto in cui il verso dell'accento non si deduce dalla vocale.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";

const ACCENTO = { a: "à", e: "è", i: "ì", o: "ò", u: "ù" };
const ACCENTO_MAIUSC = { a: "À", e: "È", i: "Ì", o: "Ò", u: "Ù" };

export function accenta(testo) {
  return testo.replace(/([A-Za-zÀ-ÿ]+)'/g, (intero, parola) => {
    if (intero === "po'") return intero;
    const ultima = parola.slice(-1);
    const bassa = ultima.toLowerCase();
    if (!(bassa in ACCENTO)) return intero; // elisione: l', dell', com', quest'
    if (/che$/i.test(parola)) return parola.slice(0, -1) + (ultima === "E" ? "É" : "é");
    const tavola = ultima === bassa ? ACCENTO : ACCENTO_MAIUSC;
    return parola.slice(0, -1) + tavola[bassa];
  });
}

function ricorri(v) {
  if (typeof v === "string") return accenta(v);
  if (Array.isArray(v)) return v.map(ricorri);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ricorri(x)]));
  return v;
}

// ⚠️ Esporta `accenta` E fa il lavoro: senza questa guardia, importarlo per provare la
// regola riscriverebbe tutti i file come effetto collaterale dell'import. Mi e' successo.
if (process.argv[1] && process.argv[1].endsWith("accenti-veri.mjs")) principale();

function principale() {
const COSTANTE = 2.607; // misurata su 16 tracce vere, non stimata

const cartelle = readdirSync(".", { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(e.name + "/script.json"))
  .map((e) => e.name);

let totParole = 0;
for (const c of cartelle) {
  const p = c + "/script.json";
  const prima = readFileSync(p, "utf8");
  const d = ricorri(JSON.parse(prima));
  d.costante_parole_al_secondo = COSTANTE;
  let parole = 0;
  for (const s of d.sezioni) {
    s.parole = s.script.split(/\s+/).filter(Boolean).length;
    s.paragrafi = s.script.split("\n\n").length;
    s.durata_obiettivo_s = Math.round(s.parole / COSTANTE);
    parole += s.parole;
  }
  writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
  const sec = d.sezioni.reduce((n, s) => n + s.durata_obiettivo_s, 0);
  const residui = (JSON.stringify(d).match(/[aeiouAEIOU]'/g) || []).filter((x) => x !== "o'").length;
  totParole += parole;
  console.log(
    c.padEnd(13) + String(d.sezioni.length).padStart(2) + " sez  " +
    String(parole).padStart(5) + " parole  " + (sec / 60).toFixed(1).padStart(5) + " min" +
    (residui ? "   ⚠️ " + residui + " residui" : ""),
  );
}
console.log("\ntotale " + totParole + " parole");
}
