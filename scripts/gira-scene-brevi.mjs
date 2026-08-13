// Le due scene brevi richieste dal montaggio, dopo la rinomina del modulo.
//
//   node scripts/gira-scene-brevi.mjs
//
// Una scena per file: chi monta vuole spezzoni separati da mettere in sequenza, non un
// unico filmato da spezzare. Quindici e venti secondi bastano: e' piu' facile tagliare
// che allungare.

import { chromium } from "@playwright/test";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import postgres from "postgres";
import "dotenv/config";

const BASE = (process.env.BASE ?? "https://evalisdeck.it").replace(/\/+$/, "");
const EMAIL = process.env.DEMO_EMAIL ?? "test.user@evalisdeck.it";
const PWD = process.env.DEMO_PWD ?? "DemoVideo2026!";
const OUT = process.env.VIDEO_DIR ?? "./video";
const W = 1920, H = 1080;

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true, args: ["--hide-scrollbars"] });

const login = await browser.newContext({ viewport: { width: W, height: H } });
const lp = await login.newPage();
await lp.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await lp.fill("#email", EMAIL);
await lp.fill("#password", PWD);
await lp.click('button[type="submit"]');
await lp.waitForURL("**/dashboard", { timeout: 60_000 });
const r = lp.getByRole("button", { name: "Rifiuta", exact: true });
if (await r.count()) { await r.click(); await lp.waitForTimeout(400); }
const stato = await login.storageState();
await login.close();

const [az] = await sql`select id from company where nome = 'Ceramiche Marchigiane S.p.A.' order by created_at desc limit 1`;

/** Gira una scena in un contesto suo: un file video per scena. */
async function scena(nome, azioni) {
  const raw = join(OUT, `raw-${nome}`);
  rmSync(raw, { recursive: true, force: true });
  mkdirSync(raw, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    storageState: stato,
    deviceScaleFactor: 2,
    recordVideo: { dir: raw, size: { width: W, height: H } },
  });
  await ctx.addInitScript(() => {
    for (const p of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
      try { localStorage.setItem(`evalisdeck-tour:${p}`, "1"); } catch {}
    }
  });
  const page = await ctx.newPage();
  await azioni(page, (ms) => page.waitForTimeout(ms));
  await ctx.close();

  const webm = readdirSync(raw).find((f) => f.endsWith(".webm"));
  const finale = join(OUT, `evalisdeck-${nome}.mp4`);
  try {
    execFileSync("ffmpeg", ["-y", "-i", join(raw, webm), "-c:v", "libx264", "-preset", "slow",
      "-crf", "16", "-pix_fmt", "yuv420p", "-r", "30", finale], { stdio: "ignore" });
    console.log(`  ${nome}: ${finale}`);
  } catch {
    renameSync(join(raw, webm), join(OUT, `evalisdeck-${nome}.webm`));
    console.log(`  ${nome}: .webm (ffmpeg assente)`);
  }
}

// ── 1. il fascicolo coi cinque percorsi ──────────────────────────────────────────
await scena("fascicolo", async (page, attendi) => {
  await page.goto(`${BASE}/aziende/${az.id}`, { waitUntil: "networkidle" });
  await attendi(4000);
  // Discesa lenta sull'elenco dei percorsi: e' quello che il montaggio deve mostrare.
  for (let i = 0; i < 34; i++) { await page.mouse.wheel(0, 12); await attendi(55); }
  await attendi(4500);
});

// ── 2. la consegna al cliente ────────────────────────────────────────────────────
await scena("consegna", async (page, attendi) => {
  await page.goto(`${BASE}/aziende/${az.id}`, { waitUntil: "networkidle" });
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 30); await attendi(45); }
  await attendi(1600);
  const nota = page.locator("#cond-nota");
  await nota.click();
  await nota.type("Amministrazione Ceramiche", { delay: 90 });
  await attendi(1100);
  await page.getByRole("button", { name: /genera collegamento/i }).click();
  await attendi(5200);
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 18); await attendi(50); }
  await attendi(2600);
});

await browser.close();

// Il collegamento appena filmato e' VERO: si revoca subito. Un token valido dentro un
// video e' una porta aperta a chiunque fermi il fotogramma.
const revocati = await sql`update company_share_link set revoked_at = now()
  where company_id = ${az.id} and revoked_at is null returning id`;
console.log(`  collegamenti revocati: ${revocati.length}`);
await sql.end();
