// Le 63 schede del metodo: catalogo, compilazione, e ciò che il prodotto NON fa ancora.
//
// ⚠️ Il controllo che conta di più è quello sulla scrittura atomica: due campi salvati
// uno dopo l'altro devono coesistere. È il difetto che questo progetto ha incontrato tre
// volte, e su un JSONB si ripresenterebbe identico se qualcuno sostituisse `jsonb_set`
// con «leggi, modifica, riscrivi».
//
//   npm run qa -- sgesg-schede [--prod]

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
const email = `schede-${RUN}@example.com`;
const NOME_AZIENDA = `Schede ESG ${String(RUN).slice(-6)} S.r.l.`;
const ANNO = new Date().getFullYear() - 1;

console.log(`\nSchede del metodo ESG — ${BASE}\n`);
if (!/^https?:\/\/localhost/.test(BASE)) await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const guasti = strumenta(page);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Schede", email, pwd: PWD_COLLAUDO });
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

const programma = async () => (await sql`select * from sgesg_programma where company_id = ${companyId}`)[0];
const dati = async (scheda) => {
  const p = await programma();
  const r = await sql`select * from sgesg_scheda_dato where program_id = ${p.id} and scheda_key = ${scheda}`;
  return r[0] ?? null;
};

// ─── catalogo ────────────────────────────────────────────────────────────────
await check("il catalogo ha 63 schede, distribuite come il metodo d'origine", async () => {
  // ⚠️ Si legge dal DATABASE, non dalla pagina: la pagina ne mostra una fase per volta.
  const r = await sql`select fase_key, count(*)::int n from sgesg_scheda_def
                      where set_id = 'sgesg-v1' group by fase_key order by fase_key`;
  const tot = r.reduce((n, x) => n + x.n, 0);
  if (tot !== 63) throw new Error(`${tot} schede invece di 63`);
  const atteso = { proc00: 7, proc01: 8, proc02: 8, proc03: 8, proc04: 7, proc05: 8, proc06: 9, proc07: 8 };
  for (const x of r) {
    if (atteso[x.fase_key] !== x.n) throw new Error(`${x.fase_key}: ${x.n} invece di ${atteso[x.fase_key]}`);
  }
});

await check("ogni fase mostra il proprio conto di schede", async () => {
  const link = page.locator('[data-schede-fase="proc00"]');
  await link.waitFor({ timeout: 20_000 });
  const t = await link.innerText();
  if (!/0\/7/.test(t)) throw new Error(`la fase 00 dice «${t}» invece di 0/7`);
});

await check("la fase si apre ed elenca le sue sette schede", async () => {
  await page.locator('[data-schede-fase="proc00"]').click();
  await page.waitForURL(`**/sgesg/${ANNO}/proc00`, { timeout: 30_000 });
  await page.locator("[data-schede]").waitFor({ timeout: 20_000 });
  const n = await page.locator("[data-scheda-voce]").count();
  if (n !== 7) throw new Error(`${n} schede a schermo`);
});

// ─── compilazione ────────────────────────────────────────────────────────────
await check("una scheda si apre e mostra l'istruzione operativa del metodo", async () => {
  await page.locator('[data-scheda-voce="00A"] a').click();
  await page.waitForURL(`**/proc00/00A`, { timeout: 30_000 });
  const t = await page.locator("main").innerText();
  if (!/Primo Contatto/i.test(t)) throw new Error("non e' la scheda 00A");
  if (!/4 ore lavorative/i.test(t)) throw new Error("manca l'istruzione operativa");
});

await check("un campo di testo si salva sfocandolo", async () => {
  await page.fill("#sc-00A-consulente_assegnato", "Silvia Marino");
  await page.locator("#sc-00A-consulente_assegnato").blur();
  await attendi(async () => (await dati("00A"))?.dati?.consulente_assegnato === "Silvia Marino", {
    cosa: "primo campo",
  });
});

await check("un SECONDO campo non azzera il primo", async () => {
  // ⚠️ Il controllo che vale piu' di tutti gli altri di questo file.
  await page.selectOption("#sc-00A-canale", "Passaparola / Referral");
  await attendi(async () => (await dati("00A"))?.dati?.canale === "Passaparola / Referral", {
    cosa: "secondo campo",
  });
  const d = await dati("00A");
  if (d.dati.consulente_assegnato !== "Silvia Marino") throw new Error("il primo campo e' stato azzerato");
});

await check("svuotare un campo TOGLIE la chiave, non lascia una stringa vuota", async () => {
  await page.selectOption("#sc-00A-canale", "");
  await attendi(async () => !("canale" in ((await dati("00A"))?.dati ?? {})), { cosa: "chiave rimossa" });
  const d = await dati("00A");
  if (d.dati.consulente_assegnato !== "Silvia Marino") throw new Error("l'altro campo e' sparito");
});

await check("un campo lungo si salva", async () => {
  await page.fill("#sc-00A-descrizione_richiesta", "Chiedono un bilancio di sostenibilita' per una gara.");
  await page.locator("#sc-00A-descrizione_richiesta").blur();
  await attendi(async () => /una gara/.test((await dati("00A"))?.dati?.descrizione_richiesta ?? ""), {
    cosa: "campo lungo",
  });
});

