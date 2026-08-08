// Prepara un account con TUTTO sbloccato e lo collauda prima che qualcuno lo usi:
// si prova uno per uno ogni permesso che il prodotto sa negare.
//
// Serve a due cose: consegnare credenziali gia' verificate, e accorgersi se un
// permesso smette di essere concesso a chi ha pagato — un paywall che scatta per
// sbaglio su un cliente attivo e' il difetto piu' costoso che questo prodotto possa
// avere, e non lo si scopre guardando il codice.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";

const BASE = (process.env.BASE ?? "https://evalisdeck.it").replace(/\/+$/, "");
// Le credenziali arrivano dall'ambiente e NON stanno qui: uno script committato che
// porta scritta la password di un account con tutto sbloccato e' una chiave lasciata
// nella toppa. Chi lo lancia le passa lui.
//
//   ACCESSO_EMAIL=... ACCESSO_PWD=... node scripts/verifica-accesso-completo.mjs
const EMAIL = process.env.ACCESSO_EMAIL;
const PWD = process.env.ACCESSO_PWD;
const NOME = process.env.ACCESSO_NOME ?? "Utente di prova";
if (!EMAIL || !PWD) {
  console.error("Servono ACCESSO_EMAIL e ACCESSO_PWD nell'ambiente.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
let ok = 0, ko = 0;
const errori = [];
const check = async (n, f) => {
  try { await f(); ok++; console.log("  ok   " + n); }
  catch (e) { ko++; console.log("  KO   " + n + " -> " + String(e.message).split("\n")[0]); }
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
await ctx.addInitScript(() => {
  for (const p of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
    try { localStorage.setItem(`evalisdeck-tour:${p}`, "1"); } catch {}
  }
});
const page = await ctx.newPage();
page.on("pageerror", (e) => errori.push(e.message));

const [gia] = await sql`select id from "user" where email = ${EMAIL}`;
if (!gia) {
  await page.goto(`${BASE}/registrati`, { waitUntil: "networkidle" });
  await page.fill("#nome", NOME);
  await page.fill("#email", EMAIL);
  await page.fill("#password", PWD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 60_000 });
  const rifiuta = page.getByRole("button", { name: "Rifiuta", exact: true });
  if (await rifiuta.count()) { await rifiuta.click(); await page.waitForTimeout(400); }
  console.log("registrazione: fatta");
  await new Promise((r) => setTimeout(r, 4000));
} else {
  console.log("l'account esiste gia': aggiorno solo i permessi");
}

const [u] = await sql`select id from "user" where email = ${EMAIL}`;
const [m] = await sql`select organization_id, role from member where user_id = ${u.id}`;
const orgId = m.organization_id;
// Owner nello studio (inviti, abbonamento, archiviazioni), piano al massimo e le tre
// estensioni accese: e' tutto cio' che il prodotto sa concedere oggi.
await sql`update member set role='owner' where user_id = ${u.id}`;
await sql`update org_entitlement
          set status='active', piano='enterprise', activated_at=now(),
              current_period_end = now() + interval '5 years',
              aziende_extra = 75, accessi_extra = 40, white_label = true
          where organization_id = ${orgId}`;

// Nuova sessione: quella in corso porta avanti lo stato di prima.
await check("l'accesso funziona", async () => {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PWD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 60_000 });
});

await check("abbonamento Enterprise, con i limiti alzati dalle estensioni", async () => {
  await page.goto(`${BASE}/impostazioni/abbonamento`, { waitUntil: "networkidle" });
  const t = await page.locator("main").innerText();
  if (!/Enterprise/i.test(t)) throw new Error("piano non applicato: " + t.slice(0, 160));
  // 25 del piano + 75 comprate = 100 aziende; 10 + 40 = 50 accessi.
  if (!/100/.test(t)) throw new Error("capacita' aziende non sommata: " + t.slice(0, 300));
  if (!/50/.test(t)) throw new Error("capacita' accessi non sommata");
  if (!/marchio del tuo studio/i.test(t)) throw new Error("white-label non risulta attivo");
});

