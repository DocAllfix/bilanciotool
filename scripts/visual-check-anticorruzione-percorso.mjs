// Collaudo del percorso Prevenzione della corruzione: un controllo per ogni comando.
//
// ⚠️ Era l'unico degli undici moduli senza un collaudo per comando: aveva il golden, i
// test di flusso e il confine di tenant, ma nessuno aveva mai premuto i suoi pulsanti in
// un browser vero. Lo scarto si è visto solo elencando i collaudi accanto ai moduli.
//
// ⚠️ Ogni verifica guarda il DATABASE, non il messaggio a schermo. E i conteggi si
// leggono dal catalogo: un numero fisso fallirebbe alla prima versione nuova dei
// contenuti per un motivo che col prodotto non c'entra.
//
//   npm run qa -- anticorruzione-percorso

import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, attendi, pretendiServerAggiornato } from "./comune-collaudo.mjs";
import { rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = process.env.SHOT_DIR ?? "./shots-anticorruzione";
mkdirSync(OUT, { recursive: true });

const RUN = Date.now();
const email = `pc-${RUN}@example.com`;
const AZIENDA = `Appalti Irpini ${String(RUN).slice(-6)} S.p.A.`;

const errori = [];
let ok = 0, ko = 0;
const verifica = (nome, cond, dettaglio = "") => {
  if (cond) { ok++; console.log("  ok   " + nome + (dettaglio ? " — " + dettaglio : "")); }
  else { ko++; console.log(" FAIL  " + nome + (dettaglio ? " — " + dettaglio : "")); }
};

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1100 } })).newPage();
page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) errori.push(m.text().slice(0, 150)); });
page.on("pageerror", (e) => errori.push("pageerror: " + e.message.slice(0, 150)));
page.on("response", (r) => { if (r.status() >= 400) errori.push(`${r.status()} ${r.url().replace(BASE, "")}`); });

