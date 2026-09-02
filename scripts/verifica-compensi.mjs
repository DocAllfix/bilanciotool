// I compensi dello studio, comando per comando — e la prova che non escono di lì.
//
// ⚠️ Il controllo che conta di più è l'ultimo: si pubblica un documento, si genera il
// collegamento del portale cliente e si apre come farebbe il cliente, **senza sessione**.
// Nessuno degli importi deve comparire da nessuna parte in quella pagina.
//
//   npm run qa -- compensi [--prod]

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, strumenta, attendi, pretendiServerAggiornato, attraversaProtezione } from "./comune-collaudo.mjs";

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
const email = `compensi-${RUN}@example.com`;
const oggi = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

console.log(`\nCompensi dello studio — ${BASE}\n`);
if (!/^https?:\/\/localhost/.test(BASE)) await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await attraversaProtezione(page);
const guasti = strumenta(page);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Compensi", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
await spegniTour(page);

const compensi = async () => sql`select * from compenso where organization_id = ${orgId}`;
const incassi = async () => sql`select * from compenso_incasso where organization_id = ${orgId} order by data`;

async function apriCompensi() {
  await page.goto(`${BASE}/compensi`, { waitUntil: "domcontentloaded" });
  // ⚠️ Si aspetta il TITOLO: `domcontentloaded` si risolve quando la navigazione
  // comincia, non quando il contenuto e' reso.
  await page.locator('h1:has-text("Compensi")').waitFor({ timeout: 30_000 });
  await spegniTour(page);
}

await check("i compensi hanno una voce propria nella barra laterale", async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  const link = page.locator('nav a[href="/compensi"]').first();
  await link.waitFor({ timeout: 30_000 });
  await link.click();
  await page.waitForURL("**/compensi", { timeout: 30_000 });
  await page.locator('h1:has-text("Compensi")').waitFor({ timeout: 30_000 });
});

await check("la pagina dichiara che il prodotto NON emette fatture", async () => {
  const t = await page.locator("main").innerText();
  if (!/non si emette niente/i.test(t)) throw new Error("non lo dice");
  if (!/restano dentro lo studio/i.test(t)) throw new Error("non dice che gli importi non escono");
});

// ─── creazione ───────────────────────────────────────────────────────────────
await check("si registra un compenso, e l'importo italiano arriva in centesimi", async () => {
  await page.click("[data-nuovo-compenso]");
  await page.selectOption("#nc-azienda", { index: 1 });
  await page.fill("#nc-descrizione", "Bilancio di sostenibilità 2025");
  // ⚠️ «4.500,00» vale quattromilacinquecento. `parseFloat` leggerebbe 4.5.
  await page.fill("#nc-importo", "4.500,00");
  await page.fill("#nc-scadenza", "2026-09-30");
  await page.click('form button[type="submit"]:has-text("Salva")');
  await attendi(async () => (await compensi()).length === 1, { cosa: "compenso registrato" });
  const [c] = await compensi();
  if (c.importo !== 450000) throw new Error(`importo ${c.importo} invece di 450000 centesimi`);
});

await check("un importo storto viene RIFIUTATO e la riga non nasce", async () => {
  const prima = (await compensi()).length;
  await page.click("[data-nuovo-compenso]");
  await page.selectOption("#nc-azienda", { index: 1 });
  await page.fill("#nc-descrizione", "Refuso");
  await page.fill("#nc-importo", "milleduecento");
  await page.click('form button[type="submit"]:has-text("Salva")');
  await page.waitForTimeout(1800);
  if ((await compensi()).length !== prima) throw new Error("la riga e' nata lo stesso");
  const t = await page.locator("main").innerText();
  if (!/non è valido/i.test(t)) throw new Error("nessun messaggio spiega il rifiuto");
  await page.click('button:has-text("Annulla")');
});

// ─── acconti ─────────────────────────────────────────────────────────────────
await check("il primo acconto propone il residuo, e si registra", async () => {
  await apriCompensi();
  await page.locator('[data-comando="incassa"]').first().click();
  const proposto = await page.locator('input[name="importo"]').first().inputValue();
  if (proposto !== "4.500,00") throw new Error(`propone «${proposto}» invece del residuo`);
  await page.locator('input[name="importo"]').first().fill("1.500,00");
  await page.locator('form button[type="submit"]:has-text("Registra")').click();
  await attendi(async () => (await incassi()).length === 1, { cosa: "primo acconto" });
  const [i] = await incassi();
  if (i.importo !== 150000) throw new Error(`acconto ${i.importo}`);
});

