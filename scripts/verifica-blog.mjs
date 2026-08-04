// Collaudo del blog, a mano.
//
// NON riscrive i controlli: chiama la stessa rotta che gira ogni mattina col cron di
// Vercel (`/api/cron/verifica-blog`), che a sua volta usa `src/features/blog/verifica.ts`.
// Una seconda implementazione degli stessi controlli divergerebbe dalla prima, e a quel
// punto non si saprebbe più quale delle due dice il vero.
//
//   node scripts/verifica-blog.mjs                        (locale)
//   BASE=https://evalisdeck.it node scripts/verifica-blog.mjs
//
// Il segreto si legge da CRON_SECRET.
import "dotenv/config";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const SEGRETO = process.env.CRON_SECRET;

if (!SEGRETO) {
  console.error("CRON_SECRET mancante: senza, la rotta risponde 404 di proposito.");
  process.exit(2);
}

const risposta = await fetch(`${BASE}/api/cron/verifica-blog`, {
  headers: { authorization: `Bearer ${SEGRETO}` },
  cache: "no-store",
});

if (risposta.status === 404) {
  console.error("404: il segreto non combacia con quello impostato sul sito.");
  process.exit(2);
}
if (!risposta.ok) {
  console.error(`La rotta ha risposto ${risposta.status}.`);
  process.exit(2);
}

const { ok, esiti = [], motivo } = await risposta.json();
if (motivo) {
  console.error(motivo);
  process.exit(2);
}

for (const e of esiti) {
  console.log(`  ${e.ok ? "ok  " : "ROSSO"} ${String(e.nome).padEnd(20)} ${e.dettaglio}`);
}
const rossi = esiti.filter((e) => !e.ok).length;
console.log(`\n${esiti.length} controlli · ${rossi} rossi · ${BASE}`);
// `exitCode` e non `process.exit()`: uscire di forza mentre le connessioni sono ancora
// aperte fa stampare a Node su Windows un'asserzione interna che sembra un guasto e non lo e'.
process.exitCode = ok ? 0 : 1;
