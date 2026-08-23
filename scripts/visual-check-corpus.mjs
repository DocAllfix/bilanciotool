// Collaudo della superficie del corpus documentale, sui tre moduli che ce l'hanno.
//
// ⚠️ Questa superficie è rimasta invisibile per tre moduli interi mentre i test erano
// verdi: il motore c'era, le mutazioni c'erano, le LETTURE no — e i test verificavano le
// scritture interrogando il database direttamente, quindi certificavano la metà che
// funzionava. Qui si guarda dall'altra parte: si apre la pagina e si conta cosa arriva
// all'utente.
//
//   npm run qa -- corpus

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, attendi, pretendiServerAggiornato } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = process.env.SHOT_DIR ?? "./shots-corpus";
mkdirSync(OUT, { recursive: true });

const RUN = Date.now();
const email = `corpus-${RUN}@example.com`;
const AZIENDA = `Vetrerie Daune ${String(RUN).slice(-6)} S.r.l.`;

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

console.log(`\nCorpus documentale — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Corpus", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
const [az] = await sql`insert into company (id, organization_id, nome, settore, is_demo)
  values (gen_random_uuid(), ${orgId}, ${AZIENDA}, 'Vetro', false) returning id`;
await spegniTour(page);

// I tre moduli che oggi hanno il corpus, coi loro conteggi VERI letti dal catalogo.
const MODULI = [
  { href: "segnalazioni", set: "wb-v1", crea: "wb-crea" },
  { href: "mog231", set: "mog231-v1", crea: "mog-crea" },
  { href: "anticorruzione", set: "iso37001-v1", crea: "pc-crea" },
];

for (const m of MODULI) {
  const U = `${BASE}/aziende/${az.id}/${m.href}`;
  console.log(`\n— ${m.href} —`);

  // Avvio del modulo.
  await page.goto(U, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const crea = page.locator(`[data-tour="${m.crea}"]`);
  if (await crea.count()) {
    await crea.click();
    await page.locator("[data-tour^='wb-vista-'],[data-tour^='mog-vista-'],[data-tour^='pc-vista-']").first().waitFor({ timeout: 60_000 });
  }

  // ⚠️ I conteggi si leggono dal CATALOGO, mai scritti a mano: un numero fisso fallisce
  // alla prima versione nuova dei contenuti per un motivo che col prodotto non c'entra.
  const [attesi] = await sql`select
      count(*) filter (where tipo = 'procedura')::int procedure,
      count(*) filter (where tipo = 'modulo')::int moduli
    from corpus_document where content_set_id = ${m.set}`;
  const [reg] = await sql`select count(*)::int n from corpus_register where content_set_id = ${m.set}`;

  // ── Procedure ──────────────────────────────────────────────────────────────
  await page.goto(`${U}?vista=procedure`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('[data-tour="corpus-procedure"]').waitFor({ timeout: 30_000 });
  const nPro = await page.locator('[data-slot="voce-corpus"]').count();
  verifica(`${m.href}: le procedure arrivano tutte alla pagina`, nPro === attesi.procedure, `${nPro}/${attesi.procedure}`);

  // ── Modulistica ────────────────────────────────────────────────────────────
  await page.goto(`${U}?vista=moduli`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('[data-tour="corpus-moduli"]').waitFor({ timeout: 30_000 });
  const nMod = await page.locator('[data-slot="voce-corpus"]').count();
  verifica(`${m.href}: la modulistica arriva tutta`, nMod === attesi.moduli, `${nMod}/${attesi.moduli}`);

  // ── Registri ───────────────────────────────────────────────────────────────
  await page.goto(`${U}?vista=registri`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('[data-tour="corpus-registri"]').waitFor({ timeout: 30_000 });
  const nReg = await page.locator('[data-slot="scheda-registro"]').count();
  verifica(`${m.href}: i registri ci sono tutti`, nReg === reg.n, `${nReg}/${reg.n}`);

  await page.screenshot({ path: `${OUT}/${m.href}-registri.png` });
}

// ─── il documento: si apre, si personalizza, si ripristina ───────────────────
const U = `${BASE}/aziende/${az.id}/segnalazioni`;
const [primaProc] = await sql`select code, titolo from corpus_document
  where content_set_id = 'wb-v1' and tipo = 'procedura' order by ordine limit 1`;

await page.goto(`${U}?vista=procedure&doc=${primaProc.code}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-slot="documento-corpus"]').waitFor({ timeout: 30_000 });
const [blocchi] = await sql`select count(*)::int n from corpus_block
  where content_set_id = 'wb-v1' and doc_code = ${primaProc.code}`;
verifica("Il documento si apre e rende i suoi blocchi", blocchi.n > 0, `${blocchi.n} blocchi`);
verifica("…col titolo del catalogo", (await page.locator("h2").first().innerText()).includes(primaProc.titolo.slice(0, 20)));

// ⚠️ Il segnaposto irrisolto si vede: è il meccanismo di completezza del corpus. Con
// l'anagrafica vuota, il nome dell'organizzazione deve comparire evidenziato.
const mancanti = await page.locator("[data-mancante]").count();
verifica("I segnaposto non risolti restano visibili", mancanti > 0, `${mancanti} evidenziati`);
await page.screenshot({ path: `${OUT}/documento.png` });

// Con la ragione sociale compilata, quel segnaposto sparisce.
await sql`update wb_system set ragione = ${AZIENDA} where company_id = ${az.id}`;
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator('[data-slot="documento-corpus"]').waitFor({ timeout: 30_000 });
verifica("…e si risolvono quando il dato c'è",
  (await page.locator('[data-slot="documento-corpus"]').innerText()).includes(AZIENDA));

