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

  let ok = r.status === 0;
  let uscitaFinale = uscita;
  let riassuntoFinale = riassunto;
  let alSecondo = false;

  // ⚠️ UN FALLITO SI RILANCIA UNA VOLTA, E LO SI DICE.
  //
  // Un giro di due ore mette sotto carico lo stesso database e la stessa funzione: nel
  // secondo giro, quattro collaudi su sette sono passati rilanciati da soli. È contesa,
  // non regressione — la stessa famiglia già annotata per l'`ENOTFOUND` a raffica e per il
  // 503 durante una batteria concorrente.
  //
  // Ma un referto che segnala quattro falsi allarmi costringe a rilanciare a mano, e chi
  // lo legge impara a non fidarsene. Il rilancio automatico toglie il rumore.
  //
  // ⚠️ E NON NASCONDE NIENTE: «al 2° tentativo» resta nella riga e nel riepilogo. Un
  // collaudo che passa solo al secondo colpo è un'informazione, non un successo — «ha
  // funzionato una volta» non distingue corretto da fortunato.
  if (!ok) {
    // ⚠️ SI ASPETTA PRIMA DI RILANCIARE. Un rilancio immediato non sfugge alla contesa che
    // ha causato il fallimento: nel giro definitivo, `condivisione` e `sgesg-documenti`
    // sono caduti due volte di fila e poi sono passati da soli, a mente fredda. Venti
    // secondi costano niente su un giro di due ore, e cambiano il significato del referto.
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20_000);
    const r2 = spawnSync(process.execPath, [join(QUI, "qa.mjs"), c.nome, "--su", SU], {
      encoding: "utf8",
      env: process.env,
      maxBuffer: 40 * 1024 * 1024,
    });
    const u2 = `${r2.stdout ?? ""}${r2.stderr ?? ""}`;
    uscitaFinale = u2;
    if (r2.status === 0) {
      ok = true;
      alSecondo = true;
      const m2 =
        u2.match(/(\d+)\s+ok,\s*(\d+)\s+(?:falliti|ko)/i) ?? u2.match(/PROVE:\s*(\d+)\/(\d+)/i)?.slice(0, 3);
      if (m2) riassuntoFinale = /ok,/.test(u2) ? `${m2[1]} ok, ${m2[2]} ko` : `${m2[1]}/${m2[2]}`;
    }
  }

  esiti.push({ nome: c.nome, ok, alSecondo, secondi, riassunto: riassuntoFinale, uscita: uscitaFinale });
  const segno = ok ? (alSecondo ? "  ok*" : "  ok ") : "  KO ";
  console.log(`${segno} ${riassuntoFinale.padEnd(14)} ${secondi}s${alSecondo ? "   (al 2° tentativo)" : ""}`);
}

// ── il referto ───────────────────────────────────────────────────────────────
const falliti = esiti.filter((e) => !e.ok);
console.log("─".repeat(78));
console.log(
  `\n${esiti.length - falliti.length} passati · ${falliti.length} falliti · ` +
    `${Math.round((Date.now() - inizioTutto) / 60000)} minuti\n`,
);

// ⚠️ Chi passa solo al secondo colpo va DETTO, non assorbito nel verde: «ha funzionato
// una volta» non distingue corretto da fortunato.
const traballanti = esiti.filter((e) => e.ok && e.alSecondo);
if (traballanti.length) {
  console.log(
    `⚠️  ${traballanti.length} passati solo al SECONDO tentativo: ` +
      traballanti.map((t) => t.nome).join(", "),
  );
  console.log("   Sotto carico cedono. Non è un successo pieno: è un'informazione.\n");
}

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
    // ⚠️ Quando NON c'è una riga rossa, il caso è quello che mi ha lasciato cieco due
    // volte: tutti i controlli verdi e l'uscita rossa — un errore di console, una
    // richiesta fallita, un'eccezione dopo l'ultimo controllo. «Guarda il referto
    // completo» non aiuta chi legge un giro di due ore: si mostra la coda.
    if (!righe.length) {
      console.log("   nessun controllo rosso, ma uscita non-zero. Ultime righe:");
      for (const r of f.uscita.trim().split("\n").slice(-6)) console.log("     " + r.trim().slice(0, 180));
    }
    console.log("");
  }
}

process.exitCode = falliti.length ? 1 : 0;
