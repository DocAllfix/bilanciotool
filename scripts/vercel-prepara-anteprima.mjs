// Prepara un ramo di ANTEPRIMA perche' giri sui dati di sviluppo, non su quelli veri.
//
// ⚠️ PERCHE' SERVE. Misurato con `vercel-ambienti.mjs`: cinque variabili critiche —
// `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
// `BETTER_AUTH_SECRET` — valgono in produzione **e** in anteprima insieme. E' il
// predefinito di Vercel quando si crea una variabile, ed e' rimasto sulle prime che
// furono create. Spingere un ramo oggi significherebbe collaudare contro il database che
// incassa, e rimettere PDF di prova nell'archivio appena ripulito.
//
// ⚠️ COME LO RISOLVE, E PERCHE' NON TOCCA NIENTE DI ESISTENTE. Vercel permette variabili
// d'anteprima legate a un SINGOLO RAMO, e quelle hanno la precedenza sul valore
// d'anteprima generale. Quindi non si toglie `preview` dalle voci condivise — operazione
// che modificherebbe un record usato dalla produzione — si AGGIUNGE una voce per il ramo.
// Ogni altra anteprima resta esattamente com'era, e per annullare basta cancellare le
// voci nuove.
//
// ⚠️ IL CONTROLLO CHE VALE PIU' DELLA DISCIPLINA. Ogni scrittura deve avere
// `target` esattamente `["preview"]` e un `gitBranch`: se non ce l'ha, lo script si ferma
// prima di mandarla. Non e' una promessa nel commento, e' una riga di codice.
//
//   node scripts/vercel-prepara-anteprima.mjs            → dice cosa farebbe, non fa niente
//   node scripts/vercel-prepara-anteprima.mjs --applica  → esegue
//
//   --ramo <nome>   il ramo da preparare (predefinito: anteprima/collaudo-completo)

import { readFileSync } from "node:fs";

const APPLICA = process.argv.includes("--applica");
const iRamo = process.argv.indexOf("--ramo");
const RAMO = iRamo >= 0 ? process.argv[iRamo + 1] : "anteprima/collaudo-completo";

// ── credenziali e identificativi ─────────────────────────────────────────────
const token = readFileSync(".env.vercel", "utf8").match(/^VERCEL_TOKEN=(.*)$/m)?.[1]?.trim();
if (!token) {
  console.error("Manca VERCEL_TOKEN in .env.vercel");
  process.exit(1);
}
const { projectId, orgId, projectName } = JSON.parse(readFileSync(".vercel/project.json", "utf8"));

const locale = readFileSync(".env", "utf8");
const dal = (chiave) => locale.match(new RegExp(`^${chiave}=(.*)$`, "m"))?.[1]?.trim();

