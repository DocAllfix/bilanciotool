// Collaudo del percorso Sistema integrato QAS: un controllo per ogni comando.
//
// ⚠️ Ogni verifica guarda il DATABASE, non il messaggio a schermo. E i conteggi si
// leggono dal catalogo: un numero fisso fallirebbe alla prima versione nuova dei
// contenuti per un motivo che col prodotto non c'entra.
//
//   npm run qa -- sgiqas-percorso

import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, attendi, pretendiServerAggiornato, fattoreAttesa } from "./comune-collaudo.mjs";
import { rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = process.env.SHOT_DIR ?? "./shots-sgiqas";
mkdirSync(OUT, { recursive: true });

const RUN = Date.now();
const email = `qas-${RUN}@example.com`;
const AZIENDA = `Officine Salentine ${String(RUN).slice(-6)} S.p.A.`;

const errori = [];
let ok = 0, ko = 0;
const verifica = (nome, cond, dettaglio = "") => {
  if (cond) { ok++; console.log("  ok   " + nome + (dettaglio ? " — " + dettaglio : "")); }
  else { ko++; console.log(" FAIL  " + nome + (dettaglio ? " — " + dettaglio : "")); }
};

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) errori.push(m.text().slice(0, 150)); });
page.on("pageerror", (e) => errori.push("pageerror: " + e.message.slice(0, 150)));
page.on("response", (r) => { if (r.status() >= 400) errori.push(`${r.status()} ${r.url().replace(BASE, "")}`); });

