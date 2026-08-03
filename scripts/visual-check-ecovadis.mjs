// Collaudo del blocco EcoVadis: fascia, piede, FAQ, dati strutturati.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = "./shots-ecovadis";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";
const errors = [];
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + e.message.split("\n")[0]); }
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

await page.goto(BASE + "/", { waitUntil: "networkidle" });

await check("il file del badge risponde 200 ed è un SVG", async () => {
  const r = await page.request.get(BASE + "/brand/ecovadis/ecovadis-platinum-2026.svg");
  if (!r.ok()) throw new Error("HTTP " + r.status());
  const t = await r.text();
  if (!t.includes("<svg")) throw new Error("non è un SVG");
  if (!/Platinum/i.test(t)) throw new Error("il badge non dice Platinum");
});

await check("la fascia sta fra 'Il metodo' e le FAQ", async () => {
  const pos = await page.evaluate(() => {
    const y = (s) => { const el = document.querySelector(s); return el ? el.getBoundingClientRect().top + window.scrollY : null; };
    const img = [...document.querySelectorAll("img")].find((i) => i.src.includes("ecovadis"));
    return { metodo: y("#metodo"), faq: y("#faq"), badge: img ? img.getBoundingClientRect().top + window.scrollY : null };
  });
  if (pos.badge === null) throw new Error("badge assente");
  if (!(pos.metodo < pos.badge && pos.badge < pos.faq)) throw new Error(JSON.stringify(pos));
});

await check("il badge si carica davvero (non è un'immagine rotta)", async () => {
  await page.evaluate(() => document.querySelector("#faq")?.scrollIntoView());
  await page.waitForTimeout(900);
  const dim = await page.evaluate(() => {
    const i = [...document.querySelectorAll("img")].find((x) => x.src.includes("ecovadis"));
    return i ? { w: i.naturalWidth, h: i.naturalHeight, alt: i.alt, box: i.getBoundingClientRect().width } : null;
  });
  if (!dim || dim.w === 0) throw new Error("naturalWidth 0: immagine rotta " + JSON.stringify(dim));
  if (dim.box < 80) throw new Error("badge troppo piccolo: " + dim.box);
  if (!dim.alt.includes("Evalis Srl")) throw new Error("alt: " + dim.alt);
});

await check("il testo dice 89/100, 99° percentile e la distinzione", async () => {
  const t = await page.evaluate(() => document.body.innerText);
  for (const s of ["89/100", "99° percentile", "Non è una certificazione del software"]) {
    if (!t.includes(s)) throw new Error("manca: " + s);
  }
});

await check("EcoVadis non viene mai chiamato certificazione", async () => {
  // Evalis fa anche attività di certificazione, quindi la parola in sé è legittima:
  // quello che non deve comparire è l'accostamento. EcoVadis è un rating.
  const vietati = [
    /certificazion\w*\s+ecovadis/i,
    /certificat\w*\s+(da\s+)?ecovadis/i,
    /ecovadis\s+certific/i,
    /certificazion\w*\s+platinum/i,
  ];
  const testo = await page.evaluate(() => document.body.innerText);
  const trovati = vietati.filter((r) => r.test(testo)).map((r) => String(r));
  if (trovati.length) throw new Error(trovati.join(" | "));
});

await check("il piede porta il badge piccolo", async () => {
  const n = await page.evaluate(() =>
    [...document.querySelectorAll("footer img")].filter((i) => i.src.includes("ecovadis")).length);
  if (n !== 1) throw new Error("badge nel footer: " + n);
});

await check("la voce FAQ 'Chi c'è dietro' si apre e spiega il limite", async () => {
  await page.evaluate(() => document.querySelector("#faq")?.scrollIntoView());
  const b = page.getByRole("button", { name: "Chi c'è dietro EvalisDeck?" }).first();
  await b.click();
  await page.waitForTimeout(600);
  if ((await b.getAttribute("aria-expanded")) !== "true") throw new Error("la voce non si apre");
  const t = await page.evaluate(() => document.body.innerText);
  if (!t.includes("non certifica EvalisDeck")) throw new Error("il limite non è dichiarato nella risposta");
  await b.click();
  await page.waitForTimeout(400);
  if ((await b.getAttribute("aria-expanded")) !== "false") throw new Error("la voce non si richiude");
});

