// La formazione, comando per comando, con i DevTools.
//
//   npm run qa -- formazione-comandi [--prod]
//
// ⚠️ `verifica-formazione` prova che le cose CI SONO e che l'invito arriva quando deve.
// Questo prova che ogni singolo comando introdotto RISPONDE: le dodici schede, le àncore
// dell'indice, il ritorno, il rimando alla guida, la X dell'invito, i due pulsanti della
// pagina «non trovato», le tre viste dello scadenzario, il tour del dodicesimo percorso.
//
// ⚠️ Un'àncora si verifica MISURANDO DOVE SI FERMA LA PAGINA, non controllando che esista.
// È la lezione dell'indice degli articoli del blog: le ancore c'erano tutte e il salto
// nascondeva i titoli sotto l'intestazione fissa. Qui l'intestazione fissa non c'è, ma
// `scroll-mt` sì, e un valore sbagliato si vede solo misurando.

import { chromium, devices } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, strumenta, contatore, pretendiServerAggiornato, attraversaProtezione } from "./comune-collaudo.mjs";
import { MODULI_AZIENDA } from "../src/features/companies/moduli.ts";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const email = `fcomandi-${RUN}@example.com`;

console.log(`\nFormazione, comando per comando — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await attraversaProtezione(page);
const sonda = strumenta(page);
const { agisci, riepilogo } = contatore(page, sonda);

const { orgId } = await registraEEntra(page, sql, {
  base: BASE,
  nome: "Studio Comandi",
  email,
  pwd: PWD_COLLAUDO,
});
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
const [demo] = await sql`select id from company where organization_id = ${orgId} and is_demo order by created_at limit 1`;

const apri = async (url, ancora) => {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  if (ancora) await page.waitForSelector(ancora, { timeout: 60_000 });
};

// ─── l'indice ────────────────────────────────────────────────────────────────
await agisci("⚠️ TUTTE E DODICI le schede dell'indice portano al proprio corso", async () => {
  const sbagliate = [];
  for (const m of MODULI_AZIENDA) {
    await apri(`${BASE}/formazione`, "[data-formazione]");
    await page.click(`[data-corso="${m.href}"]`);
    await page.waitForURL(new RegExp(`/formazione/${m.href}$`), { timeout: 30_000 }).catch(() => {});
    if (!page.url().endsWith(`/formazione/${m.href}`)) sbagliate.push(`${m.href} → ${page.url()}`);
    else {
      // E porta il nome giusto: una scheda che apre il corso sbagliato è peggio di una rotta.
      await page.waitForSelector("[data-sezioni]", { timeout: 30_000 });
      const h1 = await page.locator("h1").first().innerText();
      if (h1.trim() !== m.nome) sbagliate.push(`${m.href}: titolo «${h1.trim()}» invece di «${m.nome}»`);
    }
  }
  if (sbagliate.length) throw new Error(sbagliate.join(" | "));
});

await agisci("la scheda del corso trasversale porta al corso trasversale", async () => {
  await apri(`${BASE}/formazione`, "[data-trasversali]");
  await page.click("[data-corso-trasversale]");
  await page.waitForURL(/\/formazione\/corso\/[a-z-]+$/, { timeout: 30_000 });
  await page.waitForSelector("[data-sezioni]");
});

// ─── dentro un corso ─────────────────────────────────────────────────────────
await agisci("⚠️ ogni voce dell'indice del corso porta DAVVERO alla sua sezione", async () => {
  await apri(`${BASE}/formazione/energetico`, "[data-sezioni]");
  const voci = page.locator('nav[aria-label="Sezioni del corso"] a');
  const quante = await voci.count();
  if (quante < 8) throw new Error(`l'indice ha ${quante} voci`);

  const lontane = [];
  for (let i = 0; i < quante; i++) {
    const href = await voci.nth(i).getAttribute("href");
    const id = (href ?? "").slice(1);
    await voci.nth(i).click();
    await page.waitForTimeout(450);
    // ⚠️ Si misura DOVE SI È FERMATA la pagina rispetto al titolo: un'àncora che esiste ma
    // lascia la sezione fuori dallo schermo, o incollata al bordo, è un'àncora rotta che
    // nessun controllo sull'esistenza dell'id può cogliere.
    const y = await page.evaluate((s) => document.getElementById(s)?.getBoundingClientRect().top ?? null, id);
    if (y === null) lontane.push(`${id}: sezione assente`);
    else if (y < 0 || y > 220) lontane.push(`${id}: si ferma a ${Math.round(y)}px dal bordo`);
  }
  if (lontane.length) throw new Error(lontane.join(" | "));
});

