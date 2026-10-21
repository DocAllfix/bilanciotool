// IL CONTEGGIO DEGLI ARRIVI DA CAMPAGNA, provato dal browser fino alla riga.
//
//   npm run qa -- arrivi
//
// ⚠️ Il controllo che vale di più è che il conteggio NON dipenda dal consenso: esiste
// proprio per dare il numero che Google Analytics non può dare, cioè anche chi rifiuta.
// E ogni esito si legge dal DATABASE: un invio partito non dimostra una riga scritta.
//
// ⚠️ SCRIVE: ogni visita da campagna è una riga di conteggio, e la prova registra due
// conti. In produzione non parte — una sorgente «collaudo» finirebbe fra le campagne vere
// che il consulente legge per decidere dove spendere.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { strumenta, contatore, pretendiServerAggiornato, attraversaProtezione, vaiA } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const IN_PRODUZIONE =
  (process.env.DATABASE_URL ?? "").includes("hahtljrexrngtfsplbsz") || /^https:\/\/(www\.)?evalisdeck\.it/.test(BASE);
if (IN_PRODUZIONE) {
  console.log("Arrivi: in produzione non parte (scriverebbe righe di conteggio fra le campagne vere).");
  process.exit(0);
}

const RUN = Date.now();
const SORGENTE = `collaudo-${RUN}`;
const CAMPAGNA = `prova-${RUN}`;
const DA_CAMPAGNA = `/?gclid=VALORE-DA-NON-CONSERVARE&utm_source=${SORGENTE}&utm_medium=cpc&utm_campaign=${CAMPAGNA}`;

console.log(`\nArrivi da campagna — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const pagina = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await attraversaProtezione(pagina);
const sonda = strumenta(pagina);
const { agisci, riepilogo } = contatore(pagina, sonda);

const conteggio = async () => {
  const [r] = await sql`select coalesce(sum(conteggio), 0)::int as n from arrivo_campagna where sorgente = ${SORGENTE}`;
  return r.n;
};
/** Aspetta che il conteggio arrivi a `atteso`: il beacon parte dopo l'idratazione. */
const aspettaConteggio = async (atteso) => {
  for (let i = 0; i < 40; i++) {
    const n = await conteggio();
    if (n >= atteso) return n;
    await new Promise((r) => setTimeout(r, 500));
  }
  return conteggio();
};

/** Un visitatore nuovo, arrivato dalla campagna. */
async function visitaDaCampagna(scelta) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await attraversaProtezione(p);
  await p.goto(`${BASE}${DA_CAMPAGNA}`, { waitUntil: "domcontentloaded" });
  const banner = p.getByRole("dialog", { name: /consenso ai cookie/i });
  await banner.waitFor({ timeout: 20_000 });
  if (scelta) await p.getByRole("button", { name: scelta, exact: true }).click();
  await p.waitForTimeout(1500);
  await ctx.close();
}

await agisci("chi non ha ancora scelto viene contato, una volta", async () => {
  await visitaDaCampagna(null);
  const n = await aspettaConteggio(1);
  if (n !== 1) throw new Error(`conteggio ${n}, atteso 1`);
});

await agisci("⚠️ anche chi rifiuta viene contato: il conteggio non dipende dal consenso", async () => {
  await visitaDaCampagna("Rifiuta");
  const n = await aspettaConteggio(2);
  if (n !== 2) throw new Error(`conteggio ${n}, atteso 2`);
});

await agisci("la riga dice campagna, clic di Google Ads e pagina, e niente del clic", async () => {
  const righe = await sql`select * from arrivo_campagna where sorgente = ${SORGENTE}`;
  if (righe.length !== 1) throw new Error(`${righe.length} righe, attesa 1`);
  const r = righe[0];
  if (r.mezzo !== "cpc" || r.campagna !== CAMPAGNA || r.clic_ads !== true || r.pagina !== "/") {
    throw new Error(`riga inattesa: ${JSON.stringify(r)}`);
  }
  if (JSON.stringify(r).includes("VALORE-DA-NON-CONSERVARE")) throw new Error("il valore del gclid è stato conservato");
});

await agisci("una visita senza parametri di campagna non si conta", async () => {
  const [prima] = await sql`select coalesce(sum(conteggio),0)::int as n from arrivo_campagna`;
  await vaiA(pagina, `${BASE}/prezzi`);
  await pagina.waitForTimeout(2000);
  const [dopo] = await sql`select coalesce(sum(conteggio),0)::int as n from arrivo_campagna`;
  if (dopo.n !== prima.n) throw new Error(`il totale è passato da ${prima.n} a ${dopo.n}`);
});

await agisci("la rotta rifiuta ciò che non viene dalle nostre pagine, e i corpi storti", async () => {
  const corpo = JSON.stringify({ sorgente: SORGENTE, mezzo: "x", campagna: "x", clicAds: false, pagina: "/" });
  const esterna = await pagina.request.post(`${BASE}/api/arrivi`, {
    data: corpo,
    headers: { "content-type": "application/json", "sec-fetch-site": "cross-site" },
  });
  if (esterna.status() !== 403) throw new Error(`da un altro sito: ${esterna.status()}, atteso 403`);
  const grande = await pagina.request.post(`${BASE}/api/arrivi`, { data: "x".repeat(5000) });
  if (grande.status() !== 413) throw new Error(`corpo enorme: ${grande.status()}, atteso 413`);
  const storto = await pagina.request.post(`${BASE}/api/arrivi`, { data: JSON.stringify({ pagina: "/" }) });
  if (storto.status() !== 400) throw new Error(`senza sorgente: ${storto.status()}, atteso 400`);
  if ((await conteggio()) !== 2) throw new Error("una richiesta rifiutata ha contato lo stesso");
});

// ── La pagina dello staff ─────────────────────────────────────────────────────────────

const { userId } = await registraEEntra(pagina, sql, {
  base: BASE,
  nome: "Persona dello staff",
  email: `arrivi-staff-${RUN}@example.com`,
  pwd: PWD_COLLAUDO,
});

await agisci("⚠️ per chi non è staff la pagina NON ESISTE", async () => {
  await vaiA(pagina, `${BASE}/staff/arrivi`);
  const esito = await Promise.race([
    pagina.waitForSelector("text=Questa pagina non c", { timeout: 20_000 }).then(() => "nonTrovata"),
    pagina.waitForSelector("[data-arrivi-staff]", { timeout: 20_000 }).then(() => "aperta"),
  ]).catch(() => "niente");
  if (esito !== "nonTrovata") throw new Error(`esito «${esito}» per un account senza ruolo di piattaforma`);
});

await sql`update "user" set platform_role='admin' where id = ${userId}`;

await agisci("lo staff vede la campagna e i suoi due arrivi", async () => {
  await vaiA(pagina, `${BASE}/staff/arrivi`);
  await pagina.waitForSelector("[data-arrivi-staff]", { timeout: 30_000 });
  const testo = await pagina.locator("[data-arrivi-staff]").innerText();
  const riga = testo.split("\n").find((l) => l.includes(`${SORGENTE} / cpc / ${CAMPAGNA}`));
  if (!riga) throw new Error("la campagna non compare");
  if (!/\b2\s+2\b/.test(riga.replace(/\t/g, " "))) throw new Error(`riga «${riga}»: attesi 2 arrivi, 2 da clic`);
});

const esito = riepilogo("Arrivi da campagna");
await sql`delete from arrivo_campagna where sorgente = ${SORGENTE}`;
await browser.close();
await sql.end();
// ⚠️ `riepilogo` restituisce i ROSSI: il vero va mappato su 1, non su 0.
process.exit(esito ? 1 : 0);
