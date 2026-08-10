// Collaudo del checkout: si arriva davvero alla pagina di pagamento di Stripe, con il
// prezzo giusto e i campi fiscali italiani.
//
// Si misura sulla pagina di Stripe, non sulla nostra: il difetto che conta — mostrare
// un prezzo e addebitarne un altro — si vede solo lì.
//
//   ACCESSO_EMAIL=... ACCESSO_PWD=... node scripts/verifica-checkout.mjs

import { chromium } from "@playwright/test";
import "dotenv/config";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
// Si registra uno studio NUOVO, che e' in prova e non ha ancora un piano: e' l'unico
// stato in cui la pagina propone i piani, ed e' esattamente chi sta per comprare.
// Provarlo con un account gia' abbonato misurerebbe una schermata che quel cliente
// non vedra' mai.
const RUN = Date.now();
const EMAIL = `checkout-${RUN}@example.com`;
const PWD = "PasswordSicura123!";

const errori = [];
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]); }
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
await ctx.addInitScript(() => {
  try { localStorage.setItem("evalisdeck-tour:portfolio", "1"); } catch {}
});
const page = await ctx.newPage();
page.on("pageerror", (e) => errori.push(e.message));

await check("uno studio in prova arriva alla pagina dell'abbonamento", async () => {
  await page.goto(`${BASE}/registrati`, { waitUntil: "networkidle" });
  await page.fill("#nome", "Chi Compra");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PWD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 60_000 });
  const rifiuta = page.getByRole("button", { name: "Rifiuta", exact: true });
  if (await rifiuta.count()) { await rifiuta.click(); await page.waitForTimeout(400); }
  await page.goto(`${BASE}/impostazioni/abbonamento`, { waitUntil: "networkidle" });
});

await check("i prezzi di lancio si vedono col listino barrato", async () => {
  const t = await page.locator("main").innerText();
  for (const atteso of ["1.450 €", "2.900 €", "600 €", "2.700 €"]) {
    if (!t.includes(atteso)) throw new Error(`manca ${atteso}`);
  }
  const barrati = await page.locator("main .line-through").count();
  if (barrati < 3) throw new Error(`solo ${barrati} prezzi barrati`);
  if (!/Prezzi di lancio, validi fino al/.test(t)) throw new Error("la scadenza non è dichiarata");
});

await check("il comando porta alla pagina di pagamento di Stripe", async () => {
  const bottoni = page.getByRole("button", { name: /Attiva|Passa a questo/ });
  if (!(await bottoni.count())) throw new Error("nessun comando di acquisto");
  await bottoni.first().click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
});

await check("Stripe chiede l'importo giusto, in euro", async () => {
  await page.waitForLoadState("networkidle");
  const t = await page.locator("body").innerText();
  // Il prezzo sulla pagina di Stripe è quello che verrà addebitato davvero: se non
  // coincide con quello mostrato da noi, è il difetto peggiore possibile.
  if (!/600,00|1\.450,00|2\.700,00/.test(t)) {
    throw new Error("importo inatteso sulla pagina di Stripe: " + t.slice(0, 200).replace(/\n/g, " "));
  }
  if (!/€/.test(t)) throw new Error("valuta non in euro");
});

await check("chiede i dati fiscali italiani (partita IVA e codice destinatario)", async () => {
  const t = await page.locator("body").innerText();
  if (!/Codice destinatario o PEC/i.test(t)) throw new Error("manca il campo per la fattura elettronica");
  if (!/(Partita IVA|codice fiscale|Aggiungi.*IVA|Tax ID|IVA)/i.test(t)) {
    throw new Error("non è possibile inserire la partita IVA");
  }
});

await check("la pagina è in italiano", async () => {
  const t = await page.locator("body").innerText();
  if (!/(Iscriviti|Abbonati|Paga|Riepilogo|Informazioni di fatturazione|Indirizzo)/i.test(t)) {
    throw new Error("sembra non essere in italiano: " + t.slice(0, 120).replace(/\n/g, " "));
  }
});

await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(errori.length ? "ERRORI: " + errori.join(" | ") : "Nessun errore di pagina.");
if (ko > 0) process.exitCode = 1;
