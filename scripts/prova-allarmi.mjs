// Prova la catena degli allarmi PRIMA di dipenderne.
//
// ⚠️ «Un sistema di allarme che non si è mai visto scattare non è un sistema di allarme,
// è una speranza» — sta scritto nella rotta `/api/prova-errore`, che esiste per questo.
// Questo script la usa su un'ANTEPRIMA, così la catena si prova senza aspettare che un
// guasto vero arrivi in produzione.
//
// Che cosa dimostra: che un errore lanciato dal server attraversa `instrumentation.ts`, il
// `tunnelRoute` su `/monitoraggio` — che esiste per non farsi bloccare dai filtri
// pubblicitari — e arriva al progetto Sentry. Se arriva, gli allarmi funzionano; se non
// arriva, lo si scopre ora e non il giorno del guasto.
//
// ⚠️ Il DSN non è un segreto: è `NEXT_PUBLIC_`, quindi Next lo inlina nel bundle del
// browser e chiunque apra il sito ce l'ha. Si legge da lì invece di chiederlo.
//
//   node scripts/prova-allarmi.mjs --prepara --su <anteprima>   aggiunge DSN e segreto al ramo
//   node scripts/prova-allarmi.mjs --scatena --su <anteprima>   fa scattare l'errore

import { readFileSync } from "node:fs";

const argomenti = process.argv.slice(2);
const valore = (n) => {
  const i = argomenti.indexOf(n);
  return i >= 0 ? argomenti[i + 1] : null;
};
const SU = valore("--su");
const RAMO = valore("--ramo") ?? "anteprima/collaudo-completo";
const PREPARA = argomenti.includes("--prepara");
const SCATENA = argomenti.includes("--scatena");

if (!SU || (!PREPARA && !SCATENA)) {
  console.error("\n  node scripts/prova-allarmi.mjs --prepara|--scatena --su https://…\n");
  process.exit(1);
}

const token = readFileSync(".env.vercel", "utf8").match(/^VERCEL_TOKEN=(.*)$/m)?.[1]?.trim();
const { projectId, orgId } = JSON.parse(readFileSync(".vercel/project.json", "utf8"));

const api = async (metodo, percorso, corpo) => {
  const sep = percorso.includes("?") ? "&" : "?";
  const r = await fetch(`https://api.vercel.com${percorso}${sep}teamId=${orgId}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(corpo ? { "Content-Type": "application/json" } : {}) },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  return { ok: r.ok, stato: r.status, testo: await r.text() };
};

/** Il DSN, letto dal bundle pubblico del sito vero. */
async function dsnDalSito() {
  const home = await (await fetch("https://evalisdeck.it/")).text();
  const script = [...home.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1]);
  for (const s of script.slice(0, 30)) {
    const t = await (await fetch("https://evalisdeck.it" + s)).text();
    const m = t.match(/https:\/\/[0-9a-f]+@[a-z0-9.]*sentry\.io\/\d+/);
    if (m) return m[0];
  }
  return null;
}

const SEGRETO_PROVA = "prova-allarmi-" + Math.random().toString(36).slice(2, 12);

if (PREPARA) {
  const dsn = await dsnDalSito();
  if (!dsn) {
    console.error("DSN non trovato nel bundle pubblico: Sentry potrebbe non essere attivo in produzione.");
    process.exit(1);
  }
  console.log(`\nDSN: ${dsn.replace(/\/\/[0-9a-f]+@/, "//…@")}`);

  for (const [chiave, val] of [
    ["NEXT_PUBLIC_SENTRY_DSN", dsn],
    ["CRON_SECRET", SEGRETO_PROVA],
  ]) {
    const corpo = { key: chiave, value: val, type: "sensitive", target: ["preview"], gitBranch: RAMO };
    // ⚠️ Lo stesso controllo dell'altro script: mai un ambito diverso da `preview`.
    if (corpo.target.length !== 1 || corpo.target[0] !== "preview" || !corpo.gitBranch) {
      console.error("🛑 ambito non consentito. Mi fermo.");
      process.exit(1);
    }
    const r = await api("POST", `/v10/projects/${projectId}/env`, corpo);
    console.log(`  ${r.ok ? "✓" : "✗"} ${chiave}${r.ok ? "" : " — " + r.testo.slice(0, 120)}`);
  }
  console.log(`\nSEGRETO=${SEGRETO_PROVA}`);
  console.log("Ora serve un redeploy del ramo, poi `--scatena` con lo stesso segreto.\n");
}

if (SCATENA) {
  const segreto = valore("--segreto") ?? process.env.SEGRETO_PROVA;
  if (!segreto) {
    console.error("serve --segreto <quello stampato da --prepara>");
    process.exit(1);
  }
  const bypass = readFileSync(".env.vercel", "utf8").match(/^VERCEL_AUTOMATION_BYPASS_SECRET=(.*)$/m)?.[1]?.trim();
  const r = await fetch(`${SU.replace(/\/+$/, "")}/api/prova-errore`, {
    headers: {
      Authorization: `Bearer ${segreto}`,
      ...(bypass ? { "x-vercel-protection-bypass": bypass } : {}),
    },
  });
  console.log(`\nrotta di prova → ${r.status}`);
  if (r.status === 404) {
    console.log("404 = il segreto non combacia con quello impostato sul deploy.");
  } else if (r.status >= 500) {
    console.log("✅ L'errore E' STATO LANCIATO. Ora si guarda in Sentry:");
    console.log("   «Prova del monitoraggio: se leggi questo in Sentry, gli allarmi funzionano.»");
    console.log("\n   ⚠️ Se non compare entro un minuto, la catena e' rotta — ed e' meglio saperlo");
    console.log("      adesso che il giorno di un guasto vero.\n");
  } else {
    console.log("inatteso: la rotta doveva fallire.");
  }
}
