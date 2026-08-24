// Collaudo del percorso Due diligence di filiera: un controllo per ogni comando.
//
// ⚠️ Ogni verifica guarda il DATABASE, non il messaggio a schermo. E i conteggi si
// leggono dal catalogo: un numero fisso fallirebbe alla prima versione nuova dei
// contenuti per un motivo che col prodotto non c'entra.
//
//   npm run qa -- filiera-percorso

import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, attendi, pretendiServerAggiornato } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = process.env.SHOT_DIR ?? "./shots-filiera";
mkdirSync(OUT, { recursive: true });

const RUN = Date.now();
const email = `fil-${RUN}@example.com`;
const AZIENDA = `Tessiture Garganiche ${String(RUN).slice(-6)} S.p.A.`;

const errori = [];
let ok = 0, ko = 0;
const verifica = (nome, cond, dettaglio = "") => {
  if (cond) { ok++; console.log("  ok   " + nome + (dettaglio ? " — " + dettaglio : "")); }
  else { ko++; console.log(" FAIL  " + nome + (dettaglio ? " — " + dettaglio : "")); }
};

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1100 } })).newPage();
page.on("console", (m) => { if (m.type() === "error") errori.push(m.text().slice(0, 150)); });
page.on("pageerror", (e) => errori.push("pageerror: " + e.message.slice(0, 150)));
page.on("response", (r) => { if (r.status() >= 400) errori.push(`${r.status()} ${r.url().replace(BASE, "")}`); });

