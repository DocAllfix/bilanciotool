// Collaudo del pacchetto legale: le tre pagine, l'informativa breve, il piede
// identificativo, security.txt. Chiaro, scuro, mobile, zero errori di console.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = process.env.SHOT_DIR ?? "./shots-legale";
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3000";
const errors = [];
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + e.message.split("\n")[0]); }
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

// ------------------------------------------------ 1. l'informativa breve
await check("l'informativa compare al primo accesso e non chiede un consenso", async () => {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const nota = page.getByRole("region", { name: "Informativa sui cookie" });
  await nota.waitFor({ timeout: 15000 });
  const testo = await nota.innerText();
  if (!/soltanto cookie tecnici/i.test(testo)) throw new Error("non dice che sono solo tecnici");
  if (/rifiut|accetta tutt|preferenze/i.test(testo)) throw new Error("promette una scelta che non esiste: " + testo);
  const bottoni = await nota.getByRole("button").count();
  if (bottoni !== 1) throw new Error("bottoni nella nota: " + bottoni + " (deve essere solo «Ho capito»)");
});

await check("i due collegamenti della nota portano alle pagine giuste", async () => {
  const nota = page.getByRole("region", { name: "Informativa sui cookie" });
  const href = await nota.locator("a").evaluateAll((a) => a.map((x) => new URL(x.href).pathname));
  if (href.join(",") !== "/cookie,/privacy") throw new Error("collegamenti: " + href.join(","));
});

await check("«Ho capito» la chiude e non ritorna cambiando pagina", async () => {
  await page.getByRole("button", { name: "Ho capito" }).click();
  await page.waitForTimeout(400);
  if (await page.getByRole("region", { name: "Informativa sui cookie" }).count()) throw new Error("non si chiude");
  await page.goto(BASE + "/privacy", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  if (await page.getByRole("region", { name: "Informativa sui cookie" }).count()) throw new Error("ritorna dopo la navigazione");
  const v = await page.evaluate(() => localStorage.getItem("evalisdeck-cookie-informativa"));
  if (v !== "1") throw new Error("non l'ha ricordato: " + v);
});

// ------------------------------------------------------- 2. le tre pagine
const ATTESI = {
  "/privacy": {
    titolo: "Informativa sulla privacy",
    sezioni: 11,
    frasi: ["responsabile del trattamento", "articolo 28 del GDPR", "Francoforte", "garanteprivacy.it", "2220"],
  },
  "/cookie": {
    titolo: "Cookie policy",
    sezioni: 6,
    frasi: ["better-auth.session_token", "7 giorni", "articolo 122", "10 giugno 2021", "localStorage"],
  },
  "/termini": {
    titolo: "Termini e condizioni",
    sezioni: 16,
    frasi: ["Rimborso integrale entro quattordici giorni", "non sia stato pubblicato alcun documento", "rinnova automaticamente", "Napoli Nord", "non costituiscono certificazione"],
  },
};

for (const [rotta, atteso] of Object.entries(ATTESI)) {
  await check(`${rotta}: titolo, ${atteso.sezioni} sezioni numerate, data di aggiornamento`, async () => {
    const r = await page.goto(BASE + rotta, { waitUntil: "networkidle" });
    if (!r.ok()) throw new Error("HTTP " + r.status());
    const h1 = await page.locator("h1").first().innerText();
    if (h1.trim() !== atteso.titolo) throw new Error("titolo: " + h1);
    const n = await page.locator("section[id^=sezione-]").count();
    if (n !== atteso.sezioni) throw new Error("sezioni: " + n + " invece di " + atteso.sezioni);
    const data = await page.locator("time").first().getAttribute("datetime");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data ?? "")) throw new Error("data di aggiornamento assente");
  });

  await check(`${rotta}: contiene i punti che devono esserci`, async () => {
    const t = await page.evaluate(() => document.body.innerText);
    const mancanti = atteso.frasi.filter((f) => !t.toLowerCase().includes(f.toLowerCase()));
    if (mancanti.length) throw new Error("mancano: " + mancanti.join(" | "));
  });

  await check(`${rotta}: identificazione del prestatore nel piede`, async () => {
    const t = await page.evaluate(() => document.body.innerText);
    for (const s of ["Evalis S.r.l.", "04868330616", "Aversa", "info@evalisdeck.it"]) {
      if (!t.includes(s)) throw new Error("manca nel piede: " + s);
    }
  });

  await check(`${rotta}: le ancore delle sezioni funzionano`, async () => {
    const primo = page.locator("section[id^=sezione-] h2 a").first();
    await primo.click();
    await page.waitForTimeout(400);
    if (!page.url().includes("#sezione-")) throw new Error("l'ancora non aggiorna l'indirizzo: " + page.url());
  });
}

