// La strada di chi ha già deciso: `/attiva` → email → si entra sui PIANI, non sulla demo.
//
//   BASE=https://evalisdeck.it node scripts/verifica-attivazione.mjs
//
// La parte che conta è l'ultima. Il collegamento che arriva per posta porta con sé la
// destinazione: se si perdesse per strada, chi ha cliccato «Attiva il servizio»
// atterrerebbe sul portafoglio col video di benvenuto — cioè esattamente il giro che
// aveva scelto di saltare.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";

const BASE = (process.env.BASE ?? "https://evalisdeck.it").replace(/\/+$/, "");
const RUN = Date.now();
const EMAIL = `attiva-${RUN}@example.com`;
const PWD = PWD_COLLAUDO;

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0].slice(0, 180)); }
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();

await check("la vetrina porta a /attiva, che si presenta come attivazione", async () => {
  await page.goto(`${BASE}/attiva`, { waitUntil: "networkidle" });
  const t = await page.locator("main").innerText();
  if (!/Attiva il tuo studio/i.test(t)) throw new Error(`la pagina dice: ${t.slice(0, 90)}`);
  if (!/gratuita/i.test(t)) throw new Error("non rassicura che la registrazione è gratuita");
  if (!(await page.getByRole("button", { name: /Prosegui verso i piani/i }).count())) {
    throw new Error("il comando non annuncia dove si va");
  }
});

// La destinazione viaggia nel gettone FIRMATO dentro il collegamento dell'email, non
// nel nostro database: Better Auth la mette lì e il gettone non è leggibile da qui.
// Quello che dipende da noi — che l'iscrizione dichiari dove si vuole atterrare — si
// prova guardando la richiesta che parte dal browser. L'ultimo tratto, il clic
// sull'email, lo vede chi fa la prova con la propria casella.
await check("l'iscrizione dichiara la destinazione: la pagina dei piani", async () => {
  const attesa = page.waitForRequest((r) => r.url().includes("/sign-up/email") && r.method() === "POST");
  await page.fill("#nome", "Chi Ha Deciso");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PWD);
  await page.getByRole("button", { name: /Prosegui verso i piani/i }).click();
  const corpo = JSON.parse((await attesa).postData() ?? "{}");
  if (corpo.callbackURL !== "/impostazioni/abbonamento") {
    throw new Error(`dichiara «${corpo.callbackURL}» invece della pagina dei piani`);
  }
  await page.getByText(/Controlla la tua posta/i).waitFor({ timeout: 40_000 });
});

await check("l'iscrizione dalla porta normale dichiara invece il portafoglio", async () => {
  // La controprova: se entrambe dicessero la stessa cosa, la prima non proverebbe nulla.
  const p2 = await ctx.newPage();
  await p2.goto(`${BASE}/registrati`, { waitUntil: "networkidle" });
  const attesa = p2.waitForRequest((r) => r.url().includes("/sign-up/email") && r.method() === "POST");
  await p2.fill("#nome", "Chi Vuole Guardare");
  await p2.fill("#email", `demo-${RUN}@example.com`);
  await p2.fill("#password", PWD);
  await p2.getByRole("button", { name: /^Crea l'account$/ }).click();
  const corpo = JSON.parse((await attesa).postData() ?? "{}");
  await p2.close();
  if (corpo.callbackURL !== "/dashboard") throw new Error(`dichiara «${corpo.callbackURL}»`);
});

await check("confermato l'indirizzo, la pagina dei piani accoglie e vende", async () => {
  // Si fa a mano quello che farebbe il clic sull'email: una casella non si apre da qui.
  const [u] = await sql`select id from "user" where email = ${EMAIL}`;
  if (!u) throw new Error("l'utente non è stato creato");
  await sql`update "user" set email_verified = true where id = ${u.id}`;
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PWD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 40_000 });
  const rifiuta = page.getByRole("button", { name: "Rifiuta", exact: true });
  if (await rifiuta.count()) { await rifiuta.click(); await page.waitForTimeout(400); }

  await page.goto(`${BASE}/impostazioni/abbonamento`, { waitUntil: "networkidle" });
  const t = await page.locator("main").innerText();
  if (!/1\.450|2\.900|5\.400/.test(t)) throw new Error("i piani non compaiono");
  if (await page.locator("video").count()) throw new Error("qui parte il video di benvenuto");
});

await check("da qui si compra: il dialogo offre piano ed estensioni", async () => {
  await page.getByRole("button", { name: /^Attiva$/ }).first().click();
  await page.waitForTimeout(1000);
  const d = page.getByRole("dialog");
  if (!(await d.count())) throw new Error("il dialogo d'acquisto non si apre");
  const t = await d.innerText();
  if (!/Blocchi da \d+ aziende/.test(t)) throw new Error("non offre le estensioni");
  if (!/Primo anno/.test(t)) throw new Error("non mostra il totale");
  await page.keyboard.press("Escape");
});

await check("chi cambia idea trova comunque la demo", async () => {
  // `domcontentloaded`: il portafoglio monta la sequenza di benvenuto, e il silenzio
  // di rete che `networkidle` aspetta con un video in caricamento non arriva.
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const t = await page.locator("body").innerText();
  if (!/Meccanica Adriatica/.test(t)) throw new Error("l'azienda dimostrativa non c'è");
});

await sql.end();
await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
if (ko > 0) process.exitCode = 1;
