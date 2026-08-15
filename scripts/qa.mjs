// Lanciatore dei collaudi. `npm run qa` senza argomenti li elenca.
//
//   npm run qa                 → elenco
//   npm run qa -- marchio      → scripts/visual-check-marchio.mjs
//   npm run qa -- blog         → scripts/verifica-blog.mjs
//   npm run qa -- landing --prod  → contro https://evalisdeck.it
//
// Sono ventotto file e crescono a ogni fase: elencarli a mano in package.json
// significherebbe dimenticarne uno al primo giro di distrazione. Qui la cartella
// è la fonte, e un collaudo nuovo si presenta da solo.

import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const QUI = dirname(fileURLToPath(import.meta.url));
const PROD = "https://evalisdeck.it";

// SOLO i collaudi, riconosciuti dal prefisso. Nella stessa cartella vivono utensili
// che scrivono davvero — `seed.mjs` semina il database, `prepara-brand.mjs` rigenera
// i derivati dei loghi — e un elenco che li mescola ai controlli invita a lanciarli
// per sbaglio. Chi ne ha bisogno li chiama per nome.
const COLLAUDO = /^(visual-check|verifica-|verify-prod|qa-prod|audit-)/;
const file = readdirSync(QUI).filter((f) => f.endsWith(".mjs") && f !== "qa.mjs" && COLLAUDO.test(f));
const nomi = new Map();
for (const f of file) {
  const base = f.replace(/\.mjs$/, "");
  // Il nome corto è quello che resta togliendo il prefisso: `visual-check-marchio`
  // → `marchio`. `visual-check.mjs` (la shell, il primo di tutti) resta `shell`.
  const corto =
    base === "visual-check" ? "design" : base.replace(/^(visual-check|verifica)-/, "");
  if (!nomi.has(corto)) nomi.set(corto, f);
}

const argomenti = process.argv.slice(2);
const nome = argomenti.find((a) => !a.startsWith("-"));
const prod = argomenti.includes("--prod");

if (!nome) {
  console.log("Collaudi disponibili:\n");
  for (const [corto, f] of [...nomi].sort()) console.log(`  ${corto.padEnd(24)} ${f}`);
  console.log("\n  npm run qa -- <nome> [--prod]");
  process.exit(0);
}

const scelto = nomi.get(nome);
if (!scelto) {
  console.error(`Nessun collaudo di nome «${nome}». Lancia «npm run qa» per l'elenco.`);
  process.exit(1);
}

// I collaudi leggono BASE dall'ambiente: quelli locali vogliono il server acceso,
// `--prod` li punta al sito vero senza che ciascuno debba saperlo.
const env = { ...process.env };
if (prod) env.BASE = PROD;

// IL BERSAGLIO SI DICHIARA SEMPRE, non solo con `--prod`.
//
// Prima l'indirizzo compariva solo quando era quello di produzione, quindi un referto
// senza indirizzo poteva voler dire due cose opposte: «sto interrogando il tuo server
// locale» oppure «hai passato una variabile che nessuno legge e sto interrogando il tuo
// server locale lo stesso». È successo: tre collaudi verdi, dati per fatti sul sito
// vero, erano andati tutti contro un `next start` acceso ore prima con un altro codice.
//
// Un collaudo che non dice contro cosa ha parlato può essere verde sul bersaglio
// sbagliato, ed è il modo più economico di credersi coperti senza esserlo.
const bersaglio = env.BASE ?? "http://localhost:3000";
console.log(`→ ${scelto}  (${bersaglio})${prod ? "" : "  ← locale: il server deve essere acceso E aggiornato"}\n`);
const esito = spawnSync(process.execPath, [join(QUI, scelto), ...argomenti.filter((a) => a !== nome)], {
  stdio: "inherit",
  env,
});
process.exit(esito.status ?? 1);
