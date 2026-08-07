// Collaudo del portale cliente, dal vivo: genera → apri → revoca → riapri.
//
// La prova che conta e' la terza: dopo la revoca il collegamento deve smettere di aprire
// **subito**, e dirlo con la parola giusta. Un portale che continua a funzionare dopo la
// disattivazione e' peggio di uno che non funziona mai.
//
//   node scripts/visual-check-condivisione.mjs

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const errori = [];
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]); }
};

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errori.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errori.push(`[pageerror] ${e.message}`));

const RUN = Date.now();
const email = `cond-ui-${RUN}@example.com`;
let collegamento = "";

await check("registrazione e attivazione dello studio", async () => {
  await page.goto(`${BASE}/registrati`, { waitUntil: "networkidle" });
  await page.fill("#nome", "Marco Verdi");
  await page.fill("#email", email);
  await page.fill("#password", "PasswordSicura123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 40_000 });
  // Il banner del consenso sta in basso e in primo piano: finche' c'e', intercetta i clic
  // sui comandi in fondo alla pagina. Una persona lo chiude, e cosi' fa il collaudo.
  const rifiuta = page.getByRole("button", { name: "Rifiuta", exact: true });
  if (await rifiuta.count()) { await rifiuta.click(); await page.waitForTimeout(400); }
  // Come fanno le e2e: l'attivazione via database, perche' il pagamento non c'e' ancora.
  const [u] = await sql`select id from "user" where email = ${email}`;
  const [m] = await sql`select organization_id from member where user_id = ${u.id}`;
  await sql`update org_entitlement set status='active', piano='studio', activated_at=now()
            where organization_id = ${m.organization_id}`;
});

await check("si crea un'azienda e si apre il suo fascicolo", async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /nuova azienda/i }).first().click();
  await page.fill("#na-nome", "Cliente Condiviso S.r.l.");
  await page.click('button[type="submit"]:has-text("Crea azienda")');
  await page.waitForTimeout(3000);
  await page.getByRole("link", { name: /Cliente Condiviso/i }).first().click();
  await page.waitForURL(/\/aziende\/[^/]+$/, { timeout: 20_000 });
  await page.waitForLoadState("networkidle");
});

await check("il pannello genera un collegamento e lo mostra una volta sola", async () => {
  await page.fill("#cond-nota", "amministrazione");
  await page.selectOption("#cond-durata", "7");
  await page.getByRole("button", { name: /genera collegamento/i }).click();
  await page.waitForTimeout(3500);
  const campo = page.locator('input[readonly]');
  await campo.waitFor({ timeout: 10_000 });
  collegamento = await campo.inputValue();
  if (!/\/documenti-cliente\/[A-Za-z0-9_-]{40,}$/.test(collegamento)) {
    throw new Error("indirizzo storto: " + collegamento);
  }
  const t = await page.locator("main").innerText();
  if (!/non potrai rileggerlo/i.test(t)) throw new Error("non avverte che non e' recuperabile");
});

await check("il collegamento compare nell'elenco come attivo, e mai aperto", async () => {
  const t = await page.locator("main").innerText();
  if (!t.includes("amministrazione")) throw new Error("la nota non compare");
  if (!/mai aperto/i.test(t)) throw new Error("il contatore non parte da zero");
  if (!/Attivo/.test(t)) throw new Error("lo stato non e' attivo");
});

await check("il cliente apre il portale SENZA account e vede la sua azienda", async () => {
  const anonimo = await browser.newContext();
  const p = await anonimo.newPage();
  p.on("pageerror", (e) => errori.push(`[portale] ${e.message}`));
  await p.goto(collegamento, { waitUntil: "networkidle" });
  const t = await p.locator("main").innerText();
  if (!t.includes("Cliente Condiviso S.r.l.")) throw new Error("non mostra l'azienda: " + t.slice(0, 120));
  if (!/non ci sono ancora documenti/i.test(t)) throw new Error("stato vuoto assente");
  // Nessuna sessione: il portale non deve richiedere l'accesso.
  if (p.url().includes("/login")) throw new Error("ha chiesto di accedere");
  await anonimo.close();
});

await check("il portale resta fuori dagli indici", async () => {
  const p = await ctx.newPage();
  await p.goto(collegamento, { waitUntil: "networkidle" });
  const robots = await p.locator('meta[name="robots"]').getAttribute("content");
  await p.close();
  if (!/noindex/i.test(robots ?? "")) throw new Error("meta robots: " + robots);
});

await check("l'apertura viene contata e lo studio la vede", async () => {
  await page.reload({ waitUntil: "networkidle" });
  const t = await page.locator("main").innerText();
  if (/mai aperto/i.test(t)) throw new Error("il contatore non si e' mosso");
  if (!/aperto \d+ volt/i.test(t)) throw new Error("conteggio assente: " + t.slice(0, 150));
});

await check("la revoca chiude l'accesso all'istante, e lo dice con la parola giusta", async () => {
  await page.getByRole("button", { name: /disattiva/i }).first().click();
  await page.waitForTimeout(3500);
  const anonimo = await browser.newContext();
  const p = await anonimo.newPage();
  await p.goto(collegamento, { waitUntil: "networkidle" });
  const t = await p.locator("main").innerText();
  await anonimo.close();
  if (!/disattivato/i.test(t)) throw new Error("non dice che e' stato disattivato: " + t.slice(0, 120));
  if (/scaduto/i.test(t)) throw new Error("dice «scaduto» a un collegamento revocato");
});

await check("un indirizzo inventato non rivela niente", async () => {
  const anonimo = await browser.newContext();
  const p = await anonimo.newPage();
  await p.goto(`${BASE}/documenti-cliente/${"z".repeat(43)}`, { waitUntil: "networkidle" });
  const t = await p.locator("main").innerText();
  await anonimo.close();
  if (!/non valido/i.test(t)) throw new Error("messaggio inatteso: " + t.slice(0, 100));
  if (/S\.r\.l\.|documenti di/i.test(t)) throw new Error("ha rivelato qualcosa");
});

await sql.end();
await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(errori.length ? "ERRORI CONSOLE:\n" + errori.join("\n") : "Console pulita.");
if (ko > 0 || errori.length) process.exitCode = 1;
