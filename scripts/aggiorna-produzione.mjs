// Porta lo SCHEMA e i CATALOGHI della produzione al pari del ramo.
//
// ⚠️ NON distribuisce codice. Fa le due cose che vengono PRIMA del deploy, e che sono
// reversibili nei fatti:
//
//   1. le migrazioni mancanti  → creano tabelle e politiche nuove
//   2. il seme dei cataloghi   → le riempie (requisiti, controlli, schede, corpus)
//
// Il build attualmente in produzione continua a girare: ignora le tabelle che non conosce.
// Cosi' i due passi rischiosi — schema e codice — restano disaccoppiati, e fra l'uno e
// l'altro si puo' verificare che il sito vivo regga.
//
// ⚠️ PERCHE' E' SICURO, verificato file per file e non a impressione:
//   · zero `DROP`, `TRUNCATE`, `DELETE` nelle migrazioni mancanti;
//   · zero colonne `NOT NULL` senza default su tabelle gia' esistenti — il build vecchio
//     continua a poter scrivere;
//   · i vincoli `CHECK` sono tutti su tabelle che in produzione ancora non esistono:
//     nascono gia' conformi, non possono fallire su dati presenti;
//   · Drizzle applica UNA migrazione per transazione: se una fallisce ci si ferma li',
//     e le precedenti restano valide. Si riparte da dove si era arrivati.
//
// ⚠️ E il seme e' idempotente: `seed-counts.db.test.ts` lo prova.
//
//   node scripts/aggiorna-produzione.mjs            → dice cosa farebbe, non tocca niente
//   node scripts/aggiorna-produzione.mjs --applica  → esegue
//
// Le credenziali stanno in `.env.produzione`, fuori da git. Le migrazioni passano SEMPRE
// da `DIRECT_URL` (session pooler :5432): drizzle-kit non funziona in transaction mode.

import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import postgres from "postgres";

const APPLICA = process.argv.includes("--applica");

let prod;
try {
  prod = readFileSync(".env.produzione", "utf8");
} catch {
  console.error("Manca .env.produzione.");
  process.exit(1);
}
const DIRECT = prod.match(/^DIRECT_URL=(.*)$/m)?.[1]?.trim();
const DB = prod.match(/^DATABASE_URL=(postgresql:\/\/postgres\..*)$/m)?.[1]?.trim();
if (!DIRECT || !DB) {
  console.error("In .env.produzione mancano DIRECT_URL o DATABASE_URL.");
  process.exit(1);
}

const mascherata = (u) => u.replace(/:[^:@]*@/, ":***@").slice(0, 62);
console.log(`\nBersaglio: ${mascherata(DIRECT)}`);
console.log(APPLICA ? "MODO: esecuzione\n" : "MODO: solo elenco, non tocco niente\n");

// ── stato di partenza ────────────────────────────────────────────────────────
const s = postgres(DIRECT, { prepare: false, max: 1 });
const applicate = await s`select hash from drizzle.__drizzle_migrations order by created_at`;
const [{ n: tabelle }] = await s`select count(*)::int n from information_schema.tables where table_schema='public'`;
const [{ n: organizzazioni }] = await s`select count(*)::int n from organization`;
const [{ n: abbonamenti }] = await s`select count(*)::int n from stripe_subscription`;
await s.end();

const suDisco = readdirSync("src/lib/db/migrations").filter((f) => f.endsWith(".sql")).sort();
const mancanti = suDisco.slice(applicate.length);

console.log(`  migrazioni applicate : ${applicate.length} su ${suDisco.length}`);
console.log(`  tabelle              : ${tabelle}`);
console.log(`  organizzazioni       : ${organizzazioni}   ·   abbonamenti Stripe: ${abbonamenti}`);
console.log(`\n  da applicare: ${mancanti.length}`);
for (const m of mancanti.slice(0, 6)) console.log("    " + m);
if (mancanti.length > 6) console.log(`    … e altre ${mancanti.length - 6}`);

if (!mancanti.length) {
  console.log("\nLo schema e' gia' al pari. Resta solo il seme dei cataloghi.\n");
}

if (!APPLICA) {
  console.log("\n(elenco soltanto — rilancia con --applica per eseguire)\n");
  process.exit(0);
}

// ⚠️ L'ambiente si costruisce QUI e non si eredita: `.env` punta allo sviluppo, e un
// comando che ereditasse quello scriverebbe nel posto sbagliato dicendo di fare l'altro.
const ambiente = {
  ...process.env,
  DIRECT_URL: DIRECT,
  DATABASE_URL: DB,
  // La guardia esiste per fermare chi ci arriva per abitudine. Qui la dichiarazione e'
  // esplicita e sta scritta nel nome della variabile.
  SO_CHE_E_PRODUZIONE: "1",
};

