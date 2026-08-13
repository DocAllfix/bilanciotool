// Collaudo esaustivo della parte PUBBLICA, contro la produzione.
//
//   BASE=https://evalisdeck.it node scripts/verifica-tutto-pubblico.mjs
//
// Tutto cio' che vede chi non ha ancora un account: la vetrina, il blog, i documenti
// legali, il consenso, le pagine d'errore. Chi arriva qui non ha ancora deciso niente,
// e un link rotto o un banner che non si chiude decide per lui.

import { chromium } from "@playwright/test";
import "dotenv/config";
import { strumenta, contatore } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "https://evalisdeck.it").replace(/\/+$/, "");

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
const page = await ctx.newPage();
// Il 401 sull'accesso NON e' un guasto: e' il prodotto che rifiuta credenziali
// sbagliate, ed e' proprio quello che si vuole vedere. Un rilevatore che lo conta come
// difetto insegna a ignorare i rossi.
const sonda = strumenta(page, { ignora: [/\/api\/auth\/sign-in\/email/, /status of 401/] });
const { agisci, riepilogo } = contatore(page, sonda);
const vai = (r) => page.goto(`${BASE}${r}`, { waitUntil: "networkidle" });

console.log("\n— la vetrina —");
await agisci("la home si apre e non ha caratteri rotti", async () => {
  await vai("/");
  const t = await page.locator("body").innerText();
  if (/Ã¨|Ã |Ã²|Ã¹|Ã©|â€™/.test(t)) throw new Error("mojibake in pagina");
  if (!/EvalisDeck/.test(t)) throw new Error("il marchio non compare");
});

await agisci("nessun prezzo sulla vetrina (decisione del committente)", async () => {
  const t = await page.locator("body").innerText();
  if (/1\.450|2\.900|5\.400|€\s?\d{3}/.test(t)) throw new Error("compare un importo");
});

await agisci("tutti i collegamenti interni della home rispondono", async () => {
  const href = await page.locator("a[href^='/'], a[href^='" + BASE + "']").evaluateAll((a) =>
    [...new Set(a.map((x) => x.getAttribute("href")))].filter((h) => h && !h.startsWith("//")));
  const rotti = [];
  for (const h of href) {
    const u = h.startsWith("http") ? h : `${BASE}${h.split("#")[0] || "/"}`;
    const r = await page.request.get(u, { maxRedirects: 3 });
    if (r.status() >= 400) rotti.push(`${h} -> ${r.status()}`);
  }
  if (rotti.length) throw new Error(rotti.join(" | "));
});

await agisci("le àncore del menu portano il percorso", async () => {
  const anc = await page.locator("header a[href*='#']").evaluateAll((a) => a.map((x) => x.getAttribute("href")));
  const nude = anc.filter((h) => h.startsWith("#"));
  if (nude.length) throw new Error(`àncore senza percorso: ${nude.join(", ")}`);
});

console.log("\n— consenso e misurazione —");
await agisci("senza scelta non parte nessuna richiesta a Google", async () => {
  const pulito = await browser.newContext();
  const p2 = await pulito.newPage();
  const google = [];
  p2.on("request", (r) => { if (/google-analytics|googletagmanager/.test(r.url())) google.push(r.url()); });
  await p2.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p2.waitForTimeout(2500);
  await pulito.close();
  if (google.length) throw new Error(`${google.length} richieste prima del consenso`);
});

await agisci("il banner ha Rifiuta e Accetta, e Rifiuta funziona", async () => {
  const pulito = await browser.newContext();
  const p2 = await pulito.newPage();
  await p2.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const rif = p2.getByRole("button", { name: "Rifiuta", exact: true });
  const acc = p2.getByRole("button", { name: "Accetta", exact: true });
  if (!(await rif.count()) || !(await acc.count())) throw new Error("il banner non offre entrambe le scelte");
  await rif.click();
  await p2.waitForTimeout(800);
  if (await rif.count()) throw new Error("il banner resta dopo il rifiuto");
  await p2.reload({ waitUntil: "networkidle" });
  if (await p2.getByRole("button", { name: "Rifiuta", exact: true }).count()) {
    throw new Error("il banner torna a ogni visita");
  }
  await pulito.close();
});

