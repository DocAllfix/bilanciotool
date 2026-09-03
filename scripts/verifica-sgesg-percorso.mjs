// Implementazione del sistema di gestione ESG: comando per comando.
//
// ⚠️ Ogni gesto viene misurato su TRE spie — console, richieste fallite, messaggio di
// rifiuto a schermo — e ogni esito si legge dal DATABASE, non dalla pagina: un divieto
// che «riesce in silenzio» e uno che «fallisce in silenzio» si somigliano troppo.
//
//   npm run qa -- sgesg-percorso [--prod]

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
const email = `sgesg-${RUN}@example.com`;
const NOME_AZIENDA = `Metodo ESG ${String(RUN).slice(-6)} S.r.l.`;
const ANNO = new Date().getFullYear() - 1;

console.log(`\nSistema di gestione ESG — ${BASE}\n`);
if (!/^https?:\/\/localhost/.test(BASE)) await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await attraversaProtezione(page);
const guasti = strumenta(page);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Metodo", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
await spegniTour(page);

// ─── azienda e apertura del percorso ─────────────────────────────────────────
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await spegniTour(page);
await page.click('[data-tour="nuova-azienda"]');
await page.fill("#na-nome", NOME_AZIENDA);
await page.fill("#na-settore", "Consulenza");
await page.click('button[type="submit"]:has-text("Crea azienda")');
await page.waitForURL(/\/aziende\/[^/]+(\?|#|$)/, { timeout: 30_000 });
const companyId = page.url().match(/aziende\/([^/?#]+)/)[1];
await spegniTour(page);

const programma = async () =>
  (await sql`select * from sgesg_programma where company_id = ${companyId}`)[0] ?? null;
const fasi = async () => {
  const p = await programma();
  return p ? sql`select * from sgesg_fase where program_id = ${p.id} order by fase_key` : [];
};

await check("il fascicolo elenca il percorso, dentro Ecosostenibilita'", async () => {
  await page.locator("[data-percorsi]").waitFor({ timeout: 30_000 });
  const voce = page.locator('[data-modulo="sgesg"]');
  if (!(await voce.count())) throw new Error("il percorso non compare nel fascicolo");
  const gruppo = await voce.locator("xpath=ancestor::section[1]").locator("h3").innerText();
  if (!/ecosostenibilit/i.test(gruppo)) throw new Error(`e' sotto «${gruppo}»`);
});

await check("si apre dal fascicolo", async () => {
  await page.locator('[data-percorsi] [data-modulo="sgesg"] a').first().click();
  await page.waitForURL("**/sgesg", { timeout: 30_000 });
});

await check("senza programma propone di crearne uno", async () => {
  await page.locator("#cp-anno").waitFor({ timeout: 20_000 });
  if (await programma()) throw new Error("esiste gia' un programma");
});

await check("lo standard si sceglie prima di creare, e il predefinito e' ESRS", async () => {
  const premuto = await page.locator('[data-standard="ESRS"]').getAttribute("aria-pressed");
  if (premuto !== "true") throw new Error(`ESRS non e' preselezionato (aria-pressed=${premuto})`);
  await page.click('[data-standard="GRI"]');
  if ((await page.locator('[data-standard="GRI"]').getAttribute("aria-pressed")) !== "true") {
    throw new Error("la scelta non si applica");
  }
});

await check("si crea il programma e si atterra sull'esercizio", async () => {
  await page.fill("#cp-anno", String(ANNO));
  await page.click('button[type="submit"]:has-text("Crea programma")');
  await page.waitForURL(`**/sgesg/${ANNO}`, { timeout: 30_000 });
  const p = await programma();
  if (!p) throw new Error("nessuna riga nel database");
  if (p.anno !== ANNO) throw new Error(`anno ${p.anno}`);
  if (p.standard !== "GRI") throw new Error(`standard ${p.standard}: la scelta non e' arrivata`);
  if (p.content_set_id !== "sgesg-v1") throw new Error("il catalogo non e' stato congelato");
});

await check("le otto fasi compaiono, tutte da avviare", async () => {
  await page.locator("[data-fasi]").waitFor({ timeout: 20_000 });
  const n = await page.locator("[data-fase]").count();
  if (n !== 8) throw new Error(`${n} fasi invece di otto`);
  // ⚠️ Nessuna riga nel database: una fase esiste solo quando viene toccata. La
  // differenza fra «non avviata» e «avviata e vuota» e' informazione.
  if ((await fasi()).length !== 0) throw new Error("ci sono gia' righe di fase");
  const avanzamento = await page.locator("[data-avanzamento]").getAttribute("data-avanzamento");
  if (avanzamento !== "0") throw new Error(`avanzamento ${avanzamento}%`);
});

await check("segnare una fase «in corso» la scrive, e NON la conta come conclusa", async () => {
  await page.locator('[data-fase="proc00"] [data-comando="in_corso"]').click();
  await attendi(async () => (await fasi()).length === 1, { cosa: "prima fase scritta" });
  const [f] = await fasi();
  if (f.stato !== "in_corso") throw new Error(`stato ${f.stato}`);
  if (f.conclusa_il !== null) throw new Error("ha una data di chiusura senza essere conclusa");
  await attendi(
    async () => (await page.locator("[data-avanzamento]").getAttribute("data-avanzamento")) === "0",
    { cosa: "avanzamento ancora a zero" },
  );
});

await check("concludere una fase scrive la data e porta l'avanzamento a 13%", async () => {
  await page.locator('[data-fase="proc00"] [data-comando="conclusa"]').click();
  await attendi(
    async () => {
      const f = (await fasi()).find((x) => x.fase_key === "proc00");
      return f?.stato === "conclusa" && f.conclusa_il !== null;
    },
    { cosa: "fase conclusa con data" },
  );
  await attendi(
    async () => (await page.locator("[data-avanzamento]").getAttribute("data-avanzamento")) === "13",
    { cosa: "avanzamento 1/8" },
  );
});

await check("riaprirla CANCELLA la data di chiusura", async () => {
  // ⚠️ Il «quando e' finita» non deve sopravvivere a una riapertura: il documento
  // finale riporterebbe una data di chiusura per un lavoro riaperto.
  await page.locator('[data-fase="proc00"] [data-comando="in_corso"]').click();
  await attendi(
    async () => {
      const f = (await fasi()).find((x) => x.fase_key === "proc00");
      return f?.stato === "in_corso" && f.conclusa_il === null;
    },
    { cosa: "data cancellata" },
  );
});

await check("tre fasi concluse su otto danno 38%, non 100%", async () => {
  // ⚠️ E' la regola condivisa: una fase dovuta e non valutata pesa ZERO. Mediando
  // sulle sole fasi toccate, «tre concluse su tre toccate» darebbe 100 — lo stesso
  // numero di «tutte e otto concluse».
  for (const k of ["proc00", "proc01", "proc02"]) {
    await page.locator(`[data-fase="${k}"] [data-comando="conclusa"]`).click();
    await attendi(async () => (await fasi()).find((x) => x.fase_key === k)?.stato === "conclusa", {
      cosa: `fase ${k} conclusa`,
    });
  }
  await attendi(
    async () => (await page.locator("[data-avanzamento]").getAttribute("data-avanzamento")) === "38",
    { cosa: "avanzamento 3/8" },
  );
});

await check("la «prossima» e' la prima non conclusa, non l'ultima toccata", async () => {
  const t = await page.locator("main").innerText();
  if (!/Prossima:/.test(t)) throw new Error("non dice quale sia la prossima");
  if (!/Diagnosi/.test(t)) throw new Error("la prossima non e' PROC-03");
});

await check("una nota si salva senza cambiare lo stato della fase", async () => {
  await page.locator('[data-fase="proc04"] summary').click();
  await page.fill("#fase-proc04-note", "Attesa dei consumi del quarto trimestre.");
  await page.locator("#fase-proc04-note").blur();
  await attendi(async () => (await fasi()).find((x) => x.fase_key === "proc04")?.note !== undefined, {
    cosa: "nota salvata",
  });
  const f = (await fasi()).find((x) => x.fase_key === "proc04");
  if (!/quarto trimestre/.test(f.note ?? "")) throw new Error("la nota non e' arrivata");
  if (f.stato !== "da_avviare") throw new Error(`la nota ha cambiato lo stato in ${f.stato}`);
});

await check("il responsabile si salva sfocando il campo", async () => {
  await page.fill("#pg-responsabile", "Silvia Marino");
  await page.locator("#pg-responsabile").blur();
  await attendi(async () => (await programma()).responsabile === "Silvia Marino", { cosa: "responsabile" });
});

await check("una data inesistente viene RIFIUTATA, non fatta scivolare", async () => {
  // ⚠️ `new Date("2026-02-31")` non solleva: scivola al 3 marzo.
  await page.fill("#pg-inizio", "2026-02-31");
  await page.locator("#pg-inizio").blur();
  await page.waitForTimeout(1500);
  const p = await programma();
  if (p.data_inizio !== null) throw new Error(`la data e' diventata ${p.data_inizio}`);
  const avviso = await page.locator("#pg-inizio").locator("xpath=..").locator('[role="alert"]').innerText().catch(() => "");
  if (!/AAAA-MM-GG/.test(avviso)) throw new Error("nessun messaggio spiega il rifiuto");
});

await check("una data valida si salva", async () => {
  await page.fill("#pg-inizio", "2026-02-28");
  await page.locator("#pg-inizio").blur();
  await attendi(async () => (await programma()).data_inizio === "2026-02-28", { cosa: "data valida" });
});

await check("cambiare standard e stato del lavoro si salva", async () => {
  await page.selectOption("#pg-standard", "ENTRAMBI");
  await attendi(async () => (await programma()).standard === "ENTRAMBI", { cosa: "standard" });
  await page.selectOption("#pg-stato", "in_corso");
  await attendi(async () => (await programma()).stato === "in_corso", { cosa: "stato" });
});

await check("riaprendo l'esercizio i valori sono quelli salvati", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await spegniTour(page);
  await page.locator("[data-fasi]").waitFor({ timeout: 20_000 });
  const av = await page.locator("[data-avanzamento]").getAttribute("data-avanzamento");
  if (av !== "38") throw new Error(`avanzamento ${av}% dopo la ricarica`);
  const stato = await page.locator('[data-fase="proc00"]').getAttribute("data-stato");
  if (stato !== "conclusa") throw new Error(`proc00 e' ${stato}`);
});

await check("l'ingresso del percorso porta all'esercizio esistente", async () => {
  await page.goto(`${BASE}/aziende/${companyId}/sgesg`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(`**/sgesg/${ANNO}`, { timeout: 30_000 });
});

await check("due programmi per lo stesso esercizio non si creano", async () => {
  const prima = (await sql`select count(*)::int as n from sgesg_programma where company_id = ${companyId}`)[0].n;
  await page.goto(`${BASE}/aziende/${companyId}/sgesg`, { waitUntil: "domcontentloaded" });
  // Il percorso rimanda subito all'esercizio: non c'e' modo di crearne un secondo
  // dall'interfaccia, ed e' proprio il fatto da verificare.
  const dopo = (await sql`select count(*)::int as n from sgesg_programma where company_id = ${companyId}`)[0].n;
  if (dopo !== prima) throw new Error(`i programmi sono passati da ${prima} a ${dopo}`);
});

await check("un altro studio non apre questo esercizio", async () => {
  const email2 = `sgesg-b-${RUN}@example.com`;
  const p2 = await browser.newPage();
  const { orgId: org2 } = await registraEEntra(p2, sql, {
    base: BASE, nome: "Studio Altro", email: email2, pwd: PWD_COLLAUDO,
  });
  const r = await p2.goto(`${BASE}/aziende/${companyId}/sgesg/${ANNO}`, { waitUntil: "domcontentloaded" });
  const testo = await p2.locator("body").innerText();
  if ((r?.status() ?? 0) === 200 && /Le fasi del metodo/i.test(testo)) {
    throw new Error("un altro studio vede il programma");
  }
  // ⚠️ La domanda giusta e' sull'AZIENDA, non sullo studio. Contare i programmi
  // dell'altro studio dava zero solo finche' la dimostrativa non ne aveva uno: da
  // quando la demo semina anche questo percorso, l'altro studio ne ha uno legittimo —
  // il proprio — e il controllo accusava il prodotto di un'intrusione inesistente.
  // Il fatto da provare e' che nessuna riga DI QUESTA AZIENDA sia intestata a lui.
  const intrusi = (
    await sql`select count(*)::int as n from sgesg_programma
              where company_id = ${companyId} and organization_id = ${org2}`
  )[0].n;
  if (intrusi !== 0) throw new Error("righe di questa azienda intestate all'altro studio");
  await p2.close();
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

const p = await programma();
if (p) await sql`delete from sgesg_fase where program_id = ${p.id}`;
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
