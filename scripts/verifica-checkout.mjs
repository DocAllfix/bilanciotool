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
import { PIANI, CHIAVI_PIANO, ESTENSIONI, euro, prezzoDiVendita } from "../src/lib/prezzi.ts";

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

await check("i prezzi del listino si vedono nell'offerta", async () => {
  const t = await page.locator("body").innerText();
  // Gli importi si DERIVANO dal listino: scritti a mano invecchiano al primo cambio di
  // fasce, e il collaudo accusa il prodotto di un difetto che non ha.
  for (const k of CHIAVI_PIANO) {
    const v = prezzoDiVendita(PIANI[k], "anno1");
    if (v && !t.includes(euro(v.importo))) throw new Error(`manca ${euro(v.importo)} (${PIANI[k].nome})`);
  }
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

/**
 * Gli importi presenti in un testo, come NUMERI.
 *
 * ⚠️ «1.450,00» vale millequattrocentocinquanta: `parseFloat` legge `1.450` e restituisce
 * UNO virgola quattrocentocinquanta, senza sollevare niente. Questo progetto quel difetto
 * l'ha gia' pagato sui compensi, ed e' il motivo per cui la conversione sta qui in un
 * posto solo invece di essere riscritta a ogni controllo.
 */
function leggiImporti(testo) {
  return [...testo.matchAll(/(\d{1,3}(?:\.\d{3})*),(\d{2})\s*€|€\s*(\d{1,3}(?:\.\d{3})*),(\d{2})/g)]
    .map((m) => Number(`${(m[1] ?? m[3]).replace(/\./g, "")}.${m[2] ?? m[4]}`))
    .filter((n) => n > 0);
}

await check("Stripe chiede l'importo giusto, in euro", async () => {
  // Niente `networkidle`: la pagina di Stripe tiene connessioni aperte e quel silenzio
  // non arriva mai. Si aspetta che compaia il prezzo, che e' cio' che interessa.
  await page.waitForTimeout(2500);
  const t = await page.locator("body").innerText();
  // Il prezzo sulla pagina di Stripe è quello che verrà addebitato davvero: se non
  // coincide con quello mostrato da noi, è il difetto peggiore possibile.
  //
  // ⚠️ GLI IMPORTI SI DERIVANO DAL LISTINO. Qui c'erano `600,00|1.450,00|2.700,00` scritti
  // a mano: sono gli importi di prima del 27 agosto 2026, e da quel giorno questo controllo
  // era rosso — accusando Stripe di chiedere una cifra sbagliata mentre chiedeva
  // esattamente quella giusta. Nessuno se n'era accorto perché nessuno lo rilanciava.
  // Il listino è già importato in cima a questo file: non c'è ragione di ricopiarlo.
  // ⚠️ Si confrontano i NUMERI, non le stringhe: `euro(59000)` rende «590 €» mentre la
  // pagina di Stripe scrive «590,00 €». Confrontando il testo formattato il controllo
  // fallirebbe su una differenza di formattazione dichiarandola una differenza di
  // importo — cioè accuserebbe Stripe di chiedere una cifra sbagliata mentre chiede
  // esattamente quella giusta.
  const attesi = CHIAVI_PIANO.map((k) => prezzoDiVendita(PIANI[k], "anno1"))
    .filter(Boolean)
    .map((v) => v.importo / 100);
  const inPagina = leggiImporti(t);
  if (!attesi.some((a) => inPagina.some((n) => Math.abs(n - a) < 0.005))) {
    throw new Error(
      `importo inatteso: nessuno fra ${attesi.join(" · ")} — in pagina ${inPagina.join(" · ")}`,
    );
  }
  if (!/€/.test(t)) throw new Error("valuta non in euro");
});

// ⚠️ IL CODICE SCONTO SI PROVA SULLA PAGINA CHE ADDEBITA, non su Stripe via API.
//
// Che il coupon esista lo dice `stripe-sconto.mjs`; che il CLIENTE possa digitarlo e che
// l'importo scenda davvero lo dice solo questa pagina. Sono due fatti diversi, e fra i due
// ci sono `allow_promotion_codes`, il codice attivo, e il fatto che il coupon si applichi
// a quel prezzo: tre modi di avere un codice che esiste e non funziona.
//
// ⚠️ La percentuale si MISURA, non si confronta con un importo scritto qui: si legge il
// totale prima, si applica, si rilegge, e si verifica il rapporto. Un importo atteso
// scritto a mano diventa rosso al primo cambio di listino per un motivo che col codice
// sconto non c'entra — è già successo a questo stesso file il 27 agosto 2026.
await check("il codice sconto si applica, e toglie davvero il 25%", async () => {
  const CODICE = "PMIINTERNATIONAL25";
  const importi = async () => leggiImporti(await page.locator("body").innerText());

  const prima = Math.max(...(await importi()));
  if (!Number.isFinite(prima) || prima <= 0) throw new Error("nessun importo leggibile prima dello sconto");

  // Il comando per aprire il campo cambia etichetta fra le versioni della pagina: si
  // provano le forme note e si fallisce dicendo QUALE non si è trovato, invece di morire
  // con un timeout che non spiega niente.
  // ⚠️ Il campo può già essere aperto, oppure stare dietro un comando la cui etichetta
  // cambia fra le versioni della pagina di Stripe. Si cerca prima il CAMPO — che è la cosa
  // che serve — e solo se non c'è si prova ad aprirlo. E quando nemmeno il comando c'è, il
  // messaggio elenca i comandi che la pagina offre davvero, invece di lasciare un timeout
  // che non dice niente: senza quell'elenco la diagnosi parte dall'ipotesi sbagliata.
  const campoDiretto = page.locator(
    'input[placeholder*="odice" i], input[placeholder*="promo" i], input[name*="promo" i], #promotionCode',
  );
  if (!(await campoDiretto.count())) {
    const apri = page
      .getByRole("button", { name: /codice promozionale|promotion code|Aggiungi codice|Aggiungi un codice/i })
      .first();
    if (!(await apri.count())) {
      const comandi = await page.getByRole("button").allInnerTexts();
      const link = await page.getByRole("link").allInnerTexts();
      throw new Error(
        "nessun campo né comando per il codice promozionale — `allow_promotion_codes` è spento? " +
          `Comandi in pagina: ${[...comandi, ...link].map((x) => x.trim()).filter(Boolean).slice(0, 12).join(" | ")}`,
      );
    }
    await apri.click();
  }

  const campo = (await campoDiretto.count())
    ? campoDiretto.first()
    : page
        .locator('input[placeholder*="odice" i], input[placeholder*="promo" i], input[name*="promo" i], #promotionCode')
        .first();
  await campo.waitFor({ timeout: 15_000 });
  await campo.fill(CODICE);
  await page.getByRole("button", { name: /^(Applica|Apply)$/i }).first().click();

  // ⚠️ SI ASPETTA L'IMPORTO ATTESO, non «un numero piu' piccolo».
  //
  // La prima versione cercava il minimo fra gli importi minori del totale e trovava
  // **49,17**, che e' l'equivalente MENSILE che Stripe stampa accanto al prezzo annuo:
  // concludeva «sconto 91,67%» su una pagina in cui il codice non era stato applicato
  // affatto. Un controllo che prende per esito un numero che c'era gia' prima non misura
  // niente — ed e' peggio di nessun controllo, perche' sembra averlo misurato.
  //
  // Il fatto giusto e' preciso: dopo lo sconto deve comparire un importo che PRIMA non
  // c'era e che vale il 75% del totale, al centesimo.
  const atteso = Math.round(prima * 0.75 * 100) / 100;
  const eraGiaLi = (await importi()).some((n) => Math.abs(n - atteso) < 0.005);
  if (eraGiaLi) throw new Error(`${atteso} € era gia' in pagina prima dello sconto: la misura non proverebbe niente`);

  await page
    .waitForFunction(
      (att) =>
        [...document.body.innerText.matchAll(/(\d{1,3}(?:\.\d{3})*),(\d{2})/g)]
          .map((m) => Number(`${m[1].replace(/\./g, "")}.${m[2]}`))
          .some((n) => Math.abs(n - att) < 0.005),
      atteso,
      { timeout: 25_000 },
    )
    .catch(() => {});

  const testo = await page.locator("body").innerText();
  if (/non valido|invalid|scaduto|expired|Impossibile/i.test(testo)) {
    throw new Error(`Stripe rifiuta il codice: ${testo.slice(0, 140).split("\n").join(" ")}`);
  }
  const dopo = (await importi()).find((n) => Math.abs(n - atteso) < 0.005);
  if (dopo === undefined) {
    throw new Error(`atteso ${atteso} € (75% di ${prima}) e non compare — importi in pagina: ${(await importi()).join(" · ")}`);
  }
  console.log(`       ${prima.toFixed(2)} € → ${dopo.toFixed(2)} €  (−${((1 - dopo / prima) * 100).toFixed(1)}%)`);
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