await agisci("il ritorno «Formazione» riporta all'indice", async () => {
  await apri(`${BASE}/formazione/bilancio`, "[data-sezioni]");
  await page.locator('a[href="/formazione"]').first().click();
  await page.waitForURL(/\/formazione$/, { timeout: 30_000 });
  await page.waitForSelector("[data-formazione]");
});

await agisci("il rimando alla guida in fondo al corso funziona", async () => {
  await apri(`${BASE}/formazione/ghg`, "[data-sezioni]");
  await page.locator('a[href="/guida"]').last().click();
  await page.waitForURL(/\/guida$/, { timeout: 30_000 });
  await page.waitForSelector("[data-percorsi]");
});

await agisci("⚠️ dalla guida si arriva al corso di OGNI percorso", async () => {
  const rotti = [];
  for (const m of MODULI_AZIENDA) {
    await apri(`${BASE}/guida`, "[data-percorsi]");
    const link = page.locator(`[data-percorsi] a[href="/formazione/${m.href}"]`);
    if (!(await link.count())) {
      rotti.push(`${m.href}: nessun rimando`);
      continue;
    }
    await link.first().click();
    await page.waitForURL(new RegExp(`/formazione/${m.href}$`), { timeout: 30_000 }).catch(() => {});
    if (!page.url().endsWith(`/formazione/${m.href}`)) rotti.push(`${m.href} → ${page.url()}`);
  }
  if (rotti.length) throw new Error(rotti.join(" | "));
});

await agisci("i blocchi del corso sono resi tutti, e le tabelle scorrono da sole", async () => {
  await apri(`${BASE}/formazione/energetico`, "[data-sezioni]");
  const tabelle = await page.locator("[data-sezioni] table").count();
  const avvisi = await page.locator("[data-sezioni] div.rounded-lg.border").count();
  if (tabelle < 3) throw new Error(`solo ${tabelle} tabelle rese`);
  if (avvisi < 3) throw new Error(`solo ${avvisi} riquadri d'avviso resi`);
  // ⚠️ Il contenitore della tabella deve poter scorrere, e la PAGINA no: una pagina che
  // sfonda in orizzontale si legge come un difetto anche quando il contenuto è giusto.
  const propri = await page.evaluate(() =>
    [...document.querySelectorAll("table")].every((t) => {
      const c = t.parentElement;
      return c !== null && getComputedStyle(c).overflowX === "auto";
    }),
  );
  if (!propri) throw new Error("una tabella non sta in un contenitore che scorre");
});

// ─── l'invito, e i suoi due comandi ──────────────────────────────────────────
const PAGINA_GHG = async () => {
  const [inv] = await sql`select anno from ghg_inventory where company_id = ${demo.id} order by anno desc limit 1`;
  return `${BASE}/aziende/${demo.id}/ghg/${inv.anno}`;
};

async function faiComparireInvito() {
  const url = await PAGINA_GHG();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-tour="ghg-passo-1"]', { timeout: 90_000 });
  await spegniTour(page);
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("evalisdeck-corso-proposto")) localStorage.removeItem(k);
    }
  });
  await page.getByRole("button", { name: /Tour/ }).click();
  await page.waitForSelector(".driver-popover", { timeout: 30_000 });
  const progresso = await page.locator(".driver-popover-progress-text").innerText();
  const totale = Number(progresso.match(/di\s+(\d+)/)?.[1] ?? 0);
  for (let i = 0; i < totale; i++) {
    await page.evaluate(() => document.querySelector(".driver-popover-next-btn")?.click());
    await page.waitForTimeout(200);
  }
  await page.waitForSelector('a:has-text("Apri la formazione")', { timeout: 15_000 });
}