await check("nessuna parola incollata a un tag inline (lo spazio mangiato dal JSX)", async () => {
  // JSX perde lo spazio iniziale di un nodo di testo quando la riga va a capo:
  // in pagine di sola prosa succede in continuazione e a occhio non si vede.
  // Si controlla sull'HTML reso, non sul sorgente, perché è lì che si manifesta.
  const sporche = [];
  for (const rotta of ["/", "/privacy", "/cookie", "/termini"]) {
    const res = await page.request.get(BASE + rotta);
    const html = await res.text();
    // Punteggiatura attaccata (</a>. </strong>,) è legittima e non deve segnalare.
    const casi = [...html.matchAll(/<\/(?:strong|a|em|code)>[^< ,.:;)!?»&][^< ]{0,20}/g)].map((m) => m[0]);
    if (casi.length) sporche.push(`${rotta}: ${[...new Set(casi)].join(" | ")}`);
  }
  if (sporche.length) throw new Error(sporche.join("  ///  "));
});

await check("le tre pagine si raggiungono l'una dall'altra", async () => {
  await page.goto(BASE + "/privacy", { waitUntil: "networkidle" });
  const nav = page.getByRole("navigation", { name: "Documenti legali" });
  const href = await nav.locator("a").evaluateAll((a) => a.map((x) => new URL(x.href).pathname));
  for (const atteso of ["/", "/privacy", "/cookie", "/termini"]) {
    if (!href.includes(atteso)) throw new Error("manca il collegamento a " + atteso + " (trovati: " + href.join(",") + ")");
  }
});

await check("i rimandi incrociati dentro i testi puntano a pagine vere", async () => {
  for (const rotta of ["/privacy", "/cookie", "/termini"]) {
    await page.goto(BASE + rotta, { waitUntil: "networkidle" });
    const interni = await page.locator("main a[href^='/']").evaluateAll((a) => [...new Set(a.map((x) => new URL(x.href).pathname))]);
    for (const h of interni) {
      const res = await page.request.get(BASE + h);
      if (!res.ok()) throw new Error(`${rotta} rimanda a ${h}: HTTP ${res.status()}`);
    }
  }
});

// ------------------------------------------------ 3. piede e security.txt
await check("il piede della landing identifica il prestatore", async () => {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const t = await page.locator("footer").innerText();
  for (const s of ["Evalis S.r.l.", "04868330616", "Via Sandro Botticelli 25"]) {
    if (!t.includes(s)) throw new Error("manca: " + s);
  }
});

await check("security.txt è servito e ha una scadenza futura", async () => {
  const r = await page.request.get(BASE + "/.well-known/security.txt");
  if (!r.ok()) throw new Error("HTTP " + r.status());
  const t = await r.text();
  const m = t.match(/Expires:\s*(\S+)/);
  if (!m) throw new Error("manca Expires");
  if (new Date(m[1]) <= new Date()) throw new Error("scaduto: " + m[1]);
  if (!/Contact:\s*mailto:/.test(t)) throw new Error("manca Contact");
});

// ------------------------------- 4. l'app porta ai testi legali, il PDF no
await check("dentro l'app i legali sono raggiungibili dal piede", async () => {
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill("#email", process.env.QA_EMAIL ?? "");
  await page.fill("#password", process.env.QA_PASSWORD ?? "");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 60000 });
  const href = await page.locator("footer a").evaluateAll((a) => a.map((x) => new URL(x.href).pathname));
  for (const atteso of ["/privacy", "/cookie", "/termini"]) {
    if (!href.includes(atteso)) throw new Error("manca " + atteso + " (trovati: " + href.join(",") + ")");
  }
});

