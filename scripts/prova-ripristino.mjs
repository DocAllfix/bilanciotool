// LA PROVA DEL RIPRISTINO: un backup vale quanto l'ultima volta che è stato rimesso in piedi.
//
//   node scripts/prova-ripristino.mjs
//
// ⚠️ NON SCRIVE IN PRODUZIONE. `pg_dump` legge e basta; il ripristino va in un PostgreSQL
// usa-e-getta dentro un contenitore, che alla fine si butta. **Non si ripristina mai sopra
// la produzione**, nemmeno «per provare»: un ripristino sbagliato sull'originale non ha
// rimedio, ed è il modo in cui una prova di sicurezza diventa il guasto che doveva evitare.
//
// ⚠️ ESISTE PERCHÉ «ABBIAMO I BACKUP» NON È UNA GARANZIA. `PRE-LAUNCH.md` porta questa voce
// da settimane: i backup girano e nessuno li ha mai rimessi in piedi. Un dump che non si
// sa ripristinare è un file che occupa spazio, e lo si scopre nel giorno peggiore.
//
// Che cosa prova, in ordine di importanza:
//  1. il dump si prende, e senza errori;
//  2. si ripristina su un PostgreSQL vergine della stessa versione maggiore;
//  3. la copia ha le STESSE RIGHE della produzione, tabella per tabella;
//  4. si ripristinano anche le DIFESE — policy RLS, trigger, vincoli CHECK. È la parte che
//     un confronto di sole righe non vede: un database con i dati giusti e senza policy è
//     un database in cui, il giorno del ripristino vero, ogni studio vedrebbe tutti gli altri.
//
// ⚠️ I ruoli si creano PRIMA del ripristino. Le policy nominano `app_rls`, e su un
// PostgreSQL vergine quel ruolo non esiste: senza, si ripristinerebbero i dati e non le
// difese, e il conto delle policy direbbe zero mentre il dump le conteneva tutte.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import postgres from "postgres";

const CONTENITORE = "evalis-restore";
const PORTA = 55432;
const COPIA = `postgres://postgres:prova@127.0.0.1:${PORTA}/ripristino`;
const RUOLI = ["app_rls", "anon", "authenticated", "service_role", "supabase_admin", "authenticator"];

const docker = (...args) => execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const zitto = (...args) => { try { return docker(...args); } catch { return ""; } };

const testo = readFileSync(".env.produzione", "utf8");
const PROD = testo.match(/^DIRECT_URL=(.*)$/m)?.[1]?.trim();
if (!PROD) { console.error("DIRECT_URL non trovata in .env.produzione"); process.exit(1); }

console.log("\n── 1. il banco usa-e-getta ──");
zitto("rm", "-f", CONTENITORE);
docker("run", "-d", "--name", CONTENITORE, "-e", "POSTGRES_PASSWORD=prova", "-p", `${PORTA}:5432`, "postgres:17");
for (let i = 0; i < 60; i++) {
  try { docker("exec", CONTENITORE, "pg_isready", "-U", "postgres"); break; } catch { await new Promise((r) => setTimeout(r, 2000)); }
}
console.log(`   ${docker("exec", CONTENITORE, "psql", "-U", "postgres", "-tAc", "select version()").split(",")[0].trim()}`);

console.log("\n── 2. il dump della produzione (sola lettura) ──");
docker("exec", "-e", `PGURL=${PROD}`, CONTENITORE, "sh", "-c",
  'pg_dump "$PGURL" --schema=public --no-owner --no-privileges --format=custom -f /tmp/prod.dump');
const byte = Number(docker("exec", CONTENITORE, "stat", "-c", "%s", "/tmp/prod.dump").trim());
console.log(`   ${byte.toLocaleString("it-IT")} byte`);

console.log("\n── 3. il ripristino ──");
docker("exec", CONTENITORE, "psql", "-U", "postgres", "-c", "create database ripristino");
for (const r of RUOLI) zitto("exec", CONTENITORE, "psql", "-U", "postgres", "-d", "ripristino", "-c", `create role ${r}`);
const errori = docker("exec", CONTENITORE, "sh", "-c",
  "pg_restore -U postgres -d ripristino --no-owner --no-privileges /tmp/prod.dump 2>&1 | grep -c 'error:' || true").trim();
console.log(`   errori: ${errori}   (uno atteso: «schema public already exists», che nel contenitore c'è già)`);

console.log("\n── 4. la copia è identica? ──");
const prod = postgres(PROD, { prepare: false, max: 2, connect_timeout: 30 });
const copia = postgres(COPIA, { prepare: false, max: 2, connect_timeout: 30 });
let male = 0;

const elenco = (db) => db`
  select table_name from information_schema.tables
  where table_schema='public' and table_type='BASE TABLE' order by table_name`;
const tProd = (await elenco(prod)).map((r) => r.table_name);
const tCopia = (await elenco(copia)).map((r) => r.table_name);
const mancanti = tProd.filter((t) => !tCopia.includes(t));
console.log(`   tabelle       produzione ${tProd.length}  copia ${tCopia.length}  ${mancanti.length ? "✗ mancano: " + mancanti.join(", ") : "ok"}`);
male += mancanti.length;

let righe = 0, diverse = 0;
for (const t of tProd) {
  if (!tCopia.includes(t)) continue;
  const [{ n: a }] = await prod`select count(*)::int n from ${prod(t)}`;
  const [{ n: b }] = await copia`select count(*)::int n from ${copia(t)}`;
  righe += a;
  if (a !== b) { diverse++; console.log(`   ✗ ${t.padEnd(28)} produzione ${a}  copia ${b}`); }
}
console.log(`   righe         ${righe.toLocaleString("it-IT")} confrontate su ${tProd.length} tabelle  ${diverse ? `✗ ${diverse} diverse` : "ok"}`);
male += diverse;

// ⚠️ Le difese, che un confronto di righe non vede.
const difese = [
  ["policy RLS", (db) => db`select count(*)::int n from pg_policies where schemaname='public'`],
  ["tabelle con RLS", (db) => db`select count(*)::int n from pg_class where relnamespace='public'::regnamespace and relrowsecurity`],
  ["trigger", (db) => db`select count(*)::int n from information_schema.triggers where trigger_schema='public'`],
  ["vincoli CHECK", (db) => db`select count(*)::int n from pg_constraint c join pg_class r on r.oid=c.conrelid where r.relnamespace='public'::regnamespace and c.contype='c'`],
];
for (const [nome, q] of difese) {
  const [{ n: a }] = await q(prod);
  const [{ n: b }] = await q(copia);
  if (a !== b) male++;
  console.log(`   ${nome.padEnd(13)} produzione ${String(a).padStart(4)}  copia ${String(b).padStart(4)}  ${a === b ? "ok" : "✗"}`);
}

await prod.end();
await copia.end();
console.log(
  male === 0
    ? "\n✅ Il backup si ripristina, e la copia è identica alla produzione — dati E difese.\n"
    : `\n${male} differenze: il ripristino NON è fedele.\n`,
);
if (!process.argv.includes("--tieni")) {
  zitto("rm", "-f", CONTENITORE);
  console.log("   (contenitore rimosso; `--tieni` per lasciarlo in piedi e guardarci dentro)\n");
}
process.exit(male ? 1 : 0);