await agisci("⚠️ il selettore porta a un ALTRO corso, e segna dove sei", async () => {
  await apri(`${BASE}/formazione/energetico`, "[data-selettore-corsi]");
  const qui = page.locator('[data-selettore-corsi] [aria-current="page"]');
  if ((await qui.count()) !== 1) throw new Error(`${await qui.count()} voci marcate come corrente`);
  if ((await qui.getAttribute("data-corso-scelta")) !== "energetico") {
    throw new Error("il selettore segna un corso che non è quello aperto");
  }
  // Tutti e dodici raggiungibili da qui: se ne mancasse uno, ci si accorgerebbe solo
  // cercandolo, cioè quando serve.
  const voci = await page.locator("[data-selettore-corsi] [data-corso-scelta]").count();
  if (voci !== MODULI_AZIENDA.length) throw new Error(`${voci} corsi nel selettore invece di ${MODULI_AZIENDA.length}`);

  await page.click('[data-selettore-corsi] [data-corso-scelta="soa"]');
  await page.waitForURL(/\/formazione\/soa$/, { timeout: 30_000 });
  await page.waitForSelector("[data-sezioni]");
});

await agisci("⚠️ l'indice segue la lettura invece di restare fermo", async () => {
  await apri(`${BASE}/formazione/energetico`, "[data-indice-corso]");
  const attiva = () => page.locator('[data-indice-corso] a[aria-current="true"]').first().getAttribute("href");
  const prima = await attiva();
  // Si scorre fino a una sezione lontana e si guarda se l'indice se ne accorge. Un indice
  // che non segue non è rotto in modo visibile: è semplicemente inutile, e l'unico modo di
  // saperlo è misurarlo.
  const ultima = page.locator("[data-sezioni] section").last();
  await ultima.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const dopo = await attiva();
  if (!prima || !dopo) throw new Error("l'indice non marca nessuna sezione come corrente");
  if (prima === dopo) throw new Error(`l'indice è rimasto su «${prima}» dopo essere scorsi in fondo`);
});

await agisci("le riproduzioni dell'interfaccia sono rese, e non sono immagini", async () => {
  await apri(`${BASE}/formazione/energetico`, "[data-sezioni]");
  const figure = await page.locator("[data-sezioni] figure").count();
  if (figure < 2) throw new Error(`solo ${figure} riproduzioni rese`);
  // ⚠️ La prova che NON sono immagini: se lo fossero, si staccherebbero dal prodotto senza
  // che nessuno se ne accorga, e non seguirebbero il tema.
  const immagini = await page.locator("[data-sezioni] figure img").count();
  if (immagini) throw new Error(`${immagini} immagini dentro le riproduzioni: devono essere costruite coi token`);
});

await agisci("⚠️ la X dell'invito lo chiude", async () => {
  await faiComparireInvito();
  await page.getByRole("button", { name: "Chiudi il suggerimento" }).click();
  await page.waitForTimeout(600);
  if (await page.locator('a:has-text("Apri la formazione")').count()) {
    throw new Error("l'invito è rimasto aperto dopo la X");
  }
});

await agisci("⚠️ «Apri la formazione» porta al corso di QUEL percorso", async () => {
  await faiComparireInvito();
  await page.locator('a:has-text("Apri la formazione")').click();
  await page.waitForURL(/\/formazione\/ghg$/, { timeout: 30_000 });
  await page.waitForSelector("[data-sezioni]");
});

await agisci("l'invito si propone una volta sola, anche ricaricando", async () => {
  const url = await PAGINA_GHG();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-tour="ghg-passo-1"]', { timeout: 90_000 });
  await spegniTour(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  if (await page.locator('a:has-text("Apri la formazione")').count()) {
    throw new Error("l'invito è tornato dopo essere già stato proposto");
  }
});

