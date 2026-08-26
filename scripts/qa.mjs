// Lanciatore dei collaudi. `npm run qa` senza argomenti li elenca.
//
//   npm run qa                 → elenco
//   npm run qa -- marchio      → scripts/visual-check-marchio.mjs
//   npm run qa -- blog         → scripts/verifica-blog.mjs
//   npm run qa -- landing --prod  → contro https://evalisdeck.it
//
// Sono ventotto file e crescono a ogni fase: elencarli a mano in package.json
// significherebbe dimenticarne uno al primo giro di distrazione. Qui la cartella
// è la fonte, e un collaudo nuovo si presenta da solo.

import { readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const QUI = dirname(fileURLToPath(import.meta.url));
const PROD = "https://evalisdeck.it";

// SOLO i collaudi, riconosciuti dal prefisso. Nella stessa cartella vivono utensili
// che scrivono davvero — `seed.mjs` semina il database, `prepara-brand.mjs` rigenera
// i derivati dei loghi — e un elenco che li mescola ai controlli invita a lanciarli
// per sbaglio. Chi ne ha bisogno li chiama per nome.
const COLLAUDO = /^(visual-check|verifica-|verify-prod|qa-prod|audit-)/;
const file = readdirSync(QUI).filter((f) => f.endsWith(".mjs") && f !== "qa.mjs" && COLLAUDO.test(f));
const nomi = new Map();
for (const f of file) {
  const base = f.replace(/\.mjs$/, "");
  // Il nome corto è quello che resta togliendo il prefisso: `visual-check-marchio`
  // → `marchio`. `visual-check.mjs` (la shell, il primo di tutti) resta `shell`.
  const corto =
    base === "visual-check" ? "design" : base.replace(/^(visual-check|verifica)-/, "");
  if (!nomi.has(corto)) nomi.set(corto, f);
}

const argomenti = process.argv.slice(2);
const nome = argomenti.find((a) => !a.startsWith("-"));
const prod = argomenti.includes("--prod");

if (!nome) {
  console.log("Collaudi disponibili:\n");
  for (const [corto, f] of [...nomi].sort()) console.log(`  ${corto.padEnd(24)} ${f}`);
  console.log("\n  npm run qa -- <nome> [--prod | --su https://…]");
  process.exit(0);
}

const scelto = nomi.get(nome);
if (!scelto) {
  console.error(`Nessun collaudo di nome «${nome}». Lancia «npm run qa» per l'elenco.`);
  process.exit(1);
}

// I collaudi leggono BASE dall'ambiente: quelli locali vogliono il server acceso,
// `--prod` li punta al sito vero senza che ciascuno debba saperlo.
const env = { ...process.env };
// ⚠️ `BASE` si IMPOSTA sempre, non solo con `--prod`.
//
// Nove script su trentuno hanno come valore predefinito `https://evalisdeck.it`: lasciando
// la variabile assente, `npm run qa -- tutto-demo` andava a registrarsi IN PRODUZIONE
// mentre il lanciatore stampava «http://localhost:3000». Il messaggio nato per dire il
// vero era diventato la bugia peggiore, perche' credibile.
//
// Il difetto e' costato tre utenti e tre organizzazioni scritti nel database che incassa,
// prima che si vedesse — e si e' visto solo perche' lo script cercava poi quell'utente sul
// database di sviluppo e non lo trovava. Senza quel controllo sarebbe passato.
// ⚠️ TRE BERSAGLI, NON DUE. `--prod` punta al sito vero, niente punta a localhost, e
// `--su <indirizzo>` a qualunque altra cosa — in particolare a un deploy di ANTEPRIMA di
// Vercel, il cui host e' assegnato al volo e non si puo' scrivere qui dentro.
//
// Senza questa terza via una preview si collauda solo a mano, cioe' non si collauda.
const iSu = argomenti.indexOf("--su");
const su = iSu >= 0 ? argomenti[iSu + 1] : null;
if (iSu >= 0 && !su) {
  console.error("  --su vuole un indirizzo: npm run qa -- <nome> --su https://…");
  process.exit(1);
}
if (su && prod) {
  console.error("  --su e --prod insieme non hanno senso: scegline uno.");
  process.exit(1);
}
if (su && !/^https?:\/\//.test(su)) {
  console.error(`  --su vuole un indirizzo intero (con https://), ricevuto: ${su}`);
  process.exit(1);
}
env.BASE = su ? su.replace(/\/+$/, "") : prod ? PROD : env.BASE || "http://localhost:3000";

// ⚠️ Un'anteprima di Vercel puo' essere protetta: senza questo segreto il collaudo
// riceve una pagina di accesso al posto del prodotto e riferisce difetti che non ci
// sono. Se c'e', si passa ai collaudi che sanno usarlo.
if (su) {
  // Il segreto sta in `.env.vercel`, che nessuno carica: `dotenv` legge solo `.env`, e li'
  // un token operativo non deve stare — lo caricherebbero tutti i trenta processi di
  // collaudo. Qui lo si legge dal file solo quando serve, cioe' con `--su`.
  let segreto = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!segreto) {
    try {
      segreto = readFileSync(".env.vercel", "utf8").match(/^VERCEL_AUTOMATION_BYPASS_SECRET=(.*)$/m)?.[1]?.trim();
    } catch {
      /* niente file, niente segreto: se l'anteprima non e' protetta va bene lo stesso */
    }
  }
  if (segreto) env.VERCEL_AUTOMATION_BYPASS_SECRET = segreto;
}

// IL BERSAGLIO SI DICHIARA SEMPRE, non solo con `--prod`.
//
// Prima l'indirizzo compariva solo quando era quello di produzione, quindi un referto
// senza indirizzo poteva voler dire due cose opposte: «sto interrogando il tuo server
// locale» oppure «hai passato una variabile che nessuno legge e sto interrogando il tuo
// server locale lo stesso». È successo: tre collaudi verdi, dati per fatti sul sito
// vero, erano andati tutti contro un `next start` acceso ore prima con un altro codice.
//
// Un collaudo che non dice contro cosa ha parlato può essere verde sul bersaglio
// sbagliato, ed è il modo più economico di credersi coperti senza esserlo.
const bersaglio = env.BASE;
// La nota accanto al bersaglio deve dire il vero anche ora che i bersagli sono TRE.
// Legata a `--prod`, con `--su` scriveva «locale» accanto a un indirizzo remoto: e'
// esattamente il difetto che queste righe esistono per non avere.
const locale = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(bersaglio);
const nota = locale
  ? "  ← locale: il server deve essere acceso E aggiornato"
  : su
    ? "  ← anteprima"
    : "";
console.log(`→ ${scelto}  (${bersaglio})${nota}\n`);
// `--su <indirizzo>` non si passa al collaudo: il bersaglio viaggia in `BASE`.
const perIlCollaudo = argomenti.filter((a, i) => a !== nome && i !== iSu && i !== iSu + 1);
const esito = spawnSync(process.execPath, [join(QUI, scelto), ...perIlCollaudo], {
  stdio: "inherit",
  env,
});
process.exit(esito.status ?? 1);
