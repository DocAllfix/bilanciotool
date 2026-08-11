// Collaudo del white-label, dal vivo: pubblica → guarda il piede → spegni l'estensione
// → riguarda lo STESSO documento.
//
// La prova che conta e' l'ultima. Che un documento nuovo porti il nome giusto e' facile;
// il punto dell'estensione e' che una carta gia' consegnata al cliente non cambi
// intestazione il giorno in cui l'abbonamento scade. Quella si vede solo ricaricando.
//
//   node scripts/visual-check-marchio.mjs

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const STUDIO = "Bianchi e Associati";
const errori = [];
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]); }
};

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
// Il tour parte da solo alla prima visita e stende un velo che intercetta i clic: e' il
// suo mestiere. Lo si segna come gia' visto, come farebbe chi torna il giorno dopo.
await ctx.addInitScript(() => {
  for (const p of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
    try { localStorage.setItem(`evalisdeck-tour:${p}`, "1"); } catch {}
  }
});
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errori.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errori.push(`[pageerror] ${e.message}`));

const RUN = Date.now();
const email = `marchio-${RUN}@example.com`;
const PWD = "PasswordSicura123!";
let orgId = "";
let docWhiteLabel = "";

const accedi = async () => {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", PWD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 40_000 });
};

/** Il piede del documento, dalla scheda che la pubblicazione apre da sola. */
const piedeDelDocumento = async (url) => {
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errori.push(`[documento] ${e.message}`));
  await p.goto(url, { waitUntil: "networkidle" });
  const t = await p.locator("article.doc-pagina").innerText();
  await p.close();
  return t;
};

await check("registrazione, white-label acceso, nome dello studio impostato", async () => {
  await registraEEntra(page, sql, { base: BASE, nome: "Chiara Bianchi", email: email, pwd: PWD });
  const rifiuta = page.getByRole("button", { name: "Rifiuta", exact: true });
  if (await rifiuta.count()) { await rifiuta.click(); await page.waitForTimeout(400); }

  const [u] = await sql`select id from "user" where email = ${email}`;
  const [m] = await sql`select organization_id from member where user_id = ${u.id}`;
  orgId = m.organization_id;
  // Attivazione via database: il pagamento non c'e' ancora (F10).
  await sql`update org_entitlement set status='active', piano='studio', white_label=true, activated_at=now()
            where organization_id = ${orgId}`;
  await sql`update organization set name = ${STUDIO} where id = ${orgId}`;
  // La sessione porta avanti lo stato vecchio: senza un accesso nuovo il server
  // risponde ancora paywall.
  await accedi();
});

await check("si crea l'azienda e il suo inventario 2025", async () => {
  await page.locator('[data-tour="nuova-azienda"]').click();
  await page.fill("#na-nome", "Marchio S.p.A.");
  await page.click('button[type="submit"]:has-text("Crea azienda")');
  await page.waitForTimeout(3000);
  const [az] = await sql`select id from company where organization_id = ${orgId} order by created_at desc limit 1`;
  if (!az) throw new Error("l'azienda non e' stata creata");
  await page.goto(`${BASE}/aziende/${az.id}/ghg`, { waitUntil: "networkidle" });
  await page.fill("#ci-anno", "2025");
  await page.click('button:has-text("Crea")');
  await page.waitForURL("**/ghg/2025**", { timeout: 25_000 });
});

await check("il documento si pubblica e porta il marchio dello studio", async () => {
  await page.click('[data-tour="ghg-passo-8"]');
  await page.waitForTimeout(1500);
  const [scheda] = await Promise.all([
    ctx.waitForEvent("page", { timeout: 40_000 }),
    page.locator('[data-tour="pubblica-documento"]').click(),
  ]);
  await scheda.waitForLoadState("networkidle");
  docWhiteLabel = scheda.url();
  const t = await scheda.locator("article.doc-pagina").innerText();
  await scheda.close();
  if (!t.includes(`Redatto con ${STUDIO}`)) {
    throw new Error("il piede non porta lo studio: " + t.slice(-160));
  }
  if (/EvalisDeck/.test(t)) throw new Error("compare ancora il nostro marchio");
});

await check("nel piede non ci sono spazi mangiati ne' caratteri storti", async () => {
  const t = await piedeDelDocumento(docWhiteLabel);
  // Il JSX mangia lo spazio dopo un'espressione a fine riga: si vede solo sul reso.
  if (/conBianchi|con {2,}Bianchi/.test(t)) throw new Error("spaziatura rotta attorno al marchio");
  if (/Ã|â€|Â/.test(t)) throw new Error("mojibake nel documento");
});

await check("il monogramma sparisce quando il marchio non e' il nostro", async () => {
  const p = await ctx.newPage();
  await p.goto(docWhiteLabel, { waitUntil: "networkidle" });
  const n = await p.locator('article.doc-pagina img[src*="monogramma"]').count();
  await p.close();
  // Il logo dello studio non ce l'abbiamo: il nostro simbolo accanto al suo nome
  // sarebbe il contrario di cio' che l'estensione vende.
  if (n > 0) throw new Error("il nostro monogramma e' rimasto accanto al nome dello studio");
});

await check("spenta l'estensione, il documento gia' consegnato NON cambia", async () => {
  await sql`update org_entitlement set white_label=false where organization_id = ${orgId}`;
  const t = await piedeDelDocumento(docWhiteLabel);
  if (!t.includes(`Redatto con ${STUDIO}`)) {
    throw new Error("il documento pubblicato ha cambiato intestazione: " + t.slice(-160));
  }
});

await check("ma quello pubblicato DOPO torna al nostro marchio", async () => {
  await accedi();
  const [az] = await sql`select id from company where organization_id = ${orgId} limit 1`;
  await page.goto(`${BASE}/aziende/${az.id}/ghg/2025`, { waitUntil: "networkidle" });
  await page.click('[data-tour="ghg-passo-8"]');
  await page.waitForTimeout(1500);
  const [scheda] = await Promise.all([
    ctx.waitForEvent("page", { timeout: 40_000 }),
    page.locator('[data-tour="pubblica-documento"]').click(),
  ]);
  await scheda.waitForLoadState("networkidle");
  const t = await scheda.locator("article.doc-pagina").innerText();
  const monogrammi = await scheda.locator('article.doc-pagina img[src*="monogramma"]').count();
  await scheda.close();
  if (!t.includes("Redatto con EvalisDeck")) throw new Error("non e' tornato il nostro: " + t.slice(-160));
  if (monogrammi === 0) throw new Error("manca il monogramma sul nostro marchio");
});

await sql.end();
await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(errori.length ? "ERRORI CONSOLE:\n" + errori.join("\n") : "Console pulita.");
if (ko > 0 || errori.length) process.exitCode = 1;
