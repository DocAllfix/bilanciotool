// Ricalcola parole, paragrafi e durata attesa di ogni copione, e controlla le regole che
// un copione deve rispettare prima di essere sintetizzato.
//
//   node audio-formazione/ricalcola.mjs [corso...]
//
// ⚠️ NON stima: applica la costante 2,607 parole al secondo, MISURATA su ventitre' tracce
// vere. Le prime due volte era stimata (1,90 poi 2,27) e ogni traccia usciva corta: la
// differenza fra un numero stimato e uno misurato qui vale sei minuti su un corso.
//
// Regola di scrittura: **94 parole per minuto di lettura a schermo**. E' il rapporto 0,60
// uscito da solo, uguale, su energetico e bilancio — due misure indipendenti sullo stesso
// numero valgono piu' di una stima concordata.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const QUI = dirname(fileURLToPath(import.meta.url));
const COSTANTE = 2.607;
const PAROLE_PER_MINUTO_SCHERMO = 94;

const chiesti = process.argv.slice(2);
const cartelle = readdirSync(QUI, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(resolve(QUI, e.name, "script.json")))
  .map((e) => e.name)
  .filter((n) => chiesti.length === 0 || chiesti.includes(n));

let problemi = 0;
for (const c of cartelle) {
  const p = resolve(QUI, c, "script.json");
  const d = JSON.parse(readFileSync(p, "utf8"));
  d.costante_parole_al_secondo = COSTANTE;

  let sec = 0;
  const righe = [];
  for (const s of d.sezioni) {
    // ⚠️ Gli accenti si scrivono VERI: `perche'` fa emettere ad Azure due marche temporali
    // (la parola e l'apostrofo) e rompeva l'allineamento dei paragrafi. In italiano quel
    // caso capita ogni tre righe, quindi non e' un dettaglio.
    const residui = [...s.script.matchAll(/[A-Za-zÀ-ÿ]+[aeiouAEIOU]'/g)].map((m) => m[0]).filter((x) => x !== "po'");
    if (residui.length) {
      console.log(`  ⚠️ ${c}/${s.id}: apostrofi al posto degli accenti: ${[...new Set(residui)].join(", ")}`);
      problemi++;
    }
    if (!s.script.includes("\n\n")) {
      console.log(`  ⚠️ ${c}/${s.id}: nessuno stacco di paragrafo, le slide non avrebbero marche`);
      problemi++;
    }

    s.parole = s.script.split(/\s+/).filter(Boolean).length;
    s.paragrafi = s.script.split("\n\n").length;
    s.durata_obiettivo_s = Math.round(s.parole / COSTANTE);
    s.durata_richiesta_s = Math.round((s.minuti_schermo * PAROLE_PER_MINUTO_SCHERMO) / COSTANTE);
    sec += s.durata_obiettivo_s;

    const scarto = Math.round(((s.parole - s.minuti_schermo * PAROLE_PER_MINUTO_SCHERMO) / (s.minuti_schermo * PAROLE_PER_MINUTO_SCHERMO)) * 100);
    righe.push(
      "  " + s.id.padEnd(26) + String(s.parole).padStart(4) + " parole  " +
      String(s.durata_obiettivo_s).padStart(3) + " s  " + String(s.paragrafi).padStart(2) + " par  " +
      (scarto >= 0 ? "+" : "") + scarto + "%",
    );
  }
  d.sezioni.sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0));
  writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
  console.log(`\n${c}  —  ${d.sezioni.length} sezioni, ${(sec / 60).toFixed(1)} min`);
  righe.forEach((r) => console.log(r));
}

if (problemi) {
  console.log(`\n${problemi} problemi da correggere prima di sintetizzare.`);
  process.exit(1);
}
