// Inventario GHG: comando per comando, con i DevTools.
//
// ⚠️ Questo modulo e' il PRIMO che il prodotto abbia mai avuto, ed e' rimasto senza un
// collaudo per comando fino ad oggi. Aveva l'e2e del percorso (`ghg.spec.ts`, golden
// 24.694) e il golden del motore: nessuno aveva mai premuto i suoi pulsanti a uno a uno
// guardando le tre spie. E' lo stesso scarto che tenne ISO 37001 scoperto per due fasi,
// e si vede solo elencando i collaudi accanto ai moduli.
//
// ⚠️ NIENTE `page.on("dialog")`, ed e' deliberato. Playwright scarta da solo i dialoghi
// nativi, quindi un `confirm()` risponde sempre «no» e il collaudo legge «non ha
// funzionato». Registrare un gestore farebbe sparire il sintomo insieme al difetto: il
// prodotto ha un dialogo suo — quello dell'archiviazione — e i gesti distruttivi devono
// usare quello. Se qui torna un `confirm()`, questo collaudo deve tornare rosso.
//
//   npm run qa -- ghg-percorso [--prod]

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
  pretendiPdfVero,
} from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const email = `ghg-cmd-${RUN}@example.com`;
const NOME_AZIENDA = `Fonderia ${String(RUN).slice(-6)} S.p.A.`;
const ANNO = new Date().getFullYear() - 1;

console.log(`\nInventario GHG, comando per comando — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const sonda = strumenta(page);
const { agisci, respinto, riepilogo } = contatore(page, sonda);

const { orgId } = await registraEEntra(page, sql, {
  base: BASE,
  nome: "Studio Carbonio",
  email,
  pwd: PWD_COLLAUDO,
});
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;

await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await spegniTour(page);
await page.click('[data-tour="nuova-azienda"]');
await page.fill("#na-nome", NOME_AZIENDA);
await page.fill("#na-settore", "Metallurgia");
await page.click('button[type="submit"]:has-text("Crea azienda")');
await page.waitForURL(/\/aziende\/[^/]+(\?|#|$)/, { timeout: 30_000 });
const companyId = page.url().match(/aziende\/([^/?#]+)/)[1];
await spegniTour(page);

// ─── letture dal DATABASE: l'esito si legge di la', non dalla pagina ──────────
const inventario = async () =>
  (await sql`select * from ghg_inventory where company_id=${companyId} and anno=${ANNO}`)[0] ?? null;

const righe = async () => {
  const i = await inventario();
  return i ? sql`select * from ghg_activity_row where inventory_id=${i.id} order by created_at` : [];
};

const sorgenti = async () => {
  const i = await inventario();
  return i ? sql`select * from ghg_source_selection where inventory_id=${i.id}` : [];
};

const obiettivi = async () => {
  const i = await inventario();
  return i ? sql`select * from ghg_target where company_id=${companyId}` : [];
};

const vaiPasso = async (n) => {
  await page.click(`[data-tour="ghg-passo-${n}"]`);
  await page.waitForURL(new RegExp(`passo=${n}`), { timeout: 30_000 });
  await page.waitForTimeout(700);
};

// ─── creazione ───────────────────────────────────────────────────────────────
await agisci("il percorso si apre dal fascicolo, dentro Ecosostenibilita'", async () => {
  await page.locator("[data-percorsi]").waitFor({ timeout: 30_000 });
  const voce = page.locator('[data-percorsi] [data-modulo="ghg"]');
  if (!(await voce.count())) throw new Error("il percorso non compare nel fascicolo");
  const gruppo = await voce.locator("xpath=ancestor::section[1]").locator("h3").innerText();
  if (!/ecosostenibilit/i.test(gruppo)) throw new Error(`e' sotto «${gruppo}»`);
  await voce.locator("a").first().click();
  await page.waitForURL("**/ghg", { timeout: 30_000 });
});

await agisci("si crea l'inventario e si atterra sull'esercizio", async () => {
  await page.fill("#ci-anno", String(ANNO));
  await page.click('button[type="submit"]:has-text("Crea")');
  await page.waitForURL(`**/ghg/${ANNO}**`, { timeout: 30_000 });
  const i = await inventario();
  if (!i) throw new Error("nessuna riga nel database");
  if (!i.content_set_id) throw new Error("il catalogo non e' stato congelato alla creazione");
});

