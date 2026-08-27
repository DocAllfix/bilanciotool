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
import { PIANI, CHIAVI_PIANO, euro, prezzoDiVendita } from "../src/lib/prezzi.ts";

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

// Nato da una domanda di un potenziale cliente: «non vedo le modalità di acquisto».
// Ogni richiamo diceva «prova la demo», e chi aveva già deciso non trovava una strada.
await agisci("la vetrina dice COME si acquista", async () => {
  await vai("/");
  const t = await page.locator("body").innerText();
  if (!/Come si acquista/i.test(t)) throw new Error("nessuna sezione sull'acquisto");
  for (const atteso of [/abbonamento/i, /annuale/i, /bonifico|preventivo/i, /rimborso/i, /disdice/i]) {
    if (!atteso.test(t)) throw new Error(`la sezione non parla di ${atteso}`);
  }
  // ⚠️ Deve dire ANCHE dove sono gli importi. Fino al 27 agosto 2026 la home diceva «si
  // vedono appena entri», cioe' metteva un PEDAGGIO davanti a una domanda legittima: per
  // sapere quanto costa bisognava registrarsi. Ora c'e' una pagina, e la home ci rimanda.
  //
  // Nessuna cifra qui, ed e' voluto: il numero da solo ancora la lettura sul costo prima
  // che si sia capito cosa si compra, e il contesto che lo rende leggibile — il ritorno —
  // sta sulla pagina prezzi.
  if (!(await page.locator('main a[href="/prezzi"], footer a[href="/prezzi"]').count())) {
    throw new Error("nessun rimando alla pagina dei prezzi");
  }
  if (/si vedono appena entri/i.test(t)) throw new Error("la home nasconde ancora gli importi");
  for (const k of CHIAVI_PIANO) {
    const v = prezzoDiVendita(PIANI[k], "anno1");
    if (v && t.includes(euro(v.importo))) throw new Error(`la home mostra una cifra (${euro(v.importo)})`);
  }
});

await agisci("il menu e il piede portano alla sezione acquisto", async () => {
  // `domcontentloaded`: si arriva da una pagina con l'ancora, e attendere il silenzio
  // di rete su una navigazione che il browser considera interna non finisce mai.
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  if (!(await page.locator('header a[href="/#acquisto"]').count())) throw new Error("manca dal menu");
  if (!(await page.locator('footer a[href="/#acquisto"]').count())) throw new Error("manca dal piede");
  // La voce dev'essere raggiungibile davvero, non solo presente: il salto deve portare
  // la sezione sotto l'intestazione fissa, non nasconderla dietro.
  await page.locator('header a[href="/#acquisto"]').first().click();
  await page.waitForTimeout(900);
  const y = await page.locator("#acquisto").evaluate((e) => e.getBoundingClientRect().top);
  if (y < 0 || y > 260) throw new Error(`la sezione finisce a ${Math.round(y)}px dal bordo`);
});

await agisci("dalla vetrina si arriva all'attivazione senza passare dalla demo", async () => {
  // `domcontentloaded` e non `networkidle`: si arriva qui dalla stessa pagina con
  // l'ancora, e l'attesa del silenzio di rete su una navigazione che il browser
  // considera interna non finisce mai.
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const diretti = await page.locator('a[href="/attiva"]').count();
  if (diretti < 2) throw new Error(`solo ${diretti} richiami all'attivazione`);
  await page.locator('a[href="/attiva"]').first().click();
  await page.waitForURL("**/attiva", { timeout: 20_000 });
  const t = await page.locator("main").innerText();
  if (!/Attiva il tuo studio/i.test(t)) throw new Error("la pagina non riconosce l'intento d'acquisto");
  if (!/gratuita/i.test(t)) throw new Error("non dice che la registrazione è gratuita");
});

await agisci("le àncore del menu portano il percorso", async () => {
  const anc = await page.locator("header a[href*='#']").evaluateAll((a) => a.map((x) => x.getAttribute("href")));
  const nude = anc.filter((h) => h.startsWith("#"));
  if (nude.length) throw new Error(`àncore senza percorso: ${nude.join(", ")}`);
});

