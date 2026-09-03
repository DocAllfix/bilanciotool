// Collaudo del codice di verifica: colophon, pagina pubblica, freno.
//
// ⚠️ La prova che conta non è che la pagina risponda: è che confermi il documento GIUSTO
// e non ne confermi uno sbagliato. Per questo il collaudo pubblica un documento vero,
// legge il codice dal DATABASE, lo cerca nella pagina, e poi prova un codice storpiato
// per vedere che venga RIFIUTATO invece che indovinato.
//
//   npm run qa -- codice-documento

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, attendi, pretendiServerAggiornato, fattoreAttesa, attraversaProtezione } from "./comune-collaudo.mjs";
import { rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = process.env.SHOT_DIR ?? "./shots-verifica";
mkdirSync(OUT, { recursive: true });

const RUN = Date.now();
const email = `ver-${RUN}@example.com`;
const AZIENDA = `Fonderie Lucane ${String(RUN).slice(-6)} S.p.A.`;

const errori = [];
let ok = 0, ko = 0;
const verifica = (nome, cond, dettaglio = "") => {
  if (cond) { ok++; console.log("  ok   " + nome + (dettaglio ? " — " + dettaglio : "")); }
  else { ko++; console.log(" FAIL  " + nome + (dettaglio ? " — " + dettaglio : "")); }
};

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();
await attraversaProtezione(page);
page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) errori.push(m.text().slice(0, 150)); });
page.on("pageerror", (e) => errori.push("pageerror: " + e.message.slice(0, 150)));
page.on("response", (r) => { if (r.status() >= 400) errori.push(`${r.status()} ${r.url().replace(BASE, "")}`); });