// ─── passo 1 · confini ───────────────────────────────────────────────────────
await agisci("i confini si salvano sfocando il campo", async () => {
  const campo = page.locator("#m-fte");
  await campo.waitFor({ timeout: 20_000 });
  await campo.fill("128");
  await campo.blur();
  await attendi(async () => (await inventario())?.fte === "128", { cosa: "addetti salvati" });
});

await agisci("i ricavi si salvano, e NON cancellano gli addetti", async () => {
  // ⚠️ Terza regola di questo progetto: mai rimandare la riga intera da props. Salvare
  // il costo azzerava la quantita' nell'energetico; la rilevanza finanziaria azzerava
  // l'impatto nella materialita'. Qui si verifica che il difetto non ci sia.
  await page.locator("#m-ricavi").fill("14500000");
  await page.locator("#m-ricavi").blur();
  await attendi(async () => (await inventario())?.ricavi === "14500000", { cosa: "ricavi salvati" });
  if ((await inventario()).fte !== "128") throw new Error("salvare i ricavi ha azzerato gli addetti");
});

// ─── passo 2 · registro delle sorgenti ───────────────────────────────────────
await agisci("il registro elenca le sorgenti del catalogo", async () => {
  await vaiPasso(2);
  const n = await page.locator('[role="group"][aria-label^="Stato di "]').count();
  if (n < 20) throw new Error(`solo ${n} sorgenti a schermo`);
});

await agisci("dichiarare una sorgente «inclusa» la scrive nel registro", async () => {
  const gruppo = page.locator('[role="group"][aria-label^="Stato di "]').first();
  await gruppo.getByRole("button").first().click();
  await attendi(async () => (await sorgenti()).some((s) => s.stato === "in"), {
    cosa: "sorgente inclusa",
  });
});

await agisci("⚠️ escludere una sorgente PRETENDE la motivazione", async () => {
  // La motivazione d'esclusione e' ENFORCE-ata: e' il punto della norma per cui il
  // registro esiste. Senza, «esclusa» sarebbe indistinguibile da «dimenticata».
  const gruppo = page.locator('[role="group"][aria-label^="Stato di "]').nth(1);
  const nome = (await gruppo.getAttribute("aria-label")).replace("Stato di ", "");
  await gruppo.getByRole("button").nth(1).click();
  await page.waitForTimeout(900);
  const campo = page.getByLabel(`Motivazione per ${nome}`);
  if (!(await campo.count())) throw new Error("il campo motivazione non compare");
  await campo.fill("Sorgente non presente nel perimetro organizzativo.");
  await campo.blur();
  await attendi(
    async () => (await sorgenti()).some((s) => s.stato === "out" && /perimetro/.test(s.motivazione ?? "")),
    { cosa: "esclusione motivata" },
  );
});

// ─── passo 3 · dati di attivita' ─────────────────────────────────────────────
await agisci("il dialogo della voce si apre", async () => {
  await vaiPasso(3);
  await page.click('[data-tour="aggiungi-voce"]');
  await page.getByRole("dialog").waitFor({ timeout: 15_000 });
});

await agisci("⚠️ ogni scelta del dialogo ha un nome accessibile", async () => {
  // ⚠️ Un `<Label>` che non punta a niente e' un'etichetta VISIBILE e basta: per chi usa
  // un lettore di schermo quel combobox non ha nome, e nessun collaudo funzionale se ne
  // accorge — la pagina si apre e i comandi rispondono. Si vede solo chiedendo il nome.
  const scelte = page.getByRole("dialog").getByRole("combobox");
  const senzaNome = [];
  for (let i = 0; i < (await scelte.count()); i++) {
    const nome = (
      await scelte.nth(i).evaluate((e) => {
        const diretto = e.getAttribute("aria-label");
        if (diretto) return diretto;
        const by = e.getAttribute("aria-labelledby");
        if (by) return document.getElementById(by)?.innerText ?? "";
        const id = e.getAttribute("id");
        if (id) return document.querySelector(`label[for="${CSS.escape(id)}"]`)?.innerText ?? "";
        return "";
      })
    ).trim();
    if (!nome) senzaNome.push(i);
  }
  if (senzaNome.length) {
    throw new Error(`${senzaNome.length} scelte su ${await scelte.count()} senza nome accessibile`);
  }
});