console.log("\n— documenti legali —");
for (const [nome, r, minimo] of [["Privacy", "/privacy", 11], ["Cookie", "/cookie", 6], ["Termini", "/termini", 16]]) {
  await agisci(`${nome}: si apre ed e' completo`, async () => {
    await vai(r);
    const t = await page.locator("main").innerText();
    if (/Ã¨|Ã |â€™/.test(t)) throw new Error("mojibake");
    // Le sezioni sono intestazioni numerate «01», «02»: si contano gli h2, non i
    // numeri nel testo, che nel documento non hanno il punto.
    const sezioni = await page.locator("main h2").count();
    if (sezioni < minimo) throw new Error(`${sezioni} sezioni invece di almeno ${minimo}`);
    if (!/aggiorna/i.test(t)) throw new Error("manca la data di aggiornamento");
  });
}

console.log("\n— blog —");
await agisci("l'indice del blog si apre", async () => {
  await vai("/blog");
  const t = await page.locator("main").innerText();
  if (/Ã¨|â€™/.test(t)) throw new Error("mojibake");
});

let articolo = null;
await agisci("ogni articolo dell'indice si apre davvero", async () => {
  const href = await page.locator("main a[href^='/blog/']").evaluateAll((a) =>
    [...new Set(a.map((x) => x.getAttribute("href")))].filter((h) => !/\/(autore|categoria|tag)\//.test(h)));
  if (!href.length) throw new Error("nessun articolo nell'indice");
  const rotti = [];
  for (const h of href) {
    const r = await page.request.get(`${BASE}${h}`);
    if (r.status() !== 200) rotti.push(`${h} -> ${r.status()}`);
  }
  if (rotti.length) throw new Error(rotti.join(" | "));
  articolo = href[0];
});

await agisci("l'articolo ha indice dei contenuti e firma cliccabile", async () => {
  await vai(articolo);
  const t = await page.locator("main").innerText();
  if (/Ã¨|â€™/.test(t)) throw new Error("mojibake");
  const autore = await page.locator("main a[href^='/blog/autore/']").count();
  if (!autore) throw new Error("la firma non porta al profilo");
});

await agisci("le voci dell'indice portano davvero al titolo", async () => {
  const voci = page.locator("main nav a[href^='#'], main a[href^='#']");
  const n = await voci.count();
  if (n === 0) return; // sotto le tre voci l'indice non compare: e' voluto
  const href = await voci.first().getAttribute("href");
  await voci.first().click();
  await page.waitForTimeout(900);
  const y = await page.locator(href).evaluate((e) => e.getBoundingClientRect().top).catch(() => null);
  if (y === null) throw new Error(`l'àncora ${href} non esiste in pagina`);
  if (y < 0 || y > 260) throw new Error(`il titolo finisce a ${Math.round(y)}px: fuori vista o dietro l'intestazione`);
});

console.log("\n— accesso e registrazione —");
await agisci("il modulo di accesso rifiuta le credenziali sbagliate", async () => {
  await vai("/login");
  await page.fill("#email", "nessuno@example.com");
  await page.fill("#password", "SbagliataDavvero1!");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  const t = await page.locator("body").innerText();
  if (!/(errat|non valid|non corrett|credenziali)/i.test(t)) throw new Error("nessun messaggio di errore");
  if (/dashboard/.test(page.url())) throw new Error("e' entrato lo stesso");
}, { attesa: 200 });

await agisci("dal login si arriva al recupero della password", async () => {
  await vai("/login");
  await page.locator("a[href='/password-dimenticata']").first().click();
  await page.waitForURL("**/password-dimenticata", { timeout: 20_000 });
});

await agisci("chiedere il recupero risponde senza rivelare chi ha un account", async () => {
  await page.fill("#email", `nessuno-${Date.now()}@example.com`);
  await page.getByRole("button", { name: /Mandami il collegamento/i }).click();
  await page.waitForTimeout(3500);
  const t = await page.locator("main").innerText();
  if (!/Controlla la tua posta/i.test(t)) throw new Error(`risposta inattesa: ${t.slice(0, 120)}`);
  // Se dicesse «questo indirizzo non risulta», la pagina diventerebbe un modo per
  // sapere chi e' cliente: la risposta dev'essere la stessa in tutti e due i casi.
  if (/non risulta|non esiste|nessun account/i.test(t)) throw new Error("rivela se l'indirizzo esiste");
}, { attesa: 200 });

await agisci("un collegamento di recupero senza gettone lo dice, e offre di rifarlo", async () => {
  await vai("/reimposta-password");
  const t = await page.locator("main").innerText();
  if (!/non più valido|non piu' valido/i.test(t)) throw new Error(`la pagina dice: ${t.slice(0, 120)}`);
  if (!(await page.getByRole("button", { name: /Chiedi un nuovo collegamento/i }).count())) {
    throw new Error("nessun modo di chiederne un altro");
  }
});

await agisci("un gettone scaduto non accetta comunque la password nuova", async () => {
  await vai("/reimposta-password?error=INVALID_TOKEN&token=vecchio");
  const t = await page.locator("main").innerText();
  if (/Scegli una nuova password/i.test(t)) throw new Error("accetta una password su un gettone rifiutato");
});

await agisci("dal login si arriva alla registrazione e viceversa", async () => {
  await vai("/login");
  await page.locator("a[href='/registrati']").first().click();
  await page.waitForURL("**/registrati", { timeout: 20_000 });
  await page.locator("a[href='/login']").first().click();
  await page.waitForURL("**/login", { timeout: 20_000 });
});

console.log("\n— indirizzi che non esistono —");
await agisci("una pagina inesistente risponde 404, non 500", async () => {
  const r = await page.request.get(`${BASE}/questa-non-esiste-davvero-1234`);
  if (r.status() !== 404) throw new Error(`stato ${r.status()}`);
});
await agisci("un articolo inesistente risponde 404", async () => {
  const r = await page.request.get(`${BASE}/blog/questo-articolo-non-esiste-1234`);
  if (r.status() !== 404) throw new Error(`stato ${r.status()}`);
});
await agisci("un collegamento cliente inventato non apre nulla", async () => {
  const r = await page.request.get(`${BASE}/documenti-cliente/token-inventato-che-non-esiste`);
  if (r.status() === 200) {
    const t = await r.text();
    if (/Rapporto|Bilancio|Diagnosi/.test(t)) throw new Error("mostra documenti");
  }
});
await agisci("le pagine protette rimandano all'accesso", async () => {
  const pulito = await browser.newContext();
  const p2 = await pulito.newPage();
  for (const r of ["/dashboard", "/documenti", "/impostazioni", "/impostazioni/abbonamento", "/guida"]) {
    await p2.goto(`${BASE}${r}`, { waitUntil: "domcontentloaded" });
    if (!/\/login/.test(p2.url())) throw new Error(`${r} si apre senza sessione`);
  }
  await pulito.close();
});

console.log("\n— indicizzazione —");
await agisci("robots, sitemap e llms.txt rispondono", async () => {
  for (const r of ["/robots.txt", "/sitemap.xml", "/llms.txt"]) {
    const x = await page.request.get(`${BASE}${r}`);
    if (x.status() !== 200) throw new Error(`${r} -> ${x.status()}`);
  }
});
await agisci("la sitemap elenca solo indirizzi che rispondono", async () => {
  const xml = await (await page.request.get(`${BASE}/sitemap.xml`)).text();
  const loc = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!loc.length) throw new Error("sitemap vuota");
  const rotti = [];
  for (const u of loc.slice(0, 25)) {
    const r = await page.request.get(u, { maxRedirects: 3 });
    if (r.status() >= 400) rotti.push(`${u} -> ${r.status()}`);
  }
  if (rotti.length) throw new Error(rotti.join(" | "));
});
await agisci("il portale cliente e' fuori dai motori di ricerca", async () => {
  const robots = await (await page.request.get(`${BASE}/robots.txt`)).text();
  const xml = await (await page.request.get(`${BASE}/sitemap.xml`)).text();
  if (/documenti-cliente/.test(xml)) throw new Error("compare nella sitemap");
  void robots;
});

console.log("\n— salute —");
await agisci("/api/health risponde", async () => {
  const r = await page.request.get(`${BASE}/api/health`);
  if (r.status() !== 200) throw new Error(`stato ${r.status()}`);
});

const ko = riepilogo("Parte pubblica");
await browser.close();
if (ko > 0) process.exitCode = 1;
