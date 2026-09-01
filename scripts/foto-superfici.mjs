// Le superfici cambiate, fotografate in chiaro e in scuro.
//
// ⚠️ Serve a essere GUARDATO, non misurato: i collaudi funzionali dicono che i comandi
// rispondono, e non possono dire che undici caselle in una card stanno strette o che un
// colore d'area è finito sul modulo sbagliato. Le due cose si controllano in due modi
// diversi, e il secondo vuole un paio d'occhi.
//
//   node scripts/foto-superfici.mjs

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour } from "./comune-collaudo.mjs";
import { rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = "./foto";
mkdirSync(OUT, { recursive: true });

const RUN = Date.now();
const email = `foto-${RUN}@example.com`;

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const guasti = [];
page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) guasti.push(m.text().slice(0, 140)); });

console.log(`\nFoto delle superfici — ${BASE}\n`);
const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Foto", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
await spegniTour(page);

const [az] = await sql`select id from company where organization_id = ${orgId} limit 1`;
// ⚠️ L'indirizzo dell'ESERCIZIO, non quello del percorso: `/sgesg` rimanda a
// `/sgesg/<anno>`, e il ricaricamento con cui si applica il tema correrebbe contro
// il rinvio. Si chiede al database qual e' l'anno invece di indovinarlo.
const [pEsg] = await sql`select anno from sgesg_programma where company_id = ${az.id} order by anno desc limit 1`;

/**
 * Il tema si sceglie con l'interruttore del prodotto: NON segue `prefers-color-scheme`.
 *
 * ⚠️ E si applica RICARICANDO, non toccando la classe a pagina aperta.
 *
 * La versione precedente scriveva `localStorage` e faceva il toggle della classe subito
 * dopo `goto`. E' una corsa con l'idratazione di `next-themes`, e la corsa si perdeva a
 * volte si': delle sette superfici, `dashboard-chiaro` e `fascicolo-chiaro` uscivano
 * chiare e `guida-chiaro` usciva SCURA, nella stessa esecuzione. Uno strumento di misura
 * che risponde in modo diverso alla stessa domanda non misura niente, e qui il danno era
 * doppio: le foto sono l'unico controllo che vede la disposizione, e meta' erano nel
 * tema sbagliato senza dirlo.
 *
 * Ricaricando, `next-themes` legge il valore all'avvio e non c'e' nessuna corsa. E si
 * VERIFICA che il tema sia quello chiesto: un controllo che non puo' fallire non e' un
 * controllo, ed e' esattamente il difetto che si sta chiudendo.
 */
async function tema(scuro) {
  await page.evaluate((s) => {
    try { localStorage.setItem("theme", s ? "dark" : "light"); } catch {}
  }, scuro);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(400);
  const applicato = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  if (applicato !== scuro) {
    throw new Error(`tema chiesto ${scuro ? "scuro" : "chiaro"} ma applicato ${applicato ? "scuro" : "chiaro"}`);
  }
}

const SUPERFICI = [
  ["dashboard", `${BASE}/dashboard`, "main"],
  ["fascicolo", `${BASE}/aziende/${az.id}`, "[data-percorsi]"],
  ["archivio", `${BASE}/documenti`, "main"],
  ["agenda", `${BASE}/agenda`, "main"],
  ["compensi", `${BASE}/compensi`, "main"],
  ...(pEsg
    ? [
        ["sgesg", `${BASE}/aziende/${az.id}/sgesg/${pEsg.anno}`, "[data-fasi]"],
        ["sgesg-fase", `${BASE}/aziende/${az.id}/sgesg/${pEsg.anno}/proc00`, "[data-schede]"],
        ["sgesg-scheda", `${BASE}/aziende/${az.id}/sgesg/${pEsg.anno}/proc00/00A`, "[data-scheda]"],
      ]
    : []),
  ["filiera", `${BASE}/aziende/${az.id}/filiera`, "main"],
  ["sa8000", `${BASE}/aziende/${az.id}/sa8000`, "main"],
  ["verifica", `${BASE}/verifica`, "main"],
  ["guida", `${BASE}/guida`, "main"],
  // La formazione: l'indice, un corso di percorso e quello trasversale. Sono pagine da
  // LEGGERE, quindi la cosa da guardare è la misura del testo e la gerarchia, non i comandi.
  ["formazione", `${BASE}/formazione`, "[data-formazione]"],
  ["formazione-corso", `${BASE}/formazione/energetico`, "[data-sezioni]"],
  ["formazione-mestiere", `${BASE}/formazione/corso/avviare-attivita`, "[data-sezioni]"],
];

