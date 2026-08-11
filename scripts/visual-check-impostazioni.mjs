// Collaudo delle Impostazioni: ogni scheda, ogni comando, chiaro/scuro/mobile.
//
// Registra un utente NUOVO dal form vero, così parte da uno studio in demo come qualunque
// visitatore. Non tocca il database per attivare l'account: la scheda Abbonamento vista da
// chi non ha ancora pagato è proprio quella che stava chiudendo un vicolo cieco.
//
//   node scripts/visual-check-impostazioni.mjs           (serve `npm run dev` o `npm start`)
//   BASE=https://evalisdeck.it node scripts/visual-check-impostazioni.mjs

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = process.env.SHOT_DIR ?? "./shots-impostazioni";
mkdirSync(OUT, { recursive: true });

const errori = [];
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]); }
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errori.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errori.push(`[pageerror] ${e.message}`));

const RUN = Date.now();
const email = `imp-${RUN}@example.com`;

// ---------------------------------------------------------------- registrazione
await check("un utente nuovo arriva al portafoglio", async () => {
  await registraEEntra(page, sql, { base: BASE, nome: "Chiara Bianchi", email: email, pwd: "PasswordSicura123!" });
});

// ------------------------------------------------- il vicolo cieco e' chiuso
await check("il banner demo porta all'abbonamento, non a una pagina vuota", async () => {
  const cta = page.getByRole("link", { name: /sblocca per le tue aziende/i });
  await cta.waitFor({ timeout: 10_000 });
  await cta.click();
  await page.waitForURL("**/impostazioni/abbonamento", { timeout: 20_000 });
  // `waitForURL` si accontenta del cambio di indirizzo: il contenuto puo' ancora essere in
  // arrivo, e si finisce per leggere la pagina precedente. E' successo davvero, e il
  // controllo sulla capacita' passava leggendo la dashboard, che pure dice «Aziende attive».
  await page.waitForLoadState("networkidle");
  await page.getByRole("heading", { name: /nessun piano attivo|professional|studio/i }).first().waitFor({ timeout: 15_000 });
  const testo = await page.locator("main").innerText();
  if (!/nessun piano attivo/i.test(testo)) throw new Error("non dice che non c'e' un piano");
  if (!/demo/i.test(testo)) throw new Error("non dichiara lo stato demo");
});

await check("chi non ha un piano vede il listino, con i tre livelli e le estensioni", async () => {
  const t = await page.locator("main").innerText();
  for (const atteso of ["Professional", "Studio Plus", "1.200 €", "2.900 €", "5.400 €", "900 €", "600 €"]) {
    if (!t.includes(atteso)) throw new Error("manca dal listino: " + atteso);
  }
});

await check("il listino NON compare sul sito pubblico", async () => {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const t = await p.locator("body").innerText();
  await p.close();
  for (const prezzo of ["1.200", "2.900", "5.400"]) {
    if (t.includes(prezzo)) throw new Error(`il prezzo ${prezzo} e' finito sulla landing`);
  }
});

await check("nessuna parola incollata a un importo (lo spazio mangiato dal JSX)", async () => {
  // Trovato dal vivo: «900 €l'anno». JSX perde lo spazio iniziale di un nodo di testo
  // quando la riga va a capo, e in una pagina di prezzi si legge come un refuso.
  // Si controlla sull'HTML reso, perche' e' li' che si manifesta.
  const html = await page.content();
  const casi = [...html.matchAll(/€[a-zA-Z]|\d(?:aziende|accessi|anno)/g)].map((m) => m[0]);
  if (casi.length) throw new Error("parole incollate: " + [...new Set(casi)].join(", "));
});

await check("la capacita' mostra quella di riserva finche' non c'e' un piano", async () => {
  const t = await page.locator("main").innerText();
  if (!/Aziende attive/.test(t)) throw new Error("manca la capacita' aziende");
  if (!/Accessi/.test(t)) throw new Error("manca la capacita' accessi");
});
await page.screenshot({ path: `${OUT}/01-abbonamento.png`, fullPage: true });

// --------------------------------------------------------------- scheda Studio
await check("le tre schede navigano, e solo una alla volta risulta attiva", async () => {
  await page.getByRole("link", { name: "Studio", exact: true }).click();
  await page.waitForURL("**/impostazioni", { timeout: 20_000 });
  await page.waitForLoadState("networkidle");
  const attive = await page.locator('nav[aria-label="Sezioni delle impostazioni"] [aria-current="page"]').allInnerTexts();
  if (attive.length !== 1) throw new Error("schede attive: " + attive.join(", "));
  if (attive[0] !== "Studio") throw new Error("attiva la scheda sbagliata: " + attive[0]);
});