console.log(`\nDue diligence di filiera — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Filiera", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
const [az] = await sql`insert into company (id, organization_id, nome, settore, is_demo)
  values (gen_random_uuid(), ${orgId}, ${AZIENDA}, 'Tessile', false) returning id`;
await spegniTour(page);

const U = `${BASE}/aziende/${az.id}/filiera`;
const programma = async () => (await sql`select * from chain_program where company_id = ${az.id}`)[0];
const partner = async (nome) =>
  (await sql`select * from chain_partner where organization_id = ${orgId} and nome = ${nome}`)[0];
const vaiVista = async (k, ancora) => {
  await page.click(`[data-tour="fil-vista-${k}"]`);
  await page.waitForURL(`**vista=${k}**`, { timeout: 30_000 });
  if (ancora) await page.locator(ancora).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
};

// ─── creazione ───────────────────────────────────────────────────────────────
await page.goto(U, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="fil-crea"]').waitFor({ timeout: 60_000 });
verifica("Lo stato vuoto invita ad avviare il programma", true);
await page.screenshot({ path: `${OUT}/00-vuoto.png` });

await page.click('[data-tour="fil-crea"]');
await page.locator("[data-tour^='fil-vista-']").first().waitFor({ timeout: 60_000 });
// ⚠️ Il numero delle viste NON si scrive a mano: due collaudi sono rimasti rossi per
// giorni perche' il corpus ne aveva aggiunte tre e la riga diceva ancora «sei».
const vistefil = await page.locator("[data-tour^='fil-vista-']").evaluateAll((n) =>
  n.map((e) => e.getAttribute("data-tour").replace("fil-vista-", "")),
);
verifica("Il programma si crea e apre le sue viste", vistefil.length >= 6, vistefil.join(" · "));
verifica("…comprese le tre del corpus e i documenti",
  ["procedure", "moduli", "registri", "documenti"].every((v) => vistefil.includes(v)));

const p0 = await programma();
verifica("Il catalogo si congela alla creazione", p0?.content_set_id === "filiera-v1", p0?.content_set_id);

const [dim] = await sql`select count(*)::int n from chain_dimension where set_id='filiera-v1'`;
const [aree] = await sql`select count(*)::int n from chain_area where set_id='filiera-v1'`;
const [flg] = await sql`select count(*)::int n from chain_flag_def where set_id='filiera-v1'`;
const [fasi] = await sql`select count(*)::int n from chain_phase where set_id='filiera-v1'`;
verifica("I cataloghi sono quelli del prototipo",
  dim.n === 4 && aree.n === 7 && flg.n === 5 && fasi.n === 6,
  `${dim.n} dimensioni · ${aree.n} aree · ${flg.n} fattori · ${fasi.n} fasi`);
verifica("Il quadro mostra le sei fasi del ciclo OCSE",
  (await page.locator('[data-tour="fil-fasi"] li').count()) === fasi.n);
await page.screenshot({ path: `${OUT}/01-quadro.png` });

// ─── anagrafica del programma ────────────────────────────────────────────────
await vaiVista("programma", '[data-tour="fil-programma"]');
await page.getByLabel("Responsabile della due diligence", { exact: true }).fill("Dott.ssa Chiara Petrosino");
await page.keyboard.press("Tab");
await attendi(async () => (await programma())?.responsabile === "Dott.ssa Chiara Petrosino",
  { entro: 30_000, cosa: "il responsabile salvato" });
verifica("Un campo del programma si salva sfocandosi", true);

// ⚠️ Il riesame: nel prototipo il campo esisteva, bloccava la fase 4 sotto il 67% e
// NESSUNA vista lo scriveva. Qui si compila.
await page.fill("#fil-riesame", "2026-06-30");
await page.keyboard.press("Tab");
await attendi(async () => (await programma())?.riesame_data === "2026-06-30",
  { entro: 30_000, cosa: "la data del riesame" });
verifica("⚠️ Il riesame si può registrare — nel prototipo il campo era morto", true);
await page.screenshot({ path: `${OUT}/02-programma.png` });

// ─── partner ─────────────────────────────────────────────────────────────────
await vaiVista("partner", '[data-tour="fil-partner"]');
verifica("Il registro parte vuoto", (await page.locator('[data-slot="riga-partner"]').count()) === 0);

await page.click('[data-tour="fil-nuovo-partner"]');
await page.fill("#fil-nuovo-nome", "Zhengda Precision Components");
await page.fill("#fil-nuovo-paese", "Cina");
await page.click('[data-tour="fil-conferma-partner"]');
await page.locator('[data-tour="fil-scheda"]').waitFor({ timeout: 30_000 });
// ⚠️ Dopo aver creato qualcosa si NAVIGA verso quel qualcosa: chi aggiunge un partner
// lo aggiunge per compilarlo, e la scheda è dove si compila.
verifica("Creando un partner si apre la sua scheda", true);
const pa = await partner("Zhengda Precision Components");
verifica("…e la riga esiste nel database", Boolean(pa), pa?.paese);
verifica("Il partner aperto sta nell'indirizzo", page.url().includes(`p=${pa.id}`));

// I quattro assi del rischio inerente e le sette aree di maturità.
verifica("La scheda mostra le quattro dimensioni e le sette aree",
  (await page.locator('[data-slot="scala"]').count()) === dim.n + aree.n);

// ⚠️ IL CASO DEL DIFETTO B2: valuto SOLO la governance, e nessuna area critica.
await page.getByRole("button", { name: /^Rischio paese: 3/ }).click();
await page.getByRole("button", { name: /^Rischio settore: 3/ }).click();
await page.getByRole("button", { name: /^Governance e politiche: 4/ }).click();
await attendi(async () => {
  const r = await sql`select count(*)::int n from chain_partner_score where partner_id = ${pa.id}`;
  return r[0].n === 3;
}, { entro: 30_000, cosa: "i tre punteggi salvati" });
verifica("Un punteggio si assegna con un clic", true);

await page.waitForTimeout(1200);
const avviso = await page.locator('[data-slot="avviso-critiche"]').innerText();
verifica("⚠️ Le tre aree critiche in bianco sono dichiarate",
  /3 aree critiche non sono state valutate/.test(avviso), avviso.slice(0, 44));

const residuo = await page.locator('[data-slot="residuo-scheda"]').innerText();
verifica("⚠️ Governance a 4 e critiche in bianco NON danno rischio Basso",
  !/Basso/.test(residuo), residuo);
await page.screenshot({ path: `${OUT}/03-scheda.png` });

// Valutare davvero le aree critiche fa risalire la maturità: la correzione colpisce
// l'omissione, non la valutazione.
for (const n of ["Lavoro minorile e giovani lavoratori", "Lavoro forzato e reclutamento", "Salute e sicurezza"]) {
  await page.getByRole("button", { name: new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: 4`) }).click();
  await page.waitForTimeout(500);
}
await attendi(async () => {
  const r = await sql`select count(*)::int n from chain_partner_score where partner_id = ${pa.id}`;
  return r[0].n === 6;
}, { entro: 30_000, cosa: "le tre aree critiche valutate" });
await page.waitForTimeout(1500);
verifica("Valutandole davvero l'avviso sparisce",
  (await page.locator('[data-slot="avviso-critiche"]').count()) === 0);

