// Collaudo del percorso SA8000/2026: un controllo per ogni comando.
//
// ⚠️ Ogni verifica guarda il DATABASE, non il messaggio a schermo. E i conteggi si
// leggono dal catalogo: un numero fisso fallirebbe alla prima versione nuova dei
// contenuti per un motivo che col prodotto non c'entra.
//
//   npm run qa -- sa8000-percorso

import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, attendi, pretendiServerAggiornato } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = process.env.SHOT_DIR ?? "./shots-sa8000";
mkdirSync(OUT, { recursive: true });

const RUN = Date.now();
const email = `sa-${RUN}@example.com`;
const AZIENDA = `Confezioni Joniche ${String(RUN).slice(-6)} S.r.l.`;

const errori = [];
let ok = 0, ko = 0;
const verifica = (nome, cond, dettaglio = "") => {
  if (cond) { ok++; console.log("  ok   " + nome + (dettaglio ? " — " + dettaglio : "")); }
  else { ko++; console.log(" FAIL  " + nome + (dettaglio ? " — " + dettaglio : "")); }
};

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
page.on("console", (m) => { if (m.type() === "error") errori.push(m.text().slice(0, 150)); });
page.on("pageerror", (e) => errori.push("pageerror: " + e.message.slice(0, 150)));
page.on("response", (r) => { if (r.status() >= 400) errori.push(`${r.status()} ${r.url().replace(BASE, "")}`); });

