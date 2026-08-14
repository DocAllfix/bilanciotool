// Anteprima REALE dell'attestato ESG: prepara un'azienda con l'autovalutazione
// del prototipo, pubblica lo snapshot, fotografa il documento e produce il PDF.
// Richiede `npm run dev` attivo.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";

const OUT = process.env.SHOT_DIR ?? "./shots-attestato";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";
const errors = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1700 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

// 1 ── utente attivo ─────────────────────────────────────────────────────────
const email = `visual-att-${Date.now()}@example.com`;
await page.goto(BASE + "/registrati");
await page.waitForLoadState("networkidle");
// La connessione si apre PRIMA di chi la usa. Con la verifica dell'indirizzo accesa
// e' `registraEEntra` a completare la registrazione, e per farlo legge il token dal
// database: cosi' com'era, `sql` veniva usata prima di esistere e il collaudo moriva
// all'avvio, sempre, senza mai poter diventare ne' verde ne' rosso.
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  await registraEEntra(page, sql, { base: BASE, nome: "Silvia Marino", email: email, pwd: PWD_COLLAUDO });
await page.evaluate(() => {
  for (const k of ["portfolio", "ghg", "bilancio", "energetico", "fornitore"]) {
    localStorage.setItem(`evalisdeck-tour:${k}`, "1");
  }
});

const [org] = await sql`select m.organization_id as id from member m join "user" u on u.id=m.user_id where u.email=${email}`;
await sql`update org_entitlement set status='active' where organization_id=${org.id}`;

// 2 ── azienda e autovalutazione via SQL ─────────────────────────────────────
// Il questionario in interfaccia è già coperto dal collaudo: qui serve un
// attestato ricco da fotografare, quindi il caricamento è diretto.
const co = crypto.randomUUID();
await sql`insert into company (id, organization_id, nome, settore, sede, piva, ateco)
  values (${co}, ${org.id}, 'Carpenteria Sarnese S.r.l.', 'Carpenteria metallica', 'Sarno (SA)', '05612340658', '25.11')`;

const [cs] = await sql`select id from content_set where dominio='supplier' order by versione desc limit 1`;
const profilo = {
  piva: "05612340658",
  settore: "Carpenteria metallica pesante",
  ateco: "25.11",
  sede: "Sarno (SA), via dell'Industria 24",
  dipendenti: "42",
  fatturato: "8,4",
  referente: "Ing. Silvia Marino — Responsabile qualità e ambiente",
  committente: "Gruppo capofila di filiera automotive",
  scadenza: "2026-09-30",
};
const val = crypto.randomUUID();
await sql`insert into supplier_assessment (id, organization_id, company_id, content_set_id, soglia_richiesta, profilo)
  values (${val}, ${org.id}, ${co}, ${cs.id}, 60, ${sql.json(profilo)})`;

