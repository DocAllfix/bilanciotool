// Collaudo della pagina articolo: indice dei contenuti e firma dell'autore.
//
// Le due cose che un occhio distratto dà per buone e che qui si provano davvero:
// che ogni voce dell'indice porti a un titolo CHE ESISTE, e che dopo il salto quel
// titolo sia VISIBILE invece di finire nascosto dietro l'intestazione fissa. Un indice
// rotto in uno di questi due modi ha esattamente lo stesso aspetto di uno funzionante.
//
//   node scripts/visual-check-articolo.mjs [--prod]

import { chromium } from "@playwright/test";
import "dotenv/config";
import { rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const SLUG = process.env.SLUG ?? "rendicontazione-sostenibilita-pmi";
const errori = [];
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]); }
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) errori.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errori.push(`[pageerror] ${e.message}`));

await page.goto(`${BASE}/blog/${SLUG}`, { waitUntil: "networkidle" });

let voci = [];
await check("l'indice compare in apertura, prima del testo", async () => {
  const indice = page.locator('nav[aria-labelledby="indice-titolo"]');
  if (!(await indice.count())) throw new Error("nessun indice nella pagina");
  voci = await indice.locator("a").evaluateAll((as) => as.map((a) => ({ href: a.getAttribute("href"), testo: a.textContent.trim() })));
  if (voci.length < 3) throw new Error(`solo ${voci.length} voci`);
  // «in apertura» vuol dire prima del corpo: si confronta la posizione verticale.
  const yIndice = await indice.evaluate((n) => n.getBoundingClientRect().top + window.scrollY);
  const yPrimoTitolo = await page.locator("article h2, main h2").nth(1).evaluate((n) => n.getBoundingClientRect().top + window.scrollY);
  if (yIndice >= yPrimoTitolo) throw new Error("l'indice non sta prima del primo titolo");
});

await check("ogni voce punta a un titolo che esiste davvero", async () => {
  for (const v of voci) {
    const id = (v.href ?? "").replace(/^#/, "");
    if (!id) throw new Error(`voce senza ancora: ${v.testo}`);
    // Selettore per attributo: un `#id` grezzo non digerisce sempre cifre e trattini,
    // e `CSS.escape` qui non esiste — questo script gira in Node, non nel browser.
    const n = await page.locator(`[id="${id}"]`).count();
    if (n === 0) throw new Error(`l'ancora #${id} non esiste nel testo (voce «${v.testo}»)`);
  }
});

await check("cliccando una voce si arriva al titolo, e il titolo si VEDE", async () => {
  // Il difetto classico: l'intestazione e' fissa in alto e si mangia il titolo appena
  // raggiunto. Tecnicamente l'ancora funziona, in pratica l'indice sembra rotto.
  const ultima = voci[voci.length - 1];
  const id = ultima.href.replace(/^#/, "");
  await page.locator(`nav[aria-labelledby="indice-titolo"] a[href="#${id}"]`).click();
  await page.waitForTimeout(900);
  const box = await page.locator(`#${id}`).boundingBox();
  if (!box) throw new Error("il titolo non e' nel riquadro visibile");
  const altezzaIntestazione = await page.locator("header").evaluate((h) => h.getBoundingClientRect().height);
  if (box.y < altezzaIntestazione) {
    throw new Error(`il titolo finisce sotto l'intestazione (y=${Math.round(box.y)}, intestazione=${Math.round(altezzaIntestazione)})`);
  }
  if (await page.evaluate(() => window.scrollY) < 100) throw new Error("la pagina non si e' mossa");
});

await check("la gerarchia H2/H3 si vede nell'indice", async () => {
  const rientri = await page
    .locator('nav[aria-labelledby="indice-titolo"] li')
    .evaluateAll((li) => li.map((l) => l.className.includes("ml-4")));
  if (!rientri.some((r) => r)) throw new Error("nessuna voce rientrata: la gerarchia non si distingue");
  if (rientri.every((r) => r)) throw new Error("tutte rientrate: non e' una gerarchia");
});

await check("dall'articolo si raggiunge il profilo dell'autore", async () => {
  await page.goto(`${BASE}/blog/${SLUG}`, { waitUntil: "networkidle" });
  const link = page.getByRole("link", { name: /Bruno Santini/i }).first();
  if (!(await link.count())) throw new Error("il nome dell'autore non e' un collegamento");
  await link.click();
  await page.waitForURL("**/blog/autore/**", { timeout: 20_000 });
});

await check("dalla scheda nell'elenco si raggiunge il profilo", async () => {
  await page.goto(`${BASE}/blog`, { waitUntil: "networkidle" });
  const link = page.locator('a[href*="/blog/autore/"]').first();
  if (!(await link.count())) throw new Error("nessun collegamento all'autore nell'elenco");
  // Deve essere cliccabile davvero: la scheda ha un collegamento che la copre tutta, e
  // senza `z-index` questo finirebbe sotto — presente nel markup e inerte.
  await link.click();
  await page.waitForURL("**/blog/autore/**", { timeout: 20_000 });
});

await check("nella pagina dell'autore la firma non rimanda a se stessa", async () => {
  const dentro = await page.locator("main article a[href*='/blog/autore/']").count();
  if (dentro > 0) throw new Error("la scheda rimanda alla pagina che si sta guardando");
});

await check("lo schema Person c'e' ed e' quello dell'autore", async () => {
  const blocchi = await page.locator('script[type="application/ld+json"]').allTextContents();
  const person = blocchi.find((b) => /"@type"\s*:\s*"Person"/.test(b));
  if (!person) throw new Error("nessuno schema Person");
  if (!/"name"\s*:\s*"Bruno Santini"/.test(person)) throw new Error("il nome non c'e'");
});

await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(errori.length ? "ERRORI CONSOLE:\n" + errori.join("\n") : "Console pulita.");
if (ko > 0 || errori.length) process.exitCode = 1;
