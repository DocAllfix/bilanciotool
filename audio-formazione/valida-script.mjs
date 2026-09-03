// Valida i copioni contro lo STANDARD DI PRONUNCIA congelato dall'utente il 2 settembre.
//
//   node audio-formazione/valida-script.mjs [corso...]
//
// ⚠️ Lo standard NON si ricopia qui: si legge da `genera-audio.py`, che è il file che poi
// sintetizza davvero. Due elenchi della stessa cosa divergono, e il giorno in cui divergono
// questo controllo direbbe verde su un termine che la voce pronuncerà a modo suo.
//
// Che cosa cerca, in ordine di gravità:
//  1. caratteri fuori dalla lista bianca — la sintesi si RIFIUTA di partire, quindi è un
//     guasto certo, non un rischio;
//  2. sigle non dichiarate — verrebbero lette come parole: «GWP» diventa «gwp»;
//  3. termini inglesi non dichiarati — verrebbero letti all'italiana.
//
// ⚠️ Sui punti 2 e 3 il controllo NON decide: elenca. La pronuncia la decide l'utente
// ascoltando, e l'ha già fatto una volta: «market based», «location based», «audit» e
// «governance» restano ITALIANI per scelta esplicita, non per dimenticanza. Un controllo
// che li segnalasse come errori spingerebbe a "correggere" una decisione presa.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const QUI = dirname(fileURLToPath(import.meta.url));
const py = readFileSync(resolve(QUI, "genera-audio.py"), "utf8");

