// SOLA LETTURA: che cosa ha la produzione, che cosa le manca, e che cosa si romperebbe
// applicando le migrazioni che non ha ancora.
//
//   node scripts/stato-produzione.mjs
//
// ⚠️ NON SCRIVE NIENTE. Nessun INSERT, nessun UPDATE, nessun DDL: solo SELECT e letture
// del catalogo. E' l'unico script di questo repository che punta alla produzione senza
// chiedere una dichiarazione, e puo' permetterselo proprio perche' non scrive.
//
// ⚠️ ESISTE PER IL PASSO CHE `docs/metodo-rilascio.md` CHIAMA «il blocco duro»: lo schema
// della produzione puo' essere indietro di settimane, e fondere senza applicare le
// migrazioni manda in produzione codice che cerca tabelle inesistenti. Quel passo era
// descritto e non aveva uno strumento: si contava a mano, o non si contava.
//
// ⚠️ E LA DOMANDA CHE NESSUNO FA: un CHECK riaggiunto RIVALIDA OGNI RIGA ESISTENTE. Le
// migrazioni che allargano un dominio chiuso — e in questo progetto sono la maggioranza,
// perche' Drizzle non genera i CHECK per `text(enum)` — riscrivono il vincolo per intero.
// Se anche una sola riga di produzione cadesse fuori dal nuovo elenco, la migrazione
// fallirebbe a meta' del rilascio. Qui lo si chiede PRIMA, sui dati veri.
//
// I domini si leggono DALLE MIGRAZIONI, non si ricopiano qui: due elenchi della stessa
// cosa divergono, e il giorno in cui divergono questo controllo direbbe verde su un
// vincolo che il database rifiutera'.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const MIGRAZIONI = join(process.cwd(), "src", "lib", "db", "migrations");

function ambienteProduzione() {
  const testo = readFileSync(".env.produzione", "utf8");
  const leggi = (chiave) => testo.match(new RegExp(`^${chiave}=(.*)$`, "m"))?.[1]?.trim();
  const url = leggi("DIRECT_URL");
  if (!url) throw new Error("DIRECT_URL non trovata in .env.produzione");
  return url;
}

/**
 * I valori ammessi da un CHECK, estratti dal file di migrazione che lo crea.
 *
 * ⚠️ Si legge il SORGENTE della migrazione, e se non si trova ci si ferma invece di
 * saltare il controllo: un controllo che si disattiva da solo quando non capisce e' il
 * modo piu' sicuro di essere verdi per niente.
 */
function valoriDelVincolo(nomeVincolo) {
  for (const file of readdirSync(MIGRAZIONI).filter((f) => f.endsWith(".sql")).sort().reverse()) {
    const sql = readFileSync(join(MIGRAZIONI, file), "utf8");
    const i = sql.indexOf(`ADD CONSTRAINT "${nomeVincolo}"`);
    if (i < 0) continue;
    const coda = sql.slice(i, sql.indexOf(";", i));
    const valori = [...coda.matchAll(/'([a-z0-9_]+)'/gi)].map((m) => m[1]);
    if (valori.length) return { file, valori: [...new Set(valori)] };
  }
  return null;
}

const url = ambienteProduzione();
const sql = postgres(url, { prepare: false, max: 2, connect_timeout: 30 });