// Dataset di esempio del prototipo, con note ed evidenze.
const NOTE = {
  B1: "Politica di sostenibilità approvata dal CdA il 12 marzo 2025 e diffusa in bacheca aziendale.",
  B2: "Il referente ESG coincide con il responsabile qualità: incarico formalizzato ma senza monte ore dedicato.",
  B4: "ISO 9001:2015 e ISO 45001:2018 in corso di validità; la 14001 è in fase di avvio.",
  E1: "Registro consumi elettrici e gas tenuto dal 2023, riconciliato con le fatture.",
  E2: "Inventario GHG 2025 in corso di redazione con EvalisDeck: Scope 1 e 2 già quantificati.",
  E4: "Nessun obiettivo di riduzione formalizzato: manca l'anno base condiviso.",
  E8: "Analisi dei rischi climatici mai affrontata.",
  S1: "DVR aggiornato a settembre 2025 dopo l'ampliamento del reparto saldatura.",
  S2: "Registro infortuni tenuto, ma gli indici di frequenza e gravità non sono calcolati.",
  S6: "Il divario retributivo di genere non è mai stato misurato.",
  S7: "Nessuna clausola contrattuale sul lavoro forzato nella catena di fornitura.",
  G1: "Codice etico adottato nel 2022, sottoscritto da tutti i dipendenti.",
  G2: "Modello 231 assente: valutata l'adozione ma non avviata.",
  G3: "Canale whistleblowing attivo su piattaforma esterna, procedura da formalizzare.",
  G4: "Nessuna procedura anticorruzione né mappatura delle aree a rischio.",
  P1: "La qualifica fornitori include un questionario ESG dal 2025, ancora facoltativo.",
  P4: "La rischiosità ESG della filiera non è mai stata mappata.",
};
const risposta = async (k, r, doc, azione) => {
  await sql`insert into supplier_answer (id, organization_id, assessment_id, question_key, risposta, nota, stato_documento, responsabile, scadenza, stato_azione)
    values (${crypto.randomUUID()}, ${org.id}, ${val}, ${k}, ${r}, ${NOTE[k] ?? null}, ${doc ?? null},
      ${azione?.[0] ?? null}, ${azione?.[1] ?? null}, ${azione?.[2] ?? null})`;
};
for (const k of ["B1", "B4", "E1", "E5", "E7", "S1", "S3", "S4", "G1", "G6", "P2"]) await risposta(k, "si", "disponibile");
for (const k of ["B2", "E2", "S2", "S5", "G3", "P1"]) await risposta(k, "parziale", "da_aggiornare");
await risposta("E4", "no", "assente", ["Direzione tecnica", "2026-06-30", "da_avviare"]);
await risposta("E8", "no", "assente", ["Direzione tecnica", "2026-12-31", "da_avviare"]);
await risposta("S6", "no", "assente", ["Amministrazione del personale", "2026-05-31", "in_corso"]);
await risposta("S7", "no", "assente", ["Direzione acquisti", "2026-07-31", "da_avviare"]);
await risposta("G2", "no", "assente", ["Direzione generale", "2027-03-31", "da_avviare"]);
await risposta("G4", "no", "assente", ["Direzione generale", "2026-11-30", "da_avviare"]);
await risposta("P4", "no", "assente", ["Direzione acquisti", "2026-06-30", "in_corso"]);
await sql.end();

// 3 ── pubblicazione dall'interfaccia ────────────────────────────────────────
await page.goto(`${BASE}/aziende/${co}/fornitore?vista=attestato`);
await page.waitForLoadState("networkidle");
await page.click('[data-tour="pubblica-documento"]');
const doc = await page.waitForEvent("popup", { timeout: 90000 });
await doc.waitForLoadState("networkidle");
await doc.setViewportSize({ width: 1280, height: 1700 });
await doc.waitForTimeout(700);

const url = doc.url();
const quote = [0, 0.16, 0.32, 0.48, 0.64, 0.8, 0.95];
for (const [i, q] of quote.entries()) {
  await doc.evaluate((qq) => window.scrollTo(0, document.body.scrollHeight * qq), q);
  await doc.waitForTimeout(320);
  await doc.screenshot({ path: `${OUT}/${String(i + 1).padStart(2, "0")}-attestato.png` });
}

// 4 ── PDF vero ──────────────────────────────────────────────────────────────
const p2 = await ctx.newPage();
await p2.goto(url, { waitUntil: "networkidle" });
const pdf = await p2.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
writeFileSync(`${OUT}/attestato-esg.pdf`, pdf);
await p2.close();

console.log("EMAIL_TEST=" + email);
console.log("COMPANY=" + co);
console.log("DOCUMENTO=" + url);
console.log("PDF=" + OUT + "/attestato-esg.pdf (" + Math.round(pdf.length / 1024) + " KB)");
if (errors.length) {
  console.log("CONSOLE_ERRORS:");
  for (const e of errors) console.log("  " + e);
  process.exitCode = 1;
} else {
  console.log("CONSOLE_ERRORS: nessuno");
}
await browser.close();