await check("il SECONDO acconto non cancella il primo", async () => {
  // ⚠️ E' il controllo che vale piu' degli altri: gli acconti sono righe, non un totale
  // che si riscrive. Con un campo da aggiornare, il secondo cancellerebbe il primo.
  await apriCompensi();
  await page.locator('[data-comando="incassa"]').first().click();
  await page.locator('input[name="importo"]').first().fill("1.000,00");
  await page.locator('form button[type="submit"]:has-text("Registra")').click();
  await attendi(async () => (await incassi()).length === 2, { cosa: "secondo acconto" });
  const somma = (await incassi()).reduce((n, x) => n + x.importo, 0);
  if (somma !== 250000) throw new Error(`la somma degli acconti e' ${somma}`);
});

await check("il residuo e i totali si aggiornano a schermo", async () => {
  await apriCompensi();
  const daIncassare = await page.locator("[data-da-incassare]").getAttribute("data-da-incassare");
  if (Number(daIncassare) !== 200000) throw new Error(`da incassare ${daIncassare} centesimi`);
  const t = await page.locator("[data-compensi]").innerText();
  if (!/2\.000,00/.test(t)) throw new Error("il residuo non e' scritto nella forma italiana");
});

await check("togliere UN acconto preciso rimette il residuo com'era", async () => {
  // ⚠️ Non `.first()`: un `.first()` su un elenco che cresce agisce su un elemento a
  // caso. Una prima versione toglieva il primo acconto invece del secondo e poi
  // accusava il prodotto di un residuo sbagliato — che era quello giusto per l'acconto
  // che aveva davvero tolto. Si sceglie la riga per identificativo.
  const daTogliere = (await incassi()).find((i) => i.importo === 100000);
  if (!daTogliere) throw new Error("l'acconto da 1.000,00 non c'e'");
  await page.locator(`[data-incasso="${daTogliere.id}"] button`).click();
  await attendi(async () => (await incassi()).length === 1, { cosa: "acconto tolto" });
  const rimasto = (await incassi())[0];
  if (rimasto.importo !== 150000) throw new Error(`e' rimasto l'acconto sbagliato (${rimasto.importo})`);
  await apriCompensi();
  const daIncassare = await page.locator("[data-da-incassare]").getAttribute("data-da-incassare");
  if (Number(daIncassare) !== 300000) throw new Error(`da incassare ${daIncassare}`);
});

await check("lo stato si cambia dalla tendina", async () => {
  const [c] = await compensi();
  await page.selectOption(`#st-${c.id}`, "fatturato");
  await attendi(async () => (await compensi())[0].stato === "fatturato", { cosa: "stato" });
});

// ─── l'andamento nel quadro dello studio ─────────────────────────────────────
await check("il cruscotto mostra quanto c'e' da incassare", async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  await page.locator("[data-da-incassare]").waitFor({ timeout: 30_000 });
  const n = await page.locator("[data-da-incassare]").getAttribute("data-da-incassare");
  if (Number(n) !== 300000) throw new Error(`il cruscotto dice ${n}`);
});