// ── 1. migrazioni ────────────────────────────────────────────────────────────
if (mancanti.length) {
  console.log("\n1) MIGRAZIONI\n");
  const r = spawnSync("npx", ["drizzle-kit", "migrate"], { env: ambiente, stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error("\n🛑 Le migrazioni si sono fermate. Quelle gia' applicate restano valide:");
    console.error("   rilancia questo script e riprendera' da dove si era arrivati.\n");
    process.exit(1);
  }
}

// ── 2. seme dei cataloghi ────────────────────────────────────────────────────
console.log("\n2) SEME DEI CATALOGHI\n");
const r2 = spawnSync(process.execPath, ["scripts/seed.mjs"], { env: ambiente, stdio: "inherit" });
if (r2.status !== 0) {
  console.error("\n🛑 Il seme e' fallito. Lo schema resta aggiornato: si puo' rilanciare.\n");
  process.exit(1);
}

// ── 2b. i codici dei documenti già pubblicati ────────────────────────────────
//
// ⚠️ La tabella `document_codice` nasce vuota, e i documenti pubblicati PRIMA che il
// codice esistesse non ne hanno uno: appena il build nuovo va live, `/verifica` non li
// troverebbe. In produzione sono 228.
//
// È il motivo per cui il codice sta in una tabella a parte invece che dentro lo snapshot:
// lo snapshot è immutabile, e un documento già pubblicato non avrebbe mai potuto averne
// uno. Così si recupera. Il PDF già consegnato non cambia — quello porta il colophon di
// quando fu generato — ma chi telefona con un documento in mano lo trova.
//
// Idempotente: `on conflict do nothing`, e chi ha già un codice lo tiene.
console.log("\n2b) CODICI DEI DOCUMENTI GIÀ PUBBLICATI\n");
const r3 = spawnSync(process.execPath, ["scripts/backfill-codici.mjs", "--scrivi"], {
  env: ambiente,
  stdio: "inherit",
});
if (r3.status !== 0) {
  console.error("\n⚠️  L'assegnazione dei codici è fallita. Schema e cataloghi restano");
  console.error("   aggiornati: si può rilanciare questo script, che riprende da qui.\n");
}

// ── 3. riverifica ────────────────────────────────────────────────────────────
//
// ⚠️ La risposta di un comando dice che e' finito, non che il risultato c'e'. Si richiede.
console.log("\n3) RIVERIFICA\n");
const s2 = postgres(DIRECT, { prepare: false, max: 1 });
const dopo = await s2`select hash from drizzle.__drizzle_migrations`;
const [{ n: tabelleDopo }] = await s2`select count(*)::int n from information_schema.tables where table_schema='public'`;
const [{ n: orgDopo }] = await s2`select count(*)::int n from organization`;
const [{ n: abbDopo }] = await s2`select count(*)::int n from stripe_subscription`;
const cataloghi = {};
for (const t of ["content_set", "wb_requirement", "soa_control", "sgesg_scheda_def", "corpus_document"]) {
  const esiste = await s2`select 1 from information_schema.tables where table_name = ${t}`;
  cataloghi[t] = esiste.length ? (await s2.unsafe(`select count(*)::int c from "${t}"`))[0].c : "ASSENTE";
}
// ⚠️ Ogni documento pubblicato deve avere il suo codice: e' la riga che prova il 2b.
const [{ d: docTot }] = await s2`select count(*)::int d from document_snapshot`;
const [{ d: conCodice }] = await s2`select count(*)::int d from document_codice`;
await s2.end();

console.log(`  migrazioni : ${applicate.length} → ${dopo.length} su ${suDisco.length}`);
console.log(`  tabelle    : ${tabelle} → ${tabelleDopo}`);
for (const [t, c] of Object.entries(cataloghi)) console.log(`  ${t.padEnd(18)} ${c}`);

console.log(`  documenti          ${docTot} pubblicati · ${conCodice} col codice` +
  (docTot === conCodice ? "  ✅" : "  ⚠️ scoperti: " + (docTot - conCodice)));

// ⚠️ La prova che NON abbiamo toccato i dati dei clienti: i conteggi devono essere identici.
const intatti = orgDopo === organizzazioni && abbDopo === abbonamenti;
console.log(
  `\n  organizzazioni ${organizzazioni} → ${orgDopo} · abbonamenti ${abbonamenti} → ${abbDopo}  ` +
    (intatti ? "✅ intatti" : "🛑 CAMBIATI: guarda subito"),
);

const finito = dopo.length === suDisco.length;
console.log(
  finito
    ? "\n✅ Schema e cataloghi al pari del ramo. La produzione gira ancora col build vecchio.\n"
    : `\n⚠️  Restano ${suDisco.length - dopo.length} migrazioni: rilancia.\n`,
);
process.exitCode = finito && intatti ? 0 : 1;
