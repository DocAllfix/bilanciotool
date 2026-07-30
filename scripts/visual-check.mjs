// Gate visivo Fase 3: screenshot light/dark, desktop/mobile, zero errori console.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = process.env.SHOT_DIR;
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

// 1. Auth pages (light)
await go("/login");
await shot("01-login-light");
await go("/registrati");
await shot("02-registrati-light");

// 2. Design showcase light + dark
await go("/design");
await shot("03-design-light");
await page.click('button[aria-label*="scuro"]');
await page.waitForTimeout(400);
await shot("04-design-dark");
await page.click('button[aria-label*="chiaro"]');
await page.waitForTimeout(300);

// 3. Registrazione reale → dashboard
const email = `visual-${Date.now()}@example.com`;
await go("/registrati");
await page.fill("#nome", "Franca Verdi");
await page.fill("#email", email);
await page.fill("#password", "PasswordSicura123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard", { timeout: 30000 });
await page.waitForLoadState("networkidle");
await shot("05-dashboard-light");

// 4. Dashboard dark
await page.click('button[aria-label*="scuro"]');
await page.waitForTimeout(400);
await shot("06-dashboard-dark");
await page.click('button[aria-label*="chiaro"]');
await page.waitForTimeout(300);

// 5. Mobile viewport
await page.setViewportSize({ width: 390, height: 844 });
await go("/dashboard");
await shot("07-dashboard-mobile");
await go("/login");
await shot("08-login-mobile");

// 6. Viewport 1024 (laptop stretto)
await page.setViewportSize({ width: 1024, height: 768 });
await go("/dashboard");
await shot("09-dashboard-1024");

console.log("EMAIL_TEST=" + email);
if (errors.length) {
  console.log("CONSOLE_ERRORS:");
  for (const e of errors) console.log("  " + e);
  process.exitCode = 1;
} else {
  console.log("CONSOLE_ERRORS: nessuno");
}
await browser.close();
