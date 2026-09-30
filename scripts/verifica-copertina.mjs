// Logo e copertina su tutti i documenti, la copertina a pagina intera, e «Torna al percorso».
//
//   npm run qa -- copertina
//   COPERTINA=<percorso di un'immagine> SALVA_PDF=<cartella> npm run qa -- copertina
//
// ⚠️ TRE DIFETTI SEGNALATI DAL COMMITTENTE, provati dalla porta:
//   1. una copertina A4 già impaginata usciva ridotta a una fascia presa dal centro;
//   2. «Torna al percorso» non faceva niente (il documento si apre in una scheda nuova, e
//      `router.back()` in una scheda nuova non ha dove tornare);
//   3. logo e copertina esistevano solo nel bilancio.
// E un quarto trovato controllando: cambiare il logo dopo la pubblicazione impediva al
// documento pubblicato di aprirsi.
//
// L'immagine di prova si COSTRUISCE qui, verticale 2:3 come quella del committente — la
// proporzione che la fascia di 118 mm tagliava di più. Chi vuole vedere la propria copertina
// vera passa `COPERTINA=`, e con `SALVA_PDF=` il PDF finisce in quella cartella.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import {
  strumenta, contatore, spegniTour, attendi, fattoreAttesa, pagineDelPdf, pretendiServerAggiornato,
} from "./comune-collaudo.mjs";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const ANNO = new Date().getFullYear() - 1;
const email = `copertina-${RUN}@example.com`;

