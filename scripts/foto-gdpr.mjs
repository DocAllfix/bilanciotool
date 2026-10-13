// Le viste del percorso Protezione dei dati, fotografate per essere GUARDATE.
//
//   node scripts/foto-gdpr.mjs
//
// Sull'azienda DIMOSTRATIVA, che il prodotto semina all'iscrizione: è il percorso che un
// cliente nuovo vede per primo, compilato a metà. In chiaro e in scuro a 1440 punti, e da
// telefono a 390 con la misura dello sfondamento orizzontale (che una foto non dice).

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { rumoreDiPiattaforma, spegniTour } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = "./shots-gdpr";
mkdirSync(OUT, { recursive: true });
const RUN = Date.now();
const email = `foto-gdpr-${RUN}@example.com`;

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const errori = [];
const sfondamenti = [];
const spazi = [];

try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) errori.push(m.text().slice(0, 160));
  });
  const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Foto GDPR", email, pwd: PWD_COLLAUDO });
  await spegniTour(page);
  const [az] = await sql`select id from company where organization_id = ${orgId} and is_demo limit 1`;
  if (!az) throw new Error("nessuna azienda dimostrativa");
  const [sys] = await sql`select 1 from gdpr_system where company_id = ${az.id}`;
  if (!sys) throw new Error("la dimostrativa non ha il percorso GDPR: il seme non è partito");

  const VISTE = ["quadro", "org", "trat", "gap", "ris", "pol", "dati", "reg", "verifica", "documenti"];
  const apri = async (p, v) => {
    await p.goto(`${BASE}/aziende/${az.id}/gdpr?vista=${v}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await p.locator('nav[aria-label="Viste del modulo"]').waitFor({ timeout: 120_000 });
    await spegniTour(p);
    // La prima riga apribile si apre: la foto deve mostrare i campi, non solo i titoli.
    await p.locator("details > summary").first().click().catch(() => {});
    await p.waitForTimeout(700);
  };
  const tema = async (p, scuro) => {
    await p.evaluate((s) => {
      try { localStorage.setItem("theme", s ? "dark" : "light"); } catch {}
    }, scuro);
    await p.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
    await p.waitForTimeout(500);
    const applicato = await p.evaluate(() => document.documentElement.classList.contains("dark"));
    if (applicato !== scuro) throw new Error(`tema chiesto ${scuro ? "scuro" : "chiaro"}, applicato l'altro`);
  };

  // `SOLO_TELEFONO=1` salta le foto da scrivania: serve a rifare in pochi minuti la sola
  // misura (sfondamento e spazi mangiati) dopo una correzione.
  for (const scuro of process.env.SOLO_TELEFONO ? [] : [false, true]) {
    for (const v of VISTE) {
      await apri(page, v);
      await tema(page, scuro);
      await page.locator('nav[aria-label="Viste del modulo"]').waitFor({ timeout: 120_000 });
      await spegniTour(page);
      await page.locator("details > summary").first().click().catch(() => {});
      await page.waitForTimeout(700);
      const file = `${OUT}/${v}-${scuro ? "scuro" : "chiaro"}.png`;
      await page.screenshot({ path: file, fullPage: true });
      console.log("  " + file);
    }
  }

  // Da telefono: la foto della parte alta e la MISURA dello sfondamento.
  const tel = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() });
  const pt = await tel.newPage();
  pt.on("console", (m) => {
    if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) errori.push(m.text().slice(0, 160));
  });
  for (const v of VISTE) {
    await apri(pt, v);
    const eccesso = await pt.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (eccesso > 1) sfondamenti.push(`${v}: ${eccesso}px`);
    // ⚠️ Lo spazio mangiato fra un numero e la parola dopo («45da valutare») non lo vede
    // nessun collaudo funzionale e a occhio, su una foto rimpicciolita, sparisce: si cerca
    // nel testo RESO della pagina, che è dove il difetto esiste.
    const incollati = await pt.evaluate(() =>
      [...document.querySelector("main").innerText.matchAll(/\d[a-zà-ù]{2,}|[a-zà-ù]{2,}\d/g)].map((m) => m[0]),
    );
    if (incollati.length) spazi.push(`${v}: ${[...new Set(incollati)].join(", ")}`);
    await pt.screenshot({ path: `${OUT}/${v}-telefono.png` });
    console.log(`  ${OUT}/${v}-telefono.png  (sfondamento ${eccesso}px)`);
  }

  await sql`delete from company where organization_id = ${orgId}`;
  await sql`delete from audit_log where organization_id = ${orgId}`;
  await sql`delete from org_entitlement where organization_id = ${orgId}`;
  await sql`delete from member where organization_id = ${orgId}`;
  await sql`delete from organization where id = ${orgId}`;
  await sql`delete from "user" where email = ${email}`;
} finally {
  await browser.close();
  await sql.end();
}

console.log(`\nErrori di console: ${errori.length}`);
for (const e of errori) console.log("  · " + e);
console.log(`Sfondamenti da telefono: ${sfondamenti.length ? sfondamenti.join(", ") : "nessuno"}`);
console.log(`Spazi mangiati: ${spazi.length ? spazi.join(" | ") : "nessuno"}`);
process.exit(errori.length || sfondamenti.length || spazi.length ? 1 : 0);
