// Rigenera i due PDF d'esempio della vetrina (`public/esempi/`) DALLA PRODUZIONE.
//
//   SO_CHE_E_PRODUZIONE=1 node scripts/esempi-landing.mjs
//
// ⚠️ PERCHÉ IN PRODUZIONE. Ogni documento porta nel colophon un codice di verifica e
// l'indirizzo dove controllarlo. Generato in sviluppo, il PDF direbbe
// `localhost:3000/verifica` con un codice che esiste solo nel database di sviluppo: un
// documento pubblico che non si verifica. Solo in produzione il codice si apre davvero su
// `evalisdeck.it/verifica`.
//
// ⚠️ CHE COSA SCRIVE, e come lo chiude. Registra uno studio, «Evalis S.r.l. · documenti
// d'esempio» (è l'emittente che `/verifica` mostrerà), crea l'azienda fittizia «Corvane
// Meccanica S.r.l.» e pubblica GHG e Bilancio (lo fa `visual-check-documento.mjs`). Poi:
//   - lo studio torna in sola lettura (`expired`): nessuno lavora gratis su quel conto;
//   - si cancellano sessioni e credenziale: la password di collaudo sta nel repository, e un
//     conto di produzione con una password pubblica è un difetto (audit del 14 agosto).
// I documenti e i loro codici restano: sono il punto di tutto.

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import postgres from "postgres";

if (process.env.SO_CHE_E_PRODUZIONE !== "1") {
  console.error("Scrive in PRODUZIONE. Se è davvero quello che vuoi: SO_CHE_E_PRODUZIONE=1 node scripts/esempi-landing.mjs");
  process.exit(1);
}

const URL_PROD = readFileSync(".env.produzione", "utf8").match(/^DIRECT_URL=(.*)$/m)?.[1]?.trim();
if (!URL_PROD || !URL_PROD.includes("hahtljrexrngtfsplbsz")) throw new Error("DIRECT_URL di produzione non trovata in .env.produzione");

const CARTELLA = "./shots-esempi";
mkdirSync(CARTELLA, { recursive: true });

const r = spawnSync(process.execPath, ["scripts/visual-check-documento.mjs"], {
  stdio: ["ignore", "pipe", "inherit"],
  encoding: "utf8",
  env: {
    ...process.env,
    BASE: "https://evalisdeck.it",
    DATABASE_URL: URL_PROD,
    SHOT_DIR: CARTELLA,
    ESEMPI_NOME_STUDIO: "Evalis S.r.l. · documenti d'esempio",
  },
});
process.stdout.write(r.stdout);
const orgId = r.stdout.match(/^ORG=(\S+)/m)?.[1];

const sql = postgres(URL_PROD, { max: 1, prepare: false });
try {
  if (orgId) {
    // La chiusura gira ANCHE se la generazione è fallita a metà: un conto attivo con una
    // password pubblica è peggio di un PDF mancante.
    await sql`update org_entitlement set status = 'expired' where organization_id = ${orgId}`;
    const utenti = await sql`select user_id from member where organization_id = ${orgId}`;
    for (const { user_id } of utenti) {
      await sql`delete from session where user_id = ${user_id}`;
      await sql`delete from account where user_id = ${user_id} and provider_id = 'credential'`;
    }
    const [{ stato }] = await sql`select status as stato from org_entitlement where organization_id = ${orgId}`;
    const [{ n }] = await sql`select count(*)::int n from account a join member m on m.user_id = a.user_id where m.organization_id = ${orgId}`;
    console.log(`\nStudio ${orgId}: abbonamento «${stato}», credenziali rimaste: ${n}`);
    const codici = await sql`select codice, tipo from document_codice where organization_id = ${orgId} order by tipo`;
    for (const c of codici) console.log(`   codice ${c.tipo}: ${c.codice}`);
  } else {
    console.log("\nNessuno studio creato: niente da chiudere.");
  }
} finally {
  await sql.end();
}

if (r.status !== 0) {
  console.error("\nLa generazione non è finita bene: public/esempi NON è stata toccata.");
  process.exit(1);
}
copyFileSync(`${CARTELLA}/rapporto-ghg-2025.pdf`, "public/esempi/esempio-rapporto-ghg-2025.pdf");
copyFileSync(`${CARTELLA}/bilancio-2025.pdf`, "public/esempi/esempio-bilancio-2025.pdf");
console.log("\nPDF copiati in public/esempi/. Verifica: pdftotext public/esempi/*.pdf - | grep -c Adriatica  →  0");