await agisci("si sceglie la categoria e l'anteprima si calcola", async () => {
  const scelte = page.getByRole("dialog").getByRole("combobox");
  await scelte.first().click();
  await page.getByRole("option").filter({ hasText: "Cat. 1" }).first().click();
  await page.waitForTimeout(700);
  await page.fill("#v-desc", "Gas naturale — forno di fusione");
  await page.fill("#v-q", "42500");
  await page.waitForTimeout(1000);
  const testo = await page.getByRole("dialog").innerText();
  if (!/tCO₂e/.test(testo)) throw new Error("nessuna anteprima calcolata");
});

await agisci("la voce si salva e compare nel database", async () => {
  await page.getByRole("button", { name: "Salva voce" }).click();
  await attendi(async () => (await righe()).length === 1, { cosa: "prima voce" });
  const [r] = await righe();
  if (Number(r.quantita) !== 42500) throw new Error(`quantita' ${r.quantita}`);
  if (!r.factor_key && !r.fe) throw new Error("la voce e' senza fattore");
});

await agisci("⚠️ cambiando categoria il fattore NON resta quello di prima", async () => {
  // Difetto vero della Fase 5, trovato dal gate visivo: l'elettricita' veniva calcolata
  // col fattore del gas, perche' il fattore della categoria precedente restava applicato.
  await page.click('[data-tour="aggiungi-voce"]');
  await page.getByRole("dialog").waitFor({ timeout: 15_000 });
  const scelte = page.getByRole("dialog").getByRole("combobox");
  await scelte.first().click();
  await page.getByRole("option").filter({ hasText: "Cat. 1" }).first().click();
  await page.waitForTimeout(600);
  const feGas = await page.locator("#v-fe").inputValue();
  await scelte.first().click();
  await page.getByRole("option").filter({ hasText: "Cat. 2" }).first().click();
  await page.waitForTimeout(800);
  const feElettrico = await page.locator("#v-fe").inputValue();
  if (feGas === feElettrico) throw new Error(`il fattore non e' cambiato: resta ${feGas}`);
  await page.fill("#v-desc", "Energia elettrica prelevata dalla rete");
  await page.fill("#v-q", "612000");
  await page.getByRole("button", { name: "Salva voce" }).click();
  await attendi(async () => (await righe()).length === 2, { cosa: "seconda voce" });
});

await agisci("duplicare una voce ne crea una copia", async () => {
  await page.getByRole("button", { name: "Duplica" }).first().click();
  await attendi(async () => (await righe()).length === 3, { cosa: "voce duplicata" });
});

await agisci("⚠️ eliminare una voce chiede conferma NEL PRODOTTO, non al browser", async () => {
  // ⚠️ Questo collaudo non registra nessun gestore di dialoghi, di proposito: se qui c'e'
  // un `confirm()` nativo, Playwright lo scarta, la riga resta, e il controllo e' rosso.
  // E' la prova, non un effetto collaterale.
  const prima = (await righe()).length;
  await page.getByRole("button", { name: "Elimina" }).first().click();
  await page.waitForTimeout(800);
  const conferma = page.getByRole("dialog");
  if (!(await conferma.count())) throw new Error("nessun dialogo di conferma del prodotto");
  await conferma.getByRole("button", { name: /^Elimina/i }).click();
  await attendi(async () => (await righe()).length === prima - 1, { cosa: "voce eliminata" });
});

// ─── passo 4 · fattori a sovrapposizione ─────────────────────────────────────
await agisci("un fattore si sovrascrive per questa organizzazione", async () => {
  await vaiPasso(4);
  const campo = page.locator('input[aria-label^="Fattore "]').first();
  await campo.waitFor({ timeout: 20_000 });
  await campo.fill("0.9999");
  await campo.blur();
  await attendi(
    async () =>
      (await sql`select 1 from ghg_org_factor where organization_id=${orgId} and fe='0.9999'`).length > 0,
    { cosa: "sovrapposizione scritta" },
  );
});

await agisci("e si ripristina al valore di piattaforma", async () => {
  await page.getByRole("button", { name: "Ripristina valore di piattaforma" }).first().click();
  await attendi(
    async () =>
      (await sql`select 1 from ghg_org_factor where organization_id=${orgId} and fe='0.9999'`).length === 0,
    { cosa: "sovrapposizione rimossa" },
  );
});