console.log(`\nLogo, copertina e ritorno al percorso — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const sonda = strumenta(page);
const { agisci, riepilogo } = contatore(page, sonda);

/** Un'immagine verticale 2:3 con una TESTATA rossa e un FONDO blu, costruita nel browser. */
async function copertinaDiProva() {
  if (process.env.COPERTINA) {
    const buffer = fs.readFileSync(process.env.COPERTINA);
    return { name: path.basename(process.env.COPERTINA), mimeType: "image/jpeg", buffer };
  }
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 1536;
    const g = c.getContext("2d");
    g.fillStyle = "#2e7d32";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#d32f2f";
    g.fillRect(0, 0, c.width, 120); // testata
    g.fillStyle = "#1565c0";
    g.fillRect(0, c.height - 120, c.width, 120); // fondo
    return c.toDataURL("image/jpeg", 0.9);
  });
  return { name: "copertina-a4.jpg", mimeType: "image/jpeg", buffer: Buffer.from(dataUrl.split(",")[1], "base64") };
}

const LOGO = {
  name: "logo.png",
  mimeType: "image/png",
  buffer: fs.readFileSync("public/brand/derivati/icona-192.png"),
};

// ─── preparazione: studio attivo, un'azienda ─────────────────────────────────
const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Copertine", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await spegniTour(page);
await page.click('[data-tour="nuova-azienda"]');
await page.fill("#na-nome", `Copertine ${String(RUN).slice(-6)} S.r.l.`);
await page.click('button[type="submit"]:has-text("Crea azienda")');
await page.waitForURL(/\/aziende\/[^/]+(\?|#|$)/, { timeout: 30_000 * fattoreAttesa() });
const companyId = page.url().match(/aziende\/([^/?#]+)/)[1];
await spegniTour(page);

const azienda = async () => (await sql`select * from company where id=${companyId}`)[0];

/** Pubblica dal pannello e restituisce la scheda del documento, aperta dalla pubblicazione. */
async function pubblica() {
  const [scheda] = await Promise.all([
    ctx.waitForEvent("page", { timeout: 90_000 * fattoreAttesa() }),
    page.locator('[data-tour="pubblica-documento"]').first().click(),
  ]);
  await scheda.waitForLoadState("domcontentloaded");
  await scheda.locator("article.doc-pagina").waitFor({ timeout: 60_000 * fattoreAttesa() });
  return scheda;
}

// ─── GHG: il documento che una copertina non l'aveva ─────────────────────────
await agisci("si apre il pannello di pubblicazione del GHG", async () => {
  await page.goto(`${BASE}/aziende/${companyId}/ghg`, { waitUntil: "domcontentloaded" });
  await page.fill("#ci-anno", String(ANNO));
  await page.click('button:has-text("Crea")');
  await page.waitForURL(`**/ghg/${ANNO}**`, { timeout: 40_000 * fattoreAttesa() });
  await spegniTour(page);
  await page.click('[data-tour="ghg-passo-8"]');
  await page.locator('[data-immagini="riepilogo"]').waitFor({ timeout: 30_000 * fattoreAttesa() });
});

await agisci("⚠️ il pannello dice che cosa userà il documento, prima di pubblicarlo", async () => {
  const r = page.locator('[data-immagini="riepilogo"]');
  await attendi(async () => /senza logo/.test(await r.innerText()), { cosa: "riepilogo iniziale" });
});

await agisci("⚠️ dal percorso si caricano logo e copertina, e finiscono sull'AZIENDA", async () => {
  await page.click('[data-immagini="apri"]');
  const d = page.getByRole("dialog");
  await d.waitFor();
  await d.getByLabel("Scegli il file: logo").setInputFiles(LOGO);
  await attendi(async () => !!(await azienda()).logo_storage_key, { cosa: "logo nel database" });
  await d.getByLabel("Scegli il file: copertina").setInputFiles(await copertinaDiProva());
  await attendi(async () => !!(await azienda()).cover_storage_key, { cosa: "copertina nel database" });
});

await agisci("⚠️ la copertina 2:3 va a PAGINA INTERA DA SOLA, e il riquadro dice perché", async () => {
  // Il 30 settembre una locandina A4 è uscita tagliata perché il modo partiva sempre
  // «fotografia». Ora lo sceglie il server dalla forma: qui NON si clicca niente.
  const d = page.getByRole("dialog");
  await attendi(async () => (await azienda()).copertina_modo === "pagina", { cosa: "modo pagina nel database" });
  const nota = d.locator('[data-immagini="modo-dalla-forma"]');
  await nota.waitFor({ timeout: 15_000 * fattoreAttesa() });
  if (!/pagina intera/.test(await nota.innerText())) throw new Error(`nota: «${await nota.innerText()}»`);
  if (process.env.FOTO) await d.screenshot({ path: path.join(process.env.FOTO, "copertina-modo-dalla-forma.png") });
});

await agisci("⚠️ si sceglie la copertina a PAGINA INTERA, e il database lo sa", async () => {
  const d = page.getByRole("dialog");
  await d.locator('[data-immagini="modo-pagina"]').click();
  await attendi(async () => (await azienda()).copertina_modo === "pagina", { cosa: "modo pagina nel database" });
  if ((await d.locator('[data-immagini="modo-pagina"]').getAttribute("aria-checked")) !== "true") {
    throw new Error("la scelta non risulta selezionata");
  }
  await page.keyboard.press("Escape");
  await attendi(async () => /pagina intera/.test(await page.locator('[data-immagini="riepilogo"]').innerText()), {
    cosa: "riepilogo aggiornato",
  });
});

let docGhg = null;
let idGhg = null;
await agisci("⚠️ il GHG pubblicato si apre con la copertina a pagina intera", async () => {
  docGhg = await pubblica();
  idGhg = docGhg.url().match(/documento\/([^/?#]+)/)[1];
  const cop = docGhg.locator('[data-copertina="pagina"] img');
  await cop.waitFor({ timeout: 30_000 * fattoreAttesa() });
  await attendi(async () => (await cop.evaluate((i) => i.complete && i.naturalWidth > 0)), { cosa: "immagine caricata" });
});

await agisci("⚠️ a schermo la copertina NON è tagliata: proporzioni rese = proporzioni dell'immagine", async () => {
  const m = await docGhg.locator('[data-copertina="pagina"] img').evaluate((i) => {
    const r = i.getBoundingClientRect();
    return { resa: r.height / r.width, vera: i.naturalHeight / i.naturalWidth, fit: getComputedStyle(i).objectFit };
  });
  // Con la fascia di prima l'immagine 2:3 si vedeva larga 1,78 volte l'altezza: un terzo
  // dell'altezza, preso dal centro. Qui deve vedersi intera.
  if (Math.abs(m.resa - m.vera) > 0.01) {
    throw new Error(`resa ${m.resa.toFixed(3)} contro ${m.vera.toFixed(3)}: l'immagine è tagliata`);
  }
  if (m.fit === "cover") throw new Error("object-fit: cover sulla copertina a pagina intera");
  return `proporzioni ${m.vera.toFixed(3)}, intere`;
});

