// Collaudo della pagina Guida: contenuti veri, comandi che fanno qualcosa, due temi.
//
// La prova che conta è la terza: il pulsante «rivedi i tour» deve togliere davvero i
// segni da localStorage. Un comando che cambia solo la propria etichetta è la bugia
// più facile da scrivere e la più difficile da vedere.
//
//   node scripts/visual-check-guida.mjs

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const errori = [];
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]); }
};

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
await ctx.addInitScript(() => {
  for (const p of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
    try { localStorage.setItem(`evalisdeck-tour:${p}`, "1"); } catch {}
  }
});
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errori.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errori.push(`[pageerror] ${e.message}`));

const RUN = Date.now();
const email = `guida-${RUN}@example.com`;
const PWD = PWD_COLLAUDO;

await check("accesso e apertura della guida", async () => {
  await registraEEntra(page, sql, { base: BASE, nome: "Sara Conti", email: email, pwd: PWD });
  const rifiuta = page.getByRole("button", { name: "Rifiuta", exact: true });
  if (await rifiuta.count()) { await rifiuta.click(); await page.waitForTimeout(400); }
  await page.goto(`${BASE}/guida`, { waitUntil: "networkidle" });
  if (!/Guida all/.test(await page.locator("h1").innerText())) throw new Error("non è la guida");
});

await check("ci sono tutti e cinque i percorsi, con norma e documento prodotto", async () => {
  const t = await page.locator("main").innerText();
  const attesi = [
    ["Inventario GHG", "ISO 14064-1", "Rapporto GHG"],
    ["Bilancio di sostenibilità", "GRI", "Bilancio di sostenibilità"],
    ["Bilancio energetico", "UNI CEI EN 16247", "Bilancio energetico"],
    ["Autovalutazione ESG", "ISO 20400", "Attestato"],
    ["Statement of Applicability (SoA)", "ISO/IEC 27001", "Statement of Applicability"],
  ];
  for (const [nome, norma, doc] of attesi) {
    for (const pezzo of [nome, norma, doc]) {
      if (!t.includes(pezzo)) throw new Error(`manca «${pezzo}» (percorso ${nome})`);
    }
  }
  // Annuali e fotografie non vanno confusi: sono tre e due.
  const annuali = (t.match(/Si compila per esercizio/g) ?? []).length;
  const fotografie = (t.match(/fotografia dello stato corrente/g) ?? []).length;
  if (annuali !== 3 || fotografie !== 2) throw new Error(`${annuali} annuali e ${fotografie} fotografie, attesi 3 e 2`);
});

await check("il pulsante dei tour toglie DAVVERO i segni da localStorage", async () => {
  const prima = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith("evalisdeck-tour:")).length,
  );
  if (prima === 0) throw new Error("nessun segno da togliere: la prova non direbbe niente");
  await page.getByRole("button", { name: /rivedi i tour/i }).click();
  await page.waitForTimeout(300);
  const dopo = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith("evalisdeck-tour:")).length,
  );
  if (dopo !== 0) throw new Error(`ne restano ${dopo} su ${prima}`);
  const t = await page.locator("main").innerText();
  if (!/Fatto/.test(t)) throw new Error("il pulsante non conferma");
});

await check("le domande si aprono e si leggono", async () => {
  const domande = page.locator("main details");
  const n = await domande.count();
  if (n < 6) throw new Error("solo " + n + " domande");
  await domande.first().locator("summary").click();
  await page.waitForTimeout(200);
  const testo = await domande.first().innerText();
  if (testo.length < 200) throw new Error("la risposta non si è aperta: " + testo.slice(0, 80));
});

await check("il collegamento all'abbonamento porta dove dice", async () => {
  await page.getByRole("link", { name: /Piano e limiti/i }).click();
  await page.waitForURL("**/impostazioni/abbonamento", { timeout: 20_000 });
  await page.goto(`${BASE}/guida`, { waitUntil: "networkidle" });
});

await check("niente caratteri storti né spazi mangiati", async () => {
  const t = await page.locator("main").innerText();
  if (/Ã|â€|Â/.test(t)) throw new Error("mojibake");
  // Il JSX mangia lo spazio dopo un'espressione a fine riga: si vede solo sul reso.
  if (/pulsanteTour|dalla\s{2,}|[a-zà-ù][A-ZÀ-Ù][a-zà-ù]{3,}/.test(t.replace(/EvalisDeck|GRI|ESRS|VSME|ISO|SoA|PDF|KPI/g, ""))) {
    throw new Error("parole incollate: " + (t.match(/[a-zà-ù][A-ZÀ-Ù][a-zà-ù]{3,}/) ?? [])[0]);
  }
});

await check("regge in tema scuro e su schermo stretto", async () => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload({ waitUntil: "networkidle" });
  if (!(await page.getByRole("button", { name: /rivedi i tour/i }).isVisible())) {
    throw new Error("il comando dei tour sparisce al buio");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  const scorrimento = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (scorrimento) throw new Error("la pagina scorre in orizzontale sul telefono");
  await page.emulateMedia({ colorScheme: "light" });
});

await sql.end();
await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(errori.length ? "ERRORI CONSOLE:\n" + errori.join("\n") : "Console pulita.");
if (ko > 0 || errori.length) process.exitCode = 1;