function listaPython(nome) {
  const m = py.match(new RegExp(`^${nome}\\s*=\\s*\\[([\\s\\S]*?)\\]`, "m"));
  if (!m) throw new Error(`${nome} non trovata in genera-audio.py: lo standard è cambiato di forma`);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

const SIGLE = listaPython("SIGLE");
const INGLESI = listaPython("INGLESI");
const glossario = [...py.matchAll(/"([^"]+)":\s*"[^"]*"/g)].map((m) => m[1]);
// La lista bianca della pipeline, tenuta identica a quella del Python.
const AMMESSI = /^[\p{L}0-9 .,;:!?'\n]+$/u;

// Parole italiane che un rilevatore ingenuo scambia per inglesi, e che l'utente ha
// deciso di lasciare italiane. Elencarle qui evita di riproporgliele a ogni esecuzione.
// Sigle che si leggono COME PAROLE, e che per questo non stanno in `SIGLE`: il commento
// sopra quella lista le nomina una per una. Leggerle qui dallo stesso commento evita di
// riproporle come «non dichiarate» a ogni esecuzione — sarebbero nove falsi allarmi fissi,
// e nove falsi allarmi fissi fanno smettere di leggere il referto.
const SIGLE_PAROLA = new Set(
  (py.match(/NON si toccano\s*\n#\s*quelle che sono parole:\s*([^\n.]+)/)?.[1] ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .concat(["ISO", "UNI"]), // nomi di enti normatori, si leggono come parole
);

const ITALIANE_PER_DECISIONE = new Set([
  "audit", "market", "location", "based", "governance", "backup", "standard", "target",
  "budget", "business", "checklist", "due", "diligence", "report", "software", "partner",
  "performance", "franchising", "mix", "set", "leader", "manager", "sponsor",
  // Italiane che il rilevatore pescherebbe per la grafia: la doppia e, la w di chilowatt.
  "aree", "idee", "chilowattora", "megawattora", "gigawattora", "chilowatt", "watt",
  "kilowattora", "settimane", "settimana",
]);

// La doppia o dell'italiano sta quasi solo nel prefisso `coo` (cooperativa, coordinare) e
// in `zoo`. Escluderli per prefisso invece che per elenco evita di riproporre ogni parola
// nuova della stessa famiglia.
const PREFISSI_ITALIANI = ["coo", "zoo"];

const cartelle = readdirSync(QUI, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(resolve(QUI, e.name, "script.json")))
  .map((e) => e.name)
  .filter((n) => process.argv.length <= 2 || process.argv.slice(2).includes(n));

let guasti = 0;
const sigleIgnote = new Map();
const inglesiIgnoti = new Map();

for (const c of cartelle) {
  const d = JSON.parse(readFileSync(resolve(QUI, c, "script.json"), "utf8"));
  for (const s of d.sezioni) {
    const dove = `${c}/${s.id}`;

    // ⚠️ ELISIONE MANGIATA: `l anno` invece di `l'anno`. La sintesi legge la «l» come una
    // parola a sé e chi ascolta sente «elle anno». È un difetto che passa OGNI controllo
    // automatico — uno spazio è un carattere lecito, il testo resta italiano, la durata
    // non cambia — e si sente solo ascoltando. Ventiquattro casi veri, trovati dall'altra
    // sessione guardando le marche parola per parola, non leggendo il testo.
    //
    // ⚠️ `un` NON entra nell'elenco: «un esempio» in italiano si scrive senza apostrofo ed
    // è corretto. Includerlo triplica i falsi positivi.
    const elisioni = [...s.script.matchAll(/\b(l|dell|nell|all|dall|sull|quell|c|d)\s+[aeiouàèéìòù]\w*/gi)];
    if (elisioni.length) {
      console.log(`  GUASTO  ${dove}: elisioni senza apostrofo — ${elisioni.slice(0, 4).map((m) => m[0]).join(", ")}`);
      guasti++;
    }

    const fuori = [...new Set([...s.script].filter((ch) => !AMMESSI.test(ch)))];
    if (fuori.length) {
      console.log(`  GUASTO  ${dove}: caratteri fuori lista ${JSON.stringify(fuori.join(""))}`);
      guasti++;
    }

    // Una sigla è una sequenza di due o più maiuscole. Le parole intere in maiuscolo non
    // esistono nei copioni, quindi non c'è ambiguità.
    for (const m of s.script.matchAll(/\b[A-Z]{2,}\b/g)) {
      if (!SIGLE.includes(m[0]) && !SIGLE_PAROLA.has(m[0]) && !glossario.includes(m[0])) {
        sigleIgnote.set(m[0], (sigleIgnote.get(m[0]) ?? new Set()).add(dove));
      }
    }

    // ⚠️ `\p{Ll}` e non `[a-z]`: con la classe ASCII la parola `qualità` si spezza sulla
    // `à`, resta `qualit`, e finisce fra i sospetti inglesi perché termina per consonante.
    // Il primo rilevatore che ho scritto segnalava trenta parole italiane accentate, e
    // l'elenco era così rumoroso da rendere invisibile l'unico termine vero.
    for (const m of s.script.matchAll(/\b\p{Ll}{4,}\b/gu)) {
      const w = m[0];
      if (INGLESI.includes(w) || ITALIANE_PER_DECISIONE.has(w)) continue;
      if (PREFISSI_ITALIANI.some((p) => w.startsWith(p))) continue;
      // Solo grafie che in italiano NON esistono. La consonante finale non è un indizio:
      // l'italiano tronca (poter, far, gran) e il rumore seppellisce il segnale.
      if (/[kwxy]/.test(w) || /(sh|th|ck|oo|ee|ph)/.test(w)) {
        inglesiIgnoti.set(w, (inglesiIgnoti.get(w) ?? new Set()).add(dove));
      }
    }
  }
}

console.log(`\nStandard letto da genera-audio.py: ${SIGLE.length} sigle, ${INGLESI.length} termini inglesi.`);

for (const [titolo, mappa] of [["SIGLE non dichiarate", sigleIgnote], ["Possibili termini inglesi non dichiarati", inglesiIgnoti]]) {
  if (!mappa.size) continue;
  console.log(`\n⚠️ ${titolo} — da mettere in \`termini_nuovi\` e far decidere all'utente:`);
  for (const [t, dove] of [...mappa].sort()) {
    console.log(`   ${t.padEnd(16)} ${[...dove].slice(0, 3).join(", ")}${dove.size > 3 ? ` (+${dove.size - 3})` : ""}`);
  }
}

if (!guasti && !sigleIgnote.size && !inglesiIgnoti.size) console.log("\nTutto dentro lo standard.");
process.exit(guasti ? 1 : 0);
