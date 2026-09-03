// I due documenti FIRMATI del sistema integrato: Analisi ambientale e Valutazione dei
// rischi.
//
// ⚠️ La prova che conta non è che escano: è che dicano il vero sulle voci NON VALUTATE.
// Un aspetto non misurato non è un aspetto trascurabile, e un pericolo senza probabilità
// non è un rischio basso — e questi due documenti li firma il datore di lavoro.
//
//   npm run qa -- documenti-qas

import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, pretendiServerAggiornato, attraversaProtezione } from "./comune-collaudo.mjs";
import { rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = process.env.SHOT_DIR ?? "./shots-qas-firmati";
mkdirSync(OUT, { recursive: true });

const RUN = Date.now();
const email = `qasf-${RUN}@example.com`;
const AZIENDA = `Vetrerie Irpine ${String(RUN).slice(-6)} S.p.A.`;

const errori = [];
let ok = 0, ko = 0;
const verifica = (nome, cond, dettaglio = "") => {
  if (cond) { ok++; console.log("  ok   " + nome + (dettaglio ? " — " + dettaglio : "")); }
  else { ko++; console.log(" FAIL  " + nome + (dettaglio ? " — " + dettaglio : "")); }
};

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
await attraversaProtezione(page);
page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) errori.push(m.text().slice(0, 150)); });
page.on("pageerror", (e) => errori.push("pageerror: " + e.message.slice(0, 150)));
page.on("response", (r) => { if (r.status() >= 400) errori.push(`${r.status()} ${r.url().replace(BASE, "")}`); });

console.log(`\nI due documenti firmati del sistema integrato — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio QAS Firmati", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
const [az] = await sql`insert into company (id, organization_id, nome, settore, is_demo)
  values (gen_random_uuid(), ${orgId}, ${AZIENDA}, 'Vetro', false) returning id`;
await spegniTour(page);

const U = `${BASE}/aziende/${az.id}/sgiqas`;
await page.goto(U, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="qas-crea"]').waitFor({ timeout: 60_000 });
await page.click('[data-tour="qas-crea"]');
await page.locator("[data-tour^='qas-vista-']").first().waitFor({ timeout: 60_000 });
const [sistema] = await sql`select id from qas_system where company_id = ${az.id}`;

// ─── i registri, seminati dal database ───────────────────────────────────────
//
// ⚠️ Tre righe scelte per coprire i tre esiti che contano: una significativa per la
// scala, una significativa per una PRESCRIZIONE LEGALE con la scala ancora vuota — è lo
// scostamento voluto dal prototipo — e una non valutata affatto.
const righe = [
  ["aspetti", 1, "ASP001", { att: "Verniciatura", fase: "Produzione", asp: "Emissioni in atmosfera", cond: "Normale", g: "4 · grave", f: "3 · frequente", s: "3 · alta", legale: "No", esposto: "No", superamento: "No" }],
  ["aspetti", 2, "ASP002", { att: "Deposito solventi", fase: "Logistica", asp: "Sversamenti", cond: "Emergenza", legale: "Sì", esposto: "No", superamento: "No" }],
  ["aspetti", 3, "ASP003", { att: "Illuminazione", fase: "Servizi", asp: "Consumo energetico", cond: "Normale", legale: "No", esposto: "No", superamento: "No" }],
  ["pericoli", 1, "PER001", { area: "Forni", att: "Colata", per: "Ustione da contatto", danno: "Ustione di terzo grado", p: "3 · probabile", g: "4 · gravissimo" }],
  ["pericoli", 2, "PER002", { area: "Magazzino", att: "Movimentazione", per: "Investimento da carrello", danno: "Trauma", p: "2 · poco probabile", g: "3 · grave" }],
  ["pericoli", 3, "PER003", { area: "Uffici", att: "Videoterminale", per: "Affaticamento visivo", danno: "Astenopia" }],
];
for (const [reg, n, rif, dati] of righe) {
  await sql`insert into corpus_register_row
    (id, organization_id, company_id, content_set_id, register_id, numero, riferimento, dati)
    values (gen_random_uuid(), ${orgId}, ${az.id}, 'sgiqas-v1', ${reg}, ${n}, ${rif}, ${JSON.stringify(dati)}::jsonb)`;
}

// ⚠️ La colonna calcolata a schermo: erano due motori che non usava nessuno.
await page.goto(`${U}?vista=registri&reg=aspetti`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="corpus-registro"]').waitFor({ timeout: 30_000 });
const tabella = await page.locator('[data-tour="corpus-registro"]').innerText();
verifica("Il registro mostra la significatività calcolata", /Significativit/i.test(tabella));
verifica("⚠️ Una prescrizione legale rende significativo anche senza la scala compilata",
  (tabella.match(/Significativo/g) ?? []).length >= 2, tabella.slice(0, 0) || "");
await page.screenshot({ path: `${OUT}/00-registro.png` });

// ─── i due documenti ─────────────────────────────────────────────────────────
for (const [tipo, nome, atteso] of [
  ["analisi_ambientale", "Analisi ambientale", /aspetti ambientali/i],
  ["valutazione_ssl", "Valutazione dei", /salute e la sicurezza/i],
]) {
  await page.goto(`${U}?vista=documenti`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("button", { name: new RegExp(`^Pubblica ${nome}`) }).waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: new RegExp(`^Pubblica ${nome}`) }).click();
  const doc = await page.waitForEvent("popup", { timeout: 120_000 });
  await doc.waitForLoadState("networkidle", { timeout: 120_000 });
  await doc.setViewportSize({ width: 1280, height: 1700 });
  await doc.waitForTimeout(700);

  const [snap] = await sql`select tipo, anno, dati from document_snapshot
    where company_id = ${az.id} and tipo = ${tipo}`;
  verifica(`${nome}: si pubblica come snapshot`, snap?.tipo === tipo, snap?.tipo);
  verifica(`${nome}: senza esercizio`, snap?.anno === 0);
  verifica(`${nome}: lo snapshot congela l'edizione dei contenuti`, snap?.dati?.edizione === "sgiqas-v1");

  const testo = await doc.locator(".doc-corpo").innerText();
  verifica(`${nome}: dichiara la propria materia`, atteso.test(testo));
  // ⚠️ La voce non valutata NON viene taciuta: e' il punto del documento.
  verifica(`${nome}: ⚠️ dichiara le voci non ancora valutate`, /non ancora valutate/i.test(testo));
  verifica(`${nome}: porta le firme di chi se ne assume la responsabilità`, /Firme/.test(testo));

  const p2 = await page.context().newPage();
  await p2.goto(doc.url(), { waitUntil: "networkidle" });
  const pdf = await p2.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
  writeFileSync(`${OUT}/${tipo}.pdf`, pdf);
  await p2.close();
  verifica(`${nome}: il PDF si genera e non è vuoto`, pdf.length > 20_000, `${Math.round(pdf.length / 1024)} KB`);
  await doc.screenshot({ path: `${OUT}/${tipo}.png` });
  await doc.close();
}

