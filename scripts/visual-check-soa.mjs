// Anteprima REALE della Dichiarazione di Applicabilità: prepara un'organizzazione
// con la SoA del prototipo, pubblica lo snapshot, fotografa e produce il PDF.
// Richiede `npm run dev` attivo.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";

const OUT = process.env.SHOT_DIR ?? "./shots-soa";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";
const errors = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1700 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

const email = `visual-soa-${Date.now()}@example.com`;
await page.goto(BASE + "/registrati");
await page.waitForLoadState("networkidle");
  await registraEEntra(page, sql, { base: BASE, nome: "Davide Ricci", email: email, pwd: "PasswordSicura123!" });
await page.evaluate(() => {
  for (const k of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
    localStorage.setItem(`evalisdeck-tour:${k}`, "1");
  }
});

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const [org] = await sql`select m.organization_id as id from member m join "user" u on u.id=m.user_id where u.email=${email}`;
await sql`update org_entitlement set status='active' where organization_id=${org.id}`;

const co = crypto.randomUUID();
await sql`insert into company (id, organization_id, nome, settore, sede, piva, ateco)
  values (${co}, ${org.id}, 'Nexus Cloud Services S.r.l.', 'Servizi applicativi in cloud', 'Aversa (CE)', '01234567890', '62.01')`;

const [cs] = await sql`select id from content_set where dominio='soa' order by versione desc limit 1`;
const profilo = {
  piva: "01234567890",
  sede: "Sede legale e centro servizi di Aversa (CE); sala server presso data center certificato di Milano.",
  scope:
    "Progettazione, erogazione e assistenza dei servizi applicativi in cloud per la clientela business, inclusi i processi di sviluppo, esercizio e supporto svolti presso la sede di Aversa (CE).",
  esclusioni: "Nessuna esclusione di processo o di sede.",
  versione: "2.1",
  data: "2026-07-15",
  redatto: "Ing. Davide Ricci — Responsabile del SGSI",
  approvato: "Dott.ssa Laura Ferrante — Direzione generale",
};
const decl = crypto.randomUUID();
await sql`insert into soa_declaration (id, organization_id, company_id, content_set_id, soglia_obiettivo, ruolo_privacy, ruolo_cloud, profilo)
  values (${decl}, ${org.id}, ${co}, ${cs.id}, 80, 'responsabile', 'entrambi', ${sql.json(profilo)})`;

for (const [fw, attivo] of [["27017", true], ["27018", true], ["27701A", false], ["27701B", true]]) {
  await sql`insert into soa_module (id, organization_id, declaration_id, framework_key, attivo)
    values (${crypto.randomUUID()}, ${org.id}, ${decl}, ${fw}, ${attivo})`;
}

// Dataset di esempio del prototipo, con giustificazioni vere sulle esclusioni.
const controlli = await sql`
  select framework_key, controllo_id, ordine from soa_control
  where set_id = ${cs.id} and (framework_key = '27001' or framework_key in ('27017','27018','27701B'))
  order by ordine`;
const seq = ["av", "at", "pa", "pl", "nd", null, "at", "pa"];
const righe = controlli.map((c, i) => {
  const st = seq[i % seq.length];
  return {
    id: crypto.randomUUID(),
    organization_id: org.id,
    declaration_id: decl,
    framework_key: c.framework_key,
    controllo_id: c.controllo_id,
    applicabile: true,
    stato: st,
    motivazioni: i % 7 !== 3 ? (i % 3 === 0 ? ["rv", "ol"] : ["rv"]) : [],
    responsabile: i % 5 !== 4 ? "Responsabile del SGSI" : null,
    riferimento_doc: (st === "av" || st === "at") && i % 11 !== 5 ? `DOC-${c.controllo_id.replace(/\./g, "")}` : null,
  };
});
for (const r of righe) {
  await sql`insert into soa_control_decision ${sql(r)}`;
}
await sql`update soa_control_decision set applicabile = false,
    giustificazione = 'L''organizzazione non sviluppa software proprietario: lo sviluppo applicativo è affidato a fornitori qualificati e non esiste codice sorgente interno da proteggere.',
    stato = null, motivazioni = ARRAY[]::text[]
  where declaration_id = ${decl} and framework_key = '27001' and controllo_id = '8.4'`;
await sql`update soa_control_decision set applicabile = false,
    giustificazione = 'Nessun ambiente di sviluppo interno: i controlli sulla separazione degli ambienti sono presidiati contrattualmente dal fornitore.',
    stato = null, motivazioni = ARRAY[]::text[]
  where declaration_id = ${decl} and framework_key = '27001' and controllo_id = '8.31'`;
// Un po' di piano compilato, per il capitolo 7 del documento.
await sql`update soa_control_decision set responsabile = 'Responsabile IT', scadenza = '2026-12-31', stato_azione = 'in_corso'
  where declaration_id = ${decl} and framework_key = '27001' and controllo_id in ('5.7','8.8','8.16')`;
await sql.end();

// Pubblicazione dall'interfaccia.
// La prima apertura in dev compila la rotta: qui serve più tempo del solito.
await page.goto(`${BASE}/aziende/${co}/soa?vista=documento`, { timeout: 180000, waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle", { timeout: 120000 });
await page.click('[data-tour="pubblica-documento"]');
const doc = await page.waitForEvent("popup", { timeout: 120000 });
await doc.waitForLoadState("networkidle");
await doc.setViewportSize({ width: 1280, height: 1700 });
await doc.waitForTimeout(900);

const url = doc.url();
const quote = [0, 0.08, 0.2, 0.36, 0.55, 0.75, 0.9, 0.97];
for (const [i, q] of quote.entries()) {
  await doc.evaluate((qq) => window.scrollTo(0, document.body.scrollHeight * qq), q);
  await doc.waitForTimeout(320);
  await doc.screenshot({ path: `${OUT}/${String(i + 1).padStart(2, "0")}-soa.png` });
}

const p2 = await ctx.newPage();
await p2.goto(url, { waitUntil: "networkidle" });
const pdf = await p2.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
writeFileSync(`${OUT}/dichiarazione-applicabilita.pdf`, pdf);
await p2.close();

console.log("EMAIL_TEST=" + email);
console.log("COMPANY=" + co);
console.log("DOCUMENTO=" + url);
console.log("PDF=" + OUT + "/dichiarazione-applicabilita.pdf (" + Math.round(pdf.length / 1024) + " KB)");
if (errors.length) {
  console.log("CONSOLE_ERRORS:");
  for (const e of errors) console.log("  " + e);
  process.exitCode = 1;
} else {
  console.log("CONSOLE_ERRORS: nessuno");
}
await browser.close();
