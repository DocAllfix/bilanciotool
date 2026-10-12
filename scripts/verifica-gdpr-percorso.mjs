// IL PERCORSO PROTEZIONE DEI DATI, comando per comando, con le tre spie a ogni gesto.
//
//   npm run qa -- gdpr-percorso
//   SALVA_PDF=<cartella> npm run qa -- gdpr-percorso      (consegna dei sei PDF)
//
// Ogni esito si legge dal DATABASE, mai dalla pagina: un campo che a schermo dice
// «salvato» e nel database non c'è è esattamente il difetto che un collaudo deve vedere.
//
// ⚠️ I controlli che valgono più di tutti:
//   - aprire la pagina NON scrive niente (un'azienda archiviata deve potersi consultare);
//   - un campo non ne cancella un altro, salvati di fila;
//   - le 72 ore di una violazione si contano in ORA ITALIANA, anche a cavallo del cambio
//     d'ora: conosciuta il 28 marzo alle 23:30, il termine scade il 1° aprile alle 00:30;
//   - «Non dovuto» per un responsabile è respinto, e la riga lo prova;
//   - i sei PDF sono documenti veri: si contano le pagine, non i byte.

import "dotenv/config";
import { chromium } from "@playwright/test";
import postgres from "postgres";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import {
  attendi,
  attraversaProtezione,
  contatore,
  pretendiPdfVero,
  pretendiServerAggiornato,
  spegniTour,
  strumenta,
} from "./comune-collaudo.mjs";
import { registraEEntra } from "./comune-registrazione.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const NOMI_CONSEGNA = {
  registro_trattamenti: "Registro delle attivita di trattamento (GDPR art. 30)",
  modello_privacy: "Modello organizzativo per la protezione dei dati (GDPR)",
  politica_privacy: "Politica per la protezione dei dati personali (GDPR)",
  dpia: "Valutazioni d'impatto sulla protezione dei dati (GDPR art. 35)",
  conformita_gdpr: "Rapporto di conformita al Regolamento (UE) 2016-679",
  relazione_privacy: "Relazione annuale sulla protezione dei dati (GDPR)",
};
const TIPI = Object.keys(NOMI_CONSEGNA);

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const email = `gdpr-${RUN}@example.com`;
const NOME_AZIENDA = `Officine Murgiane ${String(RUN).slice(-6)} S.r.l.`;
const oggi = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
const anno = Number(oggi.slice(0, 4));
const giorni = (n) => {
  const d = new Date(`${oggi}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

console.log(`\nGDPR — il percorso — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await attraversaProtezione(page);
const guasti = strumenta(page);
const { agisci, respinto, riepilogo } = contatore(page, guasti);

try {
  const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio GDPR", email, pwd: PWD_COLLAUDO });
  await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
  await spegniTour(page);

  // ─── azienda ───────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  await page.click('[data-tour="nuova-azienda"]');
  await page.fill("#na-nome", NOME_AZIENDA);
  await page.fill("#na-settore", "Meccanica");
  await page.click('button[type="submit"]:has-text("Crea azienda")');
  await page.waitForURL(/\/aziende\/[^/]+(\?|#|$)/, { timeout: 30_000 });
  const companyId = page.url().match(/aziende\/([^/?#]+)/)[1];

  const vista = async (v) => {
    await page.goto(`${BASE}/aziende/${companyId}/gdpr?vista=${v}&anno=${anno}`, { waitUntil: "domcontentloaded" });
    await page.locator('nav[aria-label="Viste del modulo"]').waitFor({ timeout: 30_000 });
    await spegniTour(page);
  };
  const sistema = async () => (await sql`select * from gdpr_system where company_id = ${companyId}`)[0] ?? null;
  /** Scrive in un campo che salva sfocandosi, e aspetta che la riga lo dica. */
  const scrivi = async (sel, valore) => {
    await page.fill(sel, valore);
    await page.locator(sel).blur();
  };

  // ─── apertura ──────────────────────────────────────────────────────────────
  await agisci("⚠️ aprire la pagina NON crea il percorso: mostra «Avvia» e non scrive", async () => {
    await page.goto(`${BASE}/aziende/${companyId}/gdpr`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Avvia il percorso/i }).waitFor({ timeout: 30_000 });
    if (await sistema()) throw new Error("gdpr_system creato all'apertura della pagina");
  });

  await agisci("«Avvia il percorso» crea UNA radice, col content set gdpr-v1", async () => {
    await page.getByRole("button", { name: /Avvia il percorso/i }).click();
    await attendi(async () => !!(await sistema()), { cosa: "la radice" });
    const righe = await sql`select content_set_id from gdpr_system where company_id = ${companyId}`;
    if (righe.length !== 1) throw new Error(`${righe.length} radici`);
    if (righe[0].content_set_id !== "gdpr-v1") throw new Error(`content set ${righe[0].content_set_id}`);
    await page.locator('nav[aria-label="Viste del modulo"]').waitFor({ timeout: 30_000 });
  });

  // ─── organizzazione ────────────────────────────────────────────────────────
  await vista("org");
  await agisci("⚠️ due campi salvati di fila: il secondo non cancella il primo", async () => {
    await scrivi("#gdpr-org-legale", "Amministratore unico");
    await scrivi("#gdpr-org-referente", "Responsabile amministrativo");
    await attendi(async () => {
      const s = await sistema();
      return s.legale === "Amministratore unico" && s.referente === "Responsabile amministrativo";
    }, { cosa: "legale e referente salvati insieme" });
  });

  await agisci("le tre domande dell'art. 37 a «No»: la designazione non è obbligatoria", async () => {
    for (const [colonna, nome] of [
      ["dpo_a", /autorità pubblica/],
      ["dpo_b", /monitoraggio regolare/],
      ["dpo_c", /categorie particolari/],
    ]) {
      await page.getByRole("combobox", { name: nome }).click();
      await page.getByRole("option", { name: "No", exact: true }).click();
      await attendi(async () => (await sistema())[colonna] === "No", { cosa: colonna });
    }
    await attendi(async () => {
      const s = await sistema();
      return s.dpo_a === "No" && s.dpo_b === "No" && s.dpo_c === "No";
    }, { cosa: "le tre risposte" });
    await page.locator("[data-esito-dpo]", { hasText: /non è obbligatoria/ }).waitFor({ timeout: 20_000 });
  });

  await respinto(
    "una soglia «alto» non superiore a «medio» è respinta",
    async () => {
      await scrivi("#gdpr-org-paramAlto", "8");
    },
    { prova: async () => (await sistema()).param_alto === 15 },
  );

  // ─── trattamenti ───────────────────────────────────────────────────────────
  await vista("trat");
  await agisci("un trattamento tipico dal catalogo: «Videosorveglianza», precompilato e aperto", async () => {
    await page.getByRole("button", { name: "Aggiungi «Videosorveglianza»" }).click();
    await attendi(async () => (await sql`select 1 from gdpr_trattamento t join gdpr_system s on s.id = t.system_id
                                          where s.company_id = ${companyId} and t.tipo_key = 'videosorveglianza'`).length === 1,
      { cosa: "la riga del catalogo" });
    const [t] = await sql`select t.id, t.criteri, t.base from gdpr_trattamento t join gdpr_system s on s.id = t.system_id
                          where s.company_id = ${companyId} and t.tipo_key = 'videosorveglianza'`;
    if (!t.base || t.criteri.length < 2) throw new Error("il trattamento non è precompilato dal catalogo");
    await page.locator(`[data-trattamento="${t.id}"][open]`).waitFor({ timeout: 20_000 });
    if (await page.getByRole("button", { name: "Aggiungi «Videosorveglianza»" }).count()) {
      throw new Error("il pulsante del catalogo resta: si potrebbe aggiungere due volte");
    }
  });

  let trattamentoNuovo = null;
  await agisci("«Nuovo trattamento» crea una riga e la apre, e il nome si salva", async () => {
    const prima = (await sql`select t.id from gdpr_trattamento t join gdpr_system s on s.id = t.system_id where s.company_id = ${companyId}`).map((r) => r.id);
    await page.getByRole("button", { name: /Nuovo trattamento/ }).click();
    await attendi(async () => (await sql`select 1 from gdpr_trattamento t join gdpr_system s on s.id = t.system_id where s.company_id = ${companyId}`).length === prima.length + 1, { cosa: "la riga nuova" });
    const [n] = await sql`select t.id from gdpr_trattamento t join gdpr_system s on s.id = t.system_id
                          where s.company_id = ${companyId} and not (t.id = any(${prima}))`;
    trattamentoNuovo = n.id;
    await page.locator(`[data-trattamento="${n.id}"][open]`).waitFor({ timeout: 20_000 });
    await scrivi(`#gdpr-tr-${n.id}-nome`, "Gestione dei visitatori");
    await scrivi(`#gdpr-tr-${n.id}-finalita`, "Registro degli accessi allo stabilimento");
    await attendi(async () => {
      const [r] = await sql`select nome, finalita from gdpr_trattamento where id = ${n.id}`;
      return r.nome === "Gestione dei visitatori" && r.finalita === "Registro degli accessi allo stabilimento";
    }, { cosa: "nome e finalità" });
  });

  await agisci("una casella (dati particolari) si accende e compare la condizione dell'art. 9", async () => {
    await page.locator(`#gdpr-tr-${trattamentoNuovo}-particolari`).check();
    await attendi(async () => (await sql`select particolari from gdpr_trattamento where id = ${trattamentoNuovo}`)[0].particolari === true, { cosa: "particolari" });
    await page.locator(`#gdpr-tr-${trattamentoNuovo}-condizione9`).waitFor({ timeout: 20_000 });
  });

  // ─── conformità ────────────────────────────────────────────────────────────
  await vista("gap");
  const statoReq = async (k) =>
    (await sql`select r.stato, r.azione from gdpr_requisito_stato r join gdpr_system s on s.id = r.system_id
               where s.company_id = ${companyId} and r.requisito_key = ${k}`)[0] ?? null;

  await agisci("P-01 conforme, e ripremere annulla la scelta", async () => {
    await page.locator('[data-gruppo="P"] > summary').click();
    await page.getByRole("button", { name: "P-01: Conforme" }).click();
    await attendi(async () => (await statoReq("P-01"))?.stato === "c", { cosa: "P-01 conforme" });
    await page.getByRole("button", { name: "P-01: Conforme" }).click();
    await attendi(async () => (await statoReq("P-01"))?.stato === null, { cosa: "P-01 annullato" });
  });

  await agisci("P-02 parziale: compare l'azione, e si salva sulla stessa riga", async () => {
    await page.getByRole("button", { name: "P-02: Parziale" }).click();
    await attendi(async () => (await statoReq("P-02"))?.stato === "p", { cosa: "P-02 parziale" });
    const campo = page.locator("#gdpr-req-P-02-azione");
    await campo.waitFor({ timeout: 20_000 });
    await scrivi("#gdpr-req-P-02-azione", "Rivedere le basi giuridiche");
    await attendi(async () => {
      const r = await statoReq("P-02");
      return r?.stato === "p" && r?.azione === "Rivedere le basi giuridiche";
    }, { cosa: "azione accanto allo stato" });
  });

  await agisci("valutazioni in fretta, accodate: tutte e cinque arrivano", async () => {
    for (const k of ["P-03", "P-04", "P-05", "P-06", "P-07"]) await page.getByRole("button", { name: `${k}: Conforme` }).click();
    await attendi(async () => {
      const r = await sql`select count(*)::int n from gdpr_requisito_stato r join gdpr_system s on s.id = r.system_id
                          where s.company_id = ${companyId} and r.stato = 'c'`;
      return r[0].n === 5;
    }, { cosa: "cinque conformi" });
  });

  // ─── rischi e responsabili ─────────────────────────────────────────────────
  await vista("ris");
  const [vs] = await sql`select t.id from gdpr_trattamento t join gdpr_system s on s.id = t.system_id
                         where s.company_id = ${companyId} and t.tipo_key = 'videosorveglianza'`;
  await agisci("probabilità 3 × gravità 5 = 15: rischio alto", async () => {
    await page.locator(`[data-rischio="${vs.id}"] > summary`).click();
    await page.selectOption(`#gdpr-ris-${vs.id}-probabilita`, "3");
    await page.selectOption(`#gdpr-ris-${vs.id}-gravita`, "5");
    await attendi(async () => {
      const [r] = await sql`select probabilita, gravita from gdpr_trattamento where id = ${vs.id}`;
      return r.probabilita === 3 && r.gravita === 5;
    }, { cosa: "P e G" });
    await page.locator(`[data-rischio="${vs.id}"] [data-classe="alto"]`).waitFor({ timeout: 20_000 });
  });

  await agisci("la videosorveglianza chiede la valutazione d'impatto: il riquadro c'è", async () => {
    await page.locator(`[data-dpia="${vs.id}"]`).waitFor({ timeout: 20_000 });
  });

  let fornitore = null;
  await agisci("nuovo soggetto esterno, aperto, col nome salvato", async () => {
    await page.getByRole("button", { name: /Nuovo soggetto esterno/ }).click();
    await attendi(async () => (await sql`select 1 from gdpr_fornitore f join gdpr_system s on s.id = f.system_id where s.company_id = ${companyId}`).length === 1, { cosa: "il fornitore" });
    const [f] = await sql`select f.id from gdpr_fornitore f join gdpr_system s on s.id = f.system_id where s.company_id = ${companyId}`;
    fornitore = f.id;
    await page.locator(`[data-fornitore="${f.id}"][open]`).waitFor({ timeout: 20_000 });
    await scrivi(`#gdpr-forn-${f.id}-nome`, "Studio paghe");
    await attendi(async () => (await sql`select nome from gdpr_fornitore where id = ${f.id}`)[0].nome === "Studio paghe", { cosa: "nome" });
  });

  await respinto(
    "⚠️ «Non dovuto» per un responsabile è respinto, e la riga resta vuota",
    async () => {
      await page.locator(`#gdpr-forn-${fornitore}-contratto`).click();
      await page.getByRole("option", { name: "Non dovuto" }).click();
    },
    { prova: async () => (await sql`select contratto from gdpr_fornitore where id = ${fornitore}`)[0].contratto === null },
  );

  // ─── politica e piano ──────────────────────────────────────────────────────
  await vista("pol");
  await agisci("«Inserisci il modello» scrive la politica col nome dell'azienda, e il campo la mostra", async () => {
    await page.getByRole("button", { name: /Inserisci il modello/ }).click();
    await attendi(async () => ((await sistema()).politica_testo ?? "").includes(NOME_AZIENDA), { cosa: "il modello col nome" });
    await attendi(async () => (await page.locator("#gdpr-pol-testo").inputValue()).includes(NOME_AZIENDA), { cosa: "il testo a schermo", entro: 20_000 });
  });

  await agisci("«Carica il piano tipo» due volte non duplica niente", async () => {
    const b = page.getByRole("button", { name: /Carica il piano tipo/ });
    await b.click();
    await attendi(async () => (await sql`select count(*)::int n from gdpr_attivita a join gdpr_system s on s.id = a.system_id where s.company_id = ${companyId}`)[0].n > 0, { cosa: "il piano" });
    const [{ n: primo }] = await sql`select count(*)::int n from gdpr_attivita a join gdpr_system s on s.id = a.system_id where s.company_id = ${companyId}`;
    await b.click();
    await page.waitForTimeout(3000);
    const [{ n: secondo }] = await sql`select count(*)::int n from gdpr_attivita a join gdpr_system s on s.id = a.system_id where s.company_id = ${companyId}`;
    if (secondo !== primo) throw new Error(`${primo} attività, poi ${secondo}`);
  });

  // ─── indicatori ────────────────────────────────────────────────────────────
  await vista("dati");
  const misura = async (k) =>
    (await sql`select m.valore from gdpr_misura m join gdpr_system s on s.id = m.system_id
               where s.company_id = ${companyId} and m.anno = ${anno} and m.indicatore_key = ${k}`)[0]?.valore ?? null;

  await agisci("un indicatore scritto all'italiana («1.234») si salva come 1234", async () => {
    await scrivi(`#gdpr-kpi-${anno}-aut`, "1.234");
    await attendi(async () => Number(await misura("aut")) === 1234, { cosa: "aut = 1234" });
  });

  await respinto(
    "⚠️ un «di cui» oltre il totale è respinto",
    async () => {
      await scrivi(`#gdpr-kpi-${anno}-aut_form`, "2000");
    },
    { prova: async () => (await misura("aut_form")) === null },
  );

  // ─── registri ──────────────────────────────────────────────────────────────
  await vista("reg");
  await agisci("una richiesta ricevuta 40 giorni fa e senza riscontro è «scaduta»", async () => {
    await page.getByRole("button", { name: /Nuova registrazione/ }).click();
    await attendi(async () => (await sql`select 1 from gdpr_richiesta r join gdpr_system s on s.id = r.system_id where s.company_id = ${companyId}`).length === 1, { cosa: "la richiesta" });
    const [r] = await sql`select r.id from gdpr_richiesta r join gdpr_system s on s.id = r.system_id where s.company_id = ${companyId}`;
    await page.locator(`[data-riga="${r.id}"][open]`).waitFor({ timeout: 20_000 });
    await page.fill(`#gdpr-dir-${r.id}-ricevutaIl`, giorni(-40));
    await attendi(async () => (await sql`select ricevuta_il::text d from gdpr_richiesta where id = ${r.id}`)[0].d === giorni(-40), { cosa: "la data" });
    await page.locator(`[data-riga="${r.id}"] [data-termine="scaduta"]`).waitFor({ timeout: 20_000 });
    // ⚠️ «aperte» e «scadute» sono insiemi DISGIUNTI: la prima versione scriveva «0 in
    // attesa di riscontro, di cui 1 oltre il termine», cioè una frase che si contraddice —
    // e la stessa frase stava nel documento consegnato. Trovato guardando la foto.
    const riepilogo = await page.locator("[data-riepilogo-richieste]").innerText();
    if (!/0 ancora nei termini/.test(riepilogo) || !/1\s+oltre il termine/.test(riepilogo)) {
      throw new Error(`riepilogo incoerente: «${riepilogo}»`);
    }
  });

  await agisci("⚠️ violazione conosciuta il 28 marzo alle 23:30: le 72 ore scadono il 1° aprile alle 00:30 (ora legale)", async () => {
    await page.getByRole("tab", { name: /Violazioni dei dati/ }).click();
    await page.getByRole("button", { name: /Nuova registrazione/ }).click();
    await attendi(async () => (await sql`select 1 from gdpr_violazione v join gdpr_system s on s.id = v.system_id where s.company_id = ${companyId}`).length === 1, { cosa: "la violazione" });
    const [v] = await sql`select v.id from gdpr_violazione v join gdpr_system s on s.id = v.system_id where s.company_id = ${companyId}`;
    await page.locator(`[data-riga="${v.id}"][open]`).waitFor({ timeout: 20_000 });
    await scrivi(`#gdpr-breach-${v.id}-conoscenzaIl`, "2026-03-28T23:30");
    // L'istante salvato è quello giusto: 23:30 italiane prima del cambio d'ora sono le 22:30 UTC.
    await attendi(async () => {
      const [r] = await sql`select conoscenza_il from gdpr_violazione where id = ${v.id}`;
      return r.conoscenza_il && new Date(r.conoscenza_il).toISOString() === "2026-03-28T22:30:00.000Z";
    }, { cosa: "istante in UTC" });
    await page.locator(`#gdpr-breach-${v.id}-rischio`).click();
    await page.getByRole("option", { name: "Rischio", exact: true }).click();
    await page.locator(`[data-riga="${v.id}"] summary`, { hasText: "notifica entro 2026-04-01 00:30" }).waitFor({ timeout: 20_000 });
  });

  // ─── ricarico ──────────────────────────────────────────────────────────────
  await agisci("ricaricando la pagina i valori sono quelli salvati, senza salti", async () => {
    await vista("org");
    const v = await page.locator("#gdpr-org-legale").inputValue();
    if (v !== "Amministratore unico") throw new Error(`legale a schermo: «${v}»`);
  });

  await agisci("il quadro segnala la richiesta scaduta e porta ai registri", async () => {
    await vista("quadro");
    await page.locator("[data-segnali]").waitFor({ timeout: 20_000 });
    const t = await page.locator("[data-segnali]").innerText();
    if (!/scadut/i.test(t)) throw new Error("nessun segnale sulla richiesta scaduta");
  });

  // ─── documenti ─────────────────────────────────────────────────────────────
  await vista("documenti");
  await agisci("si pubblicano tutti e sei, nella serie senza esercizio", async () => {
    for (const tipo of TIPI) {
      const prima = (await sql`select count(*)::int n from document_snapshot where company_id = ${companyId} and tipo = ${tipo}`)[0].n;
      await page.locator(`[data-doc-gdpr="${tipo}"] button`, { hasText: "Pubblica" }).click();
      await attendi(async () => (await sql`select count(*)::int n from document_snapshot where company_id = ${companyId} and tipo = ${tipo}`)[0].n === prima + 1, { cosa: tipo });
    }
    const righe = await sql`select tipo, anno from document_snapshot where company_id = ${companyId}`;
    const sbagliati = righe.filter((r) => r.anno !== 0).map((r) => r.tipo);
    if (sbagliati.length) throw new Error(`anno diverso da 0 su: ${sbagliati.join(", ")}`);
    const relazione = await sql`select dati->>'esercizio' e from document_snapshot where company_id = ${companyId} and tipo = 'relazione_privacy'`;
    if (Number(relazione[0].e) !== anno) throw new Error(`la relazione riferisce il ${relazione[0].e}`);
  });

  await agisci("ogni documento porta il codice di verifica", async () => {
    const r = await sql`select s.tipo from document_snapshot s left join document_codice c on c.snapshot_id = s.id
                        where s.company_id = ${companyId} and c.codice is null`;
    if (r.length) throw new Error(`senza codice: ${r.map((x) => x.tipo).join(", ")}`);
  });

  await agisci("⚠️ i SEI PDF sono documenti veri: si contano le pagine", async () => {
    const righe = await sql`select id, tipo from document_snapshot where company_id = ${companyId} order by tipo`;
    const misure = [];
    for (const r of righe) {
      const risposta = await page.request.get(`${BASE}/api/documenti/${r.id}/pdf`);
      if (!risposta.ok()) throw new Error(`${r.tipo}: HTTP ${risposta.status()}`);
      const buf = await risposta.body();
      const { byte, pagine } = pretendiPdfVero(buf);
      misure.push({ tipo: r.tipo, byte, pagine });
      if (process.env.SALVA_PDF) {
        mkdirSync(process.env.SALVA_PDF, { recursive: true });
        const dove = join(process.env.SALVA_PDF, `${NOMI_CONSEGNA[r.tipo] ?? r.tipo}.pdf`);
        writeFileSync(dove, buf);
        console.log(`       salvato: ${dove}`);
      }
    }
    const pesi = new Set(misure.map((m) => m.byte));
    if (pesi.size !== misure.length) throw new Error(`due documenti diversi pesano uguale: ${misure.map((m) => `${m.tipo} ${m.byte}`).join(" | ")}`);
    for (const m of misure) console.log(`       ${m.tipo}: ${Math.round(m.byte / 1024)} KB · ${m.pagine} pagine`);
  });

  // ─── il banco si smonta, e si verifica che lo sia ──────────────────────────
  await sql`delete from document_codice where snapshot_id in (select id from document_snapshot where organization_id = ${orgId})`;
  await sql`delete from document_snapshot where organization_id = ${orgId}`;
  await sql`delete from gdpr_system where organization_id = ${orgId}`;
  await sql`delete from company where organization_id = ${orgId}`;
  await sql`delete from audit_log where organization_id = ${orgId}`;
  await sql`delete from org_entitlement where organization_id = ${orgId}`;
  await sql`delete from member where organization_id = ${orgId}`;
  await sql`delete from organization where id = ${orgId}`;
  await sql`delete from "user" where email = ${email}`;
  const [{ n: residuo }] = await sql`select (select count(*) from organization where id = ${orgId})
                                          + (select count(*) from gdpr_trattamento where organization_id = ${orgId}) as n`;
  if (Number(residuo) !== 0) console.log(`\n  ⚠️  BANCO NON SMONTATO: ${residuo} righe residue per ${orgId}`);
} finally {
  // ⚠️ Le risorse si chiudono SEMPRE: un pool aperto tiene vivo il processo, e un
  // collaudo che non esce non fallisce — appende.
  var esito = riepilogo("GDPR — il percorso");
  await browser.close();
  await sql.end();
}
// `riepilogo` restituisce quanti ROSSI ci sono: con dei falliti si esce con 1.
process.exit(esito ? 1 : 0);