await agisci("⚠️ in STAMPA la copertina sta nei margini, intera, e NON allarga il documento", async () => {
  // ⚠️ La prima versione di questo controllo guardava la proprietà `page` e diceva verde,
  // mentre nel PDF vero il testo di ogni pagina era TAGLIATO sul bordo destro: la copertina
  // aveva `width: 210mm` dentro un'area stampabile di 180, e Chromium impaginava tutto il
  // documento su quella larghezza. Si misura la geometria, non la proprietà.
  //
  // La finestra si porta alla larghezza dell'area stampabile di un A4 (180 mm a 96 dpi):
  // `emulateMedia` cambia le regole, non le misure, e su 1440 px una copertina larga 210 mm
  // ci starebbe comodamente e il difetto non si vedrebbe.
  await docGhg.setViewportSize({ width: 680, height: 1000 });
  await docGhg.emulateMedia({ media: "print" });
  const m = await docGhg.evaluate(() => {
    const art = document.querySelector("article.doc-pagina");
    const cov = document.querySelector('[data-copertina="pagina"]');
    const img = cov.querySelector("img");
    return {
      eccesso: art.scrollWidth - art.clientWidth,
      copertina: cov.getBoundingClientRect().width,
      area: art.clientWidth,
      fit: getComputedStyle(img).objectFit,
      testo: !!cov.querySelector(".testo"),
    };
  });
  await docGhg.emulateMedia({ media: "screen" });
  await docGhg.setViewportSize({ width: 1440, height: 1000 });
  if (m.eccesso > 1) throw new Error(`il documento sborda di ${m.eccesso}px: il testo delle pagine verrebbe tagliato`);
  if (m.copertina > m.area + 1) throw new Error(`copertina larga ${m.copertina}px su ${m.area}px stampabili`);
  if (m.fit !== "contain") throw new Error(`in stampa object-fit è «${m.fit}», non «contain»`);
  if (m.testo) throw new Error("sulla copertina a pagina intera c'è ancora il nostro testo");
  return `copertina ${Math.round(m.copertina)}px su ${m.area}px, nessuno sbordo`;
});

await agisci("⚠️ il titolo resta nel documento, per chi non vede e per la ricerca", async () => {
  const h1 = await docGhg.locator('[data-copertina="pagina"] h1').innerText().catch(() => "");
  // `innerText` di un elemento nascosto alla vista può essere vuoto: si chiede il testo.
  const t = await docGhg.locator('[data-copertina="pagina"] h1').textContent();
  if (!t || !t.includes("Copertine")) throw new Error(`titolo assente: «${t ?? h1}»`);
});

// ⚠️ Il nome dice solo ciò che il controllo verifica: le pagine si CONTANO. Che la prima
// sia la copertina intera lo dice la fotografia del PDF (`SALVA_PDF=`), che va guardata.
await agisci("⚠️ il PDF si genera e ha le pagine", async () => {
  const r = await docGhg.request.get(`${BASE}/api/documenti/${idGhg}/pdf`, { timeout: 180_000 });
  if (!r.ok()) throw new Error(`PDF: ${r.status()}`);
  const buf = await r.body();
  const n = pagineDelPdf(buf);
  if (n < 2) throw new Error(`il PDF ha ${n} pagine`);
  if (process.env.SALVA_PDF) {
    fs.mkdirSync(process.env.SALVA_PDF, { recursive: true });
    fs.writeFileSync(path.join(process.env.SALVA_PDF, "copertina-pagina-intera-ghg.pdf"), buf);
  }
  return `${n} pagine, ${Math.round(buf.length / 1024)} KB`;
});

await agisci("⚠️ «Torna al percorso» porta al percorso di QUELL'esercizio", async () => {
  // Prima era `router.back()` in una scheda nuova: non faceva niente.
  await docGhg.locator('[data-doc="ritorno"]').click();
  await docGhg.waitForURL(`**/aziende/${companyId}/ghg/${ANNO}**`, { timeout: 30_000 * fattoreAttesa() });
  await docGhg.close();
});

