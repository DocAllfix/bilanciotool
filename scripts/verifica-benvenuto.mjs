// Collaudo della sequenza di benvenuto: video, giro guidato fra le pagine, offerta.
//
//   node scripts/verifica-benvenuto.mjs
//
// Si registra uno studio NUOVO a ogni esecuzione, perche' e' l'unico stato in cui la
// sequenza parte: e' fatta per chi entra la prima volta, e provarla su un account che
// l'ha gia' vista misurerebbe una schermata che nessuno vedra' mai.
//
// La prova che conta e' l'ULTIMA: la sequenza non si ripete al ricarico. Un benvenuto
// che riparte a ogni visita non e' un'accoglienza, e' un ostacolo.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const EMAIL = `benvenuto-${RUN}@example.com`;
const PWD = "PasswordSicura123!";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const errori = [];
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]); }
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => errori.push(e.message));

const popover = page.locator(".driver-popover");
const avanti = page.locator(".driver-popover-next-btn");

/** Preme Avanti finche' ci sono passi, poi Fine. Restituisce quanti passi ha visto. */
async function percorriTour(max = 12) {
  let passi = 0;
  for (let i = 0; i < max; i++) {
    if (!(await popover.count())) break;
    passi++;
    const testo = (await avanti.innerText().catch(() => "")).trim();
    await avanti.click();
    await page.waitForTimeout(450);
    if (/Fine/i.test(testo)) break;
  }
  return passi;
}

await check("un nuovo studio entra e trova il video di benvenuto", async () => {
  await registraEEntra(page, sql, { base: BASE, nome: "Chi Si Iscrive", email: EMAIL, pwd: PWD });
  await page.getByText("Benvenuto in EvalisDeck", { exact: true }).first().waitFor({ timeout: 15_000 });
  if (!(await page.locator("video").count())) throw new Error("nessun elemento video nel riquadro");
});

await check("il video e' un file vero e arriva (non un 404 travestito)", async () => {
  // La rotta risponde con un rinvio a un indirizzo firmato: si segue fino in fondo e si
  // guarda il tipo e la dimensione. Un riquadro col video rotto sembra identico a uno
  // che funziona finche' non si preme play.
  const r = await page.request.get(`${BASE}/api/onboarding/video`);
  if (r.status() !== 200) throw new Error(`stato ${r.status()}`);
  const tipo = r.headers()["content-type"] ?? "";
  if (!/video/.test(tipo)) throw new Error(`tipo inatteso: ${tipo}`);
  const corpo = await r.body();
  if (corpo.length < 1_000_000) throw new Error(`solo ${corpo.length} byte`);
});

await check("senza sessione il video non si scarica", async () => {
  const anonimo = await browser.newContext();
  const r = await anonimo.request.get(`${BASE}/api/onboarding/video`, { maxRedirects: 0 });
  await anonimo.close();
  if (r.status() === 200 || (r.status() >= 300 && r.status() < 400)) {
    throw new Error(`un anonimo riceve ${r.status()}`);
  }
});

await check("l'itinerario lo calcola il server e parte dalla dashboard", async () => {
  const r = await page.request.get(`${BASE}/api/onboarding/percorso`);
  if (!r.ok()) throw new Error(`stato ${r.status()}`);
  const { tappe } = await r.json();
  if (!Array.isArray(tappe) || !tappe.length) throw new Error("itinerario vuoto");
  if (tappe[0].path !== "/dashboard") throw new Error(`prima tappa ${tappe[0].path}`);
  // Ogni tappa dev'essere una pagina che ha davvero un tour: una tappa senza tour
  // sarebbe una navigazione muta, e il giro sembrerebbe essersi rotto.
  console.log("       itinerario: " + tappe.map((t) => t.pageId).join(" -> "));
  globalThis.__tappe = tappe;
});

await check("saltando il video parte il giro sulla dashboard", async () => {
  await page.getByRole("button", { name: /Salta e vai al giro guidato/i }).click();
  await popover.first().waitFor({ timeout: 20_000 });
  const t = await popover.innerText();
  if (!/EvalisDeck|portafoglio/i.test(t)) throw new Error("il primo passo non parla del portafoglio: " + t.slice(0, 80));
});

