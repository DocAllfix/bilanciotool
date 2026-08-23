// Collaudo del percorso Modello 231: un controllo per ogni comando.
//
// ⚠️ Il nome dell'azienda porta il timestamp. La sonda che ha preceduto questo collaudo
// usava un nome fisso, e a ogni esecuzione ne creava un'altra identica: le query di
// verifica pescavano la riga di una corsa precedente, e i suoi rossi non distinguevano
// un difetto del prodotto da un difetto suo.
//
// Due controlli esistono per confermare difetti trovati guardando e corretti alla cieca:
// «associare un reato lo mostra subito» e «lo spazio dopo il grassetto non è mangiato».
//
//   npm run qa -- mog231-percorso

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, attendi } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = process.env.SHOT_DIR ?? "./shots-mog231";
mkdirSync(OUT, { recursive: true });

const RUN = Date.now();
const email = `mog231-${RUN}@example.com`;
const AZIENDA = `Appalti Lucani ${String(RUN).slice(-6)} S.p.A.`;

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
page.on("response", (r) => {
  if (r.status() >= 400 && !r.url().includes("monitoraggio")) errori.push(`${r.status()} ${r.url().replace(BASE, "")}`);
});

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

console.log(`\nModello 231 — ${BASE}\n`);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio 231", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
const [az] = await sql`insert into company (id, organization_id, nome, settore, is_demo)
  values (gen_random_uuid(), ${orgId}, ${AZIENDA}, 'Costruzioni', false) returning id`;
await spegniTour(page);

const U = `${BASE}/aziende/${az.id}/mog231`;
const vaiVista = async (k, ancora) => {
  await page.click(`[data-tour="mog-vista-${k}"]`);
  await page.waitForURL(`**vista=${k}`, { timeout: 30_000 });
  if (ancora) await page.locator(ancora).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
};

// ─── stato vuoto e creazione ─────────────────────────────────────────────────
await page.goto(U, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="mog-crea"]').waitFor({ timeout: 60_000 });
verifica("Lo stato vuoto invita ad avviare il Modello", true);
await shot("00-vuoto");

await page.click('[data-tour="mog-crea"]');
await page.locator("[data-tour^='mog-vista-']").first().waitFor({ timeout: 60_000 });
verifica("Il Modello si crea e apre le sei viste", (await page.locator("[data-tour^='mog-vista-']").count()) === 6);
const [mod] = await sql`select content_set_id, ragione from mog_model where company_id = ${az.id}`;
verifica("Il catalogo si congela alla creazione", mod?.content_set_id === "mog231-v1", mod?.content_set_id);
verifica("La ragione sociale si eredita dall'azienda", mod?.ragione === AZIENDA);
await shot("01-quadro");

// ─── ente ────────────────────────────────────────────────────────────────────
await vaiVista("ente", '[data-tour="mog-ente"]');
await page.getByLabel("Organo amministrativo", { exact: true }).fill("Consiglio di amministrazione");
await page.keyboard.press("Tab");
await attendi(async () => {
  const [m] = await sql`select organo_amministrativo from mog_model where company_id = ${az.id}`;
  return m?.organo_amministrativo === "Consiglio di amministrazione";
}, { entro: 30_000, cosa: "l'organo amministrativo salvato" });
verifica("Un campo dell'ente si salva sfocandosi", true);

// ⚠️ La data IMPOSSIBILE non si prova da qui, e la ragione e' utile saperla: un
// `<input type="date">` la rifiuta prima ancora di emetterla — Playwright riporta
// «Malformed value». La difesa vera sta comunque sul server, perche' una server action
// e' un endpoint HTTP e nessuno e' obbligato a passare dal campo: e' coperta dai test
// puri di `campi-pure.test.ts`, dove il 31 febbraio viene respinto invece di scivolare
// al 3 marzo. Qui si prova cio' che l'interfaccia puo' fare: che una data valida arrivi.
await page.getByLabel("Data della delibera di adozione", { exact: true }).fill("2026-03-16");
await attendi(async () => {
  const [m] = await sql`select data_delibera from mog_model where company_id = ${az.id}`;
  return m?.data_delibera === "2026-03-16";
}, { entro: 30_000, cosa: "la data della delibera salvata" });
verifica("Una data valida si salva al cambio", true);
await shot("02-ente");

// ─── reati ───────────────────────────────────────────────────────────────────
await vaiVista("reati", '[data-tour="mog-reati"]');
await page.getByRole("button", { name: "24: Sì", exact: true }).click();
await attendi(async () => {
  const [a] = await sql`select applicabile from mog_crime_applicability
    where crime_key = '24' and model_id = (select id from mog_model where company_id = ${az.id})`;
  return a?.applicabile === "Sì";
}, { entro: 30_000, cosa: "il reato 24 dichiarato applicabile" });
verifica("Un reato si dichiara applicabile", true);

await page.getByRole("button", { name: "25: No", exact: true }).click();
await page.waitForTimeout(1200);
verifica(
  "Escludere un reato chiede la motivazione",
  (await page.locator("#mog-mot-25").count()) > 0,
);
verifica(
  "Un reato applicabile senza processi è segnalato come lacuna",
  (await page.getByText("non ricondotto a nessun processo").count()) > 0,
);
await shot("03-reati");

// ─── processi e scenari ──────────────────────────────────────────────────────
await vaiVista("processi", '[data-tour="mog-processi"]');

