// Gate visivo della landing: fold per fold, desktop + mobile, zero errori console.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const OUT = process.env.SHOT_DIR ?? "./shots-landing";
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3000";
const errors = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) errors.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/01-hero.png` });

const sezioni = [
  ["#percorsi", "02-percorsi"],
  ["#metodo", "04-metodo"],
  ["#prezzi", "05-prezzi"],
  ["#faq", "07-faq"],
];
// come funziona (banda scura fra percorsi e metodo) e video: scroll relativi
await page.evaluate(() => document.querySelector("#percorsi")?.scrollIntoView());
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/02-percorsi.png` });
await page.evaluate(() => window.scrollBy(0, 900));
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/03-come-funziona.png` });
for (const [sel, nome] of sezioni.slice(1)) {
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "start" }), sel);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${nome}.png` });
}
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/08-cta-footer.png` });

// FAQ: apri una voce (interazione reale)
await page.evaluate((s) => document.querySelector(s)?.scrollIntoView(), "#faq");
await page.getByRole("button", { name: /Come funziona la demo/ }).click();
await page.waitForTimeout(400);

// Mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/09-hero-mobile.png` });
await page.evaluate(() => document.querySelector("#prezzi")?.scrollIntoView());
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/10-prezzi-mobile.png` });

// Pagine legali raggiungibili
for (const p of ["/privacy", "/termini", "/cookie", "/llms.txt", "/robots.txt", "/sitemap.xml"]) {
  const res = await page.goto(BASE + p);
  if (!res?.ok()) errors.push(`[${p}] HTTP ${res?.status()}`);
}

// Codifica dei caratteri: una modifica automatica al sorgente può trasformare
// «sostenibilità» in «sostenibilitÃ» senza rompere niente, e a occhio in un
// paragrafo lungo non si nota. Qui è un errore, non un avviso.
for (const p of ["/", "/privacy", "/cookie", "/termini"]) {
  const res = await page.request.get(BASE + p);
  const html = await res.text();
  const rotti = [...new Set((html.match(/[ÂÃâ][-¿]|�/g) ?? []))];
  if (rotti.length) errors.push(`[${p}] caratteri con codifica rotta: ${rotti.join(" ")}`);
}

// I cinque documenti devono esserci tutti: la sezione è la promessa del prodotto.
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE + "/", { waitUntil: "networkidle" });
// ⚠️ Il numero non si scrive a mano, e nemmeno l'intervallo di lettere. Qui c'era
// `/PERCORSO [A-E]/` con l'attesa fissa a 5: nato quando i percorsi erano cinque, sarebbe
// diventato rosso a ogni modulo aggiunto per un motivo che col prodotto non c'entra.
// L'attesa si chiede alla FONTE, cioe' al registro della vetrina.
//
// ⚠️ E si contano anche le lettere DISTINTE. Contare le sole occorrenze non vede il
// difetto che questo controllo ha scoperto il 26 agosto 2026: le lettere si calcolavano
// con un passo fisso di 3, le aree erano diventate 4+4+3, e le lettere D e G comparivano
// DUE VOLTE su una pagina pubblica.
const { readFileSync } = await import("node:fs");
const attesi = (readFileSync("src/components/landing/percorsi-vetrina.ts", "utf8").match(/titolo:\s*"/g) ?? []).length;
if (!attesi) errors.push("non riesco a contare i percorsi in percorsi-vetrina.ts: formato cambiato?");
const etichette = await page.evaluate(() => document.body.innerText.match(/PERCORSO\s+[A-Z]/g) ?? []);
if (etichette.length !== attesi) {
  // ⚠️ Contro un bersaglio REMOTO lo scarto non e' un difetto della pagina: e' il sito che
  // sta servendo un build piu' vecchio del sorgente che ho sotto mano. Detto come «percorsi
  // in pagina: 5 invece di 11» manda a cercare un guasto nella vetrina, che non c'e'.
  const remoto = !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(BASE);
  errors.push(
    remoto && etichette.length < attesi
      ? `il sito serve ${etichette.length} percorsi, il sorgente ne dichiara ${attesi}: ` +
        "quel build e' indietro rispetto a questo ramo (non e' un difetto della pagina)"
      : `percorsi in pagina: ${etichette.length} invece di ${attesi}`,
  );
}
const distinte = new Set(etichette).size;
if (distinte !== etichette.length) {
  errors.push(`lettere RIPETUTE nella vetrina: ${etichette.length} etichette ma ${distinte} distinte`);
}

if (errors.length) {
  console.log("PROBLEMI:");
  for (const e of errors) console.log("  " + e);
  process.exitCode = 1;
} else {
  console.log("CONSOLE_ERRORS: nessuno · pagine SEO/legali: tutte 200");
}
await browser.close();
