// Le pagine pubbliche dei percorsi, una per una.
//
//   npm run qa -- pagine-percorso [--prod | --su https://…]
//
// SOLA LETTURA: non registra niente, quindi può girare anche sul sito vero.
//
// ⚠️ Gli slug si leggono dal file dei CONTENUTI, non da un elenco scritto qui: una pagina nuova
// entra da sola nel controllo. E si confrontano con l'indice `/percorsi` e con la sitemap: tre
// posti che devono dire la stessa cosa, ed è il modo di accorgersi se uno resta indietro.

import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { strumenta, contatore, attraversaProtezione, spegniTour, fattoreAttesa } from "./comune-collaudo.mjs";
import { PIANI, euro, prezzoDiVendita, costoAnnuoMensile } from "../src/lib/prezzi.ts";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
console.log(`\nPagine dei percorsi — ${BASE}\n`);

const sorgente = readFileSync("src/features/vetrina/contenuti.ts", "utf8");
const SLUG = [...sorgente.matchAll(/^\s+slug: "([a-z0-9-]+)",$/gm)].map((m) => m[1]);
if (SLUG.length < 3) throw new Error(`trovati solo ${SLUG.length} slug: la lettura del file è rotta`);

const piano = PIANI.azienda;
const anno = prezzoDiVendita(piano, "anno");
const mese = prezzoDiVendita(piano, "mese");

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
// La scelta sui cookie è già fatta: il banner coprirebbe i comandi in fondo alla pagina.
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("evalisdeck-consenso-v2", "rifiutato");
  } catch {}
});
const pagina = await ctx.newPage();
await attraversaProtezione(pagina);
const sonda = strumenta(pagina);
const { agisci, riepilogo } = contatore(pagina, sonda);

const apri = async (p, percorso) => {
  const r = await p.goto(`${BASE}${percorso}`, { waitUntil: "domcontentloaded", timeout: 60_000 * fattoreAttesa() });
  if (r.status() !== 200) throw new Error(`${percorso} risponde ${r.status()}`);
  await p.locator("main h1").first().waitFor({ timeout: 30_000 * fattoreAttesa() });
  await spegniTour(p);
};

await agisci("l'indice elenca tutte le pagine dei percorsi", async () => {
  await apri(pagina, "/percorsi");
  const link = await pagina.locator('main a[href^="/percorsi/"]').evaluateAll((a) => a.map((x) => x.getAttribute("href")));
  const trovati = new Set(link.map((h) => h.replace("/percorsi/", "")));
  for (const s of SLUG) if (!trovati.has(s)) throw new Error(`l'indice non collega «${s}»`);
  return `${SLUG.length} pagine`;
});

await agisci("la home collega le pagine dei percorsi dalle loro schede", async () => {
  await apri(pagina, "/");
  const n = await pagina.locator('#percorsi a[href^="/percorsi/"]').evaluateAll((a) => new Set(a.map((x) => x.getAttribute("href"))).size);
  if (n !== SLUG.length) throw new Error(`la home ne collega ${n}, le pagine sono ${SLUG.length}`);
});

await agisci("la sitemap le elenca tutte, con l'indice", async () => {
  const xml = await (await pagina.request.get(`${BASE}/sitemap.xml`)).text();
  if (!/\/percorsi<\/loc>/.test(xml)) throw new Error("manca l'indice /percorsi");
  for (const s of SLUG) if (!xml.includes(`/percorsi/${s}<`)) throw new Error(`manca «${s}»`);
});

