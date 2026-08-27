// Il marchio dello studio agli abbonati che c'erano gia'.
//
// ⚠️ PERCHE' SERVE. Dal 27 agosto 2026 il white-label non e' piu' un'estensione da
// 600 €/anno: e' compreso in ogni fascia. Il codice lo applica in
// `ricostruisciCapacita` — `if (piano) whiteLabel = true` — ma quella funzione gira solo
// quando Stripe manda un evento sull'abbonamento. Per chi ha gia' pagato, il prossimo
// evento e' il RINNOVO: fino ad allora `org_entitlement.white_label` resterebbe falso, e
// il cliente vedrebbe il nostro marchio su un documento che dovrebbe portare il suo.
//
// Un cambiamento che vale «da adesso» per i nuovi e «fra dodici mesi» per i vecchi non e'
// un cambiamento: e' un difetto con una data di scadenza.
//
// ⚠️ NON tocca i documenti gia' pubblicati, e non deve. Il marchio si sceglie una volta
// sola alla pubblicazione e si congela nello snapshot: quelli portano il marchio di
// quando furono generati, ed e' il congelamento che funziona.
//
// Idempotente: tocca solo le righe che hanno un piano e non hanno ancora il marchio.
//
//   node scripts/recupero-marchio.mjs             dice cosa farebbe
//   node scripts/recupero-marchio.mjs --scrivi    lo fa
//
// Sul database di PRODUZIONE si passa esplicitamente:
//   node scripts/recupero-marchio.mjs --scrivi --produzione

import { readFileSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";

const SCRIVI = process.argv.includes("--scrivi");
const PRODUZIONE = process.argv.includes("--produzione");

// ⚠️ Il bersaglio si DICHIARA, e si stampa in entrambi i casi. Un referto che non dice
// contro quale database ha parlato puo' essere verde sul database sbagliato — ed e' gia'
// successo, con nove collaudi che dicevano «anteprima» e parlavano con localhost.
let url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (PRODUZIONE) {
  const prod = readFileSync(".env.produzione", "utf8");
  url = prod.match(/^DIRECT_URL=(.*)$/m)?.[1]?.trim();
  if (!url) {
    console.error("In .env.produzione manca DIRECT_URL.");
    process.exit(1);
  }
}
if (!url) {
  console.error("Nessuna connessione: manca DIRECT_URL o DATABASE_URL.");
  process.exit(1);
}

const riferimento = url.match(/postgres\.([a-z0-9]+):/)?.[1] ?? "sconosciuto";
console.log(`\nBersaglio: progetto ${riferimento}${PRODUZIONE ? "  ← PRODUZIONE, dichiarata" : ""}`);
console.log(SCRIVI ? "MODO: scrivo\n" : "MODO: solo elenco, non tocco niente\n");

const sql = postgres(url, { prepare: false, max: 1 });

const daFare = await sql`
  select e.organization_id, e.piano, e.status, o.name
  from org_entitlement e
  join organization o on o.id = e.organization_id
  where e.piano is not null and e.white_label = false
  order by o.name`;

const [{ n: conMarchio }] = await sql`select count(*)::int n from org_entitlement where white_label = true`;
const [{ n: conPiano }] = await sql`select count(*)::int n from org_entitlement where piano is not null`;

console.log(`  studi con un piano        : ${conPiano}`);
console.log(`  di cui gia' col marchio   : ${conMarchio}`);
console.log(`  da recuperare             : ${daFare.length}\n`);
for (const r of daFare.slice(0, 20)) {
  console.log(`    ${(r.name ?? "?").padEnd(34).slice(0, 34)} piano ${r.piano} · ${r.status}`);
}
if (daFare.length > 20) console.log(`    … e altri ${daFare.length - 20}`);

if (!SCRIVI) {
  console.log("\n(elenco soltanto — rilancia con --scrivi)\n");
  await sql.end();
  process.exit(0);
}

if (daFare.length === 0) {
  console.log("Niente da fare.\n");
  await sql.end();
  process.exit(0);
}

// ⚠️ Una sola istruzione, con la stessa condizione dell'elenco: chi ha un piano e non ha
// ancora il marchio. Rilanciarlo non tocca nulla, e chi comprasse l'estensione nel
// frattempo non viene toccato due volte.
const tocca = await sql`
  update org_entitlement
     set white_label = true
   where piano is not null and white_label = false
   returning organization_id`;

// La risposta di un comando dice che e' finito, non che il risultato c'e'. Si richiede.
const [{ n: rimasti }] = await sql`
  select count(*)::int n from org_entitlement where piano is not null and white_label = false`;
await sql.end();

console.log(`\n  righe aggiornate : ${tocca.length}`);
console.log(`  ancora scoperte  : ${rimasti}  ${rimasti === 0 ? "✅" : "🛑 guarda subito"}\n`);
process.exitCode = rimasti === 0 ? 0 : 1;
