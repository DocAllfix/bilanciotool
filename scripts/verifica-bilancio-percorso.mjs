// Bilancio di sostenibilita' e conformita' ESG: comando per comando, con i DevTools.
//
// ⚠️ Il secondo modulo del prodotto, e il secondo rimasto senza un collaudo per comando.
// `visual-check-bilancio` esiste dalla Fase 7 ma e' un gate VISIVO: fotografa i sei passi,
// semina i punteggi di materialita' direttamente nel database perche' «l'interazione UI e'
// gia' coperta dall'e2e», e non guarda ne' le richieste fallite ne' i messaggi di rifiuto.
// Qui si preme, e si legge l'esito dal database.
//
// ⚠️ Niente `page.on("dialog")`, come nel gemello del GHG: se un `confirm()` nativo torna
// nel prodotto, questo collaudo deve tornare rosso.
//
//   npm run qa -- bilancio-percorso [--prod]

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import {
  spegniTour,
  strumenta,
  contatore,
  attendi,
  pretendiServerAggiornato,
  pretendiPdfVero, fattoreAttesa } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const email = `bil-cmd-${RUN}@example.com`;
const NOME_AZIENDA = `Cartiera ${String(RUN).slice(-6)} S.p.A.`;
const ANNO = new Date().getFullYear() - 1;

console.log(`\nBilancio di sostenibilita', comando per comando — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const sonda = strumenta(page);
const { agisci, respinto, riepilogo } = contatore(page, sonda);

const { orgId } = await registraEEntra(page, sql, {
  base: BASE,
  nome: "Studio Rendiconto",
  email,
  pwd: PWD_COLLAUDO,
});
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;

await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await spegniTour(page);
await page.click('[data-tour="nuova-azienda"]');
await page.fill("#na-nome", NOME_AZIENDA);
await page.fill("#na-settore", "Carta e cartone");
await page.fill("#na-ateco", "17.12");
await page.click('button[type="submit"]:has-text("Crea azienda")');
await page.waitForURL(/\/aziende\/[^/]+(\?|#|$)/, { timeout: 30_000 });
const companyId = page.url().match(/aziende\/([^/?#]+)/)[1];
await spegniTour(page);

// ─── letture dal DATABASE ────────────────────────────────────────────────────
const progetto = async () =>
  (await sql`select * from report_project where company_id=${companyId} and anno=${ANNO}`)[0] ?? null;

const punteggi = async () => {
  const p = await progetto();
  return p ? sql`select * from materiality_assessment where project_id=${p.id} order by topic_key` : [];
};

const kpi = async () =>
  sql`select * from kpi_value where company_id=${companyId}`;

const gestioni = async () => {
  const p = await progetto();
  return p ? sql`select * from topic_management where project_id=${p.id}` : [];
};

const capitoli = async () => {
  const p = await progetto();
  return p ? sql`select * from narrative_section where project_id=${p.id}` : [];
};

const vaiPasso = async (n) => {
  await page.click(`[data-tour="bil-passo-${n}"]`);
  await page.waitForURL(new RegExp(`passo=${n}`), { timeout: 30_000 });
  await page.waitForTimeout(800);
};

// ─── creazione ───────────────────────────────────────────────────────────────
await agisci("il percorso si apre dal fascicolo, dentro Ecosostenibilita'", async () => {
  await page.locator("[data-percorsi]").waitFor({ timeout: 30_000 });
  const voce = page.locator('[data-percorsi] [data-modulo="bilancio"]');
  if (!(await voce.count())) throw new Error("il percorso non compare nel fascicolo");
  const gruppo = await voce.locator("xpath=ancestor::section[1]").locator("h3").innerText();
  if (!/ecosostenibilit/i.test(gruppo)) throw new Error(`e' sotto «${gruppo}»`);
  await voce.locator("a").first().click();
  await page.waitForURL("**/bilancio", { timeout: 30_000 });
});

await agisci("si crea il progetto e il catalogo si congela", async () => {
  await page.fill("#cb-anno", String(ANNO));
  await page.click('button:has-text("Crea")');
  await page.waitForURL(`**/bilancio/${ANNO}**`, { timeout: 40_000 });
  const p = await progetto();
  if (!p) throw new Error("nessuna riga nel database");
  if (!p.content_set_id) throw new Error("il catalogo non e' stato congelato alla creazione");
});

// ─── passo 1 · organizzazione ────────────────────────────────────────────────
await agisci("il perimetro si salva sfocando il campo", async () => {
  const campo = page.locator("#p-perimetro");
  await campo.waitFor({ timeout: 25_000 });
  await campo.fill("Stabilimento di Bari e magazzino di Modugno.");
  await campo.blur();
  await attendi(async () => /Modugno/.test((await progetto())?.perimetro ?? ""), {
    cosa: "perimetro salvato",
  });
});

