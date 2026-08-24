// Gate visivo del pacchetto identità: loghi, sidebar collassabile, dashboard
// arricchita, navigazione dei passi. Richiede `npm run dev` attivo e le
// credenziali QA (env QA_EMAIL/QA_PASSWORD o default della org di sviluppo).
import { chromium } from "@playwright/test";
import postgres from "postgres";
import { spegniTour } from "./comune-collaudo.mjs";
import { mkdirSync } from "node:fs";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });

const OUT = process.env.SHOT_DIR ?? "./shots-shell";
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3000";
const EMAIL = process.env.QA_EMAIL ?? "demo@evalisdeck.it";
const PW = process.env.QA_PASSWORD ?? "EvalisDeck2026!";
const errors = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`[${page.url()}] ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror ${page.url()}] ${e.message}`));

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
const go = async (url) => {
  await page.goto(BASE + url);
  await page.waitForLoadState("networkidle");
};
// ⚠️ Si usa il silenziatore CONDIVISO invece di una copia locale. Questa ne aveva una
// ferma a tre chiavi da quando i moduli erano tre, e non chiudeva il velo del benvenuto:
// il collaudo moriva su un pulsante coperto da un video.
const silenziaTour = () => spegniTour(page);

// Landing + auth: logo orizzontale e lockup verticale
await go("/");
await shot("01-landing-header");
await go("/login");
await shot("02-login-logo");

// Accesso: login se l'account esiste, altrimenti registrazione al volo
// (il signup crea lo studio demo con l'azienda d'esempio già pronta).
await page.fill("#email", EMAIL);
await page.fill("#password", PW);
await page.click('button[type="submit"]');
const esito = await page
  .waitForURL("**/dashboard", { timeout: 15000 })
  .then(() => "ok")
  .catch(() => "no");
if (esito !== "ok") {
  await go("/registrati");
  const suffisso = Date.now();
  await registraEEntra(page, sql, { base: BASE, nome: "QA Shell", email: `qa-shell-${suffisso}@example.com`, pwd: PW });
}
await silenziaTour();
// ⚠️ `networkidle` pretende mezzo secondo di silenzio di rete, e la dashboard con undici
// moduli ci mette fra i quattro e gli otto secondi a rispondere: la ricarica scadeva a
// trenta senza che niente fosse rotto. Si aspetta cio' che serve davvero — che la pagina
// sia lì — invece di una condizione che non e' quella che interessa.
await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator("main").waitFor({ timeout: 60_000 });
await page.waitForTimeout(800);

// Dashboard arricchita
await shot("03-dashboard");

// Sidebar compatta
await page.click('button[aria-label="Comprimi la barra laterale"]');
await page.waitForTimeout(450);
await shot("04-sidebar-compatta");
await page.click('button[aria-label="Espandi la barra laterale"]');
await page.waitForTimeout(450);

// Card cliccabile: clic sul corpo della card demo → inventario
await page.locator('[data-tour="azienda-demo"] a[aria-label^="Apri"]').click();
await page.waitForURL("**/ghg**", { timeout: 60000 });
await page.waitForLoadState("networkidle");
await page.getByText("avanzamento").waitFor({ timeout: 60000 });
await silenziaTour();
await shot("05-ghg-wizard-nav");
// Navigazione a piè di pagina: avanti e indietro
await page.getByRole("button", { name: /Vai al passo 2/ }).click();
await page.waitForURL("**passo=2**", { timeout: 15000 });
await page.getByRole("button", { name: /Torna al passo 1/ }).click();
await page.waitForURL("**passo=1**", { timeout: 15000 });
await shot("06-wizard-indietro");

// Dark mode della dashboard
await go("/dashboard");
await page.click('button[aria-label*="scuro"]');
await page.waitForTimeout(400);
await shot("07-dashboard-dark");
await page.click('button[aria-label*="chiaro"]');

// Mobile
await page.setViewportSize({ width: 390, height: 844 });
await go("/dashboard");
await shot("08-dashboard-mobile");

await browser.close();
if (errors.length) {
  console.error("ERRORI CONSOLE:\n" + errors.join("\n"));
  process.exit(1);
}
console.log(`OK — screenshot in ${OUT}`);