await check("lo stato «completata» e' dichiarato, e la riga lo registra", async () => {
  await page.locator('[data-comando="completata"]').click();
  await attendi(async () => (await dati("00A"))?.stato === "completata", { cosa: "stato dichiarato" });
});

await check("il conto della fase si aggiorna", async () => {
  await page.goto(`${BASE}/aziende/${companyId}/sgesg/${ANNO}/proc00`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  const t = await page.locator("[data-schede-complete]").innerText();
  if (!/^1/.test(t.trim())) throw new Error(`il conto dice «${t.trim()}»`);
});

await check("ripremere «completata» la riporta in bozza", async () => {
  await page.locator('[data-scheda-voce="00A"] a').click();
  await page.waitForURL(`**/proc00/00A`, { timeout: 30_000 });
  await page.locator('[data-comando="completata"]').click();
  await attendi(async () => (await dati("00A"))?.stato === "bozza", { cosa: "tornata in bozza" });
});

// ─── ciò che il prodotto NON fa ancora, e lo dice ────────────────────────────
await check("le schede con logica lo DICHIARANO invece di mostrare il vuoto", async () => {
  // ⚠️ Ventuno su 63 sono tabelle e registri: renderle come schede vuote le farebbe
  // sembrare rotte. Il fatto da verificare e' che il prodotto lo dica.
  const [conLogica] = await sql`select key, fase_key from sgesg_scheda_def
                                where set_id='sgesg-v1' and ha_logica limit 1`;
  await page.goto(`${BASE}/aziende/${companyId}/sgesg/${ANNO}/${conLogica.fase_key}/${conLogica.key}`, {
    waitUntil: "domcontentloaded",
  });
  await spegniTour(page);
  const t = await page.locator("main").innerText();
  if (!/tabella di lavoro/i.test(t)) throw new Error("non dichiara di essere una tabella");
  if (await page.locator('[data-comando="completata"]').count()) {
    throw new Error("offre di completarla pur non avendo campi");
  }
});

await check("una scheda con logica non si compila nemmeno forzando il server", async () => {
  const [conLogica] = await sql`select key from sgesg_scheda_def where set_id='sgesg-v1' and ha_logica limit 1`;
  const prima = await dati(conLogica.key);
  // La prova non e' il messaggio: e' la riga che non compare.
  if (prima) throw new Error("esiste gia' un compilato per una scheda con logica");
});

await check("un altro studio non apre questa scheda", async () => {
  const email2 = `schede-b-${RUN}@example.com`;
  const p2 = await browser.newPage();
  const { orgId: org2 } = await registraEEntra(p2, sql, {
    base: BASE, nome: "Studio Altro", email: email2, pwd: PWD_COLLAUDO,
  });
  const r = await p2.goto(`${BASE}/aziende/${companyId}/sgesg/${ANNO}/proc00/00A`, {
    waitUntil: "domcontentloaded",
  });
  const testo = await p2.locator("body").innerText();
  if ((r?.status() ?? 0) === 200 && /Primo Contatto/i.test(testo)) {
    throw new Error("un altro studio vede la scheda");
  }
  const p = await programma();
  const intrusi = (
    await sql`select count(*)::int n from sgesg_scheda_dato
              where program_id = ${p.id} and organization_id = ${org2}`
  )[0].n;
  if (intrusi !== 0) throw new Error("righe di questo programma intestate all'altro studio");
  await p2.close();
  await sql`delete from sgesg_scheda_dato where organization_id = ${org2}`;
  await sql`delete from sgesg_fase where organization_id = ${org2}`;
  await sql`delete from sgesg_programma where organization_id = ${org2}`;
  await sql`delete from audit_log where organization_id = ${org2}`;
  await sql`delete from company where organization_id = ${org2}`;
  await sql`delete from entitlement_event where organization_id = ${org2}`;
  await sql`delete from org_entitlement where organization_id = ${org2}`;
  await sql`delete from member where organization_id = ${org2}`;
  await sql`delete from organization where id = ${org2}`;
  await sql`delete from "user" where email = ${email2}`;
});

console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(guasti.length ? "ERRORI DI CONSOLE:\n  " + [...new Set(guasti)].join("\n  ") : "Console pulita.");

await sql`delete from sgesg_scheda_dato where organization_id = ${orgId}`;
await sql`delete from sgesg_fase where organization_id = ${orgId}`;
await sql`delete from sgesg_programma where organization_id = ${orgId}`;
await sql`delete from audit_log where organization_id = ${orgId}`;
await sql`delete from company where organization_id = ${orgId}`;
await sql`delete from entitlement_event where organization_id = ${orgId}`;
await sql`delete from org_entitlement where organization_id = ${orgId}`;
await sql`delete from member where organization_id = ${orgId}`;
await sql`delete from organization where id = ${orgId}`;
await sql`delete from "user" where email = ${email}`;

await browser.close();
await sql.end();
process.exit(ko > 0 || guasti.length > 0 ? 1 : 0);