// Ripremere lo stesso gradino annulla: il punteggio SPARISCE, non va a zero.
await page.getByRole("button", { name: /^Governance e politiche: 4/ }).click();
await attendi(async () => {
  const r = await sql`select count(*)::int n from chain_partner_score
    where partner_id = ${pa.id} and genere='area' and chiave='gov'`;
  return r[0].n === 0;
}, { entro: 30_000, cosa: "il punteggio annullato" });
verifica("⚠️ Ripremere annulla, e la riga sparisce invece di valere zero", true);
await page.getByRole("button", { name: /^Governance e politiche: 4/ }).click();
await page.waitForTimeout(900);

// I fattori aggravanti: un interruttore, e l'array è atomico.
await page.getByRole("switch", { name: "Provvedimento di autorità negli ultimi 36 mesi" }).click();
await attendi(async () => (await partner("Zhengda Precision Components"))?.flag?.includes("f_prov"),
  { entro: 30_000, cosa: "il fattore aggravante acceso" });
verifica("Un fattore aggravante si accende", true);

await page.getByRole("switch", { name: "Provvedimento di autorità negli ultimi 36 mesi" }).click();
await attendi(async () => !(await partner("Zhengda Precision Components"))?.flag?.length,
  { entro: 30_000, cosa: "il fattore aggravante spento" });
verifica("…e si spegne", true);

// La spesa: è ciò su cui si misura la copertura.
await page.getByLabel("Spesa annua (€)", { exact: true }).fill("310000");
await page.keyboard.press("Tab");
await attendi(async () => Number((await partner("Zhengda Precision Components"))?.spesa) === 310000,
  { entro: 30_000, cosa: "la spesa salvata" });
verifica("La spesa annua si salva", true);

// ⚠️ Un campo per volta: salvare la spesa non deve aver toccato il paese.
verifica("⚠️ Salvare un campo non azzera gli altri",
  (await partner("Zhengda Precision Components"))?.paese === "Cina");

// ─── il cessato esce da ogni conteggio ───────────────────────────────────────
await page.click('[data-tour="fil-torna"]');
await page.locator('[data-tour="fil-partner"]').waitFor({ timeout: 30_000 });
await page.click('[data-tour="fil-nuovo-partner"]');
await page.fill("#fil-nuovo-nome", "Ferriere Adriatiche cessato");
await page.click('[data-tour="fil-conferma-partner"]');
await page.locator('[data-tour="fil-scheda"]').waitFor({ timeout: 30_000 });
await page.getByLabel("Spesa annua (€)", { exact: true }).fill("5000000");
await page.keyboard.press("Tab");
await attendi(async () => Number((await partner("Ferriere Adriatiche cessato"))?.spesa) === 5000000,
  { entro: 30_000, cosa: "la spesa del secondo partner" });
const cess = await partner("Ferriere Adriatiche cessato");

await page.goto(`${U}?vista=quadro`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="fil-copertura"]').waitFor({ timeout: 30_000 });
const primaDelCessato = await page.locator('[data-tour="fil-copertura"] [data-slot="kpi"]').innerText();