const api = async (metodo, percorso, corpo) => {
  const sep = percorso.includes("?") ? "&" : "?";
  const r = await fetch(`https://api.vercel.com${percorso}${sep}teamId=${orgId}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(corpo ? { "Content-Type": "application/json" } : {}),
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  const testo = await r.text();
  return { ok: r.ok, stato: r.status, dati: testo ? JSON.parse(testo) : null, testo };
};

// ── che cosa deve valere sul ramo ────────────────────────────────────────────
//
// I valori di SVILUPPO, presi dal `.env` locale. `BETTER_AUTH_SECRET` non e' nell'elenco
// di proposito: in anteprima va benissimo quello che c'e' gia', serve solo a firmare
// sessioni e non da' accesso a niente di reale.
const DA_SCRIVERE = [
  ["DATABASE_URL", dal("DATABASE_URL")],
  ["DIRECT_URL", dal("DIRECT_URL")],
  ["SUPABASE_URL", dal("SUPABASE_URL")],
  ["SUPABASE_SERVICE_ROLE_KEY", dal("SUPABASE_SERVICE_ROLE_KEY")],
  ["STRIPE_SECRET_KEY", dal("STRIPE_SECRET_KEY")],
  ["STRIPE_WEBHOOK_SECRET", dal("STRIPE_WEBHOOK_SECRET")],
  // ⚠️ Il generatore PDF apre il PROPRIO indirizzo con Chromium, e su un'anteprima quel
  // indirizzo e' protetto: senza questo segreto Chromium stampa la pagina di accesso di
  // Vercel. Un PDF vero, di una pagina, identico per ogni documento — e indistinguibile
  // da uno buono per chi guarda solo i byte magici e la dimensione.
  ["VERCEL_AUTOMATION_BYPASS_SECRET", bypassDaFile()],
];

function bypassDaFile() {
  try {
    return readFileSync(".env.vercel", "utf8").match(/^VERCEL_AUTOMATION_BYPASS_SECRET=(.*)$/m)?.[1]?.trim();
  } catch {
    return undefined;
  }
}

const mancanti = DA_SCRIVERE.filter(([, v]) => !v).map(([k]) => k);
if (mancanti.length) {
  console.error(`Nel .env locale mancano: ${mancanti.join(", ")}`);
  process.exit(1);
}

// ⚠️ Le due prove che rendono innocuo tutto il resto: i valori che sto per mandare devono
// essere quelli di SVILUPPO e di PROVA. Se qualcuno un giorno rimettesse il `.env` locale
// sulla produzione, questo script diventerebbe il modo piu' rapido di copiare le
// credenziali vere dentro un'anteprima.
const rifPreview = process.env.SUPABASE_URL?.match(/https:\/\/([a-z]+)\./)?.[1];
for (const [chiave, valore] of DA_SCRIVERE) {
  if (/^(DATABASE_URL|DIRECT_URL|SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)$/.test(chiave)) {
    if (rifPreview && !valore.includes(rifPreview)) {
      console.error(`🛑 ${chiave} non punta al progetto di sviluppo (${rifPreview}). Mi fermo.`);
      process.exit(1);
    }
  }
  if (chiave === "STRIPE_SECRET_KEY" && !valore.startsWith("sk_test_")) {
    console.error("🛑 STRIPE_SECRET_KEY locale NON e' una chiave di prova. Mi fermo.");
    process.exit(1);
  }
}

const breve = (v) => (v.length > 22 ? `${v.slice(0, 14)}…${v.slice(-4)}` : v);
console.log(`\nProgetto: ${projectName}   ·   ramo: ${RAMO}`);
console.log(APPLICA ? "MODO: esecuzione\n" : "MODO: solo elenco, non mando niente\n");

// ── 1. il bypass per l'automazione ───────────────────────────────────────────
const progetto = (await api("GET", `/v9/projects/${projectId}`)).dati;
const protetto = Boolean(progetto.ssoProtection);
const bypassEsistenti = progetto.protectionBypass ? Object.keys(progetto.protectionBypass) : [];

console.log("1) BYPASS PER L'AUTOMAZIONE");
if (!protetto) {
  console.log("   le anteprime non sono protette: non serve.\n");
} else if (bypassEsistenti.length) {
  console.log(`   ne esiste gia' uno (${bypassEsistenti.length}). Non ne creo un altro.\n`);
} else if (!APPLICA) {
  console.log("   PATCH /v1/projects/…/protection-bypass  { generate: {} }");
  console.log("   → additivo: non cambia come la produzione serve le pagine.\n");
} else {
  const r = await api("PATCH", `/v1/projects/${projectId}/protection-bypass`, { generate: {} });
  if (!r.ok) {
    console.log(`   ✗ ${r.stato} ${r.testo.slice(0, 240)}\n`);
  } else {
    const chiavi = Object.keys(r.dati?.protectionBypass ?? {});
    console.log(`   creato: ${chiavi.map(breve).join(", ") || "(nessuna chiave restituita)"}\n`);
  }
}

// ── 2. le variabili legate al ramo ───────────────────────────────────────────
console.log("2) VARIABILI D'ANTEPRIMA LEGATE AL RAMO");

const { envs } = (await api("GET", `/v9/projects/${projectId}/env`)).dati;
const giaSulRamo = new Set(envs.filter((v) => v.gitBranch === RAMO).map((v) => v.key));

let scritte = 0;
const problemi = [];

for (const [chiave, valore] of DA_SCRIVERE) {
  if (giaSulRamo.has(chiave)) {
    console.log(`   – ${chiave}: c'e' gia' su questo ramo, salto`);
    continue;
  }

  const corpo = {
    key: chiave,
    value: valore,
    type: "sensitive",
    target: ["preview"],
    gitBranch: RAMO,
  };

  // ⚠️ IL CONTROLLO. Prima di mandare, non dopo.
  const soloAnteprima = corpo.target.length === 1 && corpo.target[0] === "preview";
  if (!soloAnteprima || !corpo.gitBranch) {
    console.error(`🛑 ${chiave}: ambito non consentito (${JSON.stringify(corpo.target)}). Mi fermo.`);
    process.exit(1);
  }

  if (!APPLICA) {
    console.log(`   + ${chiave.padEnd(26)} = ${breve(valore)}   [preview @ ${RAMO}]`);
    continue;
  }

  const r = await api("POST", `/v10/projects/${projectId}/env`, corpo);
  if (!r.ok) {
    problemi.push(`${chiave}: ${r.stato} ${r.testo.slice(0, 180)}`);
    console.log(`   ✗ ${chiave}: ${r.stato}`);
    continue;
  }
  scritte++;
  console.log(`   ✓ ${chiave}`);
}

if (!APPLICA) {
  console.log("\n(elenco soltanto — rilancia con --applica per eseguire)\n");
  process.exit(0);
}

// ── 3. la riverifica ─────────────────────────────────────────────────────────
//
// ⚠️ Una risposta 200 dice che il server ha accettato, non che la variabile c'e'. E la
// riverifica guarda anche le CINQUE CONDIVISE: la promessa di questo script e' di non
// averle toccate, e una promessa si dimostra.
console.log("\n3) RIVERIFICA");
const dopo = (await api("GET", `/v9/projects/${projectId}/env`)).dati.envs;

const sulRamo = dopo.filter((v) => v.gitBranch === RAMO);
console.log(`   variabili legate a «${RAMO}»: ${sulRamo.length}`);
for (const v of sulRamo) console.log(`     ${v.key.padEnd(26)} target=${JSON.stringify(v.target)}`);

const CONDIVISE = ["DATABASE_URL", "DIRECT_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "BETTER_AUTH_SECRET"];
let intatte = 0;
for (const k of CONDIVISE) {
  const v = dopo.find((x) => x.key === k && !x.gitBranch && x.target?.includes("production"));
  if (v) intatte++;
  else problemi.push(`⚠️ ${k}: la voce di produzione NON risulta piu' intatta`);
}
console.log(`   voci di produzione intatte: ${intatte}/${CONDIVISE.length}`);

console.log(`\nscritte: ${scritte}`);
if (problemi.length) {
  console.log("problemi:");
  for (const p of problemi) console.log("  " + p);
}
process.exitCode = problemi.length ? 1 : 0;
