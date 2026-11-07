// Le tre schermate della sezione «Tre gesti» della home, fotografate dal prodotto vero.
//
//   node scripts/foto-gesti.mjs           (contro http://localhost:3000)
//   BASE=https://… node scripts/foto-gesti.mjs
//
// Scrive in `public/landing/gesti/` tre WebP larghi 1600 px: domande, calcoli, documento.
// Si rifanno quando l'interfaccia cambia: una schermata vecchia in vetrina mostra un
// prodotto che non esiste più, e nessuno se ne accorge, perché chi la vede non è chi la
// controlla.
//
// ⚠️ Registra un conto di collaudo nel database dell'ambiente e lo attiva: si lancia SOLO
// contro lo sviluppo o un'anteprima, mai contro la produzione.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import postgres from "postgres";
import sharp from "sharp";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
if (/evalisdeck\.it/.test(BASE)) throw new Error("foto-gesti scrive un conto di collaudo: non si lancia contro la produzione");
const OUT = "public/landing/gesti";
mkdirSync(OUT, { recursive: true });

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: "it-IT" });
const page = await ctx.newPage();

console.log(`\nSchermate dei tre gesti — ${BASE}\n`);
const email = `foto-gesti-${Date.now()}@example.com`;
const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Foto", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='azienda', activated_at=now() where organization_id=${orgId}`;
await spegniTour(page);

const [az] = await sql`select id, nome from company where organization_id = ${orgId} and is_demo order by created_at limit 1`;
if (!az) throw new Error("nessuna azienda dimostrativa");
const [inv] = await sql`select anno from ghg_inventory where company_id = ${az.id} order by anno desc limit 1`;
if (!inv) throw new Error("la dimostrativa non ha l'inventario GHG");
const radice = `${BASE}/aziende/${az.id}/ghg/${inv.anno}`;
console.log(`  ${az.nome}, inventario ${inv.anno}`);

/** Fotografa il contenuto principale, senza la barra laterale: in vetrina conta il lavoro. */
async function scatta(nome, selettore = "main") {
  await page.waitForTimeout(1200);
  const el = page.locator(selettore).first();
  await el.waitFor({ timeout: 60_000 });
  const png = await el.screenshot({ animations: "disabled" });
  const meta = await sharp(png).metadata();
  // 16:10, dall'alto: la parte che si legge per prima.
  const larghezza = meta.width;
  const altezza = Math.min(meta.height, Math.round((larghezza * 10) / 16));
  await sharp(png).extract({ left: 0, top: 0, width: larghezza, height: altezza }).resize({ width: 1600 }).webp({ quality: 82 }).toFile(`${OUT}/${nome}.webp`);
  console.log(`  ✓ ${nome}.webp`);
}

await page.goto(`${radice}?passo=2`, { waitUntil: "domcontentloaded" });
await page.getByText("Sorgenti", { exact: false }).first().waitFor({ timeout: 60_000 });
await scatta("domande");

await page.goto(`${radice}?passo=5`, { waitUntil: "domcontentloaded" });
await page.getByText("Risultati", { exact: false }).first().waitFor({ timeout: 60_000 });
await page.waitForTimeout(1500); // i grafici si disegnano dopo i dati
await scatta("calcoli");

// Il documento: si pubblica dal passo del rapporto e si apre la versione appena congelata.
await page.goto(`${radice}?passo=8`, { waitUntil: "domcontentloaded" });
const pubblica = page.getByRole("button", { name: /^Pubblica / });
await pubblica.waitFor({ timeout: 60_000 });
await pubblica.click();
let snap = null;
for (let i = 0; i < 40 && !snap; i++) {
  await page.waitForTimeout(1000);
  [snap] = await sql`select id from document_snapshot where company_id = ${az.id} and tipo = 'ghg' order by published_at desc limit 1`;
}
if (!snap) throw new Error("il documento non risulta pubblicato");
await page.goto(`${BASE}/documento/${snap.id}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
// Non la copertina: da sola è un rettangolo scuro col titolo in fondo, e in vetrina non
// dice niente. Si prende la prima pagina interna con un grafico, cioè i risultati.
// Il documento è un'unica colonna di pagine: si ritaglia attorno al primo grafico,
// partendo dal titolo della sua sezione.
const riquadro = await page.evaluate(() => {
  const fig = document.querySelector("figure.doc-fig");
  const pagina = fig?.closest(".doc-pagina") ?? document.querySelector(".doc-pagina");
  if (!fig || !pagina) return null;
  let titolo = fig.previousElementSibling;
  while (titolo && titolo.tagName !== "H2") titolo = titolo.previousElementSibling;
  const p = pagina.getBoundingClientRect();
  const t = (titolo ?? fig).getBoundingClientRect();
  return { x: p.left + window.scrollX, y: t.top + window.scrollY - 28, width: p.width };
});
if (!riquadro) throw new Error("nel documento non c'è un grafico da fotografare");
const png = await page.screenshot({ fullPage: true, clip: { ...riquadro, height: Math.round((riquadro.width * 10) / 16) } });
await sharp(png).resize({ width: 1600 }).webp({ quality: 82 }).toFile(`${OUT}/documento.webp`);
console.log("  ✓ documento.webp");

await browser.close();
await sql.end();
console.log("\nFatto. Il conto di collaudo resta nel database di sviluppo, come quelli degli altri collaudi.\n");
