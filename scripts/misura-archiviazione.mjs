// Quanto ci mette la card ad andare in archivio, senza ricaricare la pagina.
//
// ⚠️ Strumento di misura, non collaudo. `portafoglio-aggiorna` è tornato rosso e la
// domanda che conta è una sola: l'aggiornamento non arriva MAI, oppure arriva tardi? Sono
// due difetti diversi con due cause diverse, e la finestra di sessanta secondi del
// controllo non li distingue.
//
//   node scripts/misura-archiviazione.mjs

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, attendi } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const email = `arc-${RUN}@example.com`;
const NOME = `Da Archiviare ${String(RUN).slice(-6)} S.r.l.`;
/** Si guarda molto oltre la finestra del controllo: serve sapere se arriva, non se passa. */
const FINESTRA = Number(process.env.FINESTRA ?? 60_000);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("  console: " + m.text().slice(0, 120)); });
page.on("response", (r) => { if (r.status() >= 400) console.log(`  ${r.status()} ${r.url().replace(BASE, "")}`); });

console.log(`\nMisura dell'archiviazione — ${BASE}\n`);
const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Archivio", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
await spegniTour(page);

// ⚠️ L'azienda si crea DAL DIALOGO, come fa il controllo, e non con una insert: la
// differenza fra le due strade è l'unica variabile rimasta fra un controllo rosso e una
// misura verde, e si isola facendola.
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
await page.click('[data-tour="nuova-azienda"]');
await page.locator("#na-nome").waitFor({ timeout: 20_000 });
await page.fill("#na-nome", NOME);
await page.fill("#na-settore", "Collaudo");
await page.click('button[type="submit"]:has-text("Crea azienda")');
await attendi(async () => {
  const [r] = await sql`select id from company where organization_id=${orgId} and nome=${NOME}`;
  return !!r;
}, { entro: 30_000, cosa: "l'azienda creata dal dialogo" });
const [az] = await sql`select id from company where organization_id=${orgId} and nome=${NOME}`;
await page.locator("h1").filter({ hasText: NOME }).waitFor({ timeout: 60_000 });
console.log("  creata dal dialogo, si è aperto il fascicolo");

await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
const card = () => page.locator('[data-slot="card"]').filter({ hasText: NOME });
await card().first().waitFor({ timeout: 120_000 });
console.log(`  la card c'è, con ${await card().locator("[data-modulo]").count()} caselle di percorso`);

const CICLI = Number(process.env.CICLI ?? 3);
const esiti = [];
for (let giro = 1; giro <= CICLI; giro++) {
console.log(`  ── giro ${giro} ──`);
await card().getByRole("button", { name: "Altre azioni" }).click();
await page.getByRole("menuitem", { name: /Archivia/i }).click();
const t = Date.now();
await page.getByRole("button", { name: /^Archivia$/ }).click();

await attendi(async () => {
  const [r] = await sql`select stato from company where id = ${az.id}`;
  return r?.stato === "archived";
}, { entro: 30_000, cosa: "l'archiviazione nel database" });
console.log(`  ${Date.now() - t} ms — il database ha registrato l'archiviazione`);

let visto = false;
for (let i = 0; i < FINESTRA / 1000; i++) {
  const caselle = await card().locator("[data-modulo]").count();
  if (caselle === 0) {
    console.log(`  ${Date.now() - t} ms — la card ha perso le caselle: la pagina si è rifatta`);
    visto = true;
    break;
  }
  await page.waitForTimeout(1000);
}
esiti.push(["archivia", visto ? Date.now() - t : null]);
if (!visto) {
  console.log(`  MAI — dopo ${FINESTRA / 1000}s la card ha ancora le sue caselle`);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(1500);
  const dopoRicarica = await card().locator("[data-modulo]").count();
  console.log(`  dopo una RICARICA le caselle sono ${dopoRicarica}: ` +
    (dopoRicarica === 0 ? "il server risponde giusto, è il client a non applicare" : "risponde male anche il server"));
}

// ─── e il ripristino, che è la metà rimasta rossa ────────────────────────────
await card().getByRole("button", { name: "Altre azioni" }).click();
await page.getByRole("menuitem", { name: /Ripristina/i }).click();
const t2 = Date.now();
await attendi(async () => {
  const [r] = await sql`select stato from company where id = ${az.id}`;
  return r?.stato === "active";
}, { entro: 30_000, cosa: "il ripristino nel database" });
console.log(`  ${Date.now() - t2} ms — il database ha registrato il ripristino`);

let tornata = false;
for (let i = 0; i < FINESTRA / 1000; i++) {
  if ((await card().locator("[data-modulo]").count()) > 0) {
    console.log(`  ${Date.now() - t2} ms — la card è tornata fra le attive`);
    tornata = true;
    break;
  }
  await page.waitForTimeout(1000);
}
esiti.push(["ripristina", tornata ? Date.now() - t2 : null]);
if (!tornata) {
  console.log(`  MAI — dopo ${FINESTRA / 1000}s la card non è tornata fra le attive`);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(1500);
  const dopo = await card().locator("[data-modulo]").count();
  console.log(`  dopo una RICARICA le caselle sono ${dopo}: ` +
    (dopo > 0 ? "il server risponde giusto, è il client a non applicare" : "risponde male anche il server"));
}
}
console.log("");
console.log("  RIEPILOGO");
for (const [che, ms] of esiti) console.log(`    ${che.padEnd(11)} ${ms === null ? "MAI" : ms + " ms"}`);
console.log(`    mai applicati: ${esiti.filter(([, m]) => m === null).length} su ${esiti.length}`);

await sql`delete from company where organization_id = ${orgId}`;
await sql`delete from audit_log where organization_id = ${orgId}`;
await sql`delete from entitlement_event where organization_id = ${orgId}`;
await sql`delete from org_entitlement where organization_id = ${orgId}`;
await sql`delete from member where organization_id = ${orgId}`;
await sql`delete from organization where id = ${orgId}`;
await sql`delete from "user" where email = ${email}`;

await browser.close();
await sql.end();