console.log(`\nSA8000/2026 — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio SA", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
const [az] = await sql`insert into company (id, organization_id, nome, settore, is_demo)
  values (gen_random_uuid(), ${orgId}, ${AZIENDA}, 'Tessile', false) returning id`;
await spegniTour(page);

const U = `${BASE}/aziende/${az.id}/sa8000`;
const sistema = async () => (await sql`select * from sa_system where company_id = ${az.id}`)[0];
const vaiVista = async (k, ancora) => {
  await page.click(`[data-tour="sa-vista-${k}"]`);
  await page.waitForURL(`**vista=${k}`, { timeout: 30_000 });
  if (ancora) await page.locator(ancora).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
};

// ─── creazione ───────────────────────────────────────────────────────────────
await page.goto(U, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="sa-crea"]').waitFor({ timeout: 60_000 });
verifica("Lo stato vuoto invita ad avviare il sistema", true);
await page.screenshot({ path: `${OUT}/00-vuoto.png` });

await page.click('[data-tour="sa-crea"]');
await page.locator("[data-tour^='sa-vista-']").first().waitFor({ timeout: 60_000 });
verifica("Il sistema si crea e apre le sette viste",
  (await page.locator("[data-tour^='sa-vista-']").count()) === 7);

const s0 = await sistema();
verifica("Il catalogo si congela alla creazione", s0?.content_set_id === "sa8000-v1", s0?.content_set_id);
await page.screenshot({ path: `${OUT}/01-quadro.png` });

// ─── il quadro: il numero grande e le sue cinque voci ────────────────────────
const [criteriTot] = await sql`select count(*)::int n from sa_criterion where set_id='sa8000-v1'`;
const [gruppiTot] = await sql`select count(*)::int n from sa_group where set_id='sa8000-v1'`;
verifica("Il catalogo ha i 112 criteri del prototipo", criteriTot.n === 112, `${criteriTot.n}`);
verifica("…e i diciotto gruppi", gruppiTot.n === 18, `${gruppiTot.n}`);

const voci = await page.locator('[data-tour="sa-voci"] li').count();
verifica("Il quadro scompone il punteggio in cinque voci", voci === 5, `${voci}`);
const testoVoci = await page.locator('[data-tour="sa-voci"]').innerText();
verifica("…dichiarando i pesi, procedure il doppio della modulistica",
  testoVoci.includes("30%") && testoVoci.includes("15%") && testoVoci.includes("25%"));

// Il quadro rimanda alla vista giusta invece di lasciare l'utente a cercarla.
await page.locator('[data-tour="sa-avvisi"] button').first().click();
await page.waitForURL("**vista=**", { timeout: 30_000 });
verifica("Una posizione aperta porta alla vista che la risolve", page.url().includes("vista="));

// ─── anagrafica ──────────────────────────────────────────────────────────────
await vaiVista("anagrafica", '[data-tour="sa-anagrafica"]');
await page.getByLabel("Contratto collettivo applicato", { exact: true })
  .fill("CCNL Tessile Abbigliamento Moda Industria");
await page.keyboard.press("Tab");
await attendi(async () => (await sistema())?.ccnl?.startsWith("CCNL Tessile"),
  { entro: 30_000, cosa: "il contratto collettivo salvato" });
verifica("Un campo dell'anagrafica si salva sfocandosi", true);

// ⚠️ Il campo dell'anagrafica E' un segnaposto delle procedure: il cliente deve
// vedere che compilare qui riempie il corpus, altrimenti sembra burocrazia.
const [tok] = await sql`select count(*)::int n from corpus_placeholder where content_set_id='sa8000-v1'`;
verifica("I segnaposto del corpus sono dichiarati", tok.n > 0, `${tok.n}`);
await page.screenshot({ path: `${OUT}/02-anagrafica.png` });

// ─── criteri ─────────────────────────────────────────────────────────────────
await vaiVista("criteri", '[data-tour="sa-criteri"]');

// ⚠️ I cinque fondazionali stanno INSIEME sotto «F». Nel prototipo finivano in
// cinque riquadri separati e senza titolo: e' il difetto B5.
const [gF] = await sql`select count(*)::int n from sa_criterion where set_id='sa8000-v1' and group_key='F'`;
verifica("⚠️ I cinque fondazionali sono un gruppo solo", gF.n === 5, `${gF.n}`);
const intestazioni = await page.locator('[data-tour="sa-criteri"] > ul > li > button').count();
verifica("…e i gruppi a schermo sono quelli del catalogo", intestazioni === gruppiTot.n, `${intestazioni}`);

// ⚠️ Il primo gruppo aperto dev'essere quello della prima SEZIONE. Nel catalogo
// l'ordine dei gruppi comincia da M (e' l'ordine dell'oggetto del prototipo), mentre
// sezioni e criteri cominciano da F: senza riordino si apre M1 su un elenco che parte
// da F1. Trovato da questo collaudo.
const [primo] = await sql`select key, group_key from sa_criterion where set_id='sa8000-v1' order by ordine limit 1`;
const intestazionePrima = await page.locator('[data-tour="sa-criteri"] > ul > li > button').first().innerText();
verifica("⚠️ Il primo gruppo è quello della prima sezione",
  intestazionePrima.startsWith(primo.group_key), intestazionePrima.slice(0, 30));

const bottoneCriterio = page.getByRole("button", { name: `${primo.key}: Attuato`, exact: true });
if (!(await bottoneCriterio.count())) {
  await page.locator('[data-tour="sa-criteri"] > ul > li > button')
    .filter({ hasText: primo.group_key }).first().click();
  await bottoneCriterio.waitFor({ timeout: 30_000 });
}
verifica("Il gruppo aperto mostra i suoi criteri", (await bottoneCriterio.count()) > 0);
await bottoneCriterio.click();
await attendi(async () => {
  const r = await sql`select stato from sa_criterion_state
    where system_id = ${s0.id} and criterion_key = ${primo.key}`;
  return r[0]?.stato === "ok";
}, { entro: 30_000, cosa: "il criterio valutato" });
verifica("Un criterio si valuta con un clic", true, primo.key);

await bottoneCriterio.click();
await attendi(async () => {
  const r = await sql`select stato from sa_criterion_state
    where system_id = ${s0.id} and criterion_key = ${primo.key}`;
  return r[0]?.stato === null;
}, { entro: 30_000, cosa: "la valutazione annullata" });
verifica("Ripremere lo stesso stato annulla", true);

// ⚠️ «Parziale» pesa ZERO, non meta': un criterio sociale attuato a meta' non
// protegge a meta' un lavoratore. Si misura sul punteggio, non sull'etichetta.
const criteri = await sql`select key from sa_criterion where set_id='sa8000-v1' order by ordine`;
await sql`insert into sa_criterion_state (id, organization_id, system_id, criterion_key, stato)
  select gen_random_uuid(), ${orgId}, ${s0.id}, key, 'parziale' from sa_criterion
  where set_id='sa8000-v1'
  on conflict (system_id, criterion_key) do update set stato='parziale'`;
await page.goto(`${U}?vista=quadro`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="sa-voci"]').waitFor({ timeout: 30_000 });
const rigaCriteri = await page.locator('[data-tour="sa-voci"] li', { hasText: "Criteri attuati" }).innerText();
verifica("⚠️ Tutti «parziale» danno 0% ai criteri, non 50%", /\b0%/.test(rigaCriteri), rigaCriteri.slice(-12).trim());

// «Non applicabile» esce dal denominatore: e' una valutazione, non un'omissione.
await sql`update sa_criterion_state set stato='na' where system_id=${s0.id}`;
await sql`update sa_criterion_state set stato='ok' where system_id=${s0.id}
  and criterion_key = ${criteri[0].key}`;
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator('[data-tour="sa-voci"]').waitFor({ timeout: 30_000 });
const rigaNa = await page.locator('[data-tour="sa-voci"] li', { hasText: "Criteri attuati" }).innerText();
verifica("⚠️ «Non applicabile» esce dal denominatore", /100%/.test(rigaNa), rigaNa.slice(-12).trim());

// Torno a un quadro credibile per il documento: qualcosa attuato, qualcosa no.
await sql`update sa_criterion_state set stato='ok' where system_id=${s0.id}`;
const nonAttuati = criteri.slice(0, 4).map((c) => c.key);
await sql`update sa_criterion_state set stato='no' where system_id=${s0.id}
  and criterion_key = any(${nonAttuati})`;
await page.screenshot({ path: `${OUT}/03-criteri.png` });

// Il filtro per sezione restringe davvero l'elenco.
await vaiVista("criteri", '[data-tour="sa-criteri"]');
const [sezM] = await sql`select key, nome from sa_section where set_id='sa8000-v1' and key='M'`;
await page.getByRole("button", { name: `Filtra: ${sezM.nome}` }).click();
await page.waitForTimeout(600);
const [gruppiM] = await sql`select count(*)::int n from sa_group where set_id='sa8000-v1' and section_key='M'`;
verifica("Il filtro per sezione restringe l'elenco",
  (await page.locator('[data-tour="sa-criteri"] > ul > li > button').count()) === gruppiM.n, `${gruppiM.n}`);

// ─── corpus ──────────────────────────────────────────────────────────────────
const [proc] = await sql`select count(*)::int n from corpus_document where content_set_id='sa8000-v1' and tipo='procedura'`;
const [mods] = await sql`select count(*)::int n from corpus_document where content_set_id='sa8000-v1' and tipo='modulo'`;
const [regs] = await sql`select count(*)::int n from corpus_register where content_set_id='sa8000-v1'`;
verifica("Il corpus ha le 22 procedure", proc.n === 22, `${proc.n}`);
verifica("…e i 104 moduli", mods.n === 104, `${mods.n}`);

await page.goto(`${U}?vista=procedure`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="corpus-procedure"]').waitFor({ timeout: 30_000 });
verifica("Le procedure arrivano tutte a schermo",
  (await page.locator('[data-slot="voce-corpus"]').count()) === proc.n);

await page.goto(`${U}?vista=moduli`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="corpus-moduli"]').waitFor({ timeout: 30_000 });
verifica("La modulistica arriva tutta",
  (await page.locator('[data-slot="voce-corpus"]').count()) === mods.n);

await page.goto(`${U}?vista=registri`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="corpus-registri"]').waitFor({ timeout: 30_000 });
verifica("I registri ci sono", (await page.locator('[data-slot="scheda-registro"]').count()) === regs.n, `${regs.n}`);
await page.screenshot({ path: `${OUT}/04-corpus.png` });

// ─── documento ───────────────────────────────────────────────────────────────
await page.goto(`${U}?vista=documenti`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.getByRole("button", { name: /^Pubblica/ }).waitFor({ timeout: 30_000 });
await page.click('[data-tour="pubblica-documento"]');
const doc = await page.waitForEvent("popup", { timeout: 120_000 });
await doc.waitForLoadState("networkidle", { timeout: 120_000 });
await doc.setViewportSize({ width: 1280, height: 1700 });
await doc.waitForTimeout(800);

const [snap] = await sql`select tipo, anno, dati from document_snapshot where company_id = ${az.id}`;
verifica("Il manuale si pubblica come snapshot", snap?.tipo === "manuale_sa8000", snap?.tipo);
verifica("…senza esercizio", snap?.anno === 0);

const testoDoc = await doc.locator(".doc-corpo").innerText();
verifica("Il documento porta l'anno nel nome dello standard", /SA8000\/2026|SA8000:2026/.test(testoDoc));
// ⚠️ Un manuale che elencasse solo cio' che funziona sarebbe inutile in audit.
verifica("⚠️ Riporta i criteri NON attuati", nonAttuati.every((k) => testoDoc.includes(k)));
verifica("…e dichiara che «parziale» pesa zero", /pesa zero|non protegge a metà/i.test(testoDoc));

const p2 = await page.context().newPage();
await p2.goto(doc.url(), { waitUntil: "networkidle" });
const pdf = await p2.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
writeFileSync(`${OUT}/manuale-sa8000.pdf`, pdf);
await p2.close();
verifica("Il PDF si genera e non è vuoto", pdf.length > 20_000, `${Math.round(pdf.length / 1024)} KB`);
await doc.screenshot({ path: `${OUT}/05-manuale.png` });

// ─── pulizia ─────────────────────────────────────────────────────────────────
await sql`delete from document_snapshot where organization_id = ${orgId}`;
await sql`delete from sa_criterion_state where organization_id = ${orgId}`;
await sql`delete from sa_system where organization_id = ${orgId}`;
await sql`delete from corpus_register_row where organization_id = ${orgId}`;
await sql`delete from corpus_block_override where organization_id = ${orgId}`;
await sql`delete from corpus_doc_state where organization_id = ${orgId}`;
await sql`delete from company where organization_id = ${orgId}`;
await sql`delete from audit_log where organization_id = ${orgId}`;
await sql`delete from entitlement_event where organization_id = ${orgId}`;
await sql`delete from org_entitlement where organization_id = ${orgId}`;
await sql`delete from member where organization_id = ${orgId}`;
await sql`delete from organization where id = ${orgId}`;
await sql`delete from "user" where email = ${email}`;

console.log(`\nSA8000/2026: ${ok} ok, ${ko} ko`);
if (errori.length) {
  console.log("\nErrori di console o richieste fallite:");
  for (const e of [...new Set(errori)]) console.log("  " + e);
}
await browser.close();
await sql.end();
process.exit(ko || errori.length ? 1 : 0);