await page.fill("#mog-nuovo-processo", "Gare e appalti pubblici");
await page.getByRole("button", { name: /^Aggiungi$/ }).click();
await attendi(async () => {
  const [p] = await sql`select id from mog_process where model_id = (select id from mog_model where company_id = ${az.id})`;
  return !!p;
}, { entro: 30_000, cosa: "il processo scritto nel database" });
await page.locator('[data-tour="mog-aggiungi-reato"]').waitFor({ timeout: 30_000 });
verifica("Un processo sensibile si crea e apre la sua scheda", true);

// ⚠️ Lo spazio dopo il grassetto si misura sul testo RESO, non sul sorgente: nel
// sorgente c'era e a schermo mancava. La frase vive nella scheda del processo, quindi
// si guarda DOPO averne creato uno — una prima versione di questo controllo la cercava
// prima, e falliva per un motivo che col prodotto non c'entrava.
const spiega = await page.locator("p", { hasText: "Si scelgono solo fra" }).first().innerText();
verifica("Lo spazio dopo il grassetto non è mangiato", /applicabili all/.test(spiega), spiega.slice(28, 62));

// Solo i reati APPLICABILI compaiono nella tendina: il 25 è stato escluso.
await page.click('[aria-label="Reato da associare"]');
await page.waitForTimeout(600);
const opzioni = await page.getByRole("option").allInnerTexts();
verifica("La tendina offre solo i reati applicabili", opzioni.some((o) => o.startsWith("24")) && !opzioni.some((o) => o.startsWith("25 ")), `${opzioni.length} opzioni`);
await page.getByRole("option").first().click();
await page.waitForTimeout(600);
await page.click('[data-tour="mog-aggiungi-reato"]');

// ⚠️ Il controllo che conta: la riga nel database E la riga a schermo. Prima della
// correzione la prima c'era e la seconda no, perché lo stato locale non si
// risincronizzava col refresh.
await attendi(async () => {
  const [s] = await sql`select id from mog_scenario where process_id =
    (select id from mog_process where model_id = (select id from mog_model where company_id = ${az.id}) limit 1)`;
  return !!s;
}, { entro: 30_000, cosa: "lo scenario scritto nel database" });
await attendi(async () => (await page.locator("[data-scenario]").count()) > 0, {
  entro: 30_000,
  cosa: "lo scenario visibile a schermo SENZA ricaricare",
});
verifica("Associare un reato lo mostra subito", true);

// Il rischio a due stadi, sotto gli occhi.
await page.getByRole("button", { name: /^24 probabilità: 4/ }).click();
await page.waitForTimeout(900);
await page.getByRole("button", { name: /^24 impatto: 4/ }).click();
await page.waitForTimeout(900);
const testoScenario = await page.locator("[data-scenario]").first().innerText();
verifica("Probabilità × impatto danno il rischio inerente", /Inerente: ?Critico/.test(testoScenario.replace(/\s+/g, " ")), testoScenario.replace(/\s+/g, " ").slice(-90));
verifica("Presidi non dichiarati valgono «Assenti»: il residuo resta Critico",
  /Residuo: ?Critico/.test(testoScenario.replace(/\s+/g, " ")));

await page.getByRole("button", { name: "24 presidi: Adeguati", exact: true }).click();
await page.waitForTimeout(1200);
const conPresidi = (await page.locator("[data-scenario]").first().innerText()).replace(/\s+/g, " ");
verifica("Presidi adeguati portano il residuo a Medio, e diventa accettabile",
  /Residuo: ?Medio/.test(conPresidi) && /accettabile/.test(conPresidi) && !/non accettabile/.test(conPresidi));
await shot("04-processi");

// ─── presidi ─────────────────────────────────────────────────────────────────
await vaiVista("presidi", '[data-tour="mog-presidi"]');
// ⚠️ Il `kpi` va cercato DENTRO la vista: `[data-slot=kpi]` senza perimetro pesca il
// distintivo dell'intestazione («Rischio massimo: Medio»), che e' un altro numero e
// un'altra domanda. Il nome accessibile non e' l'etichetta visibile, e il primo
// elemento del documento non e' il primo della vista.
const kpiPilastro = () => page.locator("[data-tour='mog-presidi'] [data-slot='kpi']").first();
const primaIdoneita = await kpiPilastro().innerText();
verifica("Senza presidi valutati l'idoneità del pilastro è zero", primaIdoneita.trim() === "0%", primaIdoneita);
await page.getByRole("button", { name: "P1.01: Presente ed efficace", exact: true }).click();
await attendi(async () => {
  const [r] = await sql`select stato from mog_requirement_state
    where requirement_key = 'P1.01' and model_id = (select id from mog_model where company_id = ${az.id})`;
  return r?.stato === "Presente ed efficace";
}, { entro: 30_000, cosa: "il presidio P1.01 valutato" });
const dopoIdoneita = (await kpiPilastro().innerText()).trim();
verifica("Un presidio dovuto e non valutato pesa zero: l'idoneità non salta a 100",
  dopoIdoneita !== "100%" && dopoIdoneita !== "0%", dopoIdoneita);
await shot("05-presidi");

// ─── documenti ───────────────────────────────────────────────────────────────
await vaiVista("documenti", null);
await page.getByText("Matrice reati-processi", { exact: false }).first().waitFor({ timeout: 30_000 });
verifica("La vista Documenti offre i due documenti del modulo",
  (await page.getByText("Relazione dell'Organismo di Vigilanza", { exact: false }).count()) > 0);
await shot("06-documenti");

await sql.end();
await browser.close();
console.log(`\nPROVE: ${ok}/${ok + ko} superate`);
console.log(errori.length ? "ERRORI CONSOLE:\n" + errori.join("\n") : "CONSOLE_ERRORS: nessuno");
if (ko > 0 || errori.length) process.exitCode = 1;