await check("i dati strutturati sono JSON valido e il premio è sull'organizzazione", async () => {
  const raw = await page.evaluate(() => document.querySelector('script[type="application/ld+json"]')?.textContent ?? null);
  if (!raw) throw new Error("nessun JSON-LD");
  const j = JSON.parse(raw);
  if (j["@type"] !== "Organization" || j.name !== "Evalis Srl") throw new Error("tipo/nome: " + j["@type"] + "/" + j.name);
  if (!j.award.includes("Platinum")) throw new Error("award: " + j.award);
  if (j.hasCredential.validUntil !== "2027-06-25") throw new Error("scadenza: " + j.hasCredential.validUntil);
  if (JSON.stringify(j.makesOffer).includes("award")) throw new Error("il premio non deve stare sul software");
});

await page.evaluate(() => document.querySelector("#faq")?.scrollIntoView());
await page.evaluate(() => window.scrollBy(0, -520));
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/01-fascia-chiara.png` });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/02-piede-chiaro.png` });

// Tema scuro.
await ctx.close();
// Il tema qui è a classe (next-themes su localStorage), non `prefers-color-scheme`:
// chi ha scelto lo scuro dentro l'app trova scura anche la landing.
const ctxDark = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctxDark.addInitScript(() => window.localStorage.setItem("theme", "dark"));
const dark = await ctxDark.newPage();
dark.on("console", (m) => { if (m.type() === "error") errors.push(`[dark] ${m.text()}`); });
dark.on("pageerror", (e) => errors.push(`[dark pageerror] ${e.message}`));
await dark.goto(BASE + "/", { waitUntil: "networkidle" });
if (!(await dark.evaluate(() => document.documentElement.classList.contains("dark")))) {
  errors.push("[dark] il tema scuro non si è applicato: il controllo successivo non prova nulla");
}
await dark.evaluate(() => document.querySelector("#faq")?.scrollIntoView());
await dark.evaluate(() => window.scrollBy(0, -520));
await dark.waitForTimeout(800);
await dark.screenshot({ path: `${OUT}/03-fascia-scura.png` });
await check("nel tema scuro il badge resta visibile e leggibile", async () => {
  const v = await dark.evaluate(() => {
    const i = [...document.querySelectorAll("img")].find((x) => x.src.includes("ecovadis"));
    if (!i) return null;
    const r = i.getBoundingClientRect();
    return { w: r.width, visibile: r.top < window.innerHeight && r.bottom > 0, opacity: getComputedStyle(i).opacity, filter: getComputedStyle(i).filter };
  });
  if (!v || !v.visibile) throw new Error("non visibile: " + JSON.stringify(v));
  if (v.filter !== "none") throw new Error("il badge non va filtrato: " + v.filter);
});
await dark.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await dark.waitForTimeout(500);
await dark.screenshot({ path: `${OUT}/04-piede-scuro.png` });
await ctxDark.close();

// Mobile.
const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const m = await ctxM.newPage();
m.on("console", (x) => { if (x.type() === "error") errors.push(`[mobile] ${x.text()}`); });
m.on("pageerror", (e) => errors.push(`[mobile pageerror] ${e.message}`));
await m.goto(BASE + "/", { waitUntil: "networkidle" });
await check("su mobile la fascia impila e non sborda", async () => {
  await m.evaluate(() => document.querySelector("#faq")?.scrollIntoView());
  await m.evaluate(() => window.scrollBy(0, -700));
  await m.waitForTimeout(900);
  const r = await m.evaluate(() => {
    const i = [...document.querySelectorAll("img")].find((x) => x.src.includes("ecovadis"));
    return { larghezza: i ? i.getBoundingClientRect().width : null, sborda: document.documentElement.scrollWidth > window.innerWidth + 1 };
  });
  if (r.sborda) throw new Error("la pagina sborda in orizzontale");
  if (!r.larghezza || r.larghezza > 120) throw new Error("badge mobile: " + r.larghezza);
});
await m.screenshot({ path: `${OUT}/05-fascia-mobile.png` });
await ctxM.close();
await browser.close();

console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(errors.length ? "ERRORI CONSOLE:\n" + errors.join("\n") : "Console pulita.");
process.exit(ko || errors.length ? 1 : 0);
