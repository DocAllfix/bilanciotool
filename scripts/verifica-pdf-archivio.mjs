// Collaudo della rotta PDF: la prima richiesta genera, la seconda no.
//
// Chromium è la cosa più cara che facciamo. Lo snapshot è immutabile, quindi il PDF di
// una versione non può cambiare: la seconda richiesta deve arrivare dall'archivio. Si
// misura sulle risposte vere — codice, tipo e tempo — perché una rotta che rigenera in
// silenzio ha lo stesso aspetto di una che riusa, tranne che nel conto a fine mese.
//
//   node scripts/verifica-pdf-archivio.mjs

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]); }
};

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
await ctx.addInitScript(() => {
  for (const p of ["portfolio", "ghg"]) {
    try { localStorage.setItem(`evalisdeck-tour:${p}`, "1"); } catch {}
  }
});
const page = await ctx.newPage();

const RUN = Date.now();
const email = `pdf-${RUN}@example.com`;
const PWD = "PasswordSicura123!";
let snapshotId = "";
let orgId = "";
let msPrima = 0;

await check("studio attivo, azienda, inventario e documento pubblicato", async () => {
  await page.goto(`${BASE}/registrati`, { waitUntil: "networkidle" });
  await page.fill("#nome", "Paolo Neri");
  await page.fill("#email", email);
  await page.fill("#password", PWD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 40_000 });
  const rifiuta = page.getByRole("button", { name: "Rifiuta", exact: true });
  if (await rifiuta.count()) { await rifiuta.click(); await page.waitForTimeout(400); }

  const [u] = await sql`select id from "user" where email = ${email}`;
  const [m] = await sql`select organization_id from member where user_id = ${u.id}`;
  orgId = m.organization_id;
  await sql`update org_entitlement set status='active', piano='studio', activated_at=now()
            where organization_id = ${orgId}`;
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", PWD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 40_000 });

  await page.locator('[data-tour="nuova-azienda"]').click();
  await page.fill("#na-nome", "Archivio S.r.l.");
  await page.click('button[type="submit"]:has-text("Crea azienda")');
  await page.waitForTimeout(3000);
  const [az] = await sql`select id from company where organization_id = ${orgId} order by created_at desc limit 1`;
  await page.goto(`${BASE}/aziende/${az.id}/ghg`, { waitUntil: "networkidle" });
  await page.fill("#ci-anno", "2025");
  await page.click('button:has-text("Crea")');
  await page.waitForURL("**/ghg/2025**", { timeout: 25_000 });
  await page.click('[data-tour="ghg-passo-8"]');
  await page.waitForTimeout(1500);
  const [scheda] = await Promise.all([
    ctx.waitForEvent("page", { timeout: 40_000 }),
    page.locator('[data-tour="pubblica-documento"]').click(),
  ]);
  await scheda.waitForLoadState("domcontentloaded");
  snapshotId = new URL(scheda.url()).pathname.split("/").pop();
  await scheda.close();
  if (!snapshotId) throw new Error("nessun documento pubblicato");
});

await check("la prima richiesta genera il PDF e lo consegna", async () => {
  const t0 = Date.now();
  // `maxRedirects: 0` per vedere il codice vero: seguendo i salti si perderebbe la
  // differenza fra «generato qui» e «arrivato dall'archivio», che è tutto il punto.
  const r = await ctx.request.get(`${BASE}/api/documenti/${snapshotId}/pdf`, { maxRedirects: 0 });
  msPrima = Date.now() - t0;
  if (r.status() !== 200) throw new Error(`ha risposto ${r.status()}, non 200`);
  if (!(r.headers()["content-type"] ?? "").includes("application/pdf")) {
    throw new Error("non è un PDF: " + r.headers()["content-type"]);
  }
  const corpo = await r.body();
  if (corpo.length < 20_000) throw new Error("PDF sospettosamente piccolo: " + corpo.length);
  if (corpo.subarray(0, 4).toString() !== "%PDF") throw new Error("non comincia con %PDF");
});

await check("il PDF finisce in archivio, accanto allo snapshot", async () => {
  const [r] = await sql`select pdf_storage_key from document_snapshot where id = ${snapshotId}`;
  if (!r?.pdf_storage_key) throw new Error("nessuna chiave di archiviazione registrata");
  if (!r.pdf_storage_key.startsWith(`${orgId}/`)) {
    throw new Error("chiave non prefissata con l'organizzazione: " + r.pdf_storage_key);
  }
});

await check("la seconda richiesta NON riavvia Chromium: viene dall'archivio", async () => {
  const t0 = Date.now();
  const r = await ctx.request.get(`${BASE}/api/documenti/${snapshotId}/pdf`, { maxRedirects: 0 });
  const msDopo = Date.now() - t0;
  if (r.status() !== 302) throw new Error(`ha risposto ${r.status()}, non 302: sta rigenerando`);
  const dove = r.headers()["location"] ?? "";
  if (!/token=|sign\//.test(dove)) throw new Error("non rimanda a un indirizzo firmato: " + dove.slice(0, 80));
  // La differenza di tempo è la prova che si vede a occhio: generare costa secondi,
  // firmare un indirizzo costa millisecondi.
  if (msDopo > msPrima / 2) throw new Error(`troppo lenta per essere d'archivio: ${msDopo}ms contro ${msPrima}ms`);
});

await check("l'indirizzo firmato consegna davvero il file", async () => {
  const r = await ctx.request.get(`${BASE}/api/documenti/${snapshotId}/pdf`);
  if (r.status() !== 200) throw new Error("seguendo il salto: " + r.status());
  const corpo = await r.body();
  if (corpo.subarray(0, 4).toString() !== "%PDF") throw new Error("l'archivio non ha restituito un PDF");
});

await sql.end();
await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
if (ko > 0) process.exitCode = 1;