await check("puo' gestire i membri (e' owner, non semplice consulente)", async () => {
  await page.goto(`${BASE}/impostazioni/membri`, { waitUntil: "networkidle" });
  const t = await page.locator("main").innerText();
  if (/riservat|non hai/i.test(t)) throw new Error("pagina negata: " + t.slice(0, 120));
  if (!/invit/i.test(t)) throw new Error("nessun comando di invito");
});

let companyId = "";
await check("crea un'azienda vera (permesso create_company)", async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.locator('[data-tour="nuova-azienda"]').click();
  await page.fill("#na-nome", "Officine di Prova S.r.l.");
  await page.click('button[type="submit"]:has-text("Crea azienda")');
  await page.waitForTimeout(3500);
  const [az] = await sql`select id from company where organization_id = ${orgId}
                          and nome = 'Officine di Prova S.r.l.' limit 1`;
  if (!az) throw new Error("l'azienda non e' stata creata");
  companyId = az.id;
});

let snapshotId = "";
await check("pubblica un documento (permesso generate_pdf)", async () => {
  await page.goto(`${BASE}/aziende/${companyId}/ghg`, { waitUntil: "networkidle" });
  await page.fill("#ci-anno", "2025");
  await page.click('button:has-text("Crea")');
  await page.waitForURL("**/ghg/2025**", { timeout: 30_000 });
  await page.click('[data-tour="ghg-passo-8"]');
  await page.waitForTimeout(1500);
  const [scheda] = await Promise.all([
    ctx.waitForEvent("page", { timeout: 60_000 }),
    page.locator('[data-tour="pubblica-documento"]').click(),
  ]);
  await scheda.waitForLoadState("networkidle");
  snapshotId = new URL(scheda.url()).pathname.split("/").pop();
  const t = await scheda.locator("article.doc-pagina").innerText();
  await scheda.close();
  // White-label acceso: il documento deve portare il nome del suo studio, non il nostro.
  // Il nome dello studio lo si legge dal database, non lo si indovina: il signup lo
  // compone dal nome della persona, e scriverlo qui a mano renderebbe il controllo
  // legato a un utente solo.
  const [org] = await sql`select name from organization where id = ${orgId}`;
  if (!t.includes(`Redatto con ${org.name}`)) {
    throw new Error(`marchio dello studio assente (atteso «${org.name}»): ` + t.slice(-120));
  }
});

await check("scarica il PDF", async () => {
  const r = await ctx.request.get(`${BASE}/api/documenti/${snapshotId}/pdf`);
  if (r.status() !== 200) throw new Error("ha risposto " + r.status());
  const corpo = await r.body();
  if (corpo.subarray(0, 4).toString() !== "%PDF") throw new Error("non e' un PDF");
  if (corpo.length < 20_000) throw new Error("PDF troppo piccolo: " + corpo.length);
});

await check("genera un collegamento per il cliente", async () => {
  await page.goto(`${BASE}/aziende/${companyId}`, { waitUntil: "networkidle" });
  await page.fill("#cond-nota", "prova");
  await page.getByRole("button", { name: /genera collegamento/i }).click();
  await page.waitForTimeout(4000);
  const campo = page.locator('input[readonly]');
  await campo.waitFor({ timeout: 15_000 });
  const url = await campo.inputValue();
  if (!/\/documenti-cliente\//.test(url)) throw new Error("indirizzo storto: " + url);
});

await check("apre tutti e cinque i percorsi senza incontrare blocchi", async () => {
  for (const p of ["ghg", "bilancio", "energetico", "fornitore", "soa"]) {
    await page.goto(`${BASE}/aziende/${companyId}/${p}`, { waitUntil: "networkidle" });
    const t = await page.locator("main").innerText();
    if (/paywall|sblocca|abbonamento scaduto|non disponibile in prova/i.test(t)) {
      throw new Error(`percorso ${p} bloccato`);
    }
  }
});

await browser.close();
await sql.end();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(errori.length ? "ERRORI DI PAGINA: " + errori.join(" | ") : "Nessun errore di pagina.");
console.log(`\n  ${BASE}/login\n  ${EMAIL}\n  ${PWD}`);
if (ko > 0) process.exitCode = 1;