await agisci("il pulsante «Formazione» del percorso porta al corso", async () => {
  const url = await PAGINA_GHG();
  await apri(url, 'a[href="/formazione/ghg"]');
  await page.locator('a[href="/formazione/ghg"]').first().click();
  await page.waitForURL(/\/formazione\/ghg$/, { timeout: 30_000 });
});

// ─── il tour del dodicesimo percorso ─────────────────────────────────────────
await agisci("⚠️ il tour del dodicesimo percorso parte, ha le sue tappe e si chiude", async () => {
  const [pg] = await sql`select anno from sgesg_programma where company_id = ${demo.id} order by anno desc limit 1`;
  if (!pg) throw new Error("la dimostrativa non ha un programma ESG");
  await page.goto(`${BASE}/aziende/${demo.id}/sgesg/${pg.anno}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-tour="sgesg-avanzamento"]', { timeout: 90_000 });
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("evalisdeck-tour")) localStorage.removeItem(k);
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".driver-popover", { timeout: 60_000 });
  const progresso = await page.locator(".driver-popover-progress-text").innerText();
  const totale = Number(progresso.match(/di\s+(\d+)/)?.[1] ?? 0);
  if (totale !== 3) throw new Error(`il tour ha ${totale} tappe invece di 3`);
  for (let i = 0; i < totale; i++) {
    await page.evaluate(() => document.querySelector(".driver-popover-next-btn")?.click());
    await page.waitForTimeout(200);
  }
  await page.waitForSelector(".driver-popover", { state: "detached", timeout: 10_000 });
  if (await page.locator(".driver-overlay").count()) throw new Error("il velo è rimasto");
});

// ─── la pagina «non trovato» ─────────────────────────────────────────────────
await agisci("⚠️ «non trovato»: entrambi i comandi portano dove dicono", async () => {
  await apri(`${BASE}/formazione/non-esiste`, "main");
  await page.waitForFunction(() => (document.querySelector("main")?.innerText ?? "").includes("non c"), null, {
    timeout: 20_000,
  });
  await page.getByRole("link", { name: "Vai al portafoglio" }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 30_000 });

  await apri(`${BASE}/aziende/non-esiste-affatto`, "main");
  await page.waitForFunction(() => (document.querySelector("main")?.innerText ?? "").includes("non c"), null, {
    timeout: 20_000,
  });
  await page.getByRole("link", { name: "Guida all'uso" }).click();
  await page.waitForURL(/\/guida$/, { timeout: 30_000 });
});

// ⚠️ Le tre viste dello scadenzario si collaudano in `verifica-scadenzario`, e non qui:
// lì il banco ha aziende VERE con un percorso avviato. Questo conto ha solo la
// dimostrativa, che dallo scadenzario è esclusa per decisione — il controllo trovava la
// pagina senza scadenzario e riferiva un guasto che era del banco di prova.

// ─── da telefono ─────────────────────────────────────────────────────────────
await agisci("⚠️ da telefono un corso si legge, e la pagina non sfonda", async () => {
  const tel = await browser.newContext({ ...devices["iPhone 13"], storageState: await page.context().storageState() });
  const p = await tel.newPage();
  const sfondamenti = [];
  for (const url of [`${BASE}/formazione`, `${BASE}/formazione/energetico`, `${BASE}/formazione/corso/avviare-attivita`]) {
    await p.goto(url, { waitUntil: "domcontentloaded" });
    await p.waitForSelector("main", { timeout: 60_000 });
    await p.waitForTimeout(600);
    const extra = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (extra > 2) sfondamenti.push(`${url.replace(BASE, "")}: ${extra}px`);
  }
  await tel.close();
  if (sfondamenti.length) throw new Error(sfondamenti.join(" | "));
});

await sql`delete from "user" where email = ${email}`.catch(() => {});
await sql.end().catch(() => {});
await browser.close().catch(() => {});

process.exit(riepilogo("Formazione, comando per comando") ? 1 : 0);
