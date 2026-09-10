// I deployment del progetto: elencare, annullare, ridistribuire.
//
//   node scripts/vercel-deploy.mjs                      elenca gli ultimi
//   node scripts/vercel-deploy.mjs annulla <dpl_...>     ferma un build in corso
//   node scripts/vercel-deploy.mjs ridistribuisci <dpl_...>   stesso commit, variabili rilette
//
// ⚠️ ESISTE PER UN PASSO CHE IL METODO CHIEDE E CHE NESSUNO SCRIPT SAPEVA FARE.
// `docs/metodo-rilascio.md` dice, sul ramo d'anteprima: «si verifica all'API che nessun
// deployment sia partito, e in caso lo si annulla». Serve perche' Vercel rifiuta di legare
// una variabile a un ramo che sul remoto non esiste ancora: quindi l'ordine obbligato e'
//
//   1. spingi il ramo        → Vercel avvia SUBITO un build
//   2. annulla quel build    → altrimenti eredita le variabili di PRODUZIONE
//   3. crea le variabili legate al ramo
//   4. ridistribuisci        → questo e' il deployment su cui si collauda
//
// Senza il passo 2 il primo deployment del ramo punta al database che incassa. Non e'
// teorico: e' esattamente quello che e' successo l'8 settembre 2026, e il build era gia'
// in coda quaranta secondi dopo il push.
//
// ⚠️ `[skip ci]` nel messaggio del commit NON basta: provato, Vercel costruisce lo stesso.
// L'unica cosa che ferma un build e' annullarlo.

import { readFileSync } from "node:fs";

const token = readFileSync(".env.vercel", "utf8").match(/^VERCEL_TOKEN=(.*)$/m)?.[1]?.trim();
if (!token) {
  console.error("Manca VERCEL_TOKEN in .env.vercel");
  process.exit(1);
}
const { projectId, orgId, projectName } = JSON.parse(readFileSync(".vercel/project.json", "utf8"));

async function api(metodo, percorso, corpo) {
  const sep = percorso.includes("?") ? "&" : "?";
  const r = await fetch(`https://api.vercel.com${percorso}${sep}teamId=${orgId}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { stato: r.status, dati: await r.json().catch(() => ({})) };
}

const azione = process.argv[2] ?? "elenca";
const uid = process.argv[3];

if (azione === "elenca") {
  const { dati } = await api("GET", `/v6/deployments?projectId=${projectId}&limit=10`);
  console.log(`\nProgetto: ${projectName}\n`);
  for (const d of dati.deployments ?? []) {
    const ramo = d.meta?.githubCommitRef ?? "-";
    // ⚠️ Lo stato si stampa per esteso: un build in coda o in costruzione su un ramo
    // appena spinto e' proprio quello da fermare.
    console.log(
      `${new Date(d.createdAt).toISOString()}  ${String(d.state).padEnd(10)} ${ramo.padEnd(26)} ${d.uid}\n` +
        `${" ".repeat(24)}https://${d.url}`,
    );
  }
} else if (azione === "annulla") {
  if (!uid) {
    console.error("Serve l'identificativo: node scripts/vercel-deploy.mjs annulla dpl_...");
    process.exit(1);
  }
  const r = await api("PATCH", `/v12/deployments/${uid}/cancel`);
  console.log(r.stato === 200 ? `annullato: ${uid}` : `non annullato (${r.stato}): ${JSON.stringify(r.dati).slice(0, 200)}`);
  process.exit(r.stato === 200 ? 0 : 1);
} else if (azione === "ridistribuisci") {
  if (!uid) {
    console.error("Serve l'identificativo: node scripts/vercel-deploy.mjs ridistribuisci dpl_...");
    process.exit(1);
  }
  // ⚠️ NIENTE `target`. Per un'anteprima il campo va OMESSO: passandolo, l'API risponde
  // 400 e chiede «'production', 'staging' o un ambiente personalizzato» — `preview` non e'
  // un valore valido, e `null` nemmeno. Costato due tentativi.
  const r = await api("POST", `/v13/deployments`, { deploymentId: uid, name: projectName });
  if (r.stato >= 400) {
    console.error(`non ridistribuito (${r.stato}): ${JSON.stringify(r.dati).slice(0, 300)}`);
    process.exit(1);
  }
  console.log(`nuovo deployment: ${r.dati.id}\nhttps://${r.dati.url}`);
} else {
  console.error(`Azione sconosciuta: ${azione}. Usa elenca | annulla | ridistribuisci.`);
  process.exit(1);
}