console.log(`\nCodice di verifica — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

// ─── la pagina esiste e non dice niente a chi non ha un codice ────────────────
await page.goto(`${BASE}/verifica`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-slot="modulo-verifica"]').waitFor({ timeout: 30_000 });
verifica("La pagina di verifica è pubblica e non chiede la sessione", true);
verifica("…e non mostra nulla finché non le si dà un codice",
  (await page.locator('[data-slot="esito-verifica"]').count()) === 0);
await page.screenshot({ path: `${OUT}/00-vuota.png` });

// ⚠️ Fuori alfabeto si RIFIUTA, non si indovina: una lettera indovinata male non produce
// «non trovato», produce il codice di un ALTRO documento.
await page.fill("#codice", "EV-0OIL-2Z5S");
await page.click('button[type="submit"]');
await page.waitForLoadState("domcontentloaded");
const testoStorpio = await page.locator("main").innerText();
verifica("⚠️ Un codice con lettere fuori alfabeto è rifiutato, non indovinato",
  /Non è un codice di verifica/.test(testoStorpio));
verifica("…e la pagina dice quali caratteri non esistono, invece di correggerli",
  /non compaiono mai/.test(testoStorpio));

// ─── si pubblica un documento vero ───────────────────────────────────────────
const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Verifica", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
const [az] = await sql`insert into company (id, organization_id, nome, settore, is_demo)
  values (gen_random_uuid(), ${orgId}, ${AZIENDA}, 'Metallurgia', false) returning id`;
await spegniTour(page);

// Il modulo si sceglie perche' si avvia con un clic solo: il collaudo qui misura il
// CODICE, non il percorso di quel modulo — che ha gia' il proprio.
const U = `${BASE}/aziende/${az.id}/filiera`;
await page.goto(U, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="fil-crea"]').waitFor({ timeout: 60_000 });
await page.click('[data-tour="fil-crea"]');
await page.locator("[data-tour^='fil-vista-']").first().waitFor({ timeout: 60_000 });

await page.goto(`${U}?vista=documenti`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.getByRole("button", { name: /^Pubblica/ }).waitFor({ timeout: 30_000 });
await page.click('[data-tour="pubblica-documento"]');
const doc = await page.waitForEvent("popup", { timeout: 120_000 });
await doc.waitForLoadState("networkidle", { timeout: 120_000 });

const [k] = await attendi(async () => {
  const r = await sql`select * from document_codice where organization_id = ${orgId}`;
  return r.length ? r : false;
}, { entro: 30_000 * fattoreAttesa(), cosa: "il codice assegnato alla pubblicazione" }).then(() =>
  sql`select * from document_codice where organization_id = ${orgId}`);

verifica("Pubblicare assegna un codice", Boolean(k?.codice), k?.codice);
verifica("…nella forma che si detta al telefono", /^EV-[34679ACDEFGHJKMNPQRTUVWXY]{4}-[34679ACDEFGHJKMNPQRTUVWXY]{4}$/.test(k.codice));
verifica("…con l'azienda congelata dentro", k.azienda === AZIENDA, k.azienda);

// ⚠️ Il colophon lo stampa la PAGINA del documento, una volta per tutti i tipi: nei
// dodici template si dimenticherebbe nel tredicesimo.
const testoDoc = await doc.locator("article").innerText();
verifica("Il colophon stampa il codice nel documento", testoDoc.includes(k.codice));
verifica("…e dice dove si verifica", /verifica/i.test(testoDoc));
await doc.screenshot({ path: `${OUT}/01-colophon.png` });
await doc.close();

// ─── la verifica pubblica, da un browser SENZA sessione ──────────────────────
const anonimo = await (await browser.newContext()).newPage();
const erroriAnonimo = [];
anonimo.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) erroriAnonimo.push(m.text().slice(0, 150)); });
await anonimo.goto(`${BASE}/verifica?codice=${encodeURIComponent(k.codice)}`, {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
await anonimo.locator('[data-slot="esito-verifica"]').waitFor({ timeout: 30_000 });
const esito = await anonimo.locator('[data-slot="esito-verifica"]').innerText();
verifica("⚠️ Un anonimo verifica il documento senza account", true);
verifica("…e vede chi lo ha emesso", esito.includes(k.emittente), k.emittente);
verifica("…per quale azienda", esito.includes(AZIENDA));
verifica("…e in quale revisione", esito.includes(String(k.versione)));

// ⚠️ La prova che NON mostra il contenuto. Il documento della filiera parla di rischio
// residuo, copertura sulla spesa e registro dei partner: nessuna di quelle parole deve
// comparire nella pagina di verifica.
const tuttaLaPagina = await anonimo.locator("main").innerText();
verifica("⚠️ La verifica NON mostra il contenuto del documento",
  !/rischio residuo|copertura sulla spesa|registro dei partner/i.test(tuttaLaPagina));
verifica("…e lo dice a chiare lettere", /non è consultabile da qui/i.test(tuttaLaPagina));
verifica("…distinguendo l'emissione dal merito", /non attesta la correttezza/i.test(tuttaLaPagina));
await anonimo.screenshot({ path: `${OUT}/02-verificato.png` });

// Il contatore delle verifiche si muove: serve allo studio, non a noi.
await attendi(async () => {
  const r = await sql`select verifiche from document_codice where codice = ${k.codice}`;
  return r[0]?.verifiche >= 1;
}, { entro: 20_000 * fattoreAttesa(), cosa: "il contatore delle verifiche" });
verifica("Il contatore delle verifiche si incrementa", true);

// Un codice ben formato ma inesistente: «non trovato», senza fantasia.
await anonimo.goto(`${BASE}/verifica?codice=EV-3333-4444`, { waitUntil: "domcontentloaded", timeout: 60_000 });
const inesistente = await anonimo.locator("main").innerText();
verifica("Un codice inesistente non viene confermato",
  /Nessun documento con questo codice/.test(inesistente));

// ─── il codice è immutabile una volta emesso ─────────────────────────────────
let bloccato = false;
try {
  await sql`update document_codice set azienda = 'Intrusa S.p.A.' where codice = ${k.codice}`;
} catch (e) {
  bloccato = /solo il contatore/.test(String(e.message));
}
const [dopo] = await sql`select azienda from document_codice where codice = ${k.codice}`;
verifica("⚠️ Di un codice emesso non si cambia l'azienda", bloccato, bloccato ? "" : "update passato");
// La prova del divieto è la RIGA CHE NON CAMBIA, non il messaggio.
verifica("…e la riga è rimasta intatta", dopo.azienda === AZIENDA, dopo.azienda);

// ─── nessun documento resta senza codice ─────────────────────────────────────
const [scoperti] = await sql`select count(*)::int n from document_snapshot s
  left join document_codice k on k.snapshot_id = s.id where k.codice is null`;
verifica("Nessun documento pubblicato è senza codice", scoperti.n === 0, `${scoperti.n} scoperti`);

verifica("Console pulita anche sul browser anonimo", erroriAnonimo.length === 0, erroriAnonimo[0] ?? "");

// ─── pulizia ─────────────────────────────────────────────────────────────────
await sql`delete from document_snapshot where organization_id = ${orgId}`;
await sql`delete from soa_control_decision where organization_id = ${orgId}`;
await sql`delete from soa_module where organization_id = ${orgId}`;
await sql`delete from soa_declaration where organization_id = ${orgId}`;
await sql`delete from company where organization_id = ${orgId}`;
await sql`delete from audit_log where organization_id = ${orgId}`;
await sql`delete from entitlement_event where organization_id = ${orgId}`;
await sql`delete from org_entitlement where organization_id = ${orgId}`;
await sql`delete from member where organization_id = ${orgId}`;
await sql`delete from organization where id = ${orgId}`;
await sql`delete from "user" where email = ${email}`;

console.log(`\nCodice di verifica: ${ok} ok, ${ko} ko`);
if (errori.length) {
  console.log("\nErrori di console o richieste fallite:");
  for (const e of [...new Set(errori)]) console.log("  " + e);
}
await browser.close();
await sql.end();
process.exit(ko || errori.length ? 1 : 0);
