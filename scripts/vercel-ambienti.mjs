// Che cosa vale, e DOVE, sul progetto Vercel. Sola lettura.
//
// ⚠️ La domanda a cui serve rispondere prima di qualunque anteprima e' una sola: **una
// preview userebbe il database che incassa?** Su Vercel il predefinito quando si crea una
// variabile e' spuntare tutti e tre gli ambienti, e in quel caso la risposta e' si'.
//
// ⚠️ NON CHIEDE `decrypt=true`, ed e' deliberato. Per decidere gli ambiti servono i NOMI e
// gli AMBITI, non i valori: chiederli sarebbe esposizione senza scopo, e per le variabili
// marcate «sensitive» non funzionerebbe comunque — e' esattamente il motivo per cui il
// `CRON_SECRET` dovette essere rigenerato il 10 agosto 2026 invece che riletto.
//
//   node scripts/vercel-ambienti.mjs

import { readFileSync } from "node:fs";

const token = readFileSync(".env.vercel", "utf8").match(/^VERCEL_TOKEN=(.*)$/m)?.[1]?.trim();
if (!token) {
  console.error("Manca VERCEL_TOKEN in .env.vercel");
  process.exit(1);
}
const { projectId, orgId, projectName } = JSON.parse(readFileSync(".vercel/project.json", "utf8"));

const api = async (percorso) => {
  const r = await fetch(`https://api.vercel.com${percorso}${percorso.includes("?") ? "&" : "?"}teamId=${orgId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`${r.status} ${percorso.split("?")[0]} — ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

console.log(`\nProgetto: ${projectName}\n`);

// ── gli ambiti di ogni variabile ─────────────────────────────────────────────
const { envs } = await api(`/v9/projects/${projectId}/env`);

const AMBIENTI = ["production", "preview", "development"];
const spunta = (v, a) => (v.target?.includes(a) ? "X" : "·");

// Le variabili che decidono CONTRO COSA gira una preview. Le altre sono rumore, qui.
const CRITICHE = new Set([
  "DATABASE_URL",
  "DIRECT_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "BETTER_AUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
]);

const riga = (v) =>
  `  ${v.key.padEnd(32)} ${spunta(v, "production")}   ${spunta(v, "preview")}   ${spunta(v, "development")}   ${(v.type ?? "").padEnd(10)}${v.gitBranch ? " ramo:" + v.gitBranch : ""}`;

console.log("  " + "VARIABILE".padEnd(32) + "PROD PREV DEV   TIPO");
console.log("  " + "─".repeat(66));
const critiche = envs.filter((v) => CRITICHE.has(v.key)).sort((a, b) => a.key.localeCompare(b.key));
for (const v of critiche) console.log(riga(v));

const altre = envs.filter((v) => !CRITICHE.has(v.key)).sort((a, b) => a.key.localeCompare(b.key));
if (altre.length) {
  console.log("\n  — le altre —");
  for (const v of altre) console.log(riga(v));
}

// ── il verdetto, che e' il motivo per cui questo script esiste ───────────────
console.log("\n" + "─".repeat(70));
const condivise = critiche.filter(
  (v) => v.target?.includes("preview") && v.target?.includes("production"),
);
const soloProd = critiche.filter((v) => v.target?.includes("production") && !v.target?.includes("preview"));
const mancanti = [...CRITICHE].filter((k) => !envs.some((v) => v.key === k));

if (condivise.length) {
  console.log(`\n⚠️  ${condivise.length} variabili critiche valgono in PRODUZIONE **E** IN ANTEPRIMA:`);
  for (const v of condivise) console.log(`     ${v.key}`);
  console.log("\n   Una preview userebbe quei valori, cioe' il database e le chiavi della");
  console.log("   produzione. Per dare all'anteprima valori propri va prima tolto `preview`");
  console.log("   dagli ambiti di queste voci: Vercel non ammette due voci con la stessa");
  console.log("   chiave e ambiti sovrapposti.");
} else {
  console.log("\n   Nessuna variabile critica e' condivisa fra produzione e anteprima.");
}

if (soloProd.length) {
  console.log(`\n   ${soloProd.length} valgono solo in produzione: per l'anteprima si AGGIUNGE una`);
  console.log("   voce nuova, senza toccare niente di esistente.");
  for (const v of soloProd) console.log(`     ${v.key}`);
}
if (mancanti.length) {
  console.log(`\n   ${mancanti.length} non esistono affatto: ${mancanti.join(", ")}`);
}

// ── la protezione delle anteprime ────────────────────────────────────────────
const p = await api(`/v9/projects/${projectId}`);
console.log("\n" + "─".repeat(70));
console.log("\nProtezione dei deployment:");
console.log(`   Vercel Authentication : ${p.ssoProtection ? JSON.stringify(p.ssoProtection) : "spenta"}`);
console.log(`   Password Protection   : ${p.passwordProtection ? JSON.stringify(p.passwordProtection) : "spenta"}`);
const bypass = p.protectionBypass ? Object.keys(p.protectionBypass).length : 0;
console.log(`   Bypass per automazione: ${bypass ? `${bypass} gia' presente/i` : "nessuno"}`);
if (p.ssoProtection) {
  console.log("\n   ⚠️ Con la protezione accesa un collaudo riceve una pagina di accesso al");
  console.log("      posto del prodotto, e riferisce difetti che non esistono. Serve il bypass.");
}

console.log(`\nRegione: ${(p.serverlessFunctionRegion ?? "predefinita")} · ramo di produzione: ${p.link?.productionBranch ?? "?"}\n`);
