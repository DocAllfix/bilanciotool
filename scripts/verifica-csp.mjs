// Collaudo della Content Security Policy, contando le violazioni vere.
//
// Una CSP si prova aprendo le pagine e guardando cosa il browser blocca, non
// rileggendo la regola: un indirizzo dimenticato non produce un errore visibile, produce
// una funzione che smette di funzionare in silenzio — un pulsante che non apre niente,
// un'immagine che non compare — e nessun utente te lo verrà mai a dire.
//
//   node scripts/verifica-csp.mjs [--prod]

import { chromium } from "@playwright/test";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import postgres from "postgres";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]); }
};

const violazioni = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
await ctx.addInitScript(() => {
  for (const p of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
    try { localStorage.setItem(`evalisdeck-tour:${p}`, "1"); } catch {}
  }
});
const page = await ctx.newPage();
// Le violazioni arrivano come errori di console con un testo riconoscibile.
page.on("console", (m) => {
  const t = m.text();
  // ⚠️ La violazione su `vercel.live` e' vera e non e' nostra: e' lo script che Vercel
  // inietta nelle ANTEPRIME, e la nostra CSP fa esattamente il suo mestiere bloccandolo.
  // In produzione non esiste. Contarla qui significherebbe dichiarare rotta una difesa
  // proprio nel momento in cui funziona.
  if (rumoreDiPiattaforma(t)) return;
  if (/Content Security Policy|Refused to (load|execute|connect|apply)/i.test(t)) {
    violazioni.push(`[${page.url()}] ${t.slice(0, 180)}`);
  }
});

const apri = async (percorso) => {
  await page.goto(`${BASE}${percorso}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
};

await check("l'intestazione c'è ed è quella giusta", async () => {
  const r = await ctx.request.get(`${BASE}/`);
  const csp = r.headers()["content-security-policy"];
  if (!csp) throw new Error("nessuna Content-Security-Policy nella risposta");
  for (const attesa of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"]) {
    if (!csp.includes(attesa)) throw new Error(`manca «${attesa}»`);
  }
});

await check("le pagine pubbliche non producono violazioni", async () => {
  for (const p of ["/", "/blog", "/blog/rendicontazione-sostenibilita-pmi", "/privacy", "/cookie", "/termini", "/login", "/registrati"]) {
    await apri(p);
  }
  if (violazioni.length) throw new Error(violazioni[0]);
});

await check("nemmeno col consenso accettato (Analytics carica davvero)", async () => {
  await apri("/");
  const acc = page.getByRole("button", { name: "Accetta", exact: true });
  if (await acc.count()) { await acc.click(); await page.waitForTimeout(2500); }
  if (violazioni.length) throw new Error(violazioni[0]);
});

const RUN = Date.now();
await check("l'applicazione, dopo l'accesso, non produce violazioni", async () => {
  await registraEEntra(page, sql, {
    base: BASE, nome: "Prova CSP", email: `csp-${RUN}@example.com`, pwd: PWD_COLLAUDO,
  });
  for (const p of ["/dashboard", "/documenti", "/guida", "/impostazioni", "/impostazioni/abbonamento"]) {
    await apri(p);
  }
  if (violazioni.length) throw new Error(violazioni[0]);
});

await check("il percorso di un'azienda e il documento pubblicato reggono", async () => {
  const [az] = await sql`select id from company where nome like 'Meccanica%' order by created_at desc limit 1`;
  if (az) {
    await apri(`/aziende/${az.id}`);
    await apri(`/aziende/${az.id}/ghg`);
  }
  const [snap] = await sql`select id from document_snapshot order by published_at desc limit 1`;
  if (snap) await apri(`/documento/${snap.id}`);
  if (violazioni.length) throw new Error(violazioni[0]);
});

await check("il pagamento raggiunge ancora Stripe", async () => {
  // La prova che una CSP troppo stretta romperebbe per prima, e in silenzio.
  await apri("/impostazioni/abbonamento");
  // ⚠️ Fra il pulsante e Stripe c'e' un DIALOGO dal 13 agosto: e' li' che si scelgono le
  // estensioni e si vede il totale prima di uscire. `verifica-checkout` fu corretto per
  // questo il 15 agosto; QUESTO file no, e da allora falliva aspettando una navigazione
  // che con un dialogo in mezzo non poteva piu' arrivare. Stesso difetto, altro file:
  // una correzione applicata a una copia sola.
  const b = page.getByRole("button", { name: /^(Attiva|Passa a questo)$/ }).first();
  if (await b.count()) {
    await b.click();
    const paga = page.getByRole("button", { name: /^Paga / });
    await paga.waitFor({ timeout: 15_000 });
    await paga.click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
  }
  if (violazioni.length) throw new Error(violazioni[0]);
});

await sql.end();
await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(violazioni.length ? `VIOLAZIONI (${violazioni.length}):\n` + violazioni.slice(0, 8).join("\n") : "Nessuna violazione.");
if (ko > 0 || violazioni.length) process.exitCode = 1;
