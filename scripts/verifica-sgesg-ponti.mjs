// I ponti dalle fasi del metodo ai percorsi che esistono già.
//
// ⚠️ Il fatto che questo collaudo esiste per provare è UNO: **il ponte legge e non scrive
// mai**. Si fotografa il database prima e dopo aver aperto le tre fasi, e le due
// fotografie devono coincidere. Un ponte che scrivesse — anche solo per «tenere
// allineato» uno stato — farebbe del percorso e della fase due verità sullo stesso fatto.
//
//   npm run qa -- sgesg-ponti [--prod]

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
const email = `ponti-${RUN}@example.com`;
const NOME_AZIENDA = `Ponti ESG ${String(RUN).slice(-6)} S.r.l.`;
const ANNO = new Date().getFullYear() - 1;

console.log(`\nI ponti del metodo ESG — ${BASE}\n`);
if (!/^https?:\/\/localhost/.test(BASE)) await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const guasti = strumenta(page);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Ponti", email, pwd: PWD_COLLAUDO });
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

const apriFase = async (fase) => {
  await page.goto(`${BASE}/aziende/${companyId}/sgesg/${ANNO}/${fase}`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  await page.locator("[data-schede]").waitFor({ timeout: 30_000 });
};

// ─── quali fasi hanno un ponte ───────────────────────────────────────────────
await check("tre fasi su otto dichiarano un percorso dedicato, e le altre no", async () => {
  const n = await page.locator("[data-ponte-fase]").count();
  if (n !== 3) throw new Error(`${n} fasi con ponte invece di tre`);
  for (const f of ["proc02", "proc04", "proc06"]) {
    if (!(await page.locator(`[data-ponte-fase="${f}"]`).count())) throw new Error(`manca il ponte su ${f}`);
  }
});

await check("senza i percorsi, i ponti dicono «non ancora avviato»", async () => {
  for (const f of ["proc02", "proc04", "proc06"]) {
    const s = await page.locator(`[data-ponte-fase="${f}"]`).getAttribute("data-ponte-stato");
    if (s !== "mancante") throw new Error(`${f} dice «${s}»`);
  }
});

await check("una fase senza ponte non ne mostra uno", async () => {
  await apriFase("proc00");
  if (await page.locator("[data-ponte]").count()) throw new Error("la fase 00 mostra un ponte");
});

await check("la fase 04 mostra il ponte all'inventario GHG", async () => {
  await apriFase("proc04");
  const p = page.locator("[data-ponte]");
  await p.waitFor({ timeout: 20_000 });
  if ((await p.getAttribute("data-ponte")) !== "ghg") throw new Error("il ponte non punta al GHG");
  const t = await p.innerText();
  if (!/Non ancora avviato/i.test(t)) throw new Error("non dichiara che il percorso manca");
});

await check("il ponte porta DAVVERO nel percorso", async () => {
  await page.locator("[data-ponte-href]").click();
  await page.waitForURL("**/ghg**", { timeout: 30_000 });
});

// ─── il ponte segue il percorso ──────────────────────────────────────────────
await check("avviando l'inventario, il ponte passa a «avviato, ancora vuoto»", async () => {
  // Si crea l'inventario dall'interfaccia del suo percorso: il ponte deve accorgersene
  // senza che nessuno tocchi la fase.
  await page.locator("#ci-anno").waitFor({ timeout: 30_000 });
  await page.fill("#ci-anno", String(ANNO));
  // Il pulsante dice «Crea», non «Crea inventario»: si cerca cio' che c'e'.
  await page.locator('form button[type="submit"]').first().click();
  // ⚠️ Si aspetta la RIGA, non l'indirizzo. `waitForURL` si risolve quando la
  // navigazione COMINCIA, non quando l'azione che l'ha provocata ha finito: la prima
  // versione interrogava il database un istante troppo presto, non trovava
  // l'inventario e accusava il gesto — mentre la riga compariva un attimo dopo, e il
  // controllo successivo la vedeva. E' la stessa regola gia' scritta per `networkidle`:
  // la condizione che interessa e' il fatto, non il segnale che gli assomiglia.
  await attendi(async () => (await sql`select 1 from ghg_inventory where company_id = ${companyId}`).length > 0, {
    cosa: "inventario creato",
  });
  const inv = await sql`select id, anno from ghg_inventory where company_id = ${companyId}`;
  if (inv[0].anno !== ANNO) throw new Error(`l'inventario e' dell'anno ${inv[0].anno}, il programma del ${ANNO}`);

  await apriFase("proc04");
  await attendi(
    async () => (await page.locator("[data-ponte-stato]").getAttribute("data-ponte-stato")) === "vuoto",
    { cosa: "ponte aggiornato" },
  );
  const t = await page.locator("[data-ponte]").innerText();
  if (!/0 voci/.test(t)) throw new Error("non riporta il conteggio delle voci");
});

// ─── il fatto che conta: il ponte NON SCRIVE ─────────────────────────────────
const fotografia = async () => {
  const [r] = await sql`
    select
      (select count(*) from ghg_inventory  where company_id = ${companyId})::int inv,
      (select count(*) from ghg_activity_row r join ghg_inventory i on i.id = r.inventory_id
        where i.company_id = ${companyId})::int voci,
      (select count(*) from report_project where company_id = ${companyId})::int prog,
      (select count(*) from sgesg_fase f join sgesg_programma p on p.id = f.program_id
        where p.company_id = ${companyId})::int fasi,
      (select count(*) from sgesg_scheda_dato d join sgesg_programma p on p.id = d.program_id
        where p.company_id = ${companyId})::int schede,
      (select count(*) from document_snapshot where company_id = ${companyId})::int doc`;
  return r;
};

await check("aprire le tre fasi col ponte non crea, non modifica e non cancella una riga", async () => {
  // ⚠️ La prova non e' «non ci sono errori»: e' che il database sia identico prima e dopo.
  const prima = await fotografia();
  for (const f of ["proc02", "proc04", "proc06"]) await apriFase(f);
  for (const f of ["proc02", "proc04", "proc06"]) await apriFase(f);
  const dopo = await fotografia();
  for (const k of Object.keys(prima)) {
    if (prima[k] !== dopo[k]) throw new Error(`${k}: ${prima[k]} → ${dopo[k]}`);
  }
});

await check("il ponte NON avanza la fase da solo", async () => {
  // ⚠️ Lo stato della fase e' una dichiarazione del consulente. Dedurla da un dato
  // tecnico — «l'inventario c'e', quindi la fase 04 e' avviata» — gli toglierebbe di
  // mano un giudizio che e' suo, e nel documento finale comparirebbe come suo.
  // ⚠️ La domanda e' sul PROGRAMMA di questa azienda, non sullo studio. Contare le fasi
  // dello studio includeva quelle dell'azienda DIMOSTRATIVA, che il seme crea gia'
  // compilate a meta': il controllo accusava il ponte di aver toccato quattro fasi che
  // erano li' da prima. E' lo stesso errore gia' fatto nel collaudo del percorso.
  const [{ n: fasiToccate }] = await sql`
    select count(*)::int n from sgesg_fase f
    join sgesg_programma p on p.id = f.program_id
    where p.company_id = ${companyId}`;
  if (fasiToccate !== 0) throw new Error(`${fasiToccate} fasi toccate senza che nessuno le abbia toccate`);
  await page.goto(`${BASE}/aziende/${companyId}/sgesg/${ANNO}`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  const av = await page.locator("[data-avanzamento]").getAttribute("data-avanzamento");
  if (av !== "0") throw new Error(`avanzamento ${av}% senza che nessuna fase sia stata chiusa`);
});

await check("la pagina lo dice a chiare lettere", async () => {
  await apriFase("proc04");
  const t = await page.locator("main").innerText();
  if (!/letto dal percorso, non copiato/i.test(t)) throw new Error("non spiega che il dato non e' copiato");
  if (!/da chiudere a mano/i.test(t)) throw new Error("non dice che la fase resta da chiudere");
});

console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(guasti.length ? "ERRORI DI CONSOLE:\n  " + [...new Set(guasti)].join("\n  ") : "Console pulita.");

await sql`delete from ghg_activity_row where organization_id = ${orgId}`;
await sql`delete from ghg_inventory where organization_id = ${orgId}`;
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
