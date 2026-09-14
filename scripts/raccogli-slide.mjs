// Raccoglie i file `slide.json` dei corsi in un manifesto solo, `audio-formazione/slide-map.json`.
//
//   node scripts/raccogli-slide.mjs
//
// ⚠️ Perché un manifesto e non un import per corso. Il renderer legge le slide al momento
// del BUILD, come fa col manifesto dell'audio: un import statico per ogni corso non
// compilerebbe finché il file di quel corso non esiste, e i corsi arrivano uno alla volta.
// Un manifesto solo esiste sempre, anche vuoto.
//
// ⚠️ Questo script NON valida, e non è una dimenticanza: la validazione sta in
// `src/features/formazione/slide-distillate.ts` ed è eseguita da `slide-json-pure.test.ts`
// sul manifesto prodotto qui. Scriverla due volte — qui in JavaScript e là in TypeScript —
// significherebbe due regole che divergono. Qui si controlla solo che il JSON si legga.
//
// La chiave è `<corso>/<sezione>`, la stessa del manifesto dell'audio: le sezioni comuni
// stanno sotto `comuni/`, perché la loro traccia è una sola riusata da tutti i corsi.

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RADICE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "audio-formazione");
const USCITA = resolve(RADICE, "slide-map.json");

const manifesto = {};
let file = 0;
let voci = 0;

for (const cartella of readdirSync(RADICE, { withFileTypes: true })) {
  if (!cartella.isDirectory()) continue;
  const percorso = resolve(RADICE, cartella.name, "slide.json");
  if (!existsSync(percorso)) continue;

  // `_comuni` sulla cartella, `comuni` nella chiave: è la convenzione del manifesto audio.
  const corso = cartella.name === "_comuni" ? "comuni" : cartella.name;
  let elenco;
  try {
    elenco = JSON.parse(readFileSync(percorso, "utf8"));
  } catch (e) {
    console.error(`✗ ${cartella.name}/slide.json non è JSON valido: ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(elenco)) {
    console.error(`✗ ${cartella.name}/slide.json deve essere un elenco di voci`);
    process.exit(1);
  }

  file++;
  for (const voce of elenco) {
    const chiave = `${corso}/${voce.sezione}`;
    (manifesto[chiave] ??= []).push(voce);
    voci++;
  }
}

// Ordinato per chiave: il manifesto si versiona, e un ordine stabile fa leggere il diff.
const ordinato = Object.fromEntries(Object.entries(manifesto).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(USCITA, JSON.stringify(ordinato, null, 2) + "\n");
console.log(`slide-map.json: ${file} file, ${Object.keys(ordinato).length} sezioni, ${voci} voci.`);
console.log("La validazione è in `npx vitest run slide-json-pure`: questo script non la ripete.");