console.log(`\nPrevenzione della corruzione — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio PC", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
const [az] = await sql`insert into company (id, organization_id, nome, settore, is_demo)
  values (gen_random_uuid(), ${orgId}, ${AZIENDA}, 'Costruzioni', false) returning id`;
await spegniTour(page);

const U = `${BASE}/aziende/${az.id}/anticorruzione`;
const sistema = async () => (await sql`select * from bribery_system where company_id = ${az.id}`)[0];
const socio = async (nome) =>
  (await sql`select * from bribery_partner where organization_id = ${orgId} and nome = ${nome}`)[0];
const vaiVista = async (k, ancora) => {
  await page.click(`[data-tour="pc-vista-${k}"]`);
  await page.waitForURL(`**vista=${k}**`, { timeout: 30_000 });
  if (ancora) await page.locator(ancora).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
};

// ─── creazione ───────────────────────────────────────────────────────────────
await page.goto(U, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="pc-crea"]').waitFor({ timeout: 60_000 });
verifica("Lo stato vuoto invita ad avviare il sistema", true);
await page.screenshot({ path: `${OUT}/00-vuoto.png` });

await page.click('[data-tour="pc-crea"]');
await page.locator("[data-tour^='pc-vista-']").first().waitFor({ timeout: 60_000 });
// ⚠️ Il numero delle viste NON si scrive a mano: due collaudi sono rimasti rossi per
// giorni perche' il corpus ne aveva aggiunte tre e la riga diceva ancora «sei».
const vistepc = await page.locator("[data-tour^='pc-vista-']").evaluateAll((n) =>
  n.map((e) => e.getAttribute("data-tour").replace("pc-vista-", "")),
);
verifica("Il sistema si crea e apre le sue viste", vistepc.length >= 6, vistepc.join(" · "));
verifica("…comprese le tre del corpus e i documenti",
  ["procedure", "moduli", "registri", "documenti"].every((v) => vistepc.includes(v)));

const s0 = await sistema();
verifica("Il catalogo si congela alla creazione", s0?.content_set_id === "iso37001-v1", s0?.content_set_id);

const [req] = await sql`select count(*)::int n from bribery_requirement where set_id='iso37001-v1'`;
const [cap] = await sql`select count(*)::int n from bribery_chapter where set_id='iso37001-v1'`;
const [dim] = await sql`select count(*)::int n from bribery_dimension where set_id='iso37001-v1'`;
const [fla] = await sql`select count(*)::int n from bribery_flag where set_id='iso37001-v1'`;
verifica("I cataloghi sono quelli del prototipo",
  req.n === 91 && cap.n === 7 && dim.n === 4 && fla.n === 6,
  `${req.n} requisiti · ${cap.n} capitoli · ${dim.n} dimensioni · ${fla.n} fattori`);
await page.screenshot({ path: `${OUT}/01-quadro.png` });

// ─── organizzazione ──────────────────────────────────────────────────────────
await vaiVista("organizzazione", '[data-tour="pc-organizzazione"]');
await page.getByLabel("Funzione per la prevenzione della corruzione", { exact: true })
  .fill("Dott. Rocco Sabino, responsabile conformità");
await page.keyboard.press("Tab");
await attendi(async () => (await sistema())?.funzione_pc?.startsWith("Dott. Rocco Sabino"),
  { entro: 30_000, cosa: "la funzione di conformità salvata" });
verifica("Un campo dell'organizzazione si salva sfocandosi", true);
await page.screenshot({ path: `${OUT}/02-organizzazione.png` });

// ─── soci in affari: il cuore della norma ────────────────────────────────────
await vaiVista("soci", '[data-tour="pc-soci"]');
verifica("Il registro dei soci parte vuoto", (await page.locator("[data-socio]").count()) === 0);

const NOME_SOCIO = "Subappalti Meridionali S.r.l.";
await page.fill("#pc-nuovo-socio", NOME_SOCIO);
await page.getByRole("button", { name: "Aggiungi", exact: true }).click();
await attendi(async () => Boolean(await socio(NOME_SOCIO)), { entro: 30_000, cosa: "il socio creato" });
verifica("Un socio in affari si aggiunge", true);
// La scheda si apre da sola, ma solo quando il refresh ha portato la riga nuova nelle
// props: prima di allora il socio selezionato non esiste ancora nell'elenco reso.
await page.locator("#so-nome").waitFor({ timeout: 30_000 });
verifica("…e la sua scheda si apre da sola", true);

// ⚠️ La media si fa sulle SOLE dimensioni valutate: una sola a 4 dà Critico, una sola a 1
// dà Basso. Dividere per il numero totale darebbe risultati completamente diversi, ed è
// il caso limite più facile da sbagliare riscrivendo questo motore.
const dimensioni = await sql`select key, etichetta from bribery_dimension where set_id='iso37001-v1' order by ordine`;
await page.getByRole("button", { name: new RegExp(`^${dimensioni[0].etichetta}: 4`) }).click();
const DIM_COL = ["dim_paese", "dim_pubblici_ufficiali", "dim_natura", "dim_valore"];
const valutate = async () => {
  const r = await socio(NOME_SOCIO);
  return DIM_COL.map((c) => r[c]).filter((v) => v !== null);
};
await attendi(async () => (await valutate()).includes(4),
  { entro: 30_000, cosa: "la prima dimensione valutata" });
await page.waitForTimeout(1200);
verifica("Una dimensione si valuta con un clic", true, dimensioni[0].etichetta);

await page.reload({ waitUntil: "domcontentloaded" });
await page.locator("[data-socio]").first().click();
await page.locator("#so-nome").waitFor({ timeout: 30_000 });
await page.waitForTimeout(600);
const testoSocio = await page.locator('[data-tour="pc-soci"]').innerText();
verifica("⚠️ UNA sola dimensione a 4 dà già Critico, non si divide per quattro",
  /Critico/.test(testoSocio));

// Ripremere lo stesso gradino annulla la valutazione.
await page.getByRole("button", { name: new RegExp(`^${dimensioni[0].etichetta}: 4`) }).click();
await attendi(async () => (await valutate()).length === 0,
  { entro: 30_000, cosa: "la valutazione annullata" });
verifica("Ripremere lo stesso gradino annulla", true);

// ⚠️ I precedenti per corruzione portano SEMPRE a Critico, qualunque sia la media.
const fattori = await sql`select key, etichetta from bribery_flag where set_id='iso37001-v1' order by ordine`;
const prec = fattori.find((f) => f.key === "f_prec") ?? fattori[0];
await page.getByRole("button", { name: new RegExp(`^${dimensioni[0].etichetta}: 1`) }).click();
await page.waitForTimeout(900);
await page.getByLabel(prec.etichetta, { exact: true }).check();
await attendi(async () => (await socio(NOME_SOCIO))?.flag_precedenti === true,
  { entro: 30_000, cosa: "il fattore acceso" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator("[data-socio]").first().click();
await page.locator("#so-nome").waitFor({ timeout: 30_000 });
await page.waitForTimeout(800);
verifica("⚠️ I precedenti per corruzione portano a Critico anche con la media a 1",
  /Critico/.test(await page.locator('[data-tour="pc-soci"]').innerText()));
await page.screenshot({ path: `${OUT}/03-socio.png` });

// Dal livello discendono gli obblighi: è il valore del modulo, non un'etichetta.
await vaiVista("quadro", '[data-tour="pc-livelli"]');
const quadro = await page.locator("main").innerText();
verifica("Il quadro conta il socio per livello", /Critico/.test(quadro));
verifica("…e dice che sopra la soglia scattano gli obblighi",
  /due diligence, politica, impegni, clausole, controlli/.test(quadro));

// ─── requisiti ───────────────────────────────────────────────────────────────
await vaiVista("requisiti", '[data-tour="pc-requisiti"]');
// ⚠️ Il nome accessibile porta la CHIAVE del requisito, non il riferimento alla norma:
// i riferimenti si ripetono — sei requisiti citano tutti il punto 4.5 — e sei pulsanti
// con lo stesso nome sono indistinguibili per un lettore di schermo e ambigui per questo
// collaudo, che infatti si era fermato con «resolved to 2 elements». E la vista mostra un
// capitolo per volta, quindi il requisito va cercato nel capitolo aperto.
const [capAperto] = await sql`select key from bribery_chapter where set_id='iso37001-v1' order by ordine limit 1`;
const [primo] = await sql`select key, riferimento from bribery_requirement
  where set_id='iso37001-v1' and chapter_key = ${capAperto.key} order by ordine limit 1`;
await page.getByRole("button", { name: `${primo.key}: Conforme`, exact: true }).click();
await attendi(async () => {
  const r = await sql`select stato from bribery_requirement_state
    where system_id = ${s0.id} and requirement_key = ${primo.key}`;
  return r[0]?.stato === "Conforme";
}, { entro: 30_000, cosa: "il requisito valutato" });
verifica("Un requisito si valuta con un clic", true, primo.key);

await page.getByRole("button", { name: `${primo.key}: Conforme`, exact: true }).click();
await attendi(async () => {
  const r = await sql`select stato from bribery_requirement_state
    where system_id = ${s0.id} and requirement_key = ${primo.key}`;
  return r[0]?.stato === null;
}, { entro: 30_000, cosa: "la valutazione annullata" });
verifica("Ripremere lo stesso stato annulla", true);
await page.screenshot({ path: `${OUT}/04-requisiti.png` });

// ─── corpus ──────────────────────────────────────────────────────────────────
const [proc] = await sql`select count(*)::int n from corpus_document where content_set_id='iso37001-v1' and tipo='procedura'`;
const [mods] = await sql`select count(*)::int n from corpus_document where content_set_id='iso37001-v1' and tipo='modulo'`;
const [regs] = await sql`select count(*)::int n from corpus_register where content_set_id='iso37001-v1'`;
verifica("Il corpus ha le 12 procedure e i 47 moduli", proc.n === 12 && mods.n === 47, `${proc.n} · ${mods.n}`);

await page.goto(`${U}?vista=procedure`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="corpus-procedure"]').waitFor({ timeout: 30_000 });
verifica("Le procedure arrivano tutte a schermo",
  (await page.locator('[data-slot="voce-corpus"]').count()) === proc.n);

await page.goto(`${U}?vista=registri`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="corpus-registri"]').waitFor({ timeout: 30_000 });
verifica("I registri ci sono", (await page.locator('[data-slot="scheda-registro"]').count()) === regs.n, `${regs.n}`);

// ⚠️ Il registro delle segnalazioni resta SCRIVIBILE finché il modulo dedicato non è
// attivo: è l'unico posto che l'ente ha per annotarne una.
verifica("Il registro delle segnalazioni è scrivibile senza il modulo dedicato",
  (await page.locator('[data-slot="registro-superato"]').count()) === 0);

// Aperto il modulo Segnalazioni, quello del corpus diventa di sola lettura.
await page.goto(`${BASE}/aziende/${az.id}/segnalazioni`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="wb-crea"]').waitFor({ timeout: 60_000 });
await page.click('[data-tour="wb-crea"]');
await page.locator("[data-tour^='wb-vista-']").first().waitFor({ timeout: 60_000 });

await page.goto(`${U}?vista=registri`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="corpus-registri"]').waitFor({ timeout: 30_000 });
verifica("⚠️ Con il modulo Segnalazioni attivo il registro doppione è di sola lettura",
  (await page.locator('[data-slot="registro-superato"]').count()) === 1);
await page.screenshot({ path: `${OUT}/05-registri.png` });

// ─── documenti ───────────────────────────────────────────────────────────────
await page.goto(`${U}?vista=documenti`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.getByRole("button", { name: /^Pubblica/ }).first().waitFor({ timeout: 30_000 });
const quantiPubblica = await page.getByRole("button", { name: /^Pubblica/ }).count();
verifica("Il modulo pubblica due documenti", quantiPubblica === 2, `${quantiPubblica}`);

await page.locator('[data-tour="pubblica-documento"]').first().click();
const doc = await page.waitForEvent("popup", { timeout: 120_000 });
await doc.waitForLoadState("networkidle", { timeout: 120_000 });
await doc.setViewportSize({ width: 1280, height: 1700 });
await doc.waitForTimeout(800);

const snaps = await sql`select tipo, anno from document_snapshot where company_id = ${az.id}`;
verifica("Il documento si pubblica come snapshot", snaps.length === 1, snaps[0]?.tipo);
verifica("…senza esercizio", snaps[0]?.anno === 0);

const [k] = await sql`select codice from document_codice where organization_id = ${orgId}`;
verifica("…e porta il codice di verifica nel colophon",
  (await doc.locator("article").innerText()).includes(k.codice), k.codice);

const p2 = await page.context().newPage();
await p2.goto(doc.url(), { waitUntil: "networkidle" });
const pdf = await p2.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
writeFileSync(`${OUT}/relazione-iso37001.pdf`, pdf);
await p2.close();
verifica("Il PDF si genera e non è vuoto", pdf.length > 20_000, `${Math.round(pdf.length / 1024)} KB`);
await doc.screenshot({ path: `${OUT}/06-documento.png` });

// ─── pulizia ─────────────────────────────────────────────────────────────────
await sql`delete from document_snapshot where organization_id = ${orgId}`;
await sql`delete from wb_requirement_state where organization_id = ${orgId}`;
await sql`delete from wb_report where organization_id = ${orgId}`;
await sql`delete from wb_channel where organization_id = ${orgId}`;
await sql`delete from wb_system where organization_id = ${orgId}`;
await sql`delete from bribery_requirement_state where organization_id = ${orgId}`;
await sql`delete from bribery_partner where organization_id = ${orgId}`;
await sql`delete from bribery_system where organization_id = ${orgId}`;
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

console.log(`\nPrevenzione della corruzione: ${ok} ok, ${ko} ko`);
if (errori.length) {
  console.log("\nErrori di console o richieste fallite:");
  for (const e of [...new Set(errori)]) console.log("  " + e);
}
await browser.close();
await sql.end();
process.exit(ko || errori.length ? 1 : 0);
