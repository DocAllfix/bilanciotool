// Apre un'anteprima al committente, e la richiude.
//
//   node scripts/anteprima-committente.mjs apri             prepara ramo, webhook e segreto
//   node scripts/anteprima-committente.mjs collegamento <https://deployment>   stampa il link
//   node scripts/anteprima-committente.mjs chiudi           toglie tutto
//
// ⚠️ PERCHÉ SERVE, misurato il 7 novembre 2026. Un'anteprima preparata per i collaudi NON si
// può consegnare così com'è a una persona che deve provarla davvero:
//
//   1. è dietro l'autenticazione di Vercel, e un collaudo passa col bypass nell'intestazione;
//   2. le variabili di Resend valgono solo in produzione: l'email di conferma non parte, e chi
//      si iscrive resta su «controlla la tua posta» per sempre;
//   3. l'abbonamento lo attiva il webhook, e la sandbox non ne ha uno che punti all'anteprima:
//      dopo un pagamento di prova l'account resterebbe in «attivazione in corso».
//
// ⚠️ IL COLLEGAMENTO SI COSTRUISCE SUL DEPLOYMENT, non sull'alias del ramo. L'app rimanda sempre
// a `VERCEL_URL` (Better Auth, ritorno da Stripe, email): il cookie del bypass vale per un host
// solo, e su un altro host si finirebbe sulla pagina di accesso di Vercel.
//
// ⚠️ IL SEGRETO È DEDICATO, distinto da quello dei collaudi: si revoca a fine revisione senza
// rompere niente. Vale per tutte le anteprime del progetto finché non si revoca, quindi va
// richiuso: lo si fa con `chiudi`.
//
// ⚠️ E L'ENDPOINT SANDBOX VA TOLTO A FINE REVISIONE. Quello rimasto attivo in agosto, puntato
// altrove, ha mandato al committente 93 email di «consegna fallita». `chiudi` lo cancella.
//
// Lo stato sta in `.env.anteprima-committente`, escluso da git come ogni `.env*`.

import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import Stripe from "stripe";

const STATO = ".env.anteprima-committente";
const MITTENTE = "EvalisDeck <noreply@evalisdeck.it>";
const EVENTI = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
];

const dalFile = (file, chiave) => readFileSync(file, "utf8").match(new RegExp(`^${chiave}=(.*)$`, "m"))?.[1]?.trim();
const token = dalFile(".env.vercel", "VERCEL_TOKEN");
const { projectId, orgId, projectName } = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
const chiaveStripe = dalFile(".env", "STRIPE_SECRET_KEY");
if (!chiaveStripe?.startsWith("sk_test_")) {
  console.error("🛑 La chiave Stripe locale non è di prova: mi fermo.");
  process.exit(1);
}
const stripe = new Stripe(chiaveStripe);