await check("arrivando in fondo il giro passa da solo alla pagina successiva", async () => {
  const tappe = globalThis.__tappe;
  if (tappe.length < 2) throw new Error("l'azienda dimostrativa non ha moduli da visitare");
  const passi = await percorriTour();
  if (passi < 2) throw new Error(`solo ${passi} passi sulla dashboard`);
  await page.waitForURL(`**${tappe[1].path}`, { timeout: 30_000 });
  // E il tour della pagina nuova deve partire da solo: la navigazione senza il seguito
  // lascerebbe il visitatore su una pagina che non ha chiesto, senza spiegazioni.
  await popover.first().waitFor({ timeout: 25_000 });
});

await check("il giro attraversa tutte le tappe fino all'offerta", async () => {
  const tappe = globalThis.__tappe;
  for (let i = 1; i < tappe.length; i++) {
    await popover.first().waitFor({ timeout: 25_000 });
    await percorriTour();
    if (i + 1 < tappe.length) {
      await page.waitForURL(`**${tappe[i + 1].path}`, { timeout: 30_000 });
    }
  }
  await page.getByRole("heading", { name: /Ora puoi usarlo davvero/i }).waitFor({ timeout: 25_000 });
});

await check("l'offerta mostra i prezzi di lancio col listino barrato", async () => {
  const t = await page.locator("body").innerText();
  for (const atteso of ["1.450 €", "2.900 €", "600 €", "2.700 €"]) {
    if (!t.includes(atteso)) throw new Error(`manca ${atteso}`);
  }
  const barrati = await page.locator(".line-through").count();
  if (barrati < 3) throw new Error(`solo ${barrati} prezzi barrati`);
  if (!/Prezzi di lancio, validi fino al/.test(t)) throw new Error("la scadenza non e' dichiarata");
  if (!/Quattordici giorni per ripensarci/.test(t)) throw new Error("il rimborso non e' dichiarato");
  if (/Enterprise/.test(t)) throw new Error("Enterprise non si compra da qui: si tratta");
});

await check("il comando dell'offerta porta alla pagina di pagamento di Stripe", async () => {
  await page.getByRole("button", { name: "Attiva", exact: true }).first().click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
});

await check("tornando dentro, la sequenza non riparte", async () => {
  // In una scheda NUOVA dello stesso contesto: la precedente e' rimasta sulla pagina di
  // Stripe, e da li' non si torna indietro in modo pulito. Sessione, localStorage e
  // sessionStorage sono gli stessi, che e' quel che conta per questa prova.
  const p3 = await ctx.newPage();
  await p3.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await p3.waitForTimeout(4000);
  const video = await p3.locator("video").count();
  const giro = await p3.locator(".driver-popover").count();
  const t = await p3.locator("body").innerText();
  await p3.close();
  if (video) throw new Error("il video riparte");
  if (giro) throw new Error("il giro riparte");
  if (/Ora puoi usarlo davvero/.test(t)) throw new Error("l'offerta ricompare");
});

await check("chi ha gia' pagato non vede ne' video ne' offerta", async () => {
  const [u] = await sql`select id from "user" where email = ${EMAIL}`;
  const [m] = await sql`select organization_id from member where user_id = ${u.id}`;
  await sql`update org_entitlement set status = 'active' where organization_id = ${m.organization_id}`;
  const pulito = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const p2 = await pulito.newPage();
  await p2.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await p2.fill("#email", EMAIL);
  await p2.fill("#password", PWD);
  await p2.click('button[type="submit"]');
  await p2.waitForURL("**/dashboard", { timeout: 40_000 });
  await p2.waitForTimeout(3000);
  const visto = (await p2.locator("video").count()) > 0;
  const offerta = /Ora puoi usarlo davvero/.test(await p2.locator("body").innerText());
  await pulito.close();
  if (visto) throw new Error("il video parte a chi ha l'abbonamento");
  if (offerta) throw new Error("l'offerta compare a chi ha gia' pagato");
});

await sql.end();
await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(errori.length ? "ERRORI: " + errori.join(" | ") : "Nessun errore di pagina.");
if (ko > 0) process.exitCode = 1;