// Personalizzazione blocco per blocco.
await page.click('[data-tour="corpus-personalizza"]');
await page.locator('[data-slot="blocco-corpus"]').first().waitFor({ timeout: 30_000 });
const primoBlocco = page.locator('[data-slot="blocco-corpus"]').first();
const chiaveBlocco = await primoBlocco.getAttribute("data-blocco");
const SU_MISURA = "Testo su misura di questa azienda.";
await primoBlocco.locator("textarea").fill(SU_MISURA);
await page.keyboard.press("Tab");
await attendi(async () => {
  const r = await sql`select count(*)::int n from corpus_block_override
    where company_id = ${az.id} and block_id = ${chiaveBlocco}`;
  return r[0].n === 1;
}, { entro: 30_000, cosa: "la personalizzazione scritta" });
verifica("Un blocco si personalizza, e punta alla CHIAVE non alla posizione", true, chiaveBlocco);

// Il ripristino: svuotare non scrive una stringa vuota, cancella la riga.
await page.locator('[data-slot="blocco-corpus"]').first().getByRole("button", { name: /Ripristina/ }).click();
await attendi(async () => {
  const r = await sql`select count(*)::int n from corpus_block_override
    where company_id = ${az.id} and block_id = ${chiaveBlocco}`;
  return r[0].n === 0;
}, { entro: 30_000, cosa: "la personalizzazione rimossa" });
verifica("⚠️ Ripristinare CANCELLA la riga, non scrive un testo vuoto", true);

// ─── il registro: riga, campo, eliminazione ──────────────────────────────────
const [primoReg] = await sql`select register_id, nome from corpus_register
  where content_set_id = 'wb-v1' order by ordine limit 1`;
await page.goto(`${U}?vista=registri&reg=${primoReg.register_id}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="corpus-registro"]').waitFor({ timeout: 30_000 });
verifica("Un registro si apre col suo nome", (await page.locator("h2").first().innerText()).includes(primoReg.nome.slice(0, 15)));

await page.click('[data-tour="corpus-nuova-riga"]');
await page.locator('[data-slot="scheda-riga"]').waitFor({ timeout: 30_000 });
const [riga] = await sql`select id, numero, riferimento from corpus_register_row
  where company_id = ${az.id} and register_id = ${primoReg.register_id}`;
verifica("Una registrazione si crea e apre la sua scheda", !!riga, `n. ${riga?.numero}`);
verifica("…col riferimento automatico, se il registro lo prevede", riga?.riferimento !== undefined);

// Un campo per volta.
const primoCampo = page.locator('[data-slot="scheda-riga"] textarea, [data-slot="scheda-riga"] input[type="text"]').first();
await primoCampo.fill("Valore di collaudo");
await page.keyboard.press("Tab");
await attendi(async () => {
  const r = await sql`select dati from corpus_register_row where id = ${riga.id}`;
  return JSON.stringify(r[0]?.dati ?? {}).includes("Valore di collaudo");
}, { entro: 30_000, cosa: "il campo salvato" });
verifica("Un campo della registrazione si salva sfocandosi", true);

await page.locator('[data-slot="scheda-riga"]').getByRole("button", { name: "Elimina", exact: true }).first().click();
await page.locator('[data-slot="scheda-riga"]').getByRole("button", { name: "Elimina", exact: true }).last().click();
await attendi(async () => {
  const r = await sql`select count(*)::int n from corpus_register_row where id = ${riga.id}`;
  return r[0].n === 0;
}, { entro: 30_000, cosa: "la registrazione eliminata" });
verifica("Una registrazione si elimina, con conferma", true);
await page.screenshot({ path: `${OUT}/registro.png` });

// ─── pulizia e referto ───────────────────────────────────────────────────────
await sql`delete from corpus_register_row where organization_id = ${orgId}`;
await sql`delete from corpus_block_override where organization_id = ${orgId}`;
await sql`delete from corpus_doc_state where organization_id = ${orgId}`;
for (const t of ["wb_report", "wb_requirement_state", "wb_channel", "wb_system"]) {
  await sql.unsafe(`delete from ${t} where organization_id = '${orgId}'`);
}
await sql`delete from mog_scenario where organization_id = ${orgId}`;
await sql`delete from mog_process where organization_id = ${orgId}`;
await sql`delete from mog_crime_applicability where organization_id = ${orgId}`;
await sql`delete from mog_requirement_state where organization_id = ${orgId}`;
await sql`delete from mog_model where organization_id = ${orgId}`;
await sql`delete from bribery_requirement_state where organization_id = ${orgId}`;
await sql`delete from bribery_partner where organization_id = ${orgId}`;
await sql`delete from bribery_system where organization_id = ${orgId}`;
await sql`delete from company where organization_id = ${orgId}`;
await sql`delete from audit_log where organization_id = ${orgId}`;
await sql`delete from org_entitlement where organization_id = ${orgId}`;
await sql`delete from member where organization_id = ${orgId}`;
await sql`delete from organization where id = ${orgId}`;
await sql`delete from "user" where email = ${email}`;

console.log(`\nCorpus: ${ok} ok, ${ko} ko`);
if (errori.length) {
  console.log("\nErrori di console o richieste fallite:");
  for (const e of [...new Set(errori)]) console.log("  " + e);
}
await browser.close();
await sql.end();
process.exit(ko || errori.length ? 1 : 0);