async function api(metodo, percorso, corpo) {
  const sep = percorso.includes("?") ? "&" : "?";
  const r = await fetch(`https://api.vercel.com${percorso}${sep}teamId=${orgId}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const testo = await r.text();
  return { ok: r.ok, stato: r.status, dati: testo ? JSON.parse(testo) : null, testo };
}

const leggiStato = () =>
  existsSync(STATO)
    ? Object.fromEntries(
        readFileSync(STATO, "utf8")
          .split("\n")
          .filter((r) => r.includes("="))
          .map((r) => [r.slice(0, r.indexOf("=")), r.slice(r.indexOf("=") + 1).trim()]),
      )
    : {};
const scriviStato = (s) =>
  writeFileSync(STATO, Object.entries(s).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");

/** Crea o sostituisce una variabile legata al RAMO: mai altri ambiti. */
async function variabileDelRamo(ramo, chiave, valore) {
  const { envs } = (await api("GET", `/v9/projects/${projectId}/env`)).dati;
  const esistente = envs.find((v) => v.key === chiave && v.gitBranch === ramo);
  if (esistente) {
    const r = await api("PATCH", `/v9/projects/${projectId}/env/${esistente.id}`, { value: valore });
    if (!r.ok) throw new Error(`${chiave}: ${r.stato} ${r.testo.slice(0, 160)}`);
    console.log(`   ~ ${chiave} sostituita sul ramo`);
    return;
  }
  const r = await api("POST", `/v10/projects/${projectId}/env`, {
    key: chiave,
    value: valore,
    type: "sensitive",
    target: ["preview"],
    gitBranch: ramo,
  });
  if (!r.ok) throw new Error(`${chiave}: ${r.stato} ${r.testo.slice(0, 160)}`);
  console.log(`   + ${chiave} sul ramo`);
}

const comando = process.argv[2];
const ramoCorrente = readFileSync(".git/HEAD", "utf8").match(/refs\/heads\/(.+)/)?.[1]?.trim();

if (comando === "apri") {
  const ramo = ramoCorrente;
  if (!ramo?.startsWith("anteprima/")) {
    console.error(`🛑 Sei su «${ramo}»: questo comando vale solo per un ramo anteprima/.`);
    process.exit(1);
  }
  const stato = leggiStato();
  const slug = ramo.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  console.log(`Progetto ${projectName} · ramo ${ramo}\n\n1) Email solo su questo ramo`);
  await variabileDelRamo(ramo, "RESEND_API_KEY", dalFile(".env", "RESEND_API_KEY"));
  await variabileDelRamo(ramo, "RESEND_REPLY_TO", dalFile(".env", "RESEND_REPLY_TO"));
  await variabileDelRamo(ramo, "RESEND_FROM", MITTENTE);

  console.log("\n2) Segreto d'accesso dedicato");
  if (stato.BYPASS) {
    console.log("   c'è già");
  } else {
    const prima = Object.keys((await api("GET", `/v9/projects/${projectId}`)).dati.protectionBypass ?? {});
    const r = await api("PATCH", `/v1/projects/${projectId}/protection-bypass`, { generate: { note: "committente" } });
    if (!r.ok) throw new Error(`bypass: ${r.stato} ${r.testo.slice(0, 200)}`);
    const dopo = Object.keys(r.dati.protectionBypass ?? {});
    const nuovo = dopo.find((k) => !prima.includes(k));
    if (!nuovo) throw new Error("nessun segreto nuovo restituito");
    stato.BYPASS = nuovo;
    console.log(`   creato (${prima.length} → ${dopo.length} segreti)`);
  }

  console.log("\n3) Webhook sulla sandbox, verso l'alias stabile del ramo");
  const scopeSlug = (await api("GET", `/v2/teams/${orgId}`)).dati?.slug;
  const alias = `${projectName}-git-${slug}-${scopeSlug}.vercel.app`;
  // Stripe non passa l'autenticazione di Vercel: il bypass dei collaudi sta nell'indirizzo.
  const bypassCollaudi = dalFile(".env.vercel", "VERCEL_AUTOMATION_BYPASS_SECRET");
  const url = `https://${alias}/api/stripe/webhook?x-vercel-protection-bypass=${bypassCollaudi}`;
  if (stato.WEBHOOK_ID) {
    await stripe.webhookEndpoints.update(stato.WEBHOOK_ID, { url });
    console.log(`   già presente: ${stato.WEBHOOK_ID}, indirizzo riallineato`);
  } else {
    const e = await stripe.webhookEndpoints.create({
      url,
      enabled_events: EVENTI,
      description: `Anteprima ${ramo}: da togliere a fine revisione`,
    });
    stato.WEBHOOK_ID = e.id;
    stato.WEBHOOK_SECRET = e.secret;
    console.log(`   creato: ${e.id} → https://${alias}/api/stripe/webhook`);
  }
  await variabileDelRamo(ramo, "STRIPE_WEBHOOK_SECRET", stato.WEBHOOK_SECRET);

  stato.RAMO = ramo;
  stato.ALIAS = alias;
  scriviStato(stato);
  console.log(`\nStato salvato in ${STATO}. Ora ridistribuisci: le variabili valgono dal prossimo build.`);
} else if (comando === "collegamento") {
  const stato = leggiStato();
  const base = process.argv[3]?.replace(/\/+$/, "");
  if (!base || !stato.BYPASS) {
    console.error("Uso: collegamento <https://deployment>, dopo «apri».");
    process.exit(1);
  }
  console.log(`${base}/?x-vercel-protection-bypass=${stato.BYPASS}&x-vercel-set-bypass-cookie=true`);
} else if (comando === "chiudi") {
  const stato = leggiStato();
  if (stato.WEBHOOK_ID) {
    await stripe.webhookEndpoints.del(stato.WEBHOOK_ID).catch((e) => console.log("   webhook:", e.message));
    console.log("webhook sandbox tolto");
  }
  if (stato.BYPASS) {
    const r = await api("PATCH", `/v1/projects/${projectId}/protection-bypass`, {
      revoke: { secret: stato.BYPASS, regenerate: false },
    });
    console.log(r.ok ? "segreto revocato" : `segreto NON revocato: ${r.stato} ${r.testo.slice(0, 160)}`);
  }
  rmSync(STATO, { force: true });
  console.log("Stato locale rimosso. Le variabili del ramo restano: valgono solo per quel ramo.");
} else {
  console.log("Comandi: apri · collegamento <https://deployment> · chiudi");
}