for (const slug of SLUG) {
  await agisci(`${slug}: dice perché, per chi, che cosa fa, e che cosa si consegna`, async () => {
    await apri(pagina, `/percorsi/${slug}`);
    const t = await pagina.locator("main").innerText();

    // Il corpo: ogni affermazione normativa porta la sua fonte, stampata.
    const dolori = await pagina.locator("[data-dolori] li").count();
    const fonti = await pagina.locator("[data-dolori] [data-fonte]").count();
    if (!dolori) throw new Error("nessun problema in pagina");
    if (fonti !== dolori) throw new Error(`${dolori} problemi, ${fonti} fonti`);
    if (!(await pagina.locator("[data-documenti] li").count())) throw new Error("non dice che cosa si consegna");
    for (const atteso of [/Per chi è/i, /Che cosa fa, esattamente/i, /Prima e dopo/i, /Domande/i]) {
      if (!atteso.test(t)) throw new Error(`manca la sezione ${atteso}`);
    }
    // ⚠️ Il testo pubblico non porta trattini lunghi né nomi di ciò che non si vende più.
    if (/Fondatori|Fino a 5 aziende|blocchi da/i.test(t)) throw new Error("nomina qualcosa che non si vende più");
    if (/\bstudio di consulenza\b/i.test(t.slice(0, 400))) throw new Error("apre parlando agli studi, non all'azienda");
  });

  await agisci(`${slug}: il prezzo è quello del listino, e il barrato è vero`, async () => {
    const blocco = pagina.locator(`[data-prezzo-fascia="${piano.key}"]`).first();
    const t = await blocco.innerText();
    if (!t.includes(euro(anno.importo))) throw new Error(`non mostra ${euro(anno.importo)}`);
    const barrato = (await blocco.locator("[data-barrato]").innerText()).replace(/invece di/i, "").trim();
    if (barrato !== euro(costoAnnuoMensile(piano))) throw new Error(`barrato «${barrato}»`);
    const cta = await pagina.locator(`[data-attiva="${piano.key}"]`).first().getAttribute("href");
    if (cta !== `/attiva/${piano.key}`) throw new Error(`il comando porta a ${cta}`);
    // L'interruttore cambia davvero prezzo e destinazione.
    await pagina.locator('[data-interruttore-periodo] [data-periodo="mese"]').first().click();
    const m = await pagina.locator(`[data-prezzo-fascia="${piano.key}"]`).first().innerText();
    if (!m.includes(euro(mese.importo))) throw new Error(`col mensile non mostra ${euro(mese.importo)}`);
    const ctaMese = await pagina.locator(`[data-attiva="${piano.key}"]`).first().getAttribute("href");
    if (!ctaMese.includes("periodo=mese")) throw new Error(`col mensile il comando porta a ${ctaMese}`);
  });

  await agisci(`${slug}: dati strutturati e domande coincidono con la pagina`, async () => {
    const blocchi = await pagina.locator('script[type="application/ld+json"]').allInnerTexts();
    const dati = blocchi.map((b) => JSON.parse(b));
    const faq = dati.find((d) => d["@type"] === "FAQPage");
    if (!faq?.mainEntity?.length) throw new Error("nessun FAQPage");
    const t = await pagina.locator("main").innerText();
    if (!t.includes(faq.mainEntity[0].name)) throw new Error("la prima domanda dei dati strutturati non è in pagina");
    if (!dati.some((d) => d["@type"] === "WebPage" && d.url?.endsWith(`/percorsi/${slug}`))) {
      throw new Error("il WebPage non dichiara l'indirizzo della pagina");
    }
  });

  await agisci(`${slug}: da telefono niente esce dallo schermo`, async () => {
    const tel = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
    await tel.addInitScript(() => {
      try {
        localStorage.setItem("evalisdeck-consenso-v2", "rifiutato");
      } catch {}
    });
    const p = await tel.newPage();
    await attraversaProtezione(p);
    await apri(p, `/percorsi/${slug}`);
    const sfonda = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await tel.close();
    if (sfonda > 0) throw new Error(`sfonda di ${sfonda}px a 360px`);
  });
}

await agisci("uno slug inventato risponde 404, non una pagina vuota", async () => {
  const r = await pagina.request.get(`${BASE}/percorsi/non-esiste`);
  if (r.status() !== 404) throw new Error(`risponde ${r.status()}`);
});

const esito = riepilogo("Pagine dei percorsi");
await browser.close();
// ⚠️ `riepilogo` restituisce i ROSSI: il vero va mappato su 1, non su 0.
process.exit(esito ? 1 : 0);
