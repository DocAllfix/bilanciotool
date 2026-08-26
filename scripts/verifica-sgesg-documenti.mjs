// I quattro documenti del metodo ESG: pubblicazione vera, PDF reale, codice di verifica.
//
// ⚠️ Non si verifica «il pulsante risponde»: si pubblica davvero, si apre il documento,
// si scarica il PDF e se ne guardano i byte. Un documento pubblicato è immutabile e
// finisce in mano a un cliente — è l'unico posto dove un difetto non si può correggere
// dopo.
//
//   npm run qa -- sgesg-documenti [--prod]

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, strumenta, attendi, pretendiServerAggiornato } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");

let ok = 0;
let ko = 0;
const check = async (nome, fn) => {
  try {
    await fn();
    ok++;
    console.log("  ok   " + nome);
  } catch (e) {
    ko++;
    console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]);
  }
};

const RUN = Date.now();
const email = `sgdoc-${RUN}@example.com`;
const NOME_AZIENDA = `Documenti ESG ${String(RUN).slice(-6)} S.r.l.`;
const ANNO = new Date().getFullYear() - 1;

console.log(`\nI documenti del metodo ESG — ${BASE}\n`);
if (!/^https?:\/\/localhost/.test(BASE)) await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const guasti = strumenta(page);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Doc", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
await spegniTour(page);

