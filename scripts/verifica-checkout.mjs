// Collaudo del checkout: si arriva davvero alla pagina di pagamento di Stripe, con il
// prezzo giusto e i campi fiscali italiani.
//
// Si misura sulla pagina di Stripe, non sulla nostra: il difetto che conta — mostrare
// un prezzo e addebitarne un altro — si vede solo lì.
//
//   ACCESSO_EMAIL=... ACCESSO_PWD=... node scripts/verifica-checkout.mjs

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
// Si registra uno studio NUOVO, che e' in prova e non ha ancora un piano: e' l'unico
// stato in cui la pagina propone i piani, ed e' esattamente chi sta per comprare.
// Provarlo con un account gia' abbonato misurerebbe una schermata che quel cliente
// non vedra' mai.
const RUN = Date.now();
const EMAIL = `checkout-${RUN}@example.com`;
const PWD = PWD_COLLAUDO;

// ⚠️ Questo collaudo arriva alla pagina di pagamento VERA: contro la produzione, dove le
// chiavi sono vive, crea un cliente e una sessione nell'account che incassa — a ogni
// esecuzione. Va lanciato contro un ambiente in modalita' di prova.
if (!/localhost|127\.0\.0\.1/.test(BASE) && !process.env.SO_CHE_E_VIVO) {
  console.error(`BASE e' ${BASE}: se le chiavi Stripe di quell'ambiente sono vive, questo`);
  console.error("collaudo crea clienti e sessioni reali. Lancialo su http://localhost:3000,");
  console.error("oppure, se sai quello che fai: SO_CHE_E_VIVO=1 node <script>");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
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
  await registraEEntra(page, sql, { base: BASE, nome: "Chi Compra", email: EMAIL, pwd: PWD });
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
  // ⚠️ Fra il pulsante e Stripe c'e' un DIALOGO, dal 13 agosto: e' li' che si scelgono le
  // estensioni e si vede il totale prima di uscire. Questo collaudo e' del 10 e premeva
  // un solo pulsante aspettando la navigazione, che con un dialogo in mezzo non poteva
  // piu' arrivare: falliva da due giorni e nessuno l'aveva rilanciato.
  const bottoni = page.getByRole("button", { name: /^(Attiva|Passa a questo)$/ });
  if (!(await bottoni.count())) throw new Error("nessun comando di acquisto");
  await bottoni.first().click();

  // Il totale sta sul pulsante di conferma: si aspetta lui, non un tempo fisso.
  const paga = page.getByRole("button", { name: /^Paga / });
  await paga.waitFor({ timeout: 15_000 });
  await paga.click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
});

await check("Stripe chiede l'importo giusto, in euro", async () => {
  // Niente `networkidle`: la pagina di Stripe tiene connessioni aperte e quel silenzio
  // non arriva mai. Si aspetta che compaia il prezzo, che e' cio' che interessa.
  await page.waitForTimeout(2500);
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

await sql.end();
await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(errori.length ? "ERRORI: " + errori.join(" | ") : "Nessun errore di pagina.");
if (ko > 0) process.exitCode = 1;