await page.goto(`${U}?vista=partner&p=${cess.id}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="fil-scheda"]').waitFor({ timeout: 30_000 });
// ⚠️ Non è un <select> nativo: `CampoScelta` rende un combobox shadcn. Si apre e si
// sceglie l'opzione per nome accessibile, come negli altri collaudi del prodotto.
await page.getByLabel("Stato del rapporto", { exact: true }).click();
await page.getByRole("option", { name: "Cessato", exact: true }).click();
await attendi(async () => (await partner("Ferriere Adriatiche cessato"))?.stato === "Cessato",
  { entro: 30_000, cosa: "il rapporto cessato" });

await page.goto(`${U}?vista=quadro`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="fil-copertura"]').waitFor({ timeout: 30_000 });
const dopoIlCessato = await page.locator('[data-tour="fil-copertura"] [data-slot="kpi"]').innerText();
// Nel prototipo la spesa totale includeva i cessati mentre i conteggi per numerosità no:
// un cessato grosso schiacciava ogni percentuale di copertura.
verifica("⚠️ Un cessato grosso esce dalla spesa, e la copertura risale",
  parseInt(dopoIlCessato) > parseInt(primaDelCessato),
  `${primaDelCessato} → ${dopoIlCessato}`);
await page.screenshot({ path: `${OUT}/04-quadro-pieno.png` });

// ─── i filtri del registro ───────────────────────────────────────────────────
await vaiVista("partner", '[data-tour="fil-partner"]');
verifica("Il registro «in essere» esclude i cessati",
  (await page.locator('[data-slot="riga-partner"]').count()) === 1);
await page.getByRole("button", { name: "Filtra: Cessati" }).click();
await page.waitForTimeout(500);
verifica("Il filtro «cessati» li mostra", (await page.locator('[data-slot="riga-partner"]').count()) === 1);

// ─── corpus ──────────────────────────────────────────────────────────────────
const [proc] = await sql`select count(*)::int n from corpus_document where content_set_id='filiera-v1' and tipo='procedura'`;
const [mods] = await sql`select count(*)::int n from corpus_document where content_set_id='filiera-v1' and tipo='modulo'`;
const [regs] = await sql`select count(*)::int n from corpus_register where content_set_id='filiera-v1'`;
verifica("Il corpus ha le 14 procedure e i 56 moduli", proc.n === 14 && mods.n === 56, `${proc.n} · ${mods.n}`);

await page.goto(`${U}?vista=procedure`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="corpus-procedure"]').waitFor({ timeout: 30_000 });
verifica("Le procedure arrivano tutte a schermo",
  (await page.locator('[data-slot="voce-corpus"]').count()) === proc.n);

await page.goto(`${U}?vista=registri`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="corpus-registri"]').waitFor({ timeout: 30_000 });
verifica("I registri OCSE ci sono", (await page.locator('[data-slot="scheda-registro"]').count()) === regs.n, `${regs.n}`);
await page.screenshot({ path: `${OUT}/05-corpus.png` });

// ─── documento ───────────────────────────────────────────────────────────────
await page.goto(`${U}?vista=documenti`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.getByRole("button", { name: /^Pubblica/ }).waitFor({ timeout: 30_000 });
await page.click('[data-tour="pubblica-documento"]');
const doc = await page.waitForEvent("popup", { timeout: 120_000 });
await doc.waitForLoadState("networkidle", { timeout: 120_000 });
await doc.setViewportSize({ width: 1280, height: 1700 });
await doc.waitForTimeout(800);

const [snap] = await sql`select tipo, anno, dati from document_snapshot where company_id = ${az.id}`;
verifica("La Dichiarazione si pubblica come snapshot", snap?.tipo === "dichiarazione_filiera", snap?.tipo);
verifica("…senza esercizio", snap?.anno === 0);
// I partner si congelano uno per uno: chi la riceve deve poter risalire dal numero
// aggregato alla riga che lo produce.
verifica("⚠️ Lo snapshot congela i partner, non solo il quadro",
  Array.isArray(snap?.dati?.partner) && snap.dati.partner.length === 2, String(snap?.dati?.partner?.length));

const testoDoc = await doc.locator(".doc-corpo").innerText();
verifica("Il documento cita l'obbligo di pubblicazione", /articolo 16|art\. 16/i.test(testoDoc));
verifica("…dichiara che la copertura si misura sulla spesa", /copertura sulla spesa/i.test(testoDoc));
verifica("…e nomina il cessato escluso dai conteggi", /cessati/i.test(testoDoc));

const p2 = await page.context().newPage();
await p2.goto(doc.url(), { waitUntil: "networkidle" });
const pdf = await p2.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
writeFileSync(`${OUT}/dichiarazione-filiera.pdf`, pdf);
await p2.close();
verifica("Il PDF si genera e non è vuoto", pdf.length > 20_000, `${Math.round(pdf.length / 1024)} KB`);
await doc.screenshot({ path: `${OUT}/06-dichiarazione.png` });

// ─── pulizia ─────────────────────────────────────────────────────────────────
await sql`delete from document_snapshot where organization_id = ${orgId}`;
await sql`delete from chain_partner_score where organization_id = ${orgId}`;
await sql`delete from chain_partner where organization_id = ${orgId}`;
await sql`delete from chain_program where organization_id = ${orgId}`;
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

console.log(`\nDue diligence di filiera: ${ok} ok, ${ko} ko`);
if (errori.length) {
  console.log("\nErrori di console o richieste fallite:");
  for (const e of [...new Set(errori)]) console.log("  " + e);
}
await browser.close();
await sql.end();
process.exit(ko || errori.length ? 1 : 0);