await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await spegniTour(page);
await page.click('[data-tour="nuova-azienda"]');
await page.fill("#na-nome", NOME_AZIENDA);
await page.fill("#na-settore", "Servizi");
await page.click('button[type="submit"]:has-text("Crea azienda")');
await page.waitForURL(/\/aziende\/[^/]+(\?|#|$)/, { timeout: 30_000 });
const companyId = page.url().match(/aziende\/([^/?#]+)/)[1];
await spegniTour(page);

await page.goto(`${BASE}/aziende/${companyId}/sgesg`, { waitUntil: "domcontentloaded" });
await page.locator("#cp-anno").waitFor({ timeout: 30_000 });
await page.fill("#cp-anno", String(ANNO));
await page.click('button[type="submit"]:has-text("Crea programma")');
await page.waitForURL(`**/sgesg/${ANNO}`, { timeout: 30_000 });
await spegniTour(page);

const snapshot = async (tipo) =>
  (await sql`select * from document_snapshot where company_id = ${companyId} and tipo = ${tipo} order by versione desc`)[0] ?? null;

async function apriFase(fase) {
  await page.goto(`${BASE}/aziende/${companyId}/sgesg/${ANNO}/${fase}`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-schede]").waitFor({ timeout: 30_000 });
  await spegniTour(page);
}

// ─── il pannello sta dove il documento nasce ─────────────────────────────────
await check("la fase 00 offre di pubblicare l'offerta, e le fasi senza documenti no", async () => {
  await apriFase("proc00");
  await page.locator("[data-documenti-fase]").waitFor({ timeout: 20_000 });
  if (!(await page.locator('[data-documento="offerta_esg"]').count())) throw new Error("manca l'offerta");
  await apriFase("proc02");
  if (await page.locator("[data-documenti-fase]").count()) {
    throw new Error("la fase 02 offre di pubblicare qualcosa");
  }
});

// ─── compilazione e pubblicazione ────────────────────────────────────────────
await check("si compila l'offerta e si pubblica davvero", async () => {
  await page.goto(`${BASE}/aziende/${companyId}/sgesg/${ANNO}/proc00/00E`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-scheda]").waitFor({ timeout: 30_000 });
  await spegniTour(page);
  await page.fill("#sc-00E-num_offerta", "OFF-2026-001");
  await page.locator("#sc-00E-num_offerta").blur();
  await page.fill("#sc-00E-descrizione_esigenza", "Primo bilancio di sostenibilità per una gara pubblica.");
  await page.locator("#sc-00E-descrizione_esigenza").blur();
  await attendi(
    async () => {
      const r = await sql`select dati from sgesg_scheda_dato d
                          join sgesg_programma p on p.id = d.program_id
                          where p.company_id = ${companyId} and d.scheda_key = '00E'`;
      return r[0]?.dati?.num_offerta === "OFF-2026-001";
    },
    { cosa: "offerta compilata" },
  );

  await apriFase("proc00");
  await page.locator('[data-documento="offerta_esg"] button:has-text("Pubblica")').first().click();
  await attendi(async () => (await snapshot("offerta_esg")) !== null, { cosa: "offerta pubblicata", entro: 90_000 });
});

await check("lo snapshot porta marchio, edizione e il compilato", async () => {
  const s = await snapshot("offerta_esg");
  if (!s.dati.marchio) throw new Error("manca il marchio congelato");
  if (s.dati.edizione !== "sgesg-v1") throw new Error(`edizione «${s.dati.edizione}»`);
  const sch = s.dati.schede.find((x) => x.key === "00E");
  if (sch?.dati?.num_offerta !== "OFF-2026-001") throw new Error("il compilato non e' finito nello snapshot");
  if (s.anno !== ANNO) throw new Error(`anno ${s.anno}: il documento non e' annuale`);
});

await check("riceve un codice di verifica, come ogni documento emesso", async () => {
  const s = await snapshot("offerta_esg");
  const [c] = await sql`select * from document_codice where snapshot_id = ${s.id}`;
  if (!c) throw new Error("nessun codice emesso");
  if (c.tipo !== "offerta_esg") throw new Error(`il codice dice tipo ${c.tipo}`);
});

// ─── il documento a schermo ──────────────────────────────────────────────────
await check("il documento si apre e riporta cio' che e' stato compilato", async () => {
  const s = await snapshot("offerta_esg");
  await page.goto(`${BASE}/documento/${s.id}`, { waitUntil: "domcontentloaded" });
  await page.locator(".doc-corpo").waitFor({ timeout: 60_000 });
  const t = await page.locator("body").innerText();
  if (!/Offerta professionale/i.test(t)) throw new Error("non e' l'offerta");
  if (!/OFF-2026-001/.test(t)) throw new Error("il numero d'offerta non compare");
  if (!/gara pubblica/i.test(t)) throw new Error("la descrizione non compare");
  // ⚠️ Le voci non compilate si vedono come tali: un'informazione mancante resta
  // visibile, non viene omessa — chi firma deve accorgersene.
  if (!/non compilato/i.test(t)) throw new Error("i campi vuoti spariscono invece di dichiararsi");
});

await check("il documento porta il colophon col codice di verifica", async () => {
  const t = await page.locator("body").innerText();
  if (!/verifica/i.test(t)) throw new Error("manca il riferimento alla verifica");
});

// ─── PDF reale ───────────────────────────────────────────────────────────────
await check("il PDF si scarica, ed e' un PDF vero", async () => {
  const s = await snapshot("offerta_esg");
  const r = await page.request.get(`${BASE}/api/documenti/${s.id}/pdf`, { timeout: 180_000 });
  if (r.status() !== 200) throw new Error(`la rotta risponde ${r.status()}`);
  const body = await r.body();
  // ⚠️ Si guardano i BYTE: un 200 con dentro una pagina d'errore ha lo stesso stato di
  // un PDF buono, e un collaudo che si ferma allo stato dichiara verde un file rotto.
  if (body.subarray(0, 5).toString() !== "%PDF-") throw new Error("il file non comincia con %PDF-");
  if (body.length < 20_000) throw new Error(`il PDF pesa ${body.length} byte: e' troppo poco`);
  const nome = r.headers()["content-disposition"] ?? "";
  if (!/offerta-professionale/.test(nome)) throw new Error(`nome del file: ${nome}`);
  if (!new RegExp(String(ANNO)).test(nome)) throw new Error("il nome del file non porta l'esercizio");
  console.log(`       PDF: ${Math.round(body.length / 1024)} KB · ${nome.split("filename=")[1] ?? ""}`);
});

// ─── il rapporto di diagnosi dichiara cio' che non contiene ──────────────────
await check("il rapporto di diagnosi DICHIARA cio' che non contiene", async () => {
  await apriFase("proc03");
  await page.locator('[data-documento="diagnosi_esg"] button:has-text("Pubblica")').first().click();
  await attendi(async () => (await snapshot("diagnosi_esg")) !== null, { cosa: "diagnosi pubblicata", entro: 90_000 });
  const s = await snapshot("diagnosi_esg");
  await page.goto(`${BASE}/documento/${s.id}`, { waitUntil: "domcontentloaded" });
  await page.locator(".doc-corpo").waitFor({ timeout: 60_000 });
  const t = await page.locator("body").innerText();
  // ⚠️ Lo snapshot e' immutabile: cio' che si scrive oggi resta scritto per sempre. Il
  // rapporto non porta il registro delle lacune, e lo dice in APERTURA e riquadrato,
  // invece di lasciarlo intuire a chi lo firma.
  if (!/Che cosa non è compreso/i.test(t)) throw new Error("non dichiara cio' che manca");
  if (!/lacune/i.test(t)) throw new Error("non nomina il registro delle lacune");
});

await check("ripubblicare crea la versione 2, e la 1 resta com'era", async () => {
  await page.goto(`${BASE}/aziende/${companyId}/sgesg/${ANNO}/proc00/00E`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-scheda]").waitFor({ timeout: 30_000 });
  await spegniTour(page);
  await page.fill("#sc-00E-num_offerta", "OFF-2026-002");
  await page.locator("#sc-00E-num_offerta").blur();
  await page.waitForTimeout(1500);

  await apriFase("proc00");
  await page.locator('[data-documento="offerta_esg"] button:has-text("Pubblica")').first().click();
  await attendi(
    async () => (await sql`select 1 from document_snapshot where company_id=${companyId} and tipo='offerta_esg' and versione=2`).length > 0,
    { cosa: "versione 2", entro: 90_000 },
  );
  const [v1] = await sql`select dati from document_snapshot where company_id=${companyId} and tipo='offerta_esg' and versione=1`;
  const sch = v1.dati.schede.find((x) => x.key === "00E");
  if (sch.dati.num_offerta !== "OFF-2026-001") throw new Error("la versione 1 e' cambiata");
});

await check("i documenti compaiono nell'archivio dello studio", async () => {
  await page.goto(`${BASE}/documenti`, { waitUntil: "domcontentloaded" });
  // ⚠️ Si aspettano i RISULTATI, non `main`: `main` c'e' subito, il contenuto no. E si
  // guardano i risultati e non il testo della pagina — il nome di un tipo e' scritto
  // anche sulla pastiglia del filtro, quindi cercarlo nel testo lo trova sempre, anche
  // con zero documenti.
  await page.locator("[data-risultati]").waitFor({ timeout: 60_000 });
  await spegniTour(page);
  for (const tipo of ["offerta_esg", "diagnosi_esg"]) {
    if (!(await page.locator(`[data-doc="${tipo}"]`).count())) {
      throw new Error(`${tipo} non compare fra i risultati dell'archivio`);
    }
  }
});

console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(guasti.length ? "ERRORI DI CONSOLE:\n  " + [...new Set(guasti)].join("\n  ") : "Console pulita.");

const snaps = await sql`select id from document_snapshot where organization_id = ${orgId}`;
for (const s of snaps) await sql`delete from document_codice where snapshot_id = ${s.id}`;
for (const t of ["document_snapshot", "sgesg_scheda_dato", "sgesg_fase", "sgesg_programma",
                 "audit_log", "company", "entitlement_event", "org_entitlement", "member"]) {
  await sql.unsafe(`delete from ${t} where organization_id = $1`, [orgId]);
}
await sql`delete from organization where id = ${orgId}`;
await sql`delete from "user" where email = ${email}`;

await browser.close();
await sql.end();
process.exit(ko > 0 || guasti.length > 0 ? 1 : 0);