for (const [nome, url, ancora] of SUPERFICI) {
  for (const scuro of [false, true]) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await tema(scuro);
    await page.locator(ancora).first().waitFor({ timeout: 120_000 }).catch(() => {});
    await spegniTour(page);
    await page.waitForTimeout(900);
    const file = `${OUT}/${nome}-${scuro ? "scuro" : "chiaro"}.png`;
    await page.screenshot({ path: file, fullPage: false });
    console.log("  " + file);
  }
}

// La scheda cliente, che sta in fondo al fascicolo: va portata in vista, altrimenti la
// foto del solo riquadro visibile non la contiene e il controllo "guardala" non guarda
// niente.
for (const scuro of [false, true]) {
  await page.goto(`${BASE}/aziende/${az.id}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await tema(scuro);
  await spegniTour(page);
  const scheda = page.locator("[data-scheda-cliente]");
  await scheda.waitFor({ timeout: 60_000 }).catch(() => {});
  await scheda.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(600);
  const file = `${OUT}/scheda-cliente-${scuro ? "scuro" : "chiaro"}.png`;
  await page.screenshot({ path: file });
  console.log("  " + file);
}

// La vetrina: undici percorsi nei tre gruppi del committente.
//
// ⚠️ IN ENTRAMBI I TEMI, e dichiarati. Prima la foto era una sola e usciva col tema che
// il ciclo qui sopra aveva lasciato addosso — cioe' SCURO — mentre un visitatore
// anonimo la vetrina la vede CHIARA. Guardando quella foto ho creduto per qualche
// minuto che i trattini dei gruppi fossero invisibili su fondo scuro, e stavo per
// "correggere" un colore che nessuno vede cosi'. Una foto che non dice in che stato e'
// stata presa fa perdere piu' tempo di quanto ne faccia risparmiare.
for (const scuro of [false, true]) {
  await page.goto(`${BASE}/#percorsi`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await tema(scuro);
  await page.waitForTimeout(1200);
  const file = `${OUT}/vetrina-percorsi-${scuro ? "scuro" : "chiaro"}.png`;
  await page.screenshot({ path: file });
  console.log("  " + file);
}
await tema(false);

// E la card del portafoglio da telefono. Qui c'erano undici caselle e ora sono tre, una
// per gruppo, col rapporto «avviati su totale» dentro: e' esattamente la superficie in
// cui il difetto della disposizione si e' gia' presentato tre volte, e ogni volta lo ha
// visto un paio d'occhi e nessun collaudo.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
await spegniTour(page);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/dashboard-telefono.png` });
const sfonda = await page.evaluate(() => document.body.scrollWidth - document.body.clientWidth);
console.log(`  ${OUT}/dashboard-telefono.png — sfondamento orizzontale: ${sfonda}px`);

console.log(guasti.length ? "\n  ERRORI DI CONSOLE:\n   " + [...new Set(guasti)].join("\n   ") : "\n  Console pulita.");

await sql`delete from company where organization_id = ${orgId}`;
await sql`delete from audit_log where organization_id = ${orgId}`;
await sql`delete from entitlement_event where organization_id = ${orgId}`;
await sql`delete from org_entitlement where organization_id = ${orgId}`;
await sql`delete from member where organization_id = ${orgId}`;
await sql`delete from organization where id = ${orgId}`;
await sql`delete from "user" where email = ${email}`;

await browser.close();
await sql.end();