await agisci("⚠️ cambiare modo e logo DOPO non tocca il documento pubblicato", async () => {
  await page.click('[data-immagini="apri"]');
  const d = page.getByRole("dialog");
  await d.locator('[data-immagini="modo-foto"]').click();
  await attendi(async () => (await azienda()).copertina_modo === "foto", { cosa: "modo foto" });
  const logoPrima = (await azienda()).logo_storage_key;
  await d.getByLabel("Scegli il file: logo").setInputFiles(LOGO);
  await attendi(async () => (await azienda()).logo_storage_key !== logoPrima, { cosa: "logo nuovo" });
  await page.keyboard.press("Escape");

  // ⚠️ Il pannello lo DICE: la versione pubblicata resta con le immagini di allora. Senza
  // questo avviso, il 30 settembre la copertina è stata cambiata due minuti dopo la
  // pubblicazione e nessuno sapeva che la v7 era rimasta quella tagliata.
  const avviso = page.locator('[data-immagini="superate"]');
  await avviso.waitFor({ timeout: 15_000 * fattoreAttesa() });
  if (!/v1/.test(await avviso.innerText())) throw new Error(`avviso: «${await avviso.innerText()}»`);
  if (process.env.FOTO) await avviso.locator("xpath=..").screenshot({ path: path.join(process.env.FOTO, "copertina-avviso-superate.png") });

  const p = await ctx.newPage();
  await p.goto(`${BASE}/documento/${idGhg}`, { waitUntil: "domcontentloaded" });
  await p.locator("article.doc-pagina").waitFor({ timeout: 60_000 * fattoreAttesa() });
  // Si apre (prima: «Firma URL fallita» e niente pagina), ed è ancora a pagina intera.
  if (!(await p.locator('[data-copertina="pagina"]').count())) throw new Error("il documento pubblicato ha cambiato copertina");
  const ok = await p.locator('[data-copertina="pagina"] img').evaluate((i) => i.complete && i.naturalWidth > 0);
  await p.close();
  if (!ok) throw new Error("l'immagine del documento pubblicato non si carica più");
});

// ─── Bilancio: il documento su cui il committente ha visto il difetto ─────────
await agisci("il Bilancio pubblicato ora porta la fotografia sopra il titolo, col logo", async () => {
  await page.goto(`${BASE}/aziende/${companyId}/bilancio`, { waitUntil: "domcontentloaded" });
  await page.fill("#cb-anno", String(ANNO));
  await page.click('button:has-text("Crea")');
  await page.waitForURL(`**/bilancio/${ANNO}**`, { timeout: 40_000 * fattoreAttesa() });
  await spegniTour(page);
  await page.click('[data-tour="bil-passo-7"]');
  await page.locator('[data-immagini="riepilogo"]').waitFor({ timeout: 30_000 * fattoreAttesa() });
  const doc = await pubblica();
  await doc.locator('[data-copertina="foto"]').waitFor({ timeout: 30_000 * fattoreAttesa() });
  const n = await doc.locator('[data-copertina="foto"] .logo img, [data-copertina="foto"] .foto img').count();
  await doc.locator('[data-doc="ritorno"]').click();
  await doc.waitForURL(`**/aziende/${companyId}/bilancio/${ANNO}**`, { timeout: 30_000 * fattoreAttesa() });
  await doc.close();
  if (n !== 2) throw new Error(`${n} immagini sulla copertina, attese 2 (logo e fotografia)`);
});

await agisci("⚠️ il passo 1 del Bilancio usa lo STESSO riquadro, non un caricatore proprio", async () => {
  // Il caricatore vecchio non aveva la scelta del modo e mostrava la copertina già tagliata
  // a fascia: la locandina del 30 settembre è passata da lì.
  await page.goto(`${BASE}/aziende/${companyId}/bilancio/${ANNO}`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  await page.click('[data-tour="bil-passo-1"]');
  const r = page.locator('[data-immagini="riepilogo"]');
  await r.waitFor({ timeout: 30_000 * fattoreAttesa() });
  if ((await page.locator('input[type="file"][accept="image/*"]').count()) > 0) {
    throw new Error("c'è ancora il caricatore vecchio del passo 1");
  }
  await r.locator('[data-immagini="apri"]').click();
  await page.getByRole("dialog").locator('[data-immagini="modo-pagina"]').waitFor();
  await page.keyboard.press("Escape");
});

const ko = riepilogo("Logo, copertina e ritorno al percorso");
await sql.end();
await browser.close();
if (ko > 0) process.exitCode = 1;
