// Il giro completo: esegue TUTTI i collaudi, uno dopo l'altro, e riassume.
//
//   node scripts/giro-completo.mjs            (contro il server locale)
//   BASE=https://evalisdeck.it node scripts/giro-completo.mjs
//
// Fra un collaudo e l'altro AZZERA il contatore del limite di frequenza: quasi tutti
// registrano uno studio nuovo, e dopo dieci registrazioni dallo stesso indirizzo il
// freno — che è lì apposta — li boccerebbe uno dopo l'altro facendo sembrare rotto il
// prodotto invece del giro.

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import "dotenv/config";

const QUI = dirname(fileURLToPath(import.meta.url));
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });

// Gli utensili non sono collaudi: `seed` scrive, `gira-video` registra un filmato.
const ESCLUSI = new Set(["giro-completo.mjs", "qa.mjs", "comune-registrazione.mjs", "gira-video.mjs", "seed.mjs", "extract-seed.mjs", "prepara-brand.mjs", "genera-favicon.mjs", "stampa-offerta.mjs", "stripe-bootstrap.mjs"]);
const PREFISSI = /^(visual-check|verifica-|verify-prod|qa-prod|audit-)/;

const collaudi = readdirSync(QUI)
  .filter((f) => f.endsWith(".mjs") && !ESCLUSI.has(f) && PREFISSI.test(f))
  .sort();

const esiti = [];
console.log(`${collaudi.length} collaudi da eseguire.\n`);

for (const file of collaudi) {
  await sql`delete from rate_limit`.catch(() => {});
  process.stdout.write(`▸ ${file.padEnd(38)}`);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [join(QUI, file)], {
    encoding: "utf8",
    env: process.env,
    timeout: 8 * 60_000,
  });
  const durata = Math.round((Date.now() - t0) / 1000);
  const uscita = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  // Ogni collaudo stampa la stessa riga di riepilogo: la si legge invece di indovinare.
  const riga = uscita.match(/Controlli: (\d+) ok, (\d+) falliti/) ?? uscita.match(/(\d+) controlli · (\d+) rossi/);
  const ok = riga ? Number(riga[1]) : null;
  const ko = riga ? Number(riga[2]) : null;
  const verde = r.status === 0;
  console.log(`${verde ? "verde" : "ROSSO"}  ${ok !== null ? `${ok} ok, ${ko} falliti` : "(nessun riepilogo)"}  ${durata}s`);
  esiti.push({ file, verde, ok, ko, durata, uscita });
}

await sql`delete from rate_limit`.catch(() => {});
await sql.end();

const rossi = esiti.filter((e) => !e.verde);
console.log(`\n${"=".repeat(70)}`);
console.log(`${esiti.length - rossi.length} verdi · ${rossi.length} rossi`);
if (rossi.length) {
  console.log("\nDETTAGLIO DEI ROSSI\n");
  for (const r of rossi) {
    console.log(`── ${r.file}`);
    const righe = r.uscita.split("\n").filter((l) => /KO |ROSSO|Error|✕|×/.test(l)).slice(0, 6);
    for (const l of righe) console.log("   " + l.trim().slice(0, 160));
    console.log("");
  }
}
process.exitCode = rossi.length ? 1 : 0;