await check("lo studio si rinomina davvero, e il nuovo nome resta dopo il ricarico", async () => {
  const campo = page.locator("#nome-studio");
  await campo.waitFor({ timeout: 10_000 });
  const nuovo = `Studio Rinominato ${RUN}`;
  await campo.fill(nuovo);
  await page.getByRole("button", { name: "Salva" }).click();
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: "networkidle" });
  const valore = await page.locator("#nome-studio").inputValue();
  if (valore !== nuovo) throw new Error("dopo il ricarico: " + valore);
});
await page.screenshot({ path: `${OUT}/02-studio.png`, fullPage: true });

// --------------------------------------------------------------- scheda Membri
await check("i membri elencano il titolare, e il conteggio accessi e' coerente", async () => {
  await page.getByRole("link", { name: "Membri", exact: true }).click();
  await page.waitForURL("**/impostazioni/membri", { timeout: 20_000 });
  await page.waitForLoadState("networkidle");
  const t = await page.locator("main").innerText();
  if (!t.includes(email)) throw new Error("il titolare non compare nell'elenco");
  if (!/owner/i.test(t)) throw new Error("manca il ruolo");
  if (!/1 di \d+ accessi/.test(t)) throw new Error("conteggio accessi assente o storto: " + t.slice(0, 120));
});

await check("il titolare non puo' rimuovere se stesso", async () => {
  const rimuovi = await page.getByRole("button", { name: "Rimuovi" }).count();
  if (rimuovi !== 0) throw new Error("compare un comando di rimozione sull'unico membro");
});

await check("un invito parte davvero e compare fra quelli in attesa", async () => {
  const invitato = `collega-${RUN}@example.com`;
  await page.fill("#invita-email", invitato);
  await page.getByRole("button", { name: /invia invito/i }).click();
  await page.waitForTimeout(3000);
  const t = await page.locator("main").innerText();
  if (!t.includes(invitato)) throw new Error("l'invito non compare in attesa di risposta");
  if (!/scade il/i.test(t)) throw new Error("manca la scadenza dell'invito");
});

await check("l'invito si revoca, e sparisce", async () => {
  const invitato = `collega-${RUN}@example.com`;
  await page.getByRole("button", { name: new RegExp(`revoca l'invito a ${invitato}`, "i") }).click();
  await page.waitForTimeout(3000);
  const t = await page.locator("main").innerText();
  if (t.includes(invitato)) throw new Error("l'invito revocato e' ancora li'");
});
await page.screenshot({ path: `${OUT}/03-membri.png`, fullPage: true });

// ------------------------------------------------------------------ temi e mobile
await ctx.close();

const scuro = await browser.newContext({ viewport: { width: 1440, height: 950 } });
await scuro.addInitScript(() => window.localStorage.setItem("theme", "dark"));
const pd = await scuro.newPage();
pd.on("console", (m) => { if (m.type() === "error") errori.push(`[scuro] ${m.text()}`); });
await check("tema scuro: si accede e le impostazioni si leggono", async () => {
  await pd.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await pd.fill("#email", email);
  await pd.fill("#password", "PasswordSicura123!");
  await pd.click('button[type="submit"]');
  await pd.waitForURL("**/dashboard", { timeout: 40_000 });
  await pd.goto(`${BASE}/impostazioni/abbonamento`, { waitUntil: "networkidle" });
  if (!(await pd.evaluate(() => document.documentElement.classList.contains("dark")))) {
    throw new Error("tema scuro non applicato");
  }
});
await pd.screenshot({ path: `${OUT}/04-abbonamento-scuro.png`, fullPage: true });
await scuro.close();

const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const pm = await mob.newPage();
pm.on("console", (m) => { if (m.type() === "error") errori.push(`[mobile] ${m.text()}`); });
await check("su telefono nessuna scheda sborda in orizzontale", async () => {
  await pm.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await pm.fill("#email", email);
  await pm.fill("#password", "PasswordSicura123!");
  await pm.click('button[type="submit"]');
  await pm.waitForURL("**/dashboard", { timeout: 40_000 });
  for (const rotta of ["/impostazioni", "/impostazioni/membri", "/impostazioni/abbonamento"]) {
    await pm.goto(`${BASE}${rotta}`, { waitUntil: "networkidle" });
    const sborda = await pm.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (sborda) throw new Error(rotta + " scorre in orizzontale");
  }
});
await pm.screenshot({ path: `${OUT}/05-abbonamento-mobile.png`, fullPage: true });
await mob.close();

await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(errori.length ? "ERRORI CONSOLE:\n" + errori.join("\n") : "Console pulita.");
if (ko > 0 || errori.length) process.exitCode = 1;
