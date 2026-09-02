// Valida gli script audio contro il vincolo dell'agente di sintesi, e ne calcola il peso.
//
// ⚠️ Il vincolo non e' pignoleria: la loro pipeline si RIFIUTA di sintetizzare se trova un
// carattere fuori lista, per non produrre audio sbagliato in silenzio. Mandare uno script
// non validato significa fargli scoprire il problema dopo, su ventisette file.

import { readFileSync, writeFileSync } from "node:fs";

const AMMESSI = /^[\p{L}0-9 .,;:!?'\n]+$/u;
const FILE = [ // percorsi relativi a questa cartella
  "_comuni/script.json",
  "energetico/script.json",
  "fornitore/script.json",
];

let guasti = 0;
for (const p of FILE) {
  const d = JSON.parse(readFileSync(p, "utf8"));
  for (const s of d.sezioni) {
    s.parole = s.script.split(/\s+/).filter(Boolean).length;
    const fuori = [...new Set([...s.script].filter((c) => !AMMESSI.test(c)))];
    // Due stime, perche' le due costanti misurate finora divergono del venti per cento e
    // nessuna delle due e' ancora quella buona: 1,90 su testo fitto di elenchi e codici,
    // 2,29 su testo narrativo. Il bersaglio vero sono i SECONDI, e li misura la sintesi.
    const lento = Math.round(s.parole / 1.9);
    const veloce = Math.round(s.parole / 2.29);
    console.log(
      `${d.corso}/${s.id}`.padEnd(34) +
        `${String(s.parole).padStart(4)} parole  ${String(veloce).padStart(3)}–${lento} s  [${s.densita}]`,
    );
    if (fuori.length) {
      guasti++;
      console.log(`   ⚠️ CARATTERI FUORI LISTA: ${JSON.stringify(fuori)}`);
    }
  }
  writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
}
console.log(guasti ? `\n${guasti} sezioni con caratteri vietati` : "\nNessun carattere fuori lista.");
process.exit(guasti ? 1 : 0);
