// Le slide distillate, fotografate: ogni layout presente nel manifesto, col tema dell'app
// in chiaro E in scuro.
//
//   node scripts/foto-slide.mjs [corso]
//
// ⚠️ Da GUARDARE, non da misurare: il controllo sui tagli dice che niente sfora, non che
// la slide regge. E le due foto per tema servono a una verifica precisa — la tela ha colori
// PROPRI (scelta E1) e non deve cambiare quando cambia l'interruttore dell'app. Due foto
// identiche della stessa slide sono la prova; due diverse sono il difetto.

import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { pretendiServerAggiornato, rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = "./foto/slide";
mkdirSync(OUT, { recursive: true });
await pretendiServerAggiornato(BASE);

const mappa = JSON.parse(readFileSync("audio-formazione/slide-map.json", "utf8"));
const corso = process.argv[2] ?? Object.keys(mappa).map((k) => k.split("/")[0]).find((c) => c !== "comuni");
if (!corso) {
  console.log("Nessuna slide distillata nel manifesto.");
  process.exit(0);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const guasti = [];
page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) guasti.push(m.text().slice(0, 140)); });

const RUN = Date.now();
const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Slide", email: `foto-slide-${RUN}@example.com`, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;

const colori = [];
for (const scuro of [false, true]) {
  await page.goto(`${BASE}/formazione/${corso}/presentazione`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { try { localStorage.setItem("theme", s ? "dark" : "light"); } catch {} }, scuro);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-presentazione]", { timeout: 60_000 });
  const applicato = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  if (applicato !== scuro) throw new Error(`tema chiesto ${scuro ? "scuro" : "chiaro"}, applicato ${applicato ? "scuro" : "chiaro"}`);

  const totale = await page.evaluate(() => Number(document.querySelector("[data-presentazione] footer p")?.textContent?.match(/\d+/g)?.[1] ?? 0));
  for (let k = 1; k <= totale; k++) {
    // ⚠️ Si CONTA, non si aspetta. `getAttribute` su un selettore attende che l'elemento
    // compaia: sulle slide non distillate la tela non c'è, e ogni slide costava trenta
    // secondi di attesa — lo script si è appeso oltre dieci minuti fotografando niente.
    const layout = await page.evaluate(() => document.querySelector("[data-tela]")?.getAttribute("data-layout") ?? null);
    if (layout) {
      await page.waitForTimeout(450);
      const file = `${OUT}/${corso}-${String(k).padStart(2, "0")}-${layout}-${scuro ? "scuro" : "chiaro"}.png`;
      await page.screenshot({ path: file });
      // Il fondo della tela, letto dal browser: deve essere lo stesso nei due temi.
      colori.push([k, scuro, await page.evaluate(() => getComputedStyle(document.querySelector("[data-tela]")).backgroundColor)]);
      console.log("  " + file);
    }
    if (k < totale) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(150);
    }
  }
}

const diversi = colori
  .filter(([k, s]) => !s)
  .filter(([k, , c]) => colori.find(([k2, s2]) => k2 === k && s2)?.[2] !== c)
  .map(([k]) => k);
console.log(diversi.length ? `\n⚠️ la tela cambia colore col tema su ${diversi.length} slide: ${diversi.join(", ")}` : "\nla tela ha gli stessi colori nei due temi dell'app");
console.log(guasti.length ? `ERRORI DI CONSOLE:\n  ${guasti.join("\n  ")}` : "console pulita");
await browser.close();
await sql.end();
process.exit(diversi.length || guasti.length ? 1 : 0);
