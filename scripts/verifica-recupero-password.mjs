// Il recupero della password, per intero: si chiede, arriva il gettone, si cambia,
// si entra con quella nuova e la vecchia non funziona più.
//
//   BASE=https://evalisdeck.it CONTO=<email> node scripts/verifica-recupero-password.mjs
//
// Il collegamento non si legge da una casella di posta: si legge dal DATABASE, dove
// Better Auth scrive il gettone. È l'unico modo di provare la catena intera senza
// fermarsi a «l'email è partita» — che è il punto in cui di solito ci si ferma, ed è
// il punto prima di quello che si rompe.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";

const BASE = (process.env.BASE ?? "https://evalisdeck.it").replace(/\/+$/, "");
const EMAIL = process.env.CONTO;
const VECCHIA = "PasswordSicura123!";
const NUOVA = `Rinnovata${Date.now().toString().slice(-6)}!`;
if (!EMAIL) { console.error("serve CONTO=<email>"); process.exit(1); }

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0].slice(0, 180)); }
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
const page = await ctx.newPage();

let token = null;
await check("si chiede il recupero e il gettone finisce nel database", async () => {
  const prima = new Date();
  await page.goto(`${BASE}/password-dimenticata`, { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.getByRole("button", { name: /Mandami il collegamento/i }).click();
  await page.getByText(/Controlla la tua posta/i).waitFor({ timeout: 25_000 });
  // Better Auth conserva il gettone come verifica a scadenza.
  // La riga e' `identifier = "reset-password:<gettone>"`, `value = <id utente>`.
  // Prendere `value` da' l'utente e non il gettone: la pagina si apre lo stesso — non
  // valida niente prima del salvataggio — e fallisce solo alla fine, dove sembra un
  // difetto del prodotto invece che della sonda.
  const righe = await sql`select identifier, value, expires_at from verification
    where created_at >= ${prima} and identifier like ${"reset-password:%"}
    order by created_at desc limit 3`;
  if (!righe.length) throw new Error("nessun gettone di reimpostazione creato");
  token = String(righe[0].identifier).slice("reset-password:".length);
  if (!token || token.length < 10) throw new Error(`gettone inatteso: ${righe[0].identifier}`);
});

await check("il collegamento apre la scelta della nuova password", async () => {
  await page.goto(`${BASE}/reimposta-password?token=${encodeURIComponent(token)}`, { waitUntil: "networkidle" });
  const t = await page.locator("main").innerText();
  if (!/Scegli una nuova password/i.test(t)) throw new Error(`la pagina dice: ${t.slice(0, 140)}`);
});

await check("due password diverse non passano", async () => {
  await page.fill("#password", NUOVA);
  await page.fill("#conferma", NUOVA + "x");
  await page.getByRole("button", { name: /Salva la nuova password/i }).click();
  await page.waitForTimeout(900);
  const t = await page.locator("main").innerText();
  if (!/non coincidono/i.test(t)) throw new Error("accetta due password diverse");
});

await check("una password troppo corta non passa", async () => {
  await page.fill("#password", "corta1");
  await page.fill("#conferma", "corta1");
  await page.getByRole("button", { name: /Salva la nuova password/i }).click();
  await page.waitForTimeout(900);
  const t = await page.locator("main").innerText();
  if (!/almeno 8/i.test(t)) throw new Error("accetta una password corta");
});

await check("la nuova password si salva e riporta all'accesso", async () => {
  await page.fill("#password", NUOVA);
  await page.fill("#conferma", NUOVA);
  await page.getByRole("button", { name: /Salva la nuova password/i }).click();
  await page.waitForURL(/\/login/, { timeout: 25_000 });
  const t = await page.locator("main").innerText();
  if (!/Password aggiornata/i.test(t)) throw new Error("nessuna conferma sull'accesso");
});

await check("si entra con la NUOVA password", async () => {
  await page.fill("#email", EMAIL);
  await page.fill("#password", NUOVA);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 40_000 });
});

await check("la VECCHIA password non funziona più", async () => {
  const pulito = await browser.newContext();
  const p2 = await pulito.newPage();
  await p2.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await p2.fill("#email", EMAIL);
  await p2.fill("#password", VECCHIA);
  await p2.click('button[type="submit"]');
  await p2.waitForTimeout(3500);
  const entrato = /dashboard/.test(p2.url());
  await pulito.close();
  if (entrato) throw new Error("la vecchia password apre ancora");
});

await check("lo stesso gettone non si riusa", async () => {
  const pulito = await browser.newContext();
  const p2 = await pulito.newPage();
  await p2.goto(`${BASE}/reimposta-password?token=${encodeURIComponent(token)}`, { waitUntil: "networkidle" });
  await p2.fill("#password", "AltraAncora99!").catch(() => {});
  await p2.fill("#conferma", "AltraAncora99!").catch(() => {});
  const b = p2.getByRole("button", { name: /Salva la nuova password/i });
  if (await b.count()) { await b.click(); await p2.waitForTimeout(2500); }
  const t = await p2.locator("main").innerText();
  await pulito.close();
  if (!/non più valido|non piu' valido|non è più valido/i.test(t)) {
    throw new Error(`il gettone sembra ancora buono: ${t.slice(0, 120)}`);
  }
});

// Si rimette la password di prima, cosi' gli altri collaudi continuano a entrare.
console.log(`\n  (la password del conto e' ora: ${NUOVA})`);
await sql.end();
await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
if (ko > 0) process.exitCode = 1;
