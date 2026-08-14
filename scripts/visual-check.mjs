// Gate visivo riusabile: screenshot light/dark + viewport stretti, zero errori console.
// Uso: SHOT_DIR=... node scripts/visual-check.mjs   (richiede `npm run dev` attivo)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";

const OUT = process.env.SHOT_DIR ?? "./shots";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";
const errors = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`[${page.url()}] ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror ${page.url()}] ${e.message}`));

const shot = async (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
const go = async (url) => {
  await page.goto(BASE + url);
  await page.waitForLoadState("networkidle");
};
const tema = async (verso) => {
  await page.click(`button[aria-label*="${verso}"]`);
  await page.waitForTimeout(400);
};

// --- Auth
await go("/login");
await shot("01-login-light");
await go("/registrati");
await shot("02-registrati-light");

// --- Design system
await go("/design");
await shot("03-design-light");
await tema("scuro");
await shot("04-design-dark");
await tema("chiaro");

// --- Account attivo + percorso GHG con dati reali
const email = `visual-${Date.now()}@example.com`;
await go("/registrati");
// La connessione si apre PRIMA di chi la usa. Con la verifica dell'indirizzo accesa
// e' `registraEEntra` a completare la registrazione, e per farlo legge il token dal
// database: cosi' com'era, `sql` veniva usata prima di esistere e il collaudo moriva
// all'avvio, sempre, senza mai poter diventare ne' verde ne' rosso.
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  await registraEEntra(page, sql, { base: BASE, nome: "Franca Verdi", email: email, pwd: "PasswordSicura123!" });

await sql`
  update org_entitlement set status = 'active'
  where organization_id = (
    select m.organization_id from member m join "user" u on u.id = m.user_id where u.email = ${email}
  )`;
await sql.end();

await go("/dashboard");
await shot("05-portfolio-vuoto");
await page.click('[data-tour="nuova-azienda"]');
await page.fill("#na-nome", "Meccanica Adriatica S.r.l.");
await page.fill("#na-settore", "Componenti meccanici");
await page.fill("#na-sede", "Bari");
await page.click('button[type="submit"]:has-text("Crea azienda")');
await page.waitForTimeout(1500);
await go("/dashboard");
await shot("06-portfolio-light");
await tema("scuro");
await shot("07-portfolio-dark");
await tema("chiaro");

await page.click("text=Inventario GHG");
await page.waitForURL("**/ghg", { timeout: 15000 });
await page.waitForLoadState("networkidle");
await page.fill("#ci-anno", "2025");
await page.click('button:has-text("Crea")');
await page.waitForURL("**/ghg/2025**", { timeout: 20000 });
await page.waitForLoadState("networkidle");
await shot("08-ghg-passo1-confini");

await page.click('[data-tour="ghg-passo-2"]');
await page.waitForLoadState("networkidle");
await page.getByRole("group", { name: /Combustione fissa/ }).getByRole("button", { name: "Inclusa" }).click();
await page.waitForTimeout(900);
await shot("09-ghg-passo2-sorgenti");

// Voci: gas naturale + energia elettrica con GO (doppia rendicontazione visibile)
await page.click('[data-tour="ghg-passo-3"]');
await page.waitForLoadState("networkidle");
await page.click('[data-tour="aggiungi-voce"]');
await page.fill("#v-q", "12500");
await page.fill("#v-ev", "Fatture gas 2025");
await page.click('button:has-text("Salva voce")');
// Attesa sull'esito reale (riga in tabella), non su un timeout arbitrario.
await page.getByRole("cell", { name: "24,694" }).waitFor({ timeout: 20000 });
await page.click('[data-tour="aggiungi-voce"]');
await page.getByRole("combobox").first().click();
await page.getByRole("option", { name: /Cat\. 2/ }).click();
await page.waitForTimeout(500);
await page.fill("#v-q", "100000");
await page.fill("#v-go", "40000");
await page.click('button:has-text("Salva voce")');
await page.getByRole("cell", { name: "25,650" }).waitFor({ timeout: 20000 });
await shot("10-ghg-passo3-dati");

// Navigazione tra i passi: si attende un elemento proprio del passo di arrivo,
// non il solo networkidle (la transizione RSC può risolversi dopo).
const vaiAlPasso = async (n, atteso) => {
  await page.click(`[data-tour="ghg-passo-${n}"]`);
  await page.waitForURL(`**?passo=${n}`, { timeout: 15000 });
  await page.getByText(atteso, { exact: false }).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(400);
};

await vaiAlPasso(4, "Fonte e anno");
await shot("11-ghg-passo4-fattori");

await vaiAlPasso(5, "Totale location-based");
await shot("12-ghg-passo5-risultati-light");
await tema("scuro");
await shot("13-ghg-passo5-risultati-dark");
await tema("chiaro");

await vaiAlPasso(6, "Anno base");
await shot("14-ghg-passo6-obiettivi");
await vaiAlPasso(7, "Requisiti soddisfatti");
await shot("15-ghg-passo7-verifica");

// --- Viewport stretti
await page.setViewportSize({ width: 1024, height: 768 });
await page.reload();
await page.waitForLoadState("networkidle");
await shot("16-ghg-1024");
await page.setViewportSize({ width: 390, height: 844 });
await go("/dashboard");
await shot("17-portfolio-mobile");

console.log("EMAIL_TEST=" + email);
if (errors.length) {
  console.log("CONSOLE_ERRORS:");
  for (const e of errors) console.log("  " + e);
  process.exitCode = 1;
} else {
  console.log("CONSOLE_ERRORS: nessuno");
}
await browser.close();
