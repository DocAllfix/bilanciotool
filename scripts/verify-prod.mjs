// Verifica in PRODUZIONE (Vercel): registrazione reale → azienda demo seedata →
// tour presente → attivazione account (DB) → pubblicazione documento → PDF
// generato dal serverless. Chiude il gate rimanente della Fase 8.
// Uso: node scripts/verify-prod.mjs [https://evalisdeck.vercel.app]
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";

const BASE = process.argv[2] ?? "https://evalisdeck.vercel.app";
const OUT = process.env.SHOT_DIR ?? "./shots-prod";
mkdirSync(OUT, { recursive: true });
const errors = [];
const esiti = [];
const ok = (nome, cond, extra = "") => {
  esiti.push(`${cond ? "✓" : "✗"} ${nome}${extra ? " · " + extra : ""}`);
  if (!cond) process.exitCode = 1;
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

// 1. Landing viva
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/prod-01-landing.png` });
ok("landing online", (await page.title()).includes("EvalisDeck"));

// 2. Registrazione REALE in produzione
const email = `prod-${Date.now()}@example.com`;
await page.getByRole("link", { name: "Prova la demo guidata" }).first().click();
await page.waitForURL("**/registrati", { timeout: 20000 });
await page.fill("#nome", "Verifica Prod");
await page.fill("#email", email);
await page.fill("#password", "PasswordSicura123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard", { timeout: 45000 });
await page.waitForLoadState("networkidle");
ok("registrazione → dashboard", true, email);

// 3. Azienda demo seedata + tour partito
const demoCard = page.locator('[data-tour="azienda-demo"]');
await demoCard.waitFor({ timeout: 20000 });
ok("azienda demo presente", true);
// Il tour parte dopo ~1,1s dal mount: si attende l'esito, non si fotografa l'attimo.
const tourVisibile = await page
  .locator(".driver-popover")
  .waitFor({ timeout: 8000 })
  .then(() => true)
  .catch(() => false);
ok("tour avviato automaticamente", tourVisibile);
await page.screenshot({ path: `${OUT}/prod-02-dashboard-demo-tour.png` });
if (tourVisibile) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
}

// 4. Attivazione account (fino a Stripe: flag manuale, stesso DB dev)
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
await sql`update org_entitlement set status='active' where organization_id = (
  select m.organization_id from member m join "user" u on u.id = m.user_id where u.email = ${email})`;
await sql.end();

// 5. Percorso GHG della demo → passo 8 → pubblica
await demoCard.getByRole("link", { name: /Inventario GHG/ }).click();
await page.waitForURL("**/ghg/**", { timeout: 30000 });
await page.waitForLoadState("networkidle");
const chiudiTour = async () => {
  if (await page.locator(".driver-popover").isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
};
await chiudiTour();
await page.click('[data-tour="ghg-passo-8"]');
await page.locator('[data-tour="pubblica-documento"]').waitFor({ timeout: 20000 });
await page.click('[data-tour="pubblica-documento"]');
const popup = await page.waitForEvent("popup", { timeout: 60000 });
await popup.waitForLoadState("networkidle");
ok("pubblicazione snapshot", popup.url().includes("/documento/"));
await popup.setViewportSize({ width: 1280, height: 1400 });
await popup.screenshot({ path: `${OUT}/prod-03-documento.png` });

// 6. PDF dal SERVERLESS (il gate rimanente della Fase 8)
const snapshotId = popup.url().split("/documento/")[1];
const pdfRes = await popup.request.get(`${BASE}/api/documenti/${snapshotId}/pdf`, { timeout: 120000 });
ok("PDF serverless HTTP", pdfRes.ok(), `status ${pdfRes.status()}`);
if (pdfRes.ok()) {
  const body = await pdfRes.body();
  const isPdf = body.subarray(0, 5).toString() === "%PDF-";
  ok("PDF valido", isPdf, `${Math.round(body.length / 1024)} KB`);
  writeFileSync(`${OUT}/prod-rapporto-ghg.pdf`, body);
}

console.log(esiti.join("\n"));
if (errors.length) {
  console.log("CONSOLE_ERRORS:");
  for (const e of errors) console.log("  " + e.slice(0, 300));
  process.exitCode = 1;
} else {
  console.log("CONSOLE_ERRORS: nessuno");
}
await browser.close();
