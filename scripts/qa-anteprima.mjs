// Passa TUTTI i collaudi contro un deploy di anteprima, e ne fa il referto.
//
// ⚠️ PERCHE' ESISTE. I collaudi verdi in locale non sono un permesso di rilascio: sono la
// condizione per meritarsi l'anteprima. Il 26 agosto 2026 il giro sull'anteprima ha
// trovato, in mezza giornata, cose che 1178 test verdi e dodici collaudi per comando non
// potevano vedere:
//
//   · la PASSWORD nella barra degli indirizzi (un `<form>` senza `method` e' GET, e prima
//     dell'idratazione l'invio e' quello nativo — in locale l'idratazione e' istantanea);
//   · i PDF che erano la pagina di accesso di Vercel, e passavano il controllo «non e'
//     vuoto» perche' pesavano 141 KB;
//   · il freno sulle iscrizioni che frenava noi;
//   · lo script che Vercel inietta nelle anteprime e che faceva uscire rossi collaudi con
//     tutti i controlli verdi.
//
// Lanciarli a mano uno per uno costa un pomeriggio e si sbaglia l'elenco. Questo li
// elenca dalla cartella — un collaudo nuovo entra da solo — e stampa una tabella.
//
//   node scripts/qa-anteprima.mjs --su https://<anteprima>
//   node scripts/qa-anteprima.mjs --su <url> --da fornitore    riprende da li'
//   node scripts/qa-anteprima.mjs --su <url> --solo ghg-percorso,agenda
//   node scripts/qa-anteprima.mjs --elenco                     dice solo cosa girerebbe

import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const QUI = dirname(fileURLToPath(import.meta.url));

/**
 * I collaudi che NON si passano a un'anteprima, e il motivo di ciascuno.
 *
 * ⚠️ L'elenco porta la ragione accanto, non solo il nome: un'esclusione senza motivo
 * scritto diventa, sei mesi dopo, un collaudo che nessuno lancia piu' e nessuno sa
 * perche'. E' la stessa regola delle eccezioni nella matrice RLS.
 */
const FUORI = {
  "qa-prod": "e' il giro sul sito vero: ha senso solo in produzione",
  "verify-prod": "idem",
  checkout: "compra: si rifiuta fuori da localhost, e giustamente",
  pagamento: "idem",
  rinnovo: "usa l'orologio di prova di Stripe, che vive accanto alle chiavi locali",
  estensioni: "compra estensioni: stessa famiglia",
  "accesso-completo": "pretende ACCESSO_EMAIL e ACCESSO_PWD di un conto esistente",
  buono: "pretende CONTO=<email> di un conto gia' creato",
  "recupero-password": "pretende CONTO=<email> di un conto gia' creato",
  blog: "chiede il CRON_SECRET del bersaglio, che non conosciamo",
  articolo: "dipende dagli articoli pubblicati sul CMS, non dal ramo",
  consenso: "misura GA4, che in anteprima non e' configurata",
  design: "gate visivo che scrive screenshot: si guarda in locale",
};

const argomenti = process.argv.slice(2);
const valore = (nome) => {
  const i = argomenti.indexOf(nome);
  return i >= 0 ? argomenti[i + 1] : null;
};
const SU = valore("--su");
const DA = valore("--da");
const SOLO = valore("--solo")?.split(",").map((x) => x.trim()).filter(Boolean);
const SOLO_ELENCO = argomenti.includes("--elenco");

if (!SU && !SOLO_ELENCO) {
  console.error("\n  node scripts/qa-anteprima.mjs --su https://<anteprima>\n");
  process.exit(1);
}

// L'elenco si legge dalla cartella, come fa `qa.mjs`: un collaudo nuovo si presenta da solo.
const nomeDi = (f) => f.replace(/^(verifica|visual-check)-?/, "").replace(/\.mjs$/, "") || "design";
const tutti = readdirSync(QUI)
  .filter((f) => /^(verifica|visual-check).*\.mjs$/.test(f))
  .map((f) => ({ file: f, nome: nomeDi(f) }))
  .sort((a, b) => a.nome.localeCompare(b.nome));

let daFare = tutti.filter((c) => !FUORI[c.nome]);
if (SOLO) daFare = daFare.filter((c) => SOLO.includes(c.nome));
if (DA) {
  const i = daFare.findIndex((c) => c.nome === DA);
  if (i < 0) {
    console.error(`--da ${DA}: non e' fra i collaudi da passare`);
    process.exit(1);
  }
  daFare = daFare.slice(i);
}

console.log(`\nCollaudi da passare: ${daFare.length} su ${tutti.length}`);
console.log(`Esclusi: ${Object.keys(FUORI).length}`);
for (const [n, perche] of Object.entries(FUORI)) console.log(`   ${n.padEnd(20)} ${perche}`);
if (SOLO_ELENCO) {
  console.log("\nPasserebbero:");
  for (const c of daFare) console.log("   " + c.nome);
  process.exit(0);
}
console.log(`\nBersaglio: ${SU}\n${"─".repeat(78)}`);

const esiti = [];
const inizioTutto = Date.now();

for (const [i, c] of daFare.entries()) {
  const t0 = Date.now();
  process.stdout.write(`[${String(i + 1).padStart(2)}/${daFare.length}] ${c.nome.padEnd(24)}`);
  const r = spawnSync(process.execPath, [join(QUI, "qa.mjs"), c.nome, "--su", SU], {
    encoding: "utf8",
    env: process.env,
    maxBuffer: 40 * 1024 * 1024,
  });
  const secondi = Math.round((Date.now() - t0) / 1000);
  const uscita = `${r.stdout ?? ""}${r.stderr ?? ""}`;

  // Il conteggio si legge dal referto del collaudo, che lo stampa nella sua forma: i
  // collaudi di questo progetto non hanno un formato unico, e imporne uno adesso
  // significherebbe toccarne cinquantotto.
  const m =
    uscita.match(/(\d+)\s+ok,\s*(\d+)\s+(?:falliti|ko)/i) ??
    uscita.match(/PROVE:\s*(\d+)\/(\d+)/i)?.slice(0, 3);
  let riassunto = "";
  if (m && /ok,/.test(uscita)) riassunto = `${m[1]} ok, ${m[2]} ko`;
  else if (m) riassunto = `${m[1]}/${m[2]}`;

  const ok = r.status === 0;
  esiti.push({ nome: c.nome, ok, secondi, riassunto, uscita });
  console.log(`${ok ? "  ok " : "  KO "} ${riassunto.padEnd(14)} ${secondi}s`);
}

// ── il referto ───────────────────────────────────────────────────────────────
const falliti = esiti.filter((e) => !e.ok);
console.log("─".repeat(78));
console.log(
  `\n${esiti.length - falliti.length} passati · ${falliti.length} falliti · ` +
    `${Math.round((Date.now() - inizioTutto) / 60000)} minuti\n`,
);

if (falliti.length) {
  console.log("DA GUARDARE\n");
  for (const f of falliti) {
    console.log(`── ${f.nome} ──`);
    // Le righe che dicono qualcosa: i controlli rossi e le eccezioni, non l'uscita intera.
    const righe = f.uscita
      .split("\n")
      .filter((r) => /^\s*(KO|FAIL|✗)|Error:|TimeoutError|🛑|non riuscit/i.test(r))
      .slice(0, 6);
    for (const r of righe) console.log("   " + r.trim().slice(0, 200));
    if (!righe.length) console.log("   (nessuna riga esplicita: guarda il referto completo)");
    console.log("");
  }
}

process.exitCode = falliti.length ? 1 : 0;