await agisci("lo standard adottato ha un nome accessibile e si cambia", async () => {
  const scelta = page.getByLabel("Standard adottato");
  if (!(await scelta.count())) throw new Error("la scelta dello standard non ha nome accessibile");
  const prima = (await progetto()).standard;
  await scelta.click();
  const opzioni = page.getByRole("option");
  await opzioni.first().waitFor({ timeout: 10_000 });
  const n = await opzioni.count();
  let scelto = null;
  for (let i = 0; i < n; i++) {
    const t = (await opzioni.nth(i).innerText()).trim();
    if (t !== prima) { scelto = t; await opzioni.nth(i).click(); break; }
  }
  if (!scelto) throw new Error("un solo standard disponibile");
  await attendi(async () => (await progetto()).standard === scelto, { cosa: `standard ${scelto}` });
});

// ─── passo 2 · doppia materialita' ───────────────────────────────────────────
await agisci("la matrice elenca i temi del catalogo", async () => {
  await vaiPasso(2);
  const n = await page.locator('[aria-label^="Impatto "]').count();
  if (n < 10) throw new Error(`solo ${n} temi a schermo`);
});

let temaProvato = "";
await agisci("l'impatto di un tema si salva", async () => {
  const scelta = page.locator('[aria-label^="Impatto "]').first();
  temaProvato = (await scelta.getAttribute("aria-label")).replace("Impatto ", "");
  await scelta.click();
  await page.getByRole("option").filter({ hasText: "4" }).first().click();
  await attendi(
    async () => (await punteggi()).some((p) => p.topic_key === temaProvato && Number(p.score_impact) === 4),
    { cosa: "impatto salvato" },
  );
});

await agisci("⚠️ la rilevanza finanziaria NON azzera l'impatto appena salvato", async () => {
  // ⚠️ Difetto vero della Fase 7: il client rimandava lo stato completo letto da props
  // stantie, e impostare la rilevanza finanziaria cancellava l'impatto. Da allora
  // l'aggiornamento e' per singolo campo, atomico lato DB. Questo e' il controllo che
  // vede tornare quel difetto.
  const scelta = page.locator(`[aria-label="Finanziaria ${temaProvato}"]`);
  await scelta.click();
  await page.getByRole("option").filter({ hasText: "3" }).first().click();
  await attendi(
    async () => (await punteggi()).some((p) => p.topic_key === temaProvato && Number(p.score_financial) === 3),
    { cosa: "rilevanza finanziaria salvata" },
  );
  const riga = (await punteggi()).find((p) => p.topic_key === temaProvato);
  if (Number(riga.score_impact) !== 4) {
    throw new Error(`l'impatto e' stato azzerato: ora vale ${riga.score_impact}`);
  }
});

await agisci("la guida di un tema si apre", async () => {
  await page.getByLabel(`Guida ${temaProvato}`).click().catch(async () => {
    await page.locator('[aria-label^="Guida "]').first().click();
  });
  await page.waitForTimeout(600);
});

await agisci("la proposta ATECO suggerisce, e i punteggi restano del consulente", async () => {
  const prima = (await punteggi()).length;
  await page.click('[data-tour="proposta-ateco"]');
  await page.waitForTimeout(1500);
  const dopo = (await punteggi()).length;
  if (dopo < prima) throw new Error("la proposta ha cancellato dei punteggi");
});

// ─── passo 3 · indicatori ────────────────────────────────────────────────────
await agisci("un indicatore si salva sull'esercizio corrente", async () => {
  await vaiPasso(3);
  const campo = page.locator('input[aria-label$="' + ANNO + '"]').first();
  await campo.waitFor({ timeout: 25_000 });
  await campo.fill("612000");
  await campo.blur();
  await attendi(async () => (await kpi()).some((k) => Number(k.valore) === 612000), {
    cosa: "indicatore salvato",
  });
});

await agisci("⚠️ e l'anno precedente NON sovrascrive quello corrente", async () => {
  const campo = page.locator('input[aria-label$="' + (ANNO - 1) + '"]').first();
  await campo.fill("580000");
  await campo.blur();
  await attendi(async () => (await kpi()).some((k) => Number(k.valore) === 580000), {
    cosa: "indicatore anno precedente",
  });
  if (!(await kpi()).some((k) => Number(k.valore) === 612000)) {
    throw new Error("il valore dell'esercizio corrente e' sparito");
  }
});

// ─── passo 4 · politiche ─────────────────────────────────────────────────────
await agisci("la politica di un tema materiale si salva", async () => {
  await vaiPasso(4);
  const area = page.locator('textarea[id^="pol-"]').first();
  await area.waitFor({ timeout: 25_000 });
  await area.fill("Politica ambientale approvata dal consiglio nel marzo dell'esercizio.");
  await area.blur();
  await attendi(async () => (await gestioni()).some((g) => /consiglio/.test(g.politica ?? "")), {
    cosa: "politica salvata",
  });
});

