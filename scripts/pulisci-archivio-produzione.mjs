// Toglie dall'archivio di PRODUZIONE i file lasciati dai collaudi locali.
//
// ⚠️ PERCHE' ESISTE. Fino al 26 agosto 2026 il `.env` locale puntava al database di
// sviluppo ma all'archivio della PRODUZIONE: la Fase 0 del 22 agosto aveva separato i
// database e lasciato indietro i file. Ogni PDF generato da un collaudo in locale e' finito
// nel secchio che serve i clienti — 105 oggetti, misurati firmandone le chiavi.
//
// ⚠️ COSA CANCELLA, E PERCHE' E' SICURO. Solo le chiavi che il database di SVILUPPO
// conosce. Quelle chiavi cominciano con l'identificativo di un'organizzazione creata in
// sviluppo, che la produzione non ha mai visto: sono UUID generati qui. Prima di togliere
// qualunque cosa lo script lo DIMOSTRA, interrogando la produzione in sola lettura:
//
//   · nessuna di quelle organizzazioni esiste in `organization`;
//   · nessuno snapshot di produzione le riferisce.
//
// Se anche una sola risulta collegata, si ferma senza cancellare niente. La prova non e'
// un ragionamento scritto in un commento: e' una query, e gira ogni volta.
//
//   node scripts/pulisci-archivio-produzione.mjs            → elenca soltanto
//   node scripts/pulisci-archivio-produzione.mjs --cancella → toglie davvero
//
// Le credenziali della produzione si leggono da `.env.produzione`, che è fuori da git.

import postgres from "postgres";
import "dotenv/config";
import { readFileSync } from "node:fs";

const CANCELLA = process.argv.includes("--cancella");

// ── credenziali ──────────────────────────────────────────────────────────────
let prod;
try {
  prod = readFileSync(".env.produzione", "utf8");
} catch {
  console.error("Manca .env.produzione: senza, non so a quale archivio parlare.");
  process.exit(1);
}
const P_URL = prod.match(/^SUPABASE_URL=(.*)$/m)?.[1]?.trim();
const P_KEY = prod.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m)?.[1]?.trim();
const P_DB = (prod.match(/^DATABASE_URL=(postgresql:\/\/postgres\..*)$/m) ??
  prod.match(/^DIRECT_URL=(.*)$/m))?.[1]?.trim();
if (!P_URL || !P_KEY || !P_DB) {
  console.error("In .env.produzione mancano SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o DATABASE_URL.");
  process.exit(1);
}

// ⚠️ Se l'ambiente locale punta ancora alla produzione, questo script cancellerebbe i
// file che il prodotto sta usando adesso. Si ferma.
if (P_URL === process.env.SUPABASE_URL) {
  console.error(
    "L'archivio locale E' quello di produzione: separa prima gli ambienti.\n" +
      "Vedi PRE-LAUNCH.md, voce 0-storage.",
  );
  process.exit(1);
}

const breve = (u) => u.replace(/https:\/\/([a-z]{8}).*/, "$1…");
console.log(`\nProduzione: ${breve(P_URL)}   ·   Sviluppo: ${breve(process.env.SUPABASE_URL)}\n`);

// ── le chiavi che lo SVILUPPO conosce ────────────────────────────────────────
const dev = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const chiavi = new Set();
for (const r of await dev`select pdf_storage_key k from document_snapshot where pdf_storage_key is not null`)
  chiavi.add(r.k);
for (const r of await dev`select storage_key k from media_asset where storage_key is not null`) chiavi.add(r.k);
for (const r of await dev`select logo_storage_key k from company where logo_storage_key is not null`) chiavi.add(r.k);
for (const r of await dev`select cover_storage_key k from company where cover_storage_key is not null`)
  chiavi.add(r.k);
await dev.end();

const orgIds = [...new Set([...chiavi].map((k) => k.split("/")[0]))];
console.log(`chiavi note allo sviluppo: ${chiavi.size}   ·   organizzazioni: ${orgIds.length}`);

// ── la prova: nessun legame con la produzione ────────────────────────────────
const p = postgres(P_DB, { prepare: false, max: 1 });
const collegate = await p`select id from organization where id = any(${orgIds})`;
const [{ n }] = await p`select count(*)::int n from document_snapshot where organization_id = any(${orgIds})`;
await p.end();

if (collegate.length || n) {
  console.error(
    `\n🛑 FERMO. ${collegate.length} organizzazioni esistono in produzione e ${n} snapshot le riferiscono.\n` +
      "   Queste chiavi NON sono orfane: cancellarle toglierebbe documenti veri a clienti veri.",
  );
  process.exit(1);
}
console.log("prova: 0 organizzazioni in produzione, 0 snapshot che le riferiscono → orfane\n");

// ── cosa c'e' davvero da togliere ────────────────────────────────────────────
const h = { Authorization: `Bearer ${P_KEY}`, apikey: P_KEY, "Content-Type": "application/json" };
const presenti = [];
for (const k of chiavi) {
  const r = await fetch(`${P_URL}/storage/v1/object/sign/media/${k}`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ expiresIn: 30 }),
  });
  if (r.ok) presenti.push(k);
}

if (!presenti.length) {
  console.log("Niente da togliere: l'archivio di produzione non contiene nessuna di quelle chiavi.");
  process.exit(0);
}

console.log(`presenti nell'archivio di produzione: ${presenti.length}`);
for (const k of presenti.slice(0, 5)) console.log("  " + k);
if (presenti.length > 5) console.log(`  … e altre ${presenti.length - 5}`);

if (!CANCELLA) {
  console.log("\n(elenco soltanto — rilancia con --cancella per toglierle davvero)");
  process.exit(0);
}

// ── rimozione ────────────────────────────────────────────────────────────────
let tolte = 0;
const falliti = [];
for (const k of presenti) {
  const d = await fetch(`${P_URL}/storage/v1/object/media/${k}`, { method: "DELETE", headers: h });
  if (d.ok) tolte++;
  else falliti.push(`${d.status} ${k}`);
}

// ⚠️ Si RIVERIFICA: la risposta di una DELETE dice che il server l'ha accettata, non che
// l'oggetto non c'e' piu'. La prova e' che la firma adesso fallisca.
let rimasti = 0;
for (const k of presenti) {
  const r = await fetch(`${P_URL}/storage/v1/object/sign/media/${k}`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ expiresIn: 30 }),
  });
  if (r.ok) rimasti++;
}

console.log(`\ntolte: ${tolte}   ·   ancora presenti dopo la verifica: ${rimasti}`);
if (falliti.length) {
  console.log("non riuscite:");
  for (const f of falliti) console.log("  " + f);
}
process.exitCode = rimasti || falliti.length ? 1 : 0;