try {
  const [{ chi }] = await sql`select current_user as chi`;
  console.log(`\nProduzione — connesso come ${chi}`);
  console.log(`   ${url.replace(/:[^:@]*@/, ":***@").split("@")[1]?.slice(0, 60)}`);

  // ── quanto e' indietro ──────────────────────────────────────────────────────
  const applicate = await sql`select count(*)::int n from drizzle.__drizzle_migrations`;
  const nelRepo = readdirSync(MIGRAZIONI).filter((f) => f.endsWith(".sql")).length;
  const mancanti = nelRepo - applicate[0].n;
  console.log(`\nMigrazioni: ${applicate[0].n} applicate · ${nelRepo} nel repository · ${mancanti} da applicare`);
  if (mancanti > 0) {
    const elenco = readdirSync(MIGRAZIONI).filter((f) => f.endsWith(".sql")).sort().slice(-mancanti);
    for (const f of elenco) console.log(`   – ${f}`);
  }

  // ── che cosa c'e' dentro ────────────────────────────────────────────────────
  const [{ n: tabelle }] = await sql`
    select count(*)::int n from information_schema.tables where table_schema = 'public'`;
  const [{ n: senzaRls }] = await sql`
    select count(*)::int n from pg_tables t
    join pg_class c on c.relname = t.tablename and c.relnamespace = 'public'::regnamespace
    where t.schemaname = 'public' and not c.relrowsecurity`;
  console.log(`\nTabelle pubbliche: ${tabelle} · senza RLS: ${senzaRls}`);

  // ── il carico vero, che e' la ragione di tutta la prudenza ──────────────────
  const [{ n: abbonamenti }] = await sql`select count(*)::int n from stripe_subscription`;
  const [{ n: organizzazioni }] = await sql`select count(*)::int n from organization`;
  const [{ n: attivi }] = await sql`select count(*)::int n from org_entitlement where status = 'active'`;
  const [{ n: documenti }] = await sql`select count(*)::int n from document_snapshot`;
  console.log(
    `Dati vivi: ${abbonamenti} abbonamenti Stripe · ${organizzazioni} organizzazioni · ` +
      `${attivi} entitlement attivi · ${documenti} documenti pubblicati`,
  );

  // ── i CHECK che verrebbero rivalidati ───────────────────────────────────────
  //
  // Ogni voce e' (vincolo, tabella, colonna). Il dominio arriva dalla migrazione.
  const daControllare = [
    ["document_snapshot_tipo_ck", "document_snapshot", "tipo"],
    ["content_set_dominio_ck", "content_set", "dominio"],
    ["corpus_block_tipo_ck", "corpus_block", "tipo"],
    ["corpus_register_column_tipo_ck", "corpus_register_column", "tipo"],
  ];

  console.log("\nVincoli che verranno RIVALIDATI sulle righe esistenti:");
  let rischi = 0;
  for (const [vincolo, tabella, colonna] of daControllare) {
    const letto = valoriDelVincolo(vincolo);
    if (!letto) {
      console.log(`   ⚠️ ${vincolo}: non trovato in nessuna migrazione — controllo NON eseguito`);
      rischi++;
      continue;
    }
    const fuori = await sql`
      select ${sql(colonna)} as valore, count(*)::int n
      from ${sql(tabella)}
      where ${sql(colonna)} <> all(${sql.array(letto.valori)})
      group by 1 order by 2 desc`;
    const [{ n: totale }] = await sql`select count(*)::int n from ${sql(tabella)}`;
    if (fuori.length === 0) {
      console.log(`   ok  ${vincolo.padEnd(32)} ${totale} righe, nessuna fuori dominio   [${letto.file}]`);
    } else {
      rischi++;
      console.log(`   ✗   ${vincolo}: ${fuori.length} valori fuori dal nuovo dominio — LA MIGRAZIONE FALLIREBBE`);
      for (const r of fuori) console.log(`         ${r.valore}: ${r.n} righe`);
    }
  }

  console.log(
    rischi === 0
      ? "\nNessun vincolo rifiuterebbe una riga esistente.\n"
      : `\n${rischi} vincoli da guardare PRIMA di migrare.\n`,
  );
  process.exitCode = rischi === 0 ? 0 : 1;
} finally {
  // ⚠️ Si chiude, sempre: un pool aperto tiene vivo il giro degli eventi e il processo non
  // esce piu'. Costato quarantadue minuti su `visual-check-shell` l'8 settembre 2026.
  await sql.end();
}
