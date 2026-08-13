// Il codice sconto alla cassa: c'è, si applica, e abbassa davvero il totale.
//
//   BASE=http://localhost:3000 CONTO=<email in prova> node scripts/verifica-buono.mjs
//
// Serve a rendere sicuro il collaudo dell'incasso vero: se il codice non attecchisse,
// alla cassa comparirebbe il prezzo pieno — e quel giorno, in modalità viva, sarebbero
// millecinquecento euro invece di quindici.

import { chromium } from "@playwright/test";
import Stripe from "stripe";
import "dotenv/config";
import { PIANI, euro, prezzoDiVendita } from "../src/lib/prezzi.ts";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const EMAIL = process.env.CONTO;
const PWD = process.env.PWD_CONTO ?? "PasswordSicura123!";
const CODICE = process.env.CODICE ?? "COLLAUDO99";
if (!EMAIL) { console.error("serve CONTO=<email>"); process.exit(1); }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
if (/_live_/.test(process.env.STRIPE_SECRET_KEY ?? "") && !process.env.SO_CHE_E_VIVO) {
  console.error("Chiave viva: questo collaudo apre una cassa reale. SO_CHE_E_VIVO=1 per procedere.");
  process.exit(1);
}

let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0].slice(0, 180)); }
};

const piano = PIANI.professional;
const pieno = prezzoDiVendita(piano, "anno1").importo;
const atteso = Math.round(pieno * 0.01); // buono al 99%
console.log(`  ${piano.nome}: pieno ${euro(pieno)} → atteso col codice ${euro(atteso)}\n`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
await ctx.addInitScript(() => { try { localStorage.setItem("evalisdeck-benvenuto", "1"); } catch {} });
const page = await ctx.newPage();

await check("il codice esiste ed è attivo su Stripe", async () => {
  const c = await stripe.promotionCodes.list({ code: CODICE, limit: 1 });
  if (!c.data[0]) throw new Error(`il codice ${CODICE} non esiste: esegui crea-buono-collaudo.mjs`);
  if (!c.data[0].active) throw new Error("il codice non è attivo");
});

await check("si arriva alla cassa", async () => {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PWD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 40_000 });
  const r = page.getByRole("button", { name: "Rifiuta", exact: true });
  if (await r.count()) await r.click();
  await page.goto(`${BASE}/impostazioni/abbonamento`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Attiva$/ }).first().click();
  await page.waitForTimeout(900);
  await page.getByRole("dialog").getByRole("button", { name: /^Paga / }).click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
  await page.waitForTimeout(5000);
});

// Il campo NON è un collegamento «aggiungi codice» da aprire: è un riquadro sempre
// visibile col pulsante «Applica» accanto. Cercarlo per il testo non lo trova, perché
// l'etichetta non finisce in `innerText`.
const campoCodice = () => page.locator('[class*="PromotionCodeEntry"] input').first();

await check("alla cassa c'è il campo per il codice sconto", async () => {
  if (!(await campoCodice().count())) throw new Error("nessun campo per il codice");
});

await check("il codice si applica e il totale scende", async () => {
  await campoCodice().fill(CODICE);
  // «Applica» compare accanto al campo solo quando c'è del testo: cercarlo prima di
  // scrivere non lo trova, e non è un difetto della cassa.
  const applica = page.getByRole("button", { name: /^Applica$/i }).first();
  await applica.waitFor({ timeout: 15_000 });
  await applica.click();
  await page.waitForTimeout(5000);
  const t = await page.locator("body").innerText();
  if (!t.includes(euro(atteso).replace(" €", ""))) {
    throw new Error(`il totale non è ${euro(atteso)}: ${t.replace(/\s+/g, " ").slice(0, 220)}`);
  }
  console.log(`       la cassa ora chiede ${euro(atteso)}`);
});

await check("il rinnovo NON è scontato: il buono vale una volta sola", async () => {
  // È il punto che rende il collaudo onesto: si prova l'incasso vero, non uno sconto
  // perpetuo che nel listino non esiste.
  const c = await stripe.promotionCodes.list({ code: CODICE, limit: 1, expand: ["data.promotion.coupon"] });
  const coupon = c.data[0]?.promotion?.coupon ?? c.data[0]?.coupon;
  const durata = typeof coupon === "object" ? coupon?.duration : null;
  if (durata !== "once") throw new Error(`durata del buono: ${durata}`);
});

await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
if (ko > 0) process.exitCode = 1;