await agisci("il link condiviso porta anteprima, titolo e immagine", async () => {
  // Il prodotto si passa per messaggio: un'anteprima muta fa sembrare provvisorio
  // qualcosa che si vende a quattro cifre.
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const og = async (prop) =>
    page.locator(`meta[property="og:${prop}"]`).first().getAttribute("content").catch(() => null);
  for (const p of ["title", "description", "image", "url", "site_name"]) {
    if (!(await og(p))) throw new Error(`manca og:${p}`);
  }
  const img = await og("image");
  // L'indirizzo dichiarato dev'essere ASSOLUTO — un percorso relativo non significa
  // niente dentro WhatsApp — ma l'immagine si scarica dall'ambiente che si sta
  // collaudando: in locale il dominio vero servirebbe la versione gia' pubblicata,
  // e un 404 direbbe «rotto» su una cosa che non e' ancora arrivata li'.
  if (!/^https?:\/\//.test(img)) throw new Error(`og:image non assoluto: ${img}`);
  const r = await page.request.get(`${BASE}${new URL(img).pathname}`);
  if (r.status() !== 200) throw new Error(`l'immagine risponde ${r.status()}`);
  const corpo = await r.body();
  if (corpo.length < 5000) throw new Error(`immagine di ${corpo.length} byte: sospetta`);
});

await agisci("i dati strutturati dichiarano il dominio vero e le domande", async () => {
  const blocchi = await page.locator('script[type="application/ld+json"]').allTextContents();
  if (blocchi.length < 2) throw new Error(`solo ${blocchi.length} blocchi di dati strutturati`);
  if (/vercel\.app/.test(blocchi.join(" "))) throw new Error("dichiara ancora un indirizzo di Vercel");
  const faq = blocchi.map((b) => JSON.parse(b)).find((x) => x["@type"] === "FAQPage");
  if (!faq) throw new Error("nessun blocco FAQPage");
  // Le risposte devono essere le STESSE che stanno in pagina, non una copia a parte.
  const testo = await page.locator("body").innerText();
  if (!testo.includes(faq.mainEntity[0].name)) throw new Error("una domanda dichiarata non compare in pagina");
});


// Il telefono e' uno dei modi principali con cui questa pagina verra' vista, e il Deck
// dell'hero e' una composizione a posizioni assolute: con misure fisse funziona a una
// larghezza sola e sotto quella non si stringe, si TAGLIA. E' successo: la copertina
// finiva novantacinque pixel fuori dallo schermo e il nome dell'azienda si leggeva
// «…anica …tica S.r.l.». Qui si misura, non si guarda.
for (const [nome, largh, alt] of [["iPhone SE", 375, 667], ["Android comune", 360, 800], ["iPhone 14", 390, 844]]) {
  await agisci(`da ${nome} (${largh}px) niente esce dallo schermo`, async () => {
    const tel = await browser.newContext({ viewport: { width: largh, height: alt }, isMobile: true, hasTouch: true });
    const p2 = await tel.newPage();
    await p2.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await p2.waitForTimeout(2200);
    const esito = await p2.evaluate(() => {
      const de = document.documentElement;
      const fuori = [];
      for (const e of document.querySelectorAll("main *")) {
        const b = e.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        // Le velature sfocate escono apposta: sono decorazione, non contenuto.
        if (/blur-|pointer-events-none/.test((e.className || "").toString())) continue;
        if (b.left < -1 || b.right > de.clientWidth + 1) {
          fuori.push(`${e.tagName}.${(e.className || "").toString().slice(0, 40)}`);
        }
      }
      return { scorre: de.scrollWidth - de.clientWidth, fuori: fuori.slice(0, 4), quanti: fuori.length };
    });
    await tel.close();
    if (esito.scorre > 0) throw new Error(`la pagina scorre in orizzontale di ${esito.scorre}px`);
    if (esito.quanti) throw new Error(`${esito.quanti} elementi fuori dai bordi: ${esito.fuori.join(" | ")}`);
  });
}

await agisci("il marchio non si comprime a nessuna larghezza", async () => {
  // Quando la barra si stringe, la prima cosa che cede e' il logo, e cede in silenzio:
  // a 768px era diventato una scaglia di quattordici pixel, illeggibile. Si misura la
  // sua larghezza a tutte le soglie invece di fidarsi dell'occhio su una sola.
  const stretti = [];
  for (const w of [360, 390, 768, 1024, 1280]) {
    const c = await browser.newContext({ viewport: { width: w, height: 700 }, isMobile: w < 700, hasTouch: w < 700 });
    const p2 = await c.newPage();
    await p2.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await p2.waitForTimeout(1500);
    const largh = await p2.locator('header a[aria-label="EvalisDeck"]').first()
      .evaluate((e) => Math.round(e.getBoundingClientRect().width));
    await c.close();
    if (largh < 90) stretti.push(`${w}px → logo ${largh}px`);
  }
  if (stretti.length) throw new Error(`marchio compresso: ${stretti.join(", ")}`);
});

await agisci("da telefono l'attivazione e' raggiungibile sopra la piega", async () => {
  const tel = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  const p2 = await tel.newPage();
  await p2.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await p2.waitForTimeout(2000);
  // Il PRIMO VISIBILE, non il primo nel documento: quello dell'intestazione esiste nel
  // markup ma e' nascosto sotto una certa larghezza, e misurarlo direbbe «non c'e'».
  const tutti = p2.locator('a[href="/attiva"]');
  let b = null;
  for (let i = 0; i < (await tutti.count()); i++) {
    const r = await tutti.nth(i).boundingBox();
    if (r) { b = r; break; }
  }
  await tel.close();
  if (!b) throw new Error("nessun comando di attivazione visibile");
  // Entro due schermate: piu' in basso e' come non esserci.
  if (b.y > 667 * 2) throw new Error(`il comando sta a ${Math.round(b.y)}px, troppo in basso`);
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
  // ⚠️ Su un'ANTEPRIMA la sitemap dichiara i canonical della PRODUZIONE, ed e' giusto
  // cosi': un canonical verso un host temporaneo insegnerebbe a Google un indirizzo che
  // muore. Ma il controllo poi segue quei collegamenti e finisce sul sito vero, che puo'
  // essere indietro rispetto al ramo — `/verifica` esiste dal 24 agosto 2026 e non e'
  // ancora distribuito. Un 404 li' non e' un collegamento rotto: e' la produzione che non
  // ha ancora quella pagina, e lo si dice invece di far cercare un guasto che non c'e'.
  const anteprima = !/^https?:\/\/(localhost|127\.0\.0\.1|evalisdeck\.it)/.test(BASE);
  const rotti = [];
  const nonAncoraInProduzione = [];
  for (const u of loc.slice(0, 25)) {
    const r = await page.request.get(u, { maxRedirects: 3 });
    if (r.status() < 400) continue;
    if (anteprima && !u.startsWith(BASE)) nonAncoraInProduzione.push(`${u} -> ${r.status()}`);
    else rotti.push(`${u} -> ${r.status()}`);
  }
  if (nonAncoraInProduzione.length) {
    console.log(`       (${nonAncoraInProduzione.length} indirizzi canonici non ancora in produzione: ${nonAncoraInProduzione.join(", ")})`);
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