console.log(`\nSistema integrato QAS — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio QAS", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
const [az] = await sql`insert into company (id, organization_id, nome, settore, is_demo)
  values (gen_random_uuid(), ${orgId}, ${AZIENDA}, 'Meccanica', false) returning id`;
await spegniTour(page);

const U = `${BASE}/aziende/${az.id}/sgiqas`;
const sistema = async () => (await sql`select * from qas_system where company_id = ${az.id}`)[0];
const vaiVista = async (k, ancora) => {
  await page.click(`[data-tour="qas-vista-${k}"]`);
  await page.waitForURL(`**vista=${k}`, { timeout: 30_000 });
  if (ancora) await page.locator(ancora).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
};

// ─── creazione ───────────────────────────────────────────────────────────────
await page.goto(U, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="qas-crea"]').waitFor({ timeout: 60_000 });
verifica("Lo stato vuoto invita ad avviare il sistema", true);
await page.screenshot({ path: `${OUT}/00-vuoto.png` });

await page.click('[data-tour="qas-crea"]');
await page.locator("[data-tour^='qas-vista-']").first().waitFor({ timeout: 60_000 });
// ⚠️ Il numero delle viste NON si scrive a mano: due collaudi sono rimasti rossi per
// giorni perche' il corpus ne aveva aggiunte tre e la riga diceva ancora «sei».
const visteqas = await page.locator("[data-tour^='qas-vista-']").evaluateAll((n) =>
  n.map((e) => e.getAttribute("data-tour").replace("qas-vista-", "")),
);
verifica("Il sistema si crea e apre le sue viste", visteqas.length >= 6, visteqas.join(" · "));
verifica("…comprese le tre del corpus e i documenti",
  ["procedure", "moduli", "registri", "documenti"].every((v) => visteqas.includes(v)));

const s0 = await sistema();
verifica("Il catalogo si congela alla creazione", s0?.content_set_id === "sgiqas-v1", s0?.content_set_id);
verifica("Nasce con tutte e tre le norme nel perimetro", String(s0?.norme) === "Q,A,S", String(s0?.norme));
await page.screenshot({ path: `${OUT}/01-quadro.png` });

// ─── il perimetro: il comando che cambia tutto ───────────────────────────────
const [tot] = await sql`select count(*)::int n from qas_requirement where set_id='sgiqas-v1'`;
const [soloQ] = await sql`select count(*)::int n from qas_requirement where set_id='sgiqas-v1' and 'Q' = any(norme)`;
verifica("Il catalogo ha i requisiti del prototipo", tot.n === 107, `${tot.n}`);
verifica("…e la copertura della Qualità è quella misurata", soloQ.n === 57, `${soloQ.n}`);

await vaiVista("sistema", '[data-tour="qas-perimetro"]');
verifica("La vista Sistema mostra le tre norme", (await page.locator('[data-slot="norma"]').count()) === 3);

// Togliere Ambiente e Sicurezza: restano i 57 della Qualità.
for (const nome of ["ISO 14001 nel perimetro", "ISO 45001 nel perimetro"]) {
  await page.getByRole("switch", { name: nome }).click();
  await page.waitForTimeout(700);
}
await attendi(async () => String((await sistema())?.norme) === "Q", { entro: 30_000 * fattoreAttesa(), cosa: "il perimetro ridotto alla Qualità" });
verifica("⚠️ Il perimetro si restringe a una norma sola", true);

await page.waitForTimeout(800);
const conto = await page.locator('[data-slot="perimetro-conto"]').innerText();
verifica("…e la pagina dichiara quanti requisiti restano", conto.includes(String(soloQ.n)), conto.slice(0, 60));

// ⚠️ L'ultima norma non si toglie: il rifiuto e' immediato e spiegato.
await page.getByRole("switch", { name: "ISO 9001 nel perimetro" }).click();
await page.waitForTimeout(800);
verifica("⚠️ L'ultima norma NON si può togliere", String((await sistema())?.norme) === "Q");
verifica("…e il rifiuto è spiegato accanto al comando",
  (await page.getByText("Almeno una norma deve restare").count()) > 0);
await page.screenshot({ path: `${OUT}/02-perimetro.png` });

// I requisiti fuori perimetro spariscono davvero dall'elenco.
await vaiVista("requisiti", '[data-tour="qas-requisiti"]');
const [nonQ] = await sql`select key from qas_requirement
  where set_id='sgiqas-v1' and not ('Q' = any(norme)) order by ordine limit 1`;
const testoReq = await page.locator('[data-tour="qas-requisiti"]').innerText();
verifica("⚠️ Un requisito fuori perimetro non compare", !testoReq.includes(nonQ.key), nonQ.key);

// Rimetto tutto nel perimetro.
await vaiVista("sistema", '[data-tour="qas-perimetro"]');
for (const nome of ["ISO 14001 nel perimetro", "ISO 45001 nel perimetro"]) {
  await page.getByRole("switch", { name: nome }).click();
  await page.waitForTimeout(600);
}
await attendi(async () => String((await sistema())?.norme).length === 5, { entro: 30_000 * fattoreAttesa(), cosa: "il perimetro ripristinato" });
verifica("Rimettere una norma non ha perso niente", true);

// ─── anagrafica ──────────────────────────────────────────────────────────────
await page.getByLabel("Alta direzione", { exact: true }).fill("Consiglio di amministrazione");
await page.keyboard.press("Tab");
await attendi(async () => (await sistema())?.direzione === "Consiglio di amministrazione",
  { entro: 30_000 * fattoreAttesa(), cosa: "l'alta direzione salvata" });
verifica("Un campo dell'anagrafica si salva sfocandosi", true);

// ─── requisiti ───────────────────────────────────────────────────────────────
await vaiVista("requisiti", '[data-tour="qas-requisiti"]');
const [primo] = await sql`select key, riferimento from qas_requirement where set_id='sgiqas-v1' order by ordine limit 1`;
await page.getByRole("button", { name: `${primo.key}: Conforme`, exact: true }).click();
await attendi(async () => {
  const r = await sql`select stato from qas_requirement_state
    where system_id = ${s0.id} and requirement_key = ${primo.key}`;
  return r[0]?.stato === "Conforme";
}, { entro: 30_000 * fattoreAttesa(), cosa: "il requisito valutato" });
verifica("Un requisito si valuta con un clic", true, primo.key);

await page.getByRole("button", { name: `${primo.key}: Conforme`, exact: true }).click();
await attendi(async () => {
  const r = await sql`select stato from qas_requirement_state
    where system_id = ${s0.id} and requirement_key = ${primo.key}`;
  return r[0]?.stato === null;
}, { entro: 30_000 * fattoreAttesa(), cosa: "la valutazione annullata" });
verifica("Ripremere lo stesso stato annulla", true);
await page.screenshot({ path: `${OUT}/03-requisiti.png` });

// ─── indicatori ──────────────────────────────────────────────────────────────
await vaiVista("indicatori", '[data-tour="qas-indicatori"]');
await page.click('[data-tour="qas-indicatori-base"]');
const [base] = await sql`select count(*)::int n from qas_indicator_default where set_id='sgiqas-v1'`;
await attendi(async () => {
  const r = await sql`select count(*)::int n from qas_indicator where system_id = ${s0.id}`;
  return r[0].n === base.n;
}, { entro: 40_000 * fattoreAttesa(), cosa: "gli indicatori di partenza caricati" });
verifica("I venti indicatori di partenza si caricano", true, `${base.n}`);

// ⚠️ Ripremere non duplica: il gesto si puo' ripetere senza pensarci.
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator('[data-tour="qas-indicatori-base"]').waitFor({ timeout: 30_000 });
await page.click('[data-tour="qas-indicatori-base"]');
await page.waitForTimeout(2500);
const [dopo] = await sql`select count(*)::int n from qas_indicator where system_id = ${s0.id}`;
verifica("⚠️ Ripremere non li duplica", dopo.n === base.n, `${dopo.n}`);

// Un indicatore senza target risulta «non rilevato», non «a target».
const idSenza = await sql`insert into qas_indicator (id, organization_id, system_id, nome, ordine)
  values (gen_random_uuid(), ${orgId}, ${s0.id}, 'Indicatore senza target', 99) returning id`;
await sql`insert into qas_measurement (id, organization_id, indicator_id, periodo, valore)
  values (gen_random_uuid(), ${orgId}, ${idSenza[0].id}, '2026-01', '42')`;
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator('[data-tour="qas-indicatori"]').waitFor({ timeout: 30_000 });
const riga = page.locator('[data-slot="riga-indicatore"]', { hasText: "Indicatore senza target" });
verifica("⚠️ Senza target l'indicatore è «non rilevato», non «a target»",
  (await riga.innerText()).includes("non rilevato"));

// La serie storica: due valori per lo stesso periodo aggiornano, non aggiungono.
await riga.getByRole("button", { name: /^Apri/ }).click();
await page.locator('[data-slot="scheda-indicatore"]').waitFor({ timeout: 30_000 });
await page.fill(`#qas-per-${idSenza[0].id}`, "2026-02");
await page.fill(`#qas-val-${idSenza[0].id}`, "50");
await page.click('[data-tour="qas-aggiungi-rilevazione"]');
await attendi(async () => {
  const r = await sql`select count(*)::int n from qas_measurement where indicator_id = ${idSenza[0].id}`;
  return r[0].n === 2;
}, { entro: 30_000 * fattoreAttesa(), cosa: "la seconda rilevazione" });
verifica("Una rilevazione si registra", true);
await page.screenshot({ path: `${OUT}/04-indicatori.png` });

// ─── corpus ──────────────────────────────────────────────────────────────────
const [proc] = await sql`select count(*)::int n from corpus_document where content_set_id='sgiqas-v1' and tipo='procedura'`;
const [regs] = await sql`select count(*)::int n from corpus_register where content_set_id='sgiqas-v1'`;
await page.goto(`${U}?vista=procedure`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="corpus-procedure"]').waitFor({ timeout: 30_000 });
verifica("Le procedure del corpus arrivano tutte",
  (await page.locator('[data-slot="voce-corpus"]').count()) === proc.n, `${proc.n}`);

await page.goto(`${U}?vista=registri`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="corpus-registri"]').waitFor({ timeout: 30_000 });
verifica("I sedici registri ci sono",
  (await page.locator('[data-slot="scheda-registro"]').count()) === regs.n, `${regs.n}`);
await page.screenshot({ path: `${OUT}/05-registri.png` });

// ─── documento ───────────────────────────────────────────────────────────────
await page.goto(`${U}?vista=documenti`, { waitUntil: "domcontentloaded", timeout: 60_000 });
// ⚠️ Il modulo pubblica TRE documenti: il Riesame e i due firmati. Un `/^Pubblica/`
// secco ne trova tre e Playwright si ferma; e i tre vanno provati, non uno.
await page.getByRole("button", { name: /^Pubblica/ }).first().waitFor({ timeout: 30_000 });
const quantiPubblica = await page.getByRole("button", { name: /^Pubblica/ }).count();
verifica("Il modulo pubblica i tre documenti del sistema", quantiPubblica === 3, `${quantiPubblica}`);
verifica("…compresi i due firmati, che non sono allegati del riesame",
  (await page.getByRole("button", { name: /Analisi ambientale/ }).count()) === 1 &&
    (await page.getByRole("button", { name: /Valutazione dei/ }).count()) === 1);
await page.locator('[data-tour="pubblica-documento"]').first().click();
const doc = await page.waitForEvent("popup", { timeout: 120_000 });
await doc.waitForLoadState("networkidle", { timeout: 120_000 });
await doc.setViewportSize({ width: 1280, height: 1700 });
await doc.waitForTimeout(800);

const [snap] = await sql`select tipo, anno, dati from document_snapshot where company_id = ${az.id}`;
verifica("Il riesame si pubblica come snapshot", snap?.tipo === "riesame_qas", snap?.tipo);
verifica("…senza esercizio", snap?.anno === 0);
// ⚠️ Il perimetro e' congelato col documento: se domani cambia, il documento non lo segue.
verifica("⚠️ Il perimetro è congelato nello snapshot", /"perimetro"/.test(JSON.stringify(snap?.dati ?? {})));

const testoDoc = await doc.locator(".doc-corpo").innerText();
verifica("Il documento dichiara il perimetro", /Perimetro\.\s+Il sistema comprende/.test(testoDoc));
verifica("…e riporta le lacune", /richiedono decisione/i.test(testoDoc));
verifica("…con la nota sugli indicatori senza target", /non è «a target»/.test(testoDoc));

const p2 = await page.context().newPage();
await p2.goto(doc.url(), { waitUntil: "networkidle" });
const pdf = await p2.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
writeFileSync(`${OUT}/riesame-direzione.pdf`, pdf);
await p2.close();
verifica("Il PDF si genera e non è vuoto", pdf.length > 20_000, `${Math.round(pdf.length / 1024)} KB`);
await doc.screenshot({ path: `${OUT}/06-riesame.png` });

// ─── pulizia ─────────────────────────────────────────────────────────────────
await sql`delete from document_snapshot where organization_id = ${orgId}`;
await sql`delete from qas_measurement where organization_id = ${orgId}`;
await sql`delete from qas_indicator where organization_id = ${orgId}`;
await sql`delete from qas_requirement_state where organization_id = ${orgId}`;
await sql`delete from qas_system where organization_id = ${orgId}`;
await sql`delete from corpus_register_row where organization_id = ${orgId}`;
await sql`delete from corpus_block_override where organization_id = ${orgId}`;
await sql`delete from corpus_doc_state where organization_id = ${orgId}`;
await sql`delete from company where organization_id = ${orgId}`;
await sql`delete from audit_log where organization_id = ${orgId}`;
await sql`delete from org_entitlement where organization_id = ${orgId}`;
await sql`delete from member where organization_id = ${orgId}`;
await sql`delete from organization where id = ${orgId}`;
await sql`delete from "user" where email = ${email}`;

console.log(`\nSGI QAS: ${ok} ok, ${ko} ko`);
if (errori.length) {
  console.log("\nErrori di console o richieste fallite:");
  for (const e of [...new Set(errori)]) console.log("  " + e);
}
await browser.close();
await sql.end();
process.exit(ko || errori.length ? 1 : 0);
