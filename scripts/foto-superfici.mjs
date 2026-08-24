// Le superfici cambiate, fotografate in chiaro e in scuro.
//
// ⚠️ Serve a essere GUARDATO, non misurato: i collaudi funzionali dicono che i comandi
// rispondono, e non possono dire che undici caselle in una card stanno strette o che un
// colore d'area è finito sul modulo sbagliato. Le due cose si controllano in due modi
// diversi, e il secondo vuole un paio d'occhi.
//
//   node scripts/foto-superfici.mjs

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = "./foto";
mkdirSync(OUT, { recursive: true });

const RUN = Date.now();
const email = `foto-${RUN}@example.com`;

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const guasti = [];
page.on("console", (m) => { if (m.type() === "error") guasti.push(m.text().slice(0, 140)); });

console.log(`\nFoto delle superfici — ${BASE}\n`);
const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Foto", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
await spegniTour(page);

const [az] = await sql`select id from company where organization_id = ${orgId} limit 1`;

/** Il tema si sceglie con l'interruttore del prodotto: NON segue `prefers-color-scheme`. */
async function tema(scuro) {
  await page.evaluate((s) => {
    localStorage.setItem("theme", s ? "dark" : "light");
    document.documentElement.classList.toggle("dark", s);
  }, scuro);
}

const SUPERFICI = [
  ["dashboard", `${BASE}/dashboard`, "main"],
  ["fascicolo", `${BASE}/aziende/${az.id}`, "[data-percorsi]"],
  ["filiera", `${BASE}/aziende/${az.id}/filiera`, "main"],
  ["sa8000", `${BASE}/aziende/${az.id}/sa8000`, "main"],
  ["verifica", `${BASE}/verifica`, "main"],
  ["guida", `${BASE}/guida`, "main"],
];

for (const [nome, url, ancora] of SUPERFICI) {
  for (const scuro of [false, true]) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await tema(scuro);
    await page.locator(ancora).first().waitFor({ timeout: 120_000 }).catch(() => {});
    await spegniTour(page);
    await page.waitForTimeout(900);
    const file = `${OUT}/${nome}-${scuro ? "scuro" : "chiaro"}.png`;
    await page.screenshot({ path: file, fullPage: false });
    console.log("  " + file);
  }
}

// La vetrina, che è la superficie più cambiata: undici percorsi in cinque aree.
await page.goto(`${BASE}/#percorsi`, { waitUntil: "domcontentloaded", timeout: 120_000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/vetrina-percorsi.png` });
console.log(`  ${OUT}/vetrina-percorsi.png`);

// E la card del portafoglio da telefono: undici caselle su uno schermo stretto.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
await spegniTour(page);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/dashboard-telefono.png` });
const sfonda = await page.evaluate(() => document.body.scrollWidth - document.body.clientWidth);
console.log(`  ${OUT}/dashboard-telefono.png — sfondamento orizzontale: ${sfonda}px`);

console.log(guasti.length ? "\n  ERRORI DI CONSOLE:\n   " + [...new Set(guasti)].join("\n   ") : "\n  Console pulita.");

await sql`delete from company where organization_id = ${orgId}`;
await sql`delete from audit_log where organization_id = ${orgId}`;
await sql`delete from entitlement_event where organization_id = ${orgId}`;
await sql`delete from org_entitlement where organization_id = ${orgId}`;
await sql`delete from member where organization_id = ${orgId}`;
await sql`delete from organization where id = ${orgId}`;
await sql`delete from "user" where email = ${email}`;

await browser.close();
await sql.end();