await agisci("⚠️ le azioni NON cancellano la politica appena salvata", async () => {
  const area = page.locator('textarea[id^="azi-"]').first();
  await area.fill("Sostituzione della caldaia e contratto con garanzia d'origine.");
  await area.blur();
  await attendi(async () => (await gestioni()).some((g) => /caldaia/.test(g.azioni ?? "")), {
    cosa: "azioni salvate",
  });
  const g = (await gestioni()).find((x) => /caldaia/.test(x.azioni ?? ""));
  if (!/consiglio/.test(g.politica ?? "")) throw new Error("la politica e' stata cancellata");
});

// ─── passo 5 · racconto ──────────────────────────────────────────────────────
await agisci("la bozza dai dati compila un capitolo", async () => {
  await vaiPasso(5);
  const bozza = page.locator('[data-tour^="bozza-"]').first();
  await bozza.waitFor({ timeout: 25_000 });
  await bozza.click();
  await attendi(async () => (await capitoli()).length >= 1, { entro: 60_000 * fattoreAttesa(), cosa: "capitolo scritto" });
});

// ─── passo 6 · verifica ──────────────────────────────────────────────────────
await agisci("la verifica elenca le lacune e ci porta dentro", async () => {
  await vaiPasso(6);
  const testo = await page.locator("main").innerText();
  if (!/lacun|manca|complet/i.test(testo)) throw new Error("la verifica non dice che cosa manca");
});

// ─── passo 7 · pubblicazione ─────────────────────────────────────────────────
let snapshotId = null;
await agisci("il Bilancio si pubblica e si congela", async () => {
  await vaiPasso(7);
  await page.locator('[data-tour="pubblica-documento"]').click({ timeout: 25_000 });
  await attendi(
    async () => {
      const [s] = await sql`select id from document_snapshot where company_id=${companyId} and tipo='bilancio'`;
      if (s) snapshotId = s.id;
      return !!s;
    },
    { entro: 120_000 * fattoreAttesa(), cosa: "snapshot pubblicato" },
  );
});

await agisci("il documento porta il codice di verifica", async () => {
  const [c] = await sql`select codice from document_codice where snapshot_id=${snapshotId}`;
  if (!c) throw new Error("nessun codice emesso");
  if (!/^EV-/.test(c.codice)) throw new Error(`codice inatteso: ${c.codice}`);
  console.log("       " + c.codice);
});

await agisci("⚠️ lo snapshot e' immutabile: i dati vivi non lo toccano piu'", async () => {
  const [prima] = await sql`select dati from document_snapshot where id=${snapshotId}`;
  await page.goto(`${BASE}/aziende/${companyId}/bilancio/${ANNO}?passo=3`, {
    waitUntil: "domcontentloaded",
  });
  const campo = page.locator('input[aria-label$="' + ANNO + '"]').first();
  await campo.waitFor({ timeout: 25_000 });
  await campo.fill("999999");
  await campo.blur();
  await attendi(async () => (await kpi()).some((k) => Number(k.valore) === 999999), {
    cosa: "dato vivo cambiato",
  });
  const [dopo] = await sql`select dati from document_snapshot where id=${snapshotId}`;
  if (JSON.stringify(prima.dati) !== JSON.stringify(dopo.dati)) {
    throw new Error("lo snapshot e' cambiato dopo la pubblicazione");
  }
});

await agisci("il PDF si genera e non e' vuoto", async () => {
  const r = await page.request.get(`${BASE}/api/documenti/${snapshotId}/pdf`);
  if (!r.ok()) throw new Error(`HTTP ${r.status()}`);
  const buf = await r.body();
  const { byte, pagine } = pretendiPdfVero(buf);
  console.log(`       ${Math.round(byte / 1024)} KB · ${pagine} pagine`);
});

// ─── il confine di tenant ────────────────────────────────────────────────────
// ⚠️ Il conteggio si fotografa adesso: scriverlo a mano lo legherebbe a quanti gesti
// precedenti sono riusciti, e un fallimento a monte accuserebbe il confine.
const punteggiPrima = (await punteggi()).length;
await respinto(
  "un altro studio non apre questo bilancio",
  async () => {
    const p2 = await browser.newPage();
    await p2.goto(`${BASE}/aziende/${companyId}/bilancio/${ANNO}`, { waitUntil: "domcontentloaded" });
    await p2.close();
  },
  { prova: async () => (await punteggi()).length === punteggiPrima },
);

const ko = riepilogo("Bilancio di sostenibilita'");
console.log("EMAIL_TEST=" + email);
await browser.close();
await sql.end();
process.exitCode = ko ? 1 : 0;
