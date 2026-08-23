// Golden del motore dei termini (D.Lgs. 24/2023), ESTRATTO ESEGUENDO IL PROTOTIPO.
//
// ⚠️ Serve a MISURARE due difetti, non a conservarli. Il prototipo interpreta le date a
// mezzanotte UTC e poi le manipola in ora LOCALE: attraversando il cambio d'ora il
// risultato slitta di un giorno, e su un termine perentorio un giorno in meno è una
// violazione. E `addMesi` fa traboccare il 31 gennaio al 1° maggio invece che al 30
// aprile.
//
// Il golden si estrae DUE VOLTE, con due fusi diversi, perché è così che il difetto si
// vede: se lo stesso codice dà due risposte a seconda di dove si trova il browser, la
// risposta giusta non è nessuna delle due.
//
//   node scripts/golden-segnalazioni.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { ritagliaConst, ritagliaFunzione } from "./estrai-registri.mjs";

const SORGENTE = readFileSync("aggiuntenuovimoduli/whistleblowing-v1.html", "utf8");

/** I casi: date scelte per toccare il cambio d'ora e i fine mese. */
const AVVISO = [
  "2026-03-20", // prima del cambio d'ora
  "2026-03-25", // +7 giorni ATTRAVERSA il cambio d'ora del 29 marzo
  "2026-03-29", // il giorno stesso del cambio
  "2026-10-22", // +7 giorni attraversa il ritorno all'ora solare del 25 ottobre
  "2026-06-10", // lontano da qualunque cambio
];
const RISCONTRO = [
  "2026-01-31", // +3 mesi: aprile ha 30 giorni
  "2026-11-30", // +3 mesi: attraversa l'anno
  "2026-05-31", // +3 mesi: agosto ne ha 31
  "2026-02-28",
  "2024-11-29", // +3 mesi cade in un anno bisestile
];

function misura() {
  const ctx = vm.createContext({ Number, String, Math, Object, Array, JSON, Boolean, Date, isNaN });
  for (const nome of ["GG_AVVISO", "MESI_RISCONTRO", "ANNI_CONSERV"]) {
    vm.runInContext(`const ${nome} = ${ritagliaConst(SORGENTE, nome)};`, ctx);
  }
  for (const nome of ["dt", "addGG", "addMesi", "addAnni"]) {
    const f = ritagliaFunzione(SORGENTE, nome);
    if (!f) throw new Error(`funzione ${nome} non trovata`);
    vm.runInContext(f, ctx);
  }
  const out = { fuso: Intl.DateTimeFormat().resolvedOptions().timeZone, avviso: {}, riscontro: {}, conservazione: {} };
  for (const d of AVVISO) out.avviso[d] = vm.runInContext(`addGG(${JSON.stringify(d)}, GG_AVVISO)`, ctx);
  for (const d of RISCONTRO) out.riscontro[d] = vm.runInContext(`addMesi(${JSON.stringify(d)}, MESI_RISCONTRO)`, ctx);
  for (const d of ["2026-02-29", "2024-02-29", "2026-08-23"]) {
    out.conservazione[d] = vm.runInContext(`addAnni(${JSON.stringify(d)}, ANNI_CONSERV)`, ctx);
  }
  return out;
}

// Se invocato con TZ già impostato, misura e stampa. Altrimenti si richiama due volte.
if (process.env.SOLO_MISURA) {
  process.stdout.write(JSON.stringify(misura()));
} else {
  const perFuso = {};
  for (const tz of ["UTC", "Europe/Rome"]) {
    const grezzo = execFileSync(process.execPath, [new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")], {
      env: { ...process.env, TZ: tz, SOLO_MISURA: "1" },
      encoding: "utf8",
    });
    perFuso[tz] = JSON.parse(grezzo);
  }

  // Le divergenze fra i due fusi: sono il difetto, misurato.
  const divergenze = [];
  for (const gruppo of ["avviso", "riscontro", "conservazione"]) {
    for (const k of Object.keys(perFuso.UTC[gruppo])) {
      const a = perFuso.UTC[gruppo][k];
      const b = perFuso["Europe/Rome"][gruppo][k];
      if (a !== b) divergenze.push({ gruppo, data: k, utc: a, roma: b });
    }
  }

  writeFileSync(
    "src/lib/calc/segnalazioni/__tests__/golden.json",
    JSON.stringify({ estrattoDa: "aggiuntenuovimoduli/whistleblowing-v1.html", perFuso, divergenze }, null, 2) + "\n",
  );

  console.log(`golden estratto con due fusi. Divergenze: ${divergenze.length}`);
  for (const d of divergenze) {
    console.log(`  ${d.gruppo.padEnd(14)} ${d.data}  UTC=${d.utc}  Roma=${d.roma}  <-- lo stesso codice, due risposte`);
  }
  console.log("\n  traboccamenti di fine mese (riscontro, +3 mesi, fuso UTC):");
  for (const [k, v] of Object.entries(perFuso.UTC.riscontro)) {
    const giorno = Number(k.slice(8));
    const arrivo = Number(v.slice(8));
    console.log(`    ${k} -> ${v}${arrivo < giorno && arrivo <= 3 ? "   <-- trabocca nel mese dopo" : ""}`);
  }
}