// ─── passo 5 · risultati ─────────────────────────────────────────────────────
await agisci("i risultati mostrano un totale calcolato", async () => {
  await vaiPasso(5);
  const testo = await page.locator("main").innerText();
  if (!/tCO₂e/.test(testo)) throw new Error("nessun totale a schermo");
  if (!/\d/.test(testo)) throw new Error("nessun valore numerico nei risultati");
});

// ─── passo 6 · obiettivi ─────────────────────────────────────────────────────
await agisci("si aggiunge un obiettivo di riduzione", async () => {
  await vaiPasso(6);
  await page.fill("#ob-nome", "Riduzione delle emissioni dirette e da energia importata");
  await page.fill("#ob-rid", "30");
  await page.fill("#ob-anno", String(ANNO + 5));
  await page.getByRole("button", { name: "Aggiungi obiettivo" }).click();
  await attendi(async () => (await obiettivi()).length === 1, { cosa: "obiettivo scritto" });
});

await agisci("⚠️ eliminare un obiettivo chiede conferma NEL PRODOTTO", async () => {
  await page.getByRole("button", { name: "Elimina obiettivo" }).first().click();
  await page.waitForTimeout(800);
  const conferma = page.getByRole("dialog");
  if (!(await conferma.count())) throw new Error("nessun dialogo di conferma del prodotto");
  await conferma.getByRole("button", { name: /^Elimina/i }).click();
  await attendi(async () => (await obiettivi()).length === 0, { cosa: "obiettivo eliminato" });
});

// ─── passo 7 · verifica ──────────────────────────────────────────────────────
await agisci("la checklist di verifica accetta uno stato", async () => {
  await vaiPasso(7);
  const gruppo = page.locator('[role="group"][aria-label^="Stato "]').first();
  await gruppo.waitFor({ timeout: 20_000 });
  await gruppo.getByRole("button").first().click();
  await attendi(
    async () =>
      (
        await sql`select 1 from ghg_checklist_status c
                  join ghg_inventory i on i.id = c.inventory_id
                  where i.company_id = ${companyId}`
      ).length > 0,
    { cosa: "stato di verifica scritto" },
  );
});

// ─── passo 8 · pubblicazione ─────────────────────────────────────────────────
let snapshotId = null;
await agisci("il Rapporto GHG si pubblica e si congela", async () => {
  await vaiPasso(8);
  await page.locator('[data-tour="pubblica-documento"]').click({ timeout: 20_000 });
  await attendi(
    async () => {
      const [s] = await sql`select id from document_snapshot where company_id=${companyId} and tipo='ghg'`;
      if (s) snapshotId = s.id;
      return !!s;
    },
    { entro: 90_000, cosa: "snapshot pubblicato" },
  );
});

await agisci("il documento pubblicato porta il codice di verifica", async () => {
  const [c] = await sql`select codice from document_codice where snapshot_id=${snapshotId}`;
  if (!c) throw new Error("nessun codice emesso");
  if (!/^EV-/.test(c.codice)) throw new Error(`codice inatteso: ${c.codice}`);
  console.log("       " + c.codice);
});

await agisci("il PDF si genera e non e' vuoto", async () => {
  const r = await page.request.get(`${BASE}/api/documenti/${snapshotId}/pdf`);
  if (!r.ok()) throw new Error(`HTTP ${r.status()}`);
  const buf = await r.body();
  const { byte, pagine } = pretendiPdfVero(buf);
  console.log(`       ${Math.round(byte / 1024)} KB · ${pagine} pagine`);
});

// ─── il confine di tenant ────────────────────────────────────────────────────
// ⚠️ Il conteggio si fotografa ADESSO. Scriverlo a mano lo legherebbe a quanti gesti
// precedenti sono riusciti: un fallimento a monte farebbe fallire anche questo, e il
// referto accuserebbe il confine invece del gesto vero.
const righePrima = (await righe()).length;
await respinto(
  "un altro studio non apre questo inventario",
  async () => {
    const p2 = await browser.newPage();
    await p2.goto(`${BASE}/aziende/${companyId}/ghg/${ANNO}`, { waitUntil: "domcontentloaded" });
    await p2.close();
  },
  // ⚠️ La prova e' la riga che non cambia, non il messaggio: un accesso che riesce in
  // silenzio e uno che fallisce in silenzio si somigliano troppo.
  { prova: async () => (await righe()).length === righePrima },
);

const ko = riepilogo("Inventario GHG");
console.log("EMAIL_TEST=" + email);
await browser.close();
await sql.end();
process.exitCode = ko ? 1 : 0;