// ⚠️ Il documento firmato NON dichiara «Basso» un rischio che nessuno ha misurato.
const [ssl] = await sql`select dati from document_snapshot where company_id = ${az.id} and tipo='valutazione_ssl'`;
const nonValutati = (ssl.dati.pericoli ?? []).filter((p) => p.livello === null);
verifica("⚠️ Un pericolo senza probabilità resta NON valutato, non «Basso»",
  nonValutati.length === 1, `${nonValutati.length} su ${(ssl.dati.pericoli ?? []).length}`);

const [amb] = await sql`select dati from document_snapshot where company_id = ${az.id} and tipo='analisi_ambientale'`;
const significativi = (amb.dati.aspetti ?? []).filter((a) => a.significativita === "Significativo");
verifica("⚠️ La prescrizione legale conta anche con la scala vuota",
  significativi.length === 2, `${significativi.length} significativi`);

// ─── pulizia ─────────────────────────────────────────────────────────────────
await sql`delete from document_snapshot where organization_id = ${orgId}`;
await sql`delete from corpus_register_row where organization_id = ${orgId}`;
await sql`delete from qas_measurement where organization_id = ${orgId}`;
await sql`delete from qas_indicator where organization_id = ${orgId}`;
await sql`delete from qas_requirement_state where organization_id = ${orgId}`;
await sql`delete from qas_system where id = ${sistema.id}`;
await sql`delete from corpus_doc_state where organization_id = ${orgId}`;
await sql`delete from company where organization_id = ${orgId}`;
await sql`delete from audit_log where organization_id = ${orgId}`;
await sql`delete from entitlement_event where organization_id = ${orgId}`;
await sql`delete from org_entitlement where organization_id = ${orgId}`;
await sql`delete from member where organization_id = ${orgId}`;
await sql`delete from organization where id = ${orgId}`;
await sql`delete from "user" where email = ${email}`;

console.log(`\nDocumenti firmati QAS: ${ok} ok, ${ko} ko`);
if (errori.length) {
  console.log("\nErrori di console o richieste fallite:");
  for (const e of [...new Set(errori)]) console.log("  " + e);
}
await browser.close();
await sql.end();
process.exit(ko || errori.length ? 1 : 0);
