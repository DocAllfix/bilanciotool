// Le superfici dell'assistenza, fotografate in chiaro, in scuro e da telefono.
//
//   node scripts/foto-assistenza.mjs
//
// ⚠️ Da GUARDARE, non da misurare. Separato da `foto-superfici.mjs` perché ha bisogno di un
// preambolo che quello non ha: una richiesta vera con la risposta dello staff, e un
// account promosso a staff per fotografare la coda.
//
// ⚠️ Ha trovato al primo giro tre difetti che nessun collaudo funzionale vedeva: la
// pastiglia dello stato VUOTA nella coda (etichette importate da un modulo client dentro un
// componente server), lo staff che leggeva «Tocca a te» su una richiesta a cui aveva appena
// risposto, e classi di colore su un token che non esiste — il collegamento del rimando si
// leggeva appena in scuro.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, rumoreDiPiattaforma, pretendiServerAggiornato } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = "./foto";
mkdirSync(OUT, { recursive: true });
const RUN = Date.now();
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const guasti = [];
const nuova = async (w, h) => {
  const p = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  p.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) guasti.push(m.text().slice(0, 140)); });
  return p;
};
const page = await nuova(1440, 1000);
const { orgId, userId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Foto", email: `foto-ass-${RUN}@example.com`, pwd: PWD_COLLAUDO });
await sql`update "user" set platform_role='admin' where id = ${userId}`;

// Una richiesta con risposta dello staff, scritta dal browser.
await page.goto(`${BASE}/assistenza`, { waitUntil: "domcontentloaded" });
await spegniTour(page);
await page.click("[data-nuova-richiesta]");
await page.fill("#oggetto", "Il PDF del bilancio energetico non si scarica");
await page.fill("#testo", "Ho pubblicato il documento per Meccanica Adriatica.\nPremendo «Scarica» resta in attesa per più di un minuto e poi non succede niente.");
await page.getByRole("button", { name: "Invia la richiesta" }).click();
await page.waitForURL(/\/assistenza\/[^/]+$/, { timeout: 60_000 });
const id = page.url().split("/").pop();
await page.goto(`${BASE}/staff/assistenza/${id}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-conversazione]", { timeout: 60_000 });
await page.fill("#risposta", "Grazie della segnalazione. Il documento risulta pubblicato: abbiamo rigenerato il PDF, riprova adesso dal fascicolo.");
await page.click("[data-invia]");
await page.waitForTimeout(2500);

async function tema(p, scuro) {
  await p.evaluate((s) => { try { localStorage.setItem("theme", s ? "dark" : "light"); } catch {} }, scuro);
  await p.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await p.waitForTimeout(500);
  const applicato = await p.evaluate(() => document.documentElement.classList.contains("dark"));
  if (applicato !== scuro) throw new Error(`tema chiesto ${scuro ? "scuro" : "chiaro"}, applicato ${applicato ? "scuro" : "chiaro"}`);
}

const SUPERFICI = [
  ["assistenza", `${BASE}/assistenza`, "[data-assistenza]", null],
  ["assistenza-risposta", `${BASE}/assistenza`, "[data-assistenza]", async (p) => {
    await p.getByRole("button", { name: /Documenti e PDF/ }).click();
    await p.getByRole("button", { name: /Il PDF non si scarica/ }).click();
    await p.waitForSelector("[data-risposta]");
  }],
  ["assistenza-conversazione", `${BASE}/assistenza/${id}`, "[data-conversazione]", null],
  ["staff-coda", `${BASE}/staff/assistenza`, "[data-coda-staff]", null],
  ["staff-conversazione", `${BASE}/staff/assistenza/${id}`, "[data-conversazione]", null],
];

for (const [nome, url, ancora, prima] of SUPERFICI) {
  for (const scuro of [false, true]) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await tema(page, scuro);
    await page.locator(ancora).first().waitFor({ timeout: 60_000 });
    await spegniTour(page);
    if (prima) await prima(page);
    await page.waitForTimeout(700);
    const file = `${OUT}/${nome}-${scuro ? "scuro" : "chiaro"}.png`;
    await page.screenshot({ path: file });
    console.log("  " + file);
  }
}

// Da telefono: 390 punti, e la misura dello sfondamento orizzontale.
const tel = await nuova(390, 844);
await tel.context().addCookies(await page.context().cookies());
for (const [nome, url, ancora] of [["assistenza-telefono", `${BASE}/assistenza`, "[data-assistenza]"], ["conversazione-telefono", `${BASE}/assistenza/${id}`, "[data-conversazione]"]]) {
  await tel.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await tel.locator(ancora).first().waitFor({ timeout: 60_000 });
  await spegniTour(tel);
  await tel.waitForTimeout(600);
  const sfondo = await tel.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`  ${nome}: sfondamento orizzontale ${sfondo}px`);
  await tel.screenshot({ path: `${OUT}/${nome}.png` });
}

console.log(guasti.length ? `\nERRORI DI CONSOLE:\n  ${guasti.join("\n  ")}` : "\nconsole pulita");
await sql`delete from assistenza_ticket where organization_id = ${orgId}`;
await browser.close();
await sql.end();