// ─── IL CONTROLLO CHE CONTA: il portale cliente ──────────────────────────────
await check("il portale cliente NON mostra nessun importo", async () => {
  // Si pubblica un documento vero e si genera il collegamento, poi lo si apre in una
  // scheda SENZA SESSIONE — come farebbe il cliente che lo riceve per email.
  const [az] = await sql`select id from company where organization_id = ${orgId} limit 1`;
  await sql`insert into document_snapshot (id, organization_id, company_id, tipo, anno, versione, dati, published_by)
            values (${crypto.randomUUID()}, ${orgId}, ${az.id}, 'ghg', 2025, 1, '{"prova":true}'::jsonb,
                    (select user_id from member where organization_id = ${orgId} limit 1))`;

  await page.goto(`${BASE}/aziende/${az.id}`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  await page.locator("#cc-nota").waitFor({ timeout: 30_000 }).catch(() => {});
  await page.locator('button:has-text("Genera collegamento")').click();
  await attendi(async () => (await sql`select 1 from company_share_link where organization_id = ${orgId}`).length > 0, {
    cosa: "collegamento generato",
  });

  // ⚠️ Il collegamento sta in un CAMPO di sola lettura, non nel testo della pagina: il
  // valore di un `<input>` non compare in `innerText`, ed e' una regola gia' scritta in
  // questo progetto («le quantita' stanno nei campi, non nel testo»). Leggendo il testo
  // il controllo diceva «il collegamento non e' comparso» mentre era li' sotto gli occhi.
  const campo = page.locator('input[readonly][value*="documenti-cliente"]').first();
  await campo.waitFor({ timeout: 30_000 });
  const url = await campo.inputValue();
  const m = url.match(/documenti-cliente\/([A-Za-z0-9_-]{10,})/);
  if (!m) throw new Error(`il campo contiene «${url}»`);

  const anonima = await browser.newContext();
  const p2 = await anonima.newPage();
  const r = await p2.goto(`${BASE}/documenti-cliente/${m[1]}`, { waitUntil: "domcontentloaded" });
  if ((r?.status() ?? 0) !== 200) throw new Error(`il portale risponde ${r?.status()}`);
  const html = await p2.content();

  // ⚠️ Si cerca nell'HTML INTERO, non nel testo visibile: un importo nascosto in un
  // attributo o in un payload di idratazione sarebbe ugualmente uscito dallo studio.
  for (const cifra of ["450000", "4.500", "300000", "3.000", "150000", "1.500"]) {
    if (html.includes(cifra)) throw new Error(`il portale espone «${cifra}»`);
  }
  if (/compenso|acconto|incassare/i.test(html)) throw new Error("il portale nomina i compensi");
  // E i documenti ci sono davvero: senza, il controllo passerebbe su una pagina vuota.
  if (!/Rapporto GHG|documento|Scarica/i.test(html)) throw new Error("il portale non mostra nemmeno i documenti");
  await anonima.close();
});

await check("un altro studio non vede questi compensi", async () => {
  const email2 = `compensi-b-${RUN}@example.com`;
  const p2 = await browser.newPage();
  const { orgId: org2 } = await registraEEntra(p2, sql, {
    base: BASE, nome: "Studio Altro", email: email2, pwd: PWD_COLLAUDO,
  });
  await p2.goto(`${BASE}/compensi`, { waitUntil: "domcontentloaded" });
  await p2.locator('h1:has-text("Compensi")').waitFor({ timeout: 30_000 });
  const t = await p2.locator("main").innerText();
  if (/Bilancio di sostenibilità 2025/i.test(t)) throw new Error("un altro studio vede i compensi");
  const intrusi = (await sql`select count(*)::int n from compenso where organization_id = ${org2}`)[0].n;
  if (intrusi !== 0) throw new Error("righe intestate all'altro studio");
  await p2.close();
  for (const t of ["compenso_incasso", "compenso", "company_share_link", "document_snapshot", "audit_log", "company",
                   "entitlement_event", "org_entitlement", "member"]) {
    await sql.unsafe(`delete from ${t} where organization_id = $1`, [org2]);
  }
  await sql`delete from organization where id = ${org2}`;
  await sql`delete from "user" where email = ${email2}`;
});

console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(guasti.length ? "ERRORI DI CONSOLE:\n  " + [...new Set(guasti)].join("\n  ") : "Console pulita.");

for (const t of ["compenso_incasso", "compenso", "company_share_link", "document_snapshot", "agenda_voce",
                 "sgesg_scheda_dato", "sgesg_fase", "sgesg_programma", "audit_log", "company",
                 "entitlement_event", "org_entitlement", "member"]) {
  await sql.unsafe(`delete from ${t} where organization_id = $1`, [orgId]);
}
await sql`delete from organization where id = ${orgId}`;
await sql`delete from "user" where email = ${email}`;

await browser.close();
await sql.end();
process.exit(ko > 0 || guasti.length > 0 ? 1 : 0);