await check("l'informativa NON compare dentro un documento pubblicato", async () => {
  const doc = await page.evaluate(async () => {
    const a = [...document.querySelectorAll('a[href^="/documento/"]')][0];
    return a ? a.getAttribute("href") : null;
  });
  if (!doc) { console.log("       (nessun documento pubblicato: controllo saltato)"); return; }
  const p2 = await ctx.newPage();
  await p2.evaluate(() => localStorage.removeItem("evalisdeck-cookie-informativa")).catch(() => {});
  await p2.goto(BASE + doc, { waitUntil: "networkidle" });
  await p2.evaluate(() => localStorage.removeItem("evalisdeck-cookie-informativa"));
  await p2.reload({ waitUntil: "networkidle" });
  await p2.waitForTimeout(1200);
  const n = await p2.getByRole("region", { name: "Informativa sui cookie" }).count();
  await p2.close();
  if (n) throw new Error("la nota finirebbe stampata nel PDF consegnato al cliente");
});

// ------------------------------------------------------- 5. viste e temi
await page.goto(BASE + "/privacy", { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/01-privacy.png`, fullPage: false });
await page.goto(BASE + "/cookie", { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/02-cookie.png` });
await page.goto(BASE + "/termini", { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/03-termini.png` });
await ctx.close();

const ctxDark = await browser.newContext({ viewport: { width: 1440, height: 950 } });
await ctxDark.addInitScript(() => window.localStorage.setItem("theme", "dark"));
const dark = await ctxDark.newPage();
dark.on("console", (m) => { if (m.type() === "error") errors.push(`[dark] ${m.text()}`); });
dark.on("pageerror", (e) => errors.push(`[dark pageerror] ${e.message}`));
await dark.goto(BASE + "/cookie", { waitUntil: "networkidle" });
await check("tema scuro applicato e nota leggibile", async () => {
  if (!(await dark.evaluate(() => document.documentElement.classList.contains("dark")))) throw new Error("tema scuro non applicato");
  await dark.getByRole("region", { name: "Informativa sui cookie" }).waitFor({ timeout: 10000 });
});
await dark.screenshot({ path: `${OUT}/04-cookie-scuro.png` });
await ctxDark.close();

const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const m = await ctxM.newPage();
m.on("console", (x) => { if (x.type() === "error") errors.push(`[mobile] ${x.text()}`); });
m.on("pageerror", (e) => errors.push(`[mobile pageerror] ${e.message}`));
await check("su mobile le pagine legali non sbordano e le tabelle scorrono da sole", async () => {
  for (const rotta of ["/privacy", "/cookie", "/termini"]) {
    await m.goto(BASE + rotta, { waitUntil: "networkidle" });
    const sborda = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (sborda) throw new Error(rotta + " scorre in orizzontale");
  }
});
await check("su mobile la nota resta leggibile e il pulsante è raggiungibile", async () => {
  await m.goto(BASE + "/", { waitUntil: "networkidle" });
  const b = m.getByRole("button", { name: "Ho capito" });
  await b.waitFor({ timeout: 10000 });
  const box = await b.boundingBox();
  if (!box || box.height < 28) throw new Error("pulsante troppo piccolo: " + JSON.stringify(box));
  await b.click();
  await m.waitForTimeout(300);
  if (await m.getByRole("region", { name: "Informativa sui cookie" }).count()) throw new Error("non si chiude");
});
await m.goto(BASE + "/termini", { waitUntil: "networkidle" });
await m.screenshot({ path: `${OUT}/05-termini-mobile.png`, fullPage: false });
await ctxM.close();
await browser.close();

console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(errors.length ? "ERRORI CONSOLE:\n" + errors.join("\n") : "Console pulita.");
process.exit(ko || errors.length ? 1 : 0);
