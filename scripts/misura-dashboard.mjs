// Quanto ci mette la dashboard, con undici moduli invece di cinque.
//
// ⚠️ Non è un collaudo: è uno strumento di misura, e sta qui perché la diagnosi va fatta
// sui numeri. Due controlli diversi hanno cominciato a scadere sulla stessa pagina —
// `portafoglio-aggiorna` sull'aggiornamento dopo l'archiviazione e `shell` su
// `networkidle` — e due sintomi sulla stessa pagina non si spiegano indovinando.
//
//   node scripts/misura-dashboard.mjs

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const email = `mis-${RUN}@example.com`;

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

console.log(`\nMisura della dashboard — ${BASE}\n`);
const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Misura", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
await spegniTour(page);

const cronometra = async (nome, fn) => {
  const t = Date.now();
  await fn();
  const ms = Date.now() - t;
  console.log(`  ${String(ms).padStart(6)} ms  ${nome}`);
  return ms;
};

await cronometra("dashboard, primo caricamento", async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator("main").waitFor({ timeout: 120_000 });
});
console.log("  contenuto: " + (await page.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 220));
console.log("  card: " + (await page.locator('[data-slot="card"]').count()));

await cronometra("dashboard, secondo caricamento", async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator("main").waitFor({ timeout: 120_000 });
});

await cronometra("dashboard, attesa di networkidle", async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle", timeout: 120_000 });
});

const [az] = await sql`select id from company where organization_id = ${orgId} limit 1`;
await cronometra("fascicolo dell'azienda", async () => {
  await page.goto(`${BASE}/aziende/${az.id}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator("[data-percorsi] [data-modulo]").first().waitFor({ timeout: 120_000 });
});

await cronometra("router.refresh() sulla dashboard", async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator("main").waitFor({ timeout: 120_000 });
  const risposta = page.waitForResponse((r) => r.url().includes("/dashboard") && r.status() < 400, {
    timeout: 120_000,
  });
  await page.evaluate(() => window.history.replaceState(null, "", location.href));
  await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await risposta.catch(() => {});
});

await sql`delete from corpus_register_row where organization_id = ${orgId}`;
await sql`delete from corpus_doc_state where organization_id = ${orgId}`;
for (const t of [
  "chain_partner_score", "chain_partner", "chain_program",
  "sa_criterion_state", "sa_system",
  "qas_measurement", "qas_indicator", "qas_requirement_state", "qas_system",
  "wb_requirement_state", "wb_report", "wb_channel", "wb_system",
  "mog_scenario", "mog_process", "mog_crime_applicability", "mog_requirement_state", "mog_model",
  "bribery_requirement_state", "bribery_partner", "bribery_system",
  "soa_control_decision", "soa_module", "soa_declaration",
  "supplier_answer", "supplier_assessment",
]) {
  await sql.unsafe(`delete from ${t} where organization_id = $1`, [orgId]).catch(() => {});
}
await sql`delete from company where organization_id = ${orgId}`;
await sql`delete from audit_log where organization_id = ${orgId}`;
await sql`delete from entitlement_event where organization_id = ${orgId}`;
await sql`delete from org_entitlement where organization_id = ${orgId}`;
await sql`delete from member where organization_id = ${orgId}`;
await sql`delete from organization where id = ${orgId}`;
await sql`delete from "user" where email = ${email}`;

await browser.close();
await sql.end();
