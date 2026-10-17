// IL SISTEMA DI GESTIONE SOCIALE (PAS 24000), comando per comando, con le tre spie a ogni gesto.
//
//   npm run qa -- pas-percorso
//   SALVA_PDF=<cartella> npm run qa -- pas-percorso      (consegna dei quattro PDF)
//
// Ogni esito si legge dal DATABASE, mai dalla pagina: un campo che a schermo dice «salvato» e
// nel database non c'è è esattamente il difetto che un collaudo deve vedere.
//
// ⚠️ I controlli che valgono più di tutti:
//   - aprire la pagina NON scrive niente (un'azienda archiviata deve potersi consultare);
//   - un campo non ne cancella un altro, salvati di fila;
//   - «1.580» euro si salva come 1580, non come 1,58: il difetto del prototipo;
//   - senza la retribuzione delle donne il divario di genere è «—», non 100%;
//   - i quattro PDF sono documenti veri: si contano le pagine, non i byte.

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
  manuale_pas: "Manuale del sistema di gestione sociale (PAS 24000)",
  politica_pas: "Politica sociale (PAS 24000)",
  conformita_pas: "Rapporto di conformita e piano di adeguamento (PAS 24000)",
  riesame_pas: "Verbale di riesame della direzione (PAS 24000)",
};
const TIPI = Object.keys(NOMI_CONSEGNA);

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const email = `pas-${RUN}@example.com`;
const NOME_AZIENDA = `Officine Sociali ${String(RUN).slice(-6)} S.r.l.`;
const oggi = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
const anno = Number(oggi.slice(0, 4));
const giorni = (n) => {
  const d = new Date(`${oggi}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

console.log(`\nPAS 24000 — il percorso — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await attraversaProtezione(page);
const guasti = strumenta(page);
const { agisci, respinto, riepilogo } = contatore(page, guasti);

try {
  const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio PAS", email, pwd: PWD_COLLAUDO });
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
    await page.goto(`${BASE}/aziende/${companyId}/pas24000?vista=${v}&anno=${anno}`, { waitUntil: "domcontentloaded" });
    await page.locator('nav[aria-label="Viste del modulo"]').waitFor({ timeout: 30_000 });
    await spegniTour(page);
  };
  const sistema = async () => (await sql`select * from pas_system where company_id = ${companyId}`)[0] ?? null;
  const conta = async (tabella) =>
    (await sql`select count(*)::int n from ${sql(tabella)} t join pas_system s on s.id = t.system_id where s.company_id = ${companyId}`)[0].n;
  /** Scrive in un campo che salva sfocandosi. */
  const scrivi = async (sel, valore) => {
    await page.fill(sel, valore);
    await page.locator(sel).blur();
  };

  // ─── apertura ──────────────────────────────────────────────────────────────
  await agisci("⚠️ aprire la pagina NON crea il percorso: mostra «Avvia» e non scrive", async () => {
    await page.goto(`${BASE}/aziende/${companyId}/pas24000`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Avvia il percorso/i }).waitFor({ timeout: 30_000 });
    if (await sistema()) throw new Error("pas_system creato all'apertura della pagina");
  });

  await agisci("«Avvia il percorso» crea UNA radice col content set pas-v1, otto parti e venti rischi", async () => {
    await page.getByRole("button", { name: /Avvia il percorso/i }).click();
    await attendi(async () => !!(await sistema()), { cosa: "la radice" });
    const righe = await sql`select content_set_id from pas_system where company_id = ${companyId}`;
    if (righe.length !== 1) throw new Error(`${righe.length} radici`);
    if (righe[0].content_set_id !== "pas-v1") throw new Error(`content set ${righe[0].content_set_id}`);
    const [parti, rischi] = [await conta("pas_parte"), await conta("pas_rischio")];
    if (parti !== 8 || rischi !== 20) throw new Error(`${parti} parti e ${rischi} rischi`);
    await page.locator('nav[aria-label="Viste del modulo"]').waitFor({ timeout: 30_000 });
  });

  // ─── organizzazione ────────────────────────────────────────────────────────
  await vista("org");
  await agisci("⚠️ due campi salvati di fila: il secondo non cancella il primo", async () => {
    await scrivi("#pas-org-ccnl", "Metalmeccanica industria");
    await scrivi("#pas-org-responsabile", "Responsabile HR");
    await attendi(async () => {
      const s = await sistema();
      return s.ccnl === "Metalmeccanica industria" && s.responsabile === "Responsabile HR";
    }, { cosa: "contratto e responsabile salvati insieme" });
  });

  await respinto(
    "un limite complessivo sotto l'orario ordinario è respinto",
    async () => {
      await scrivi("#pas-org-paramOreTotali", "40");
    },
    { prova: async () => (await sistema()).param_ore_totali === 60 },
  );

  await respinto(
    "una soglia «alto» non superiore a «medio» è respinta",
    async () => {
      await scrivi("#pas-org-paramAlto", "8");
    },
    { prova: async () => (await sistema()).param_alto === 15 },
  );

  // ─── contesto ──────────────────────────────────────────────────────────────
  await vista("ctx");
  await agisci("«Nuovo fattore» crea una riga, e la descrizione si salva", async () => {
    await page.getByRole("button", { name: /Nuovo fattore/ }).click();
    await attendi(async () => (await conta("pas_fattore")) === 1, { cosa: "il fattore" });
    const [f] = await sql`select f.id from pas_fattore f join pas_system s on s.id = f.system_id where s.company_id = ${companyId}`;
    await scrivi(`#pas-fat-${f.id}-descrizione`, "Picchi stagionali coperti con straordinari");
    await attendi(async () => (await sql`select descrizione from pas_fattore where id = ${f.id}`)[0].descrizione === "Picchi stagionali coperti con straordinari", { cosa: "la descrizione" });
  });

  await agisci("una casella di una parte interessata («gestita») si spegne e la riga lo dice", async () => {
    const [p] = await sql`select p.id from pas_parte p join pas_system s on s.id = p.system_id where s.company_id = ${companyId} order by p.ordine limit 1`;
    await page.locator(`[data-parte="${p.id}"] > summary`).click();
    await page.locator(`#pas-parte-${p.id}-gestita`).uncheck();
    await attendi(async () => (await sql`select gestita from pas_parte where id = ${p.id}`)[0].gestita === false, { cosa: "gestita = false" });
  });

  // ─── conformità ────────────────────────────────────────────────────────────
  await vista("gap");
  const statoReq = async (k) =>
    (await sql`select r.stato, r.azione, r.evidenza from pas_requisito_stato r join pas_system s on s.id = r.system_id
               where s.company_id = ${companyId} and r.requisito_key = ${k}`)[0] ?? null;

  await agisci("4.1 conforme, e ripremere annulla la scelta", async () => {
    await page.locator('[data-gruppo="C4"] > summary').click();
    await page.getByRole("button", { name: "4.1: Conforme" }).click();
    await attendi(async () => (await statoReq("4.1"))?.stato === "c", { cosa: "4.1 conforme" });
    await page.getByRole("button", { name: "4.1: Conforme" }).click();
    await attendi(async () => (await statoReq("4.1"))?.stato === null, { cosa: "4.1 annullato" });
  });

  await agisci("4.2 parziale: compare l'azione, e si salva sulla stessa riga", async () => {
    await page.getByRole("button", { name: "4.2: Parziale" }).click();
    await attendi(async () => (await statoReq("4.2"))?.stato === "p", { cosa: "4.2 parziale" });
    await page.locator("#pas-req-4\\.2-azione").waitFor({ timeout: 20_000 });
    await scrivi("#pas-req-4\\.2-azione", "Aggiornare l'elenco delle parti interessate");
    await attendi(async () => {
      const r = await statoReq("4.2");
      return r?.stato === "p" && r?.azione === "Aggiornare l'elenco delle parti interessate";
    }, { cosa: "azione accanto allo stato" });
  });

  await agisci("valutazioni in fretta, accodate: tutte e quattro arrivano", async () => {
    await page.locator('[data-gruppo="C5"] > summary').click();
    for (const k of ["5.1", "5.2", "5.3", "5.4"]) await page.getByRole("button", { name: `${k}: Conforme` }).click();
    await attendi(async () => {
      const r = await sql`select count(*)::int n from pas_requisito_stato r join pas_system s on s.id = r.system_id
                          where s.company_id = ${companyId} and r.stato = 'c'`;
      return r[0].n === 4;
    }, { cosa: "quattro conformi" });
  });

  await agisci("un requisito dell'Allegato A «non pertinente» chiede la motivazione, e la salva", async () => {
    await page.locator('[data-gruppo="A3"] > summary').click();
    await page.getByRole("button", { name: "A.3-4: Non pertinente" }).click();
    await attendi(async () => (await statoReq("A.3-4"))?.stato === "na", { cosa: "A.3-4 non pertinente" });
    await scrivi("#pas-req-A\\.3-4-evidenza", "Nessun lavoratore sotto i 18 anni");
    await attendi(async () => (await statoReq("A.3-4"))?.evidenza === "Nessun lavoratore sotto i 18 anni", { cosa: "la motivazione" });
  });

  // ─── rischi e fornitori ────────────────────────────────────────────────────
  await vista("ris");
  const [primo] = await sql`select r.id from pas_rischio r join pas_system s on s.id = r.system_id where s.company_id = ${companyId} order by r.ordine limit 1`;
  await agisci("probabilità 4 × gravità 5 = 20: rischio alto, e il segnale dei rischi alti senza misure", async () => {
    await page.locator(`[data-rischio="${primo.id}"] > summary`).click();
    await page.selectOption(`#pas-ris-${primo.id}-probabilita`, "4");
    await page.selectOption(`#pas-ris-${primo.id}-gravita`, "5");
    await attendi(async () => {
      const [r] = await sql`select probabilita, gravita from pas_rischio where id = ${primo.id}`;
      return r.probabilita === 4 && r.gravita === 5;
    }, { cosa: "P e G" });
    await page.locator(`[data-rischio="${primo.id}"] [data-classe="alto"]`).waitFor({ timeout: 20_000 });
    await page.locator("[data-alti-scoperti]").waitFor({ timeout: 20_000 });
  });

  await agisci("nuovo fornitore, aperto, col nome e la clausola salvati", async () => {
    await page.getByRole("button", { name: /Nuovo fornitore/ }).click();
    await attendi(async () => (await conta("pas_fornitore")) === 1, { cosa: "il fornitore" });
    const [f] = await sql`select f.id from pas_fornitore f join pas_system s on s.id = f.system_id where s.company_id = ${companyId}`;
    await page.locator(`[data-fornitore="${f.id}"][open]`).waitFor({ timeout: 20_000 });
    await scrivi(`#pas-forn-${f.id}-nome`, "Agenzia per il lavoro");
    await page.locator(`#pas-forn-${f.id}-clausola`).check();
    await attendi(async () => {
      const [r] = await sql`select nome, clausola from pas_fornitore where id = ${f.id}`;
      return r.nome === "Agenzia per il lavoro" && r.clausola === true;
    }, { cosa: "nome e clausola" });
  });

  // ─── politica e piano ──────────────────────────────────────────────────────
  await vista("pol");
  await agisci("«Inserisci il modello» scrive la politica col nome dell'azienda, e il campo la mostra", async () => {
    await page.getByRole("button", { name: /Inserisci il modello/ }).click();
    await attendi(async () => ((await sistema()).politica_testo ?? "").includes(NOME_AZIENDA), { cosa: "il modello col nome" });
    await attendi(async () => (await page.locator("#pas-pol-testo").inputValue()).includes(NOME_AZIENDA), { cosa: "il testo a schermo", entro: 20_000 });
  });

  await agisci("«Carica il piano tipo» due volte non duplica niente", async () => {
    const b = page.getByRole("button", { name: /Carica il piano tipo/ });
    await b.click();
    await attendi(async () => (await conta("pas_attivita")) > 0, { cosa: "il piano" });
    const primo = await conta("pas_attivita");
    await b.click();
    await page.waitForTimeout(3000);
    const secondo = await conta("pas_attivita");
    if (secondo !== primo) throw new Error(`${primo} attività, poi ${secondo}`);
  });

  // ─── indicatori ────────────────────────────────────────────────────────────
  await vista("dati");
  const misura = async (k) =>
    (await sql`select m.valore from pas_misura m join pas_system s on s.id = m.system_id
               where s.company_id = ${companyId} and m.anno = ${anno} and m.indicatore_key = ${k}`)[0]?.valore ?? null;

  await agisci("⚠️ «1.580» euro si salva come 1580, non come 1,58", async () => {
    await scrivi(`#pas-kpi-${anno}-re_min`, "1.580");
    await attendi(async () => Number(await misura("re_min")) === 1580, { cosa: "re_min = 1580" });
  });

  await agisci("⚠️ con la sola retribuzione degli uomini il divario di genere è «—», non 100%", async () => {
    await scrivi(`#pas-kpi-${anno}-re_uom`, "33.100");
    await attendi(async () => Number(await misura("re_uom")) === 33100, { cosa: "re_uom" });
    await attendi(async () => (await page.locator('[data-derivato="payGap"]').innerText()).trim() === "—", { cosa: "payGap «—»", entro: 20_000 });
    await scrivi(`#pas-kpi-${anno}-re_don`, "30.500");
    await attendi(async () => /7,9/.test(await page.locator('[data-derivato="payGap"]').innerText()), { cosa: "payGap 7,9%", entro: 20_000 });
  });

  await scrivi(`#pas-kpi-${anno}-lav_tot`, "48");
  await attendi(async () => Number(await misura("lav_tot")) === 48, { cosa: "lav_tot" });
  await respinto(
    "⚠️ un «di cui» oltre il totale è respinto",
    async () => {
      await scrivi(`#pas-kpi-${anno}-lav_don`, "60");
    },
    { prova: async () => (await misura("lav_don")) === null },
  );

  // ─── registri ──────────────────────────────────────────────────────────────
  await vista("reg");
  await agisci("un reclamo aperto da 40 giorni è «da sollecitare»", async () => {
    await page.getByRole("button", { name: /Nuova registrazione/ }).click();
    await attendi(async () => (await conta("pas_reclamo")) === 1, { cosa: "il reclamo" });
    const [r] = await sql`select r.id from pas_reclamo r join pas_system s on s.id = r.system_id where s.company_id = ${companyId}`;
    await page.locator(`[data-riga="${r.id}"][open]`).waitFor({ timeout: 20_000 });
    await page.fill(`#pas-recl-${r.id}-data`, giorni(-40));
    await attendi(async () => (await sql`select data::text d from pas_reclamo where id = ${r.id}`)[0].d === giorni(-40), { cosa: "la data" });
    await page.locator(`[data-riga="${r.id}"] [data-termine="da sollecitare"]`).waitFor({ timeout: 20_000 });
    const riepilogo = await page.locator("[data-riepilogo-reclami]").innerText();
    if (!/più di 30 giorni:\s*1/.test(riepilogo)) throw new Error(`riepilogo: «${riepilogo}»`);
  });

  await agisci("una non conformità con l'azione scaduta è segnata «azione scaduta»", async () => {
    await page.getByRole("tab", { name: /Non conformità/ }).click();
    await page.getByRole("button", { name: /Nuova registrazione/ }).click();
    await attendi(async () => (await conta("pas_non_conformita")) === 1, { cosa: "la non conformità" });
    const [n] = await sql`select n.id from pas_non_conformita n join pas_system s on s.id = n.system_id where s.company_id = ${companyId}`;
    await page.locator(`[data-riga="${n.id}"][open]`).waitFor({ timeout: 20_000 });
    await page.fill(`#pas-nc-${n.id}-scadenza`, giorni(-5));
    await attendi(async () => (await sql`select scadenza::text d from pas_non_conformita where id = ${n.id}`)[0].d === giorni(-5), { cosa: "la scadenza" });
    await page.locator(`[data-riga="${n.id}"] [data-termine="azione scaduta"]`).waitFor({ timeout: 20_000 });
  });

  // ─── ricarico e quadro ─────────────────────────────────────────────────────
  await agisci("ricaricando la pagina i valori sono quelli salvati, senza salti", async () => {
    await vista("org");
    const v = await page.locator("#pas-org-ccnl").inputValue();
    if (v !== "Metalmeccanica industria") throw new Error(`contratto a schermo: «${v}»`);
  });

  await agisci("il quadro segnala il reclamo da sollecitare e il rischio alto senza misure", async () => {
    await vista("quadro");
    await page.locator("[data-segnali]").waitFor({ timeout: 20_000 });
    const t = await page.locator("[data-segnali]").innerText();
    if (!/reclam/i.test(t)) throw new Error("nessun segnale sul reclamo");
    if (!/senza misure|privi di misure|priv/i.test(t)) throw new Error("nessun segnale sul rischio alto senza misure");
  });

  // ─── documenti ─────────────────────────────────────────────────────────────
  await vista("documenti");
  await agisci("si pubblicano tutti e quattro, nella serie senza esercizio", async () => {
    for (const tipo of TIPI) {
      const prima = (await sql`select count(*)::int n from document_snapshot where company_id = ${companyId} and tipo = ${tipo}`)[0].n;
      await page.locator(`[data-doc-pas="${tipo}"] button`, { hasText: "Pubblica" }).click();
      await attendi(async () => (await sql`select count(*)::int n from document_snapshot where company_id = ${companyId} and tipo = ${tipo}`)[0].n === prima + 1, { cosa: tipo });
    }
    const righe = await sql`select tipo, anno, dati->>'esercizio' e from document_snapshot where company_id = ${companyId}`;
    const sbagliati = righe.filter((r) => r.anno !== 0).map((r) => r.tipo);
    if (sbagliati.length) throw new Error(`anno diverso da 0 su: ${sbagliati.join(", ")}`);
    if (righe.some((r) => Number(r.e) !== anno)) throw new Error("un documento non riferisce l'esercizio scelto");
  });

  await agisci("ogni documento porta il codice di verifica", async () => {
    const r = await sql`select s.tipo from document_snapshot s left join document_codice c on c.snapshot_id = s.id
                        where s.company_id = ${companyId} and c.codice is null`;
    if (r.length) throw new Error(`senza codice: ${r.map((x) => x.tipo).join(", ")}`);
  });

  await agisci("⚠️ i QUATTRO PDF sono documenti veri: si contano le pagine", async () => {
    const righe = await sql`select id, tipo from document_snapshot where company_id = ${companyId} order by tipo`;
    const misure = [];
    for (const r of righe) {
      const risposta = await page.request.get(`${BASE}/api/documenti/${r.id}/pdf`);
      if (!risposta.ok()) throw new Error(`${r.tipo}: HTTP ${risposta.status()}`);
      const { byte, pagine } = pretendiPdfVero(await risposta.body());
      misure.push({ tipo: r.tipo, byte, pagine });
    }
    const pesi = new Set(misure.map((m) => m.byte));
    if (pesi.size !== misure.length) throw new Error(`due documenti diversi pesano uguale: ${misure.map((m) => `${m.tipo} ${m.byte}`).join(" | ")}`);
    for (const m of misure) console.log(`       ${m.tipo}: ${Math.round(m.byte / 1024)} KB · ${m.pagine} pagine`);
  });

  // ─── consegna: i quattro PDF della DIMOSTRATIVA ────────────────────────────
  if (process.env.SALVA_PDF) {
    await agisci("consegna: la dimostrativa pubblica i quattro documenti, PDF veri e salvati", async () => {
      const [demo] = await sql`select id from company where organization_id = ${orgId} and is_demo`;
      if (!demo) throw new Error("nessuna azienda dimostrativa nello studio");
      await page.goto(`${BASE}/aziende/${demo.id}/pas24000?vista=documenti&anno=${anno}`, { waitUntil: "domcontentloaded" });
      await page.locator('nav[aria-label="Viste del modulo"]').waitFor({ timeout: 30_000 });
      await spegniTour(page);
      for (const tipo of TIPI) {
        const prima = (await sql`select count(*)::int n from document_snapshot where company_id = ${demo.id} and tipo = ${tipo}`)[0].n;
        await page.locator(`[data-doc-pas="${tipo}"] button`, { hasText: "Pubblica" }).click();
        await attendi(async () => (await sql`select count(*)::int n from document_snapshot where company_id = ${demo.id} and tipo = ${tipo}`)[0].n === prima + 1, { cosa: tipo });
      }
      mkdirSync(process.env.SALVA_PDF, { recursive: true });
      const righe = await sql`select distinct on (tipo) id, tipo from document_snapshot where company_id = ${demo.id} and tipo = any(${TIPI}) order by tipo, versione desc`;
      for (const r of righe) {
        const risposta = await page.request.get(`${BASE}/api/documenti/${r.id}/pdf`);
        if (!risposta.ok()) throw new Error(`${r.tipo}: HTTP ${risposta.status()}`);
        const buf = await risposta.body();
        const { byte, pagine } = pretendiPdfVero(buf);
        const dove = join(process.env.SALVA_PDF, `${NOMI_CONSEGNA[r.tipo] ?? r.tipo}.pdf`);
        writeFileSync(dove, buf);
        console.log(`       ${r.tipo}: ${Math.round(byte / 1024)} KB · ${pagine} pagine → ${dove}`);
      }
    });
  }

  // ─── il banco si smonta, e si verifica che lo sia ──────────────────────────
  await sql`delete from document_codice where snapshot_id in (select id from document_snapshot where organization_id = ${orgId})`;
  await sql`delete from document_snapshot where organization_id = ${orgId}`;
  await sql`delete from pas_system where organization_id = ${orgId}`;
  await sql`delete from company where organization_id = ${orgId}`;
  await sql`delete from audit_log where organization_id = ${orgId}`;
  await sql`delete from org_entitlement where organization_id = ${orgId}`;
  await sql`delete from member where organization_id = ${orgId}`;
  await sql`delete from organization where id = ${orgId}`;
  await sql`delete from "user" where email = ${email}`;
  const [{ n: residuo }] = await sql`select (select count(*) from organization where id = ${orgId})
                                          + (select count(*) from pas_reclamo where organization_id = ${orgId}) as n`;
  if (Number(residuo) !== 0) console.log(`\n  ⚠️  BANCO NON SMONTATO: ${residuo} righe residue per ${orgId}`);
} finally {
  // ⚠️ Le risorse si chiudono SEMPRE: un pool aperto tiene vivo il processo, e un collaudo
  // che non esce non fallisce — appende.
  var esito = riepilogo("PAS 24000 — il percorso");
  await browser.close();
  await sql.end();
}
// `riepilogo` restituisce quanti ROSSI ci sono: con dei falliti si esce con 1.
process.exit(esito ? 1 : 0);
