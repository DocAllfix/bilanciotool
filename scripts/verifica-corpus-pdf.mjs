// Collaudo della stampa del corpus: le procedure escono in PDF.
//
// ⚠️ È la decisione A10 del piano, ed era il buco più grosso dei moduli: 447 procedure e
// moduli si consultavano e si personalizzavano a schermo, e non si potevano consegnare.
// Il grosso del valore del prodotto restava dentro.
//
//   npm run qa -- corpus-pdf

import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, attendi, pretendiServerAggiornato } from "./comune-collaudo.mjs";
import { rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = process.env.SHOT_DIR ?? "./shots-corpus-pdf";
mkdirSync(OUT, { recursive: true });

const RUN = Date.now();
const email = `cpdf-${RUN}@example.com`;
const AZIENDA = `Cartiere Sannite ${String(RUN).slice(-6)} S.p.A.`;

const errori = [];
let ok = 0, ko = 0;
const verifica = (nome, cond, dettaglio = "") => {
  if (cond) { ok++; console.log("  ok   " + nome + (dettaglio ? " — " + dettaglio : "")); }
  else { ko++; console.log(" FAIL  " + nome + (dettaglio ? " — " + dettaglio : "")); }
};

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) errori.push(m.text().slice(0, 150)); });
page.on("pageerror", (e) => errori.push("pageerror: " + e.message.slice(0, 150)));
page.on("response", (r) => { if (r.status() >= 400) errori.push(`${r.status()} ${r.url().replace(BASE, "")}`); });

console.log(`\nStampa del corpus — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Corpus", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
const [az] = await sql`insert into company (id, organization_id, nome, settore, is_demo)
  values (gen_random_uuid(), ${orgId}, ${AZIENDA}, 'Cartaria', false) returning id`;
await spegniTour(page);

// Si avvia la filiera: un clic solo, e il suo corpus ha quattordici procedure.
const U = `${BASE}/aziende/${az.id}/filiera`;
await page.goto(U, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="fil-crea"]').waitFor({ timeout: 60_000 });
await page.click('[data-tour="fil-crea"]');
await page.locator("[data-tour^='fil-vista-']").first().waitFor({ timeout: 60_000 });

// L'anagrafica riempie i segnaposto: senza, restano evidenziati anche in stampa — ed è
// giusto che lo restino, ma qui si prova che compilandola spariscono.
await page.goto(`${U}?vista=programma`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="fil-programma"]').waitFor({ timeout: 30_000 });
await page.getByLabel("Alta direzione", { exact: true }).fill("Ing. Rosaria Del Vecchio");
await page.keyboard.press("Tab");
await attendi(async () => {
  const [r] = await sql`select direzione from chain_program where company_id = ${az.id}`;
  return r?.direzione === "Ing. Rosaria Del Vecchio";
}, { entro: 30_000, cosa: "l'alta direzione salvata" });
verifica("L'anagrafica che riempie i segnaposto si compila", true);

// ─── la vista del documento offre la stampa ──────────────────────────────────
const [proc] = await sql`select code, titolo from corpus_document
  where content_set_id='filiera-v1' and tipo='procedura' order by ordine limit 1`;
await page.goto(`${U}?vista=procedure&doc=${encodeURIComponent(proc.code)}`, {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
await page.locator('[data-tour="corpus-pdf"]').waitFor({ timeout: 30_000 });
verifica("La vista del documento offre il comando di stampa", true, proc.code);
await page.screenshot({ path: `${OUT}/00-documento.png` });

// ─── la pagina di stampa ─────────────────────────────────────────────────────
const urlStampa = `${BASE}/corpus/${az.id}/filiera-v1/${encodeURIComponent(proc.code)}`;
await page.goto(urlStampa, { waitUntil: "networkidle", timeout: 60_000 });
await page.locator("article.doc-pagina").waitFor({ timeout: 30_000 });
const testo = await page.locator("article").innerText();
verifica("La pagina di stampa rende il documento nel registro editoriale", testo.includes(proc.titolo));
verifica("…col codice della procedura", testo.includes(proc.code));

// ⚠️ Il colophon dice chi lo ha emesso e su QUALE EDIZIONE dei contenuti: le norme si
// aggiornano, e un documento redatto su un'edizione superata resta autentico senza
// essere aggiornato.
verifica("…e il colophon dichiara l'edizione dei contenuti", /contenuti filiera-v1/.test(testo));
verifica("…e l'emittente", /Emesso da/.test(testo));

// ⚠️ I segnaposto risolti spariscono, quelli non risolti restano VISIBILI: nasconderli
// darebbe un documento che sembra completo e non lo è.
verifica("Il segnaposto compilato è stato sostituito",
  testo.includes("Ing. Rosaria Del Vecchio") && !testo.includes("[Alta Direzione]"));
const mancanti = await page.locator("[data-mancante]").count();
verifica("…e quelli non compilati restano visibili, non nascosti", mancanti > 0, `${mancanti} evidenziati`);
await page.screenshot({ path: `${OUT}/01-stampa.png`, fullPage: true });

// ─── il PDF vero ─────────────────────────────────────────────────────────────
const risposta = await page.request.get(
  `${BASE}/api/corpus/${az.id}/filiera-v1/${encodeURIComponent(proc.code)}/pdf`,
);
verifica("La rotta PDF risponde", risposta.ok(), `${risposta.status()}`);
const pdf = await risposta.body();
writeFileSync(`${OUT}/${proc.code}.pdf`, pdf);
verifica("…con un PDF vero e non vuoto",
  pdf.length > 5_000 && pdf.subarray(0, 4).toString() === "%PDF",
  `${Math.round(pdf.length / 1024)} KB`);

// ⚠️ Il confine di tenant: un'altra azienda non ha quel programma, e la rotta deve dire
// «inesistente» PRIMA di accendere Chromium.
const altra = await sql`insert into company (id, organization_id, nome, is_demo)
  values (gen_random_uuid(), ${orgId}, ${"Senza Filiera " + RUN}, false) returning id`;
const negata = await page.request.get(
  `${BASE}/api/corpus/${altra[0].id}/filiera-v1/${encodeURIComponent(proc.code)}/pdf`,
);
verifica("⚠️ Un'azienda senza quel modulo non stampa il suo corpus", negata.status() === 404, `${negata.status()}`);

// ─── pulizia ─────────────────────────────────────────────────────────────────
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

console.log(`\nStampa del corpus: ${ok} ok, ${ko} ko`);
if (errori.length) {
  console.log("\nErrori di console o richieste fallite:");
  for (const e of [...new Set(errori)]) console.log("  " + e);
}
await browser.close();
await sql.end();
process.exit(ko || errori.length ? 1 : 0);
