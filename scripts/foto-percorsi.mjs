// La sezione percorsi della vetrina, fotografata per essere GUARDATA.
//
// ⚠️ Non ha asserzioni, ed è deliberato: i collaudi funzionali dicono che la pagina si
// apre e che i collegamenti rispondono, e non possono dire che una scheda è rimasta
// orfana in fondo a una griglia o che una riga sfonda su un telefono. Le due cose si
// controllano in due modi diversi, e il secondo vuole un paio d'occhi.
//
// Misura però le due cose che l'occhio sbaglia: lo sfondamento orizzontale, e il numero
// di percorsi effettivamente resi contro quelli che il registro dichiara.
//
//   node scripts/foto-percorsi.mjs

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = "./foto";
mkdirSync(OUT, { recursive: true });

console.log(`\nBersaglio: ${BASE}\n`);

const browser = await chromium.launch({ headless: true });
const rilievi = [];

/** Il tema si applica RICARICANDO: scriverlo a pagina aperta è una corsa con
 *  l'idratazione di next-themes, e nella stessa esecuzione una foto esce chiara e
 *  l'altra scura senza che nulla sia cambiato. */
async function scatta(nome, { width, height, tema }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  // ⚠️ Tema e consenso si scrivono PRIMA del caricamento. Il banner dei cookie si chiude
  // anche premendo «Rifiuta», ma nasce comunque e copre il contenuto finche' non lo si
  // preme: nella prima foto aveva coperto due percorsi, e a occhio sembravano mancanti.
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("theme", t);
      localStorage.setItem("evalisdeck-consenso-v1", "rifiutato");
    } catch {}
  }, tema);
  await page.goto(`${BASE}/#percorsi`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#percorsi", { timeout: 30000 });

  // Si VERIFICA che il tema applicato sia quello chiesto: una foto che non dice in che
  // stato è stata presa fa perdere più tempo di quanta ne faccia risparmiare.
  const scuro = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  if (scuro !== (tema === "dark")) rilievi.push(`${nome}: tema chiesto «${tema}», applicato «${scuro ? "dark" : "light"}»`);

  // Se il banner c'e' lo stesso, la foto e' inservibile e va detto invece che taciuto.
  if (await page.getByRole("button", { name: /rifiuta/i }).first().isVisible().catch(() => false)) {
    rilievi.push(`${nome}: il banner dei cookie copre la sezione`);
  }

  // ⚠️ I `Reveal` animano all'ingresso, uno per volta. Saltare in fondo e tornare su NON
  // li fa scattare tutti: quelli in mezzo restano a opacita' zero e nella foto si vede un
  // buco bianco, che a occhio sembra un percorso mancante. Si scorre a passi.
  await page.evaluate(async () => {
    const passo = window.innerHeight / 2;
    for (let y = 0; y < document.body.scrollHeight; y += passo) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  await page.evaluate(() => document.querySelector("#percorsi")?.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(600);

  // Nessuna riga deve restare invisibile: e' la prova che lo scorrimento e' bastato.
  const spente = await page.evaluate(() =>
    [...document.querySelectorAll("#percorsi article")].filter((e) => {
      const o = getComputedStyle(e.parentElement ?? e).opacity;
      return Number(o) < 0.9;
    }).length,
  );
  if (spente) rilievi.push(`${nome}: ${spente} righe ancora trasparenti nella foto`);

  const sfondamento = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (sfondamento > 0) rilievi.push(`${nome}: la pagina sfonda di ${sfondamento}px in orizzontale`);

  const quanti = await page.locator("#percorsi article").count();
  const gruppi = await page.locator("#percorsi h2 ~ div > div > div:first-child p").count();

  const el = page.locator("#percorsi");
  await el.screenshot({ path: `${OUT}/percorsi-${nome}.png` });
  console.log(`  ${nome.padEnd(18)} ${quanti} percorsi · ${gruppi} intestazioni · sfondamento ${sfondamento}px`);
  await ctx.close();
  return quanti;
}

const resi = [];
resi.push(await scatta("chiaro", { width: 1440, height: 1100, tema: "light" }));
resi.push(await scatta("scuro", { width: 1440, height: 1100, tema: "dark" }));
resi.push(await scatta("telefono-390", { width: 390, height: 844, tema: "light" }));
resi.push(await scatta("telefono-360", { width: 360, height: 740, tema: "light" }));

// ⚠️ Il numero non si scrive a mano: si chiede alla pagina e si pretende che sia lo
// stesso ovunque. Un percorso che compare da desktop e non da telefono è un percorso che
// nessun collaudo funzionale segnalerebbe.
if (new Set(resi).size !== 1) rilievi.push(`percorsi resi diversi fra le larghezze: ${resi.join(", ")}`);

await browser.close();

console.log(`\nFoto in ${OUT}/ — vanno GUARDATE.`);
if (rilievi.length) {
  console.log("\n⚠️  Rilievi misurati:");
  for (const r of rilievi) console.log("   " + r);
  process.exitCode = 1;
} else {
  console.log("Nessuno sfondamento, tema corretto, stesso numero di percorsi a ogni larghezza.\n");
}
