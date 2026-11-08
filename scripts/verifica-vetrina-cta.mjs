// Dal richiamo della vetrina fino alla cassa.
//
//   npm run qa -- vetrina-cta
//
// La vetrina esiste per convertire: questo collaudo percorre la strada intera — risultati →
// richiamo → `/attiva/<fascia>` → iscrizione → pagina dei piani col dialogo aperto sulla
// fascia giusta. La catena finale è già provata da `qa -- attivazione`; qui si verifica che
// il richiamo ci si agganci davvero, e che dica il vero sul prezzo.
//
// ⚠️ IL CONTROLLO CHE CONTA PIÙ DI TUTTI è quello sul barrato: si confronta con dodici mesi di
// mensile LETTI DAL LISTINO, non col numero scritto nel banner. Un barrato che non è un'offerta
// reale è pubblicità ingannevole. E i posti d'introduzione e i Fondatori, ritirati il 6 novembre
// 2026, non devono più comparire.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { strumenta, contatore, fattoreAttesa, spegniTour } from "./comune-collaudo.mjs";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { PIANI, euro, prezzoDiVendita, costoAnnuoMensile } from "../src/lib/prezzi.ts";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const ROTTA = "/percorsi/bilancio-energetico";
const RUN = Date.now();
const EMAIL = `vetrina-${RUN}@example.com`;

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const sonda = strumenta(page);
const { agisci, riepilogo } = contatore(page, sonda);

// Il piano che la vetrina propone: l'azienda che fa da sé, il cliente primario.
const PIANO_PROPOSTO = "azienda";
const piano = PIANI[PIANO_PROPOSTO];
const anno = prezzoDiVendita(piano, "anno");
const mese = prezzoDiVendita(piano, "mese");

/** ⚠️ Il giro guidato parte da solo alla prima visita, e il suo velo si prende i clic: è il
 *  comportamento giusto del prodotto e il modo sbagliato di collaudarlo. Si spegne come in
 *  tutti gli altri collaudi — e il tour ha il proprio, `qa -- vetrina-tour`. */
async function senzaTour(p) {
  await spegniTour(p);
}

const apri = async () => {
  await page.goto(`${BASE}${ROTTA}`, { waitUntil: "domcontentloaded" });
  await senzaTour(page);
  // Il banner del consenso è una finestra: finché sta lì, copre il richiamo in basso.
  await scegliCookie(page);
};

/** La scelta sui cookie è una finestra: finché sta lì il richiamo non si apre (di proposito),
 *  quindi si risponde e si ASPETTA che sparisca.
 *
 *  ⚠️ Prima si ASPETTA CHE COMPAIA. Il banner è un componente client e sul server finge che
 *  la scelta sia già fatta — per non lampeggiare — quindi esiste solo dopo l'idratazione: un
 *  `count()` subito dopo il caricamento dice zero, il collaudo salta il clic, e il banner
 *  arriva un istante dopo restando lì per tutto il giro. È così che sei controlli sono
 *  diventati rossi accusando il richiamo di non comparire, mentre non compariva **perché il
 *  banner era ancora aperto** — cioè facendo esattamente il suo mestiere. */
async function scegliCookie(p) {
  const banner = p.locator("[data-consenso]");
  await banner.waitFor({ state: "attached", timeout: 10_000 * fattoreAttesa() }).catch(() => {});
  if (!(await banner.count())) return; // scelta già fatta in questo contesto
  await p.getByRole("button", { name: "Rifiuta", exact: true }).click();
  await banner.waitFor({ state: "detached", timeout: 15_000 * fattoreAttesa() });
}

await agisci("il richiamo NON compare prima dei risultati", async () => {
  await apri();
  await page.waitForTimeout(1500 * fattoreAttesa());
  if (await page.locator('[data-vetrina="richiamo"]').count()) {
    throw new Error("si apre subito: interrompe chi sta ancora capendo che cos'è");
  }
});

await agisci("arrivati ai risultati, il richiamo compare", async () => {
  await page.getByRole("button", { name: /Risultati/ }).click();
  await page.locator('[data-vetrina="richiamo"]').waitFor({ timeout: 20_000 * fattoreAttesa() });
});

await agisci("il prezzo è quello del listino, annuale e mensile", async () => {
  const t = await page.locator('[data-vetrina="richiamo"]').innerText();
  if (!t.includes(euro(anno.importo))) throw new Error(`non mostra ${euro(anno.importo)}`);
  if (!t.includes(euro(mese.importo))) throw new Error(`non mostra ${euro(mese.importo)}`);
  if (!t.includes(piano.nome)) throw new Error(`non nomina «${piano.nome}»`);
  return `${euro(anno.importo)} l'anno, ${euro(mese.importo)} al mese`;
});

await agisci("⚠️ il barrato è dodici mesi di mensile, letti dal listino", async () => {
  const atteso = euro(costoAnnuoMensile(piano));
  const b = page.locator('[data-vetrina="richiamo"] [data-barrato]');
  if (!(await b.count())) throw new Error("nessun barrato accanto all'annuale");
  const mostrato = (await b.innerText()).replace(/invece di/i, "").trim();
  if (mostrato !== atteso) throw new Error(`mostra «${mostrato}», dodici mesi di mensile fanno ${atteso}`);
  return mostrato;
});

await agisci("⚠️ posti d'introduzione e Fondatori non ci sono più", async () => {
  const t = await page.locator('[data-vetrina="richiamo"]').innerText();
  if (/Fondatori|posti su|poi si va a listino/i.test(t)) throw new Error(`il richiamo dice ancora: ${t.slice(0, 120)}`);
  if (await page.locator('[data-vetrina="posti"]').count()) throw new Error("c'è ancora la riga dei posti");
});

await agisci("⚠️ lo sconto sull'interruttore si legge, a periodo selezionato", async () => {
  // L'annuale è il predefinito: «fino a −29%» era `text-primary` su un pulsante `bg-primary`,
  // verde su verde. Il testo c'era, quindi nessun controllo sul testo poteva accorgersene.
  const altra = await page.context().newPage();
  await altra.goto(`${BASE}/prezzi`, { waitUntil: "domcontentloaded" });
  const voce = altra.locator('[data-interruttore-periodo] [data-periodo="anno"]').first();
  await voce.waitFor({ timeout: 15_000 });
  const { testo, fondo, scritta } = await voce.evaluate((b) => {
    const s = b.querySelector("span");
    return {
      fondo: getComputedStyle(b).backgroundColor,
      testo: s ? getComputedStyle(s).color : "",
      scritta: s?.textContent ?? "",
    };
  });
  await altra.close();
  if (!/−\d+%/.test(scritta)) throw new Error(`nessuno sconto sul pulsante: «${scritta}»`);
  if (testo === fondo) throw new Error(`«${scritta}» ha lo stesso colore del fondo: ${testo}`);
  return scritta;
});

await agisci("chiudendolo non ricompare, nemmeno ricaricando", async () => {
  await page.locator('[data-vetrina="richiamo-chiudi"]').click();
  await page.waitForTimeout(400 * fattoreAttesa());
  if (await page.locator('[data-vetrina="richiamo"]').count()) throw new Error("non si è chiuso");
  await apri();
  await page.getByRole("button", { name: /Risultati/ }).click();
  await page.waitForTimeout(1500 * fattoreAttesa());
  if (await page.locator('[data-vetrina="richiamo"]').count()) {
    throw new Error("si riapre addosso a chi l'aveva appena chiuso");
  }
});

await agisci("⚠️ col consenso ancora aperto il richiamo non si mostra", async () => {
  // Prima stava sotto al banner dei cookie: visibile a metà e col pulsante che non
  // rispondeva al clic. Meglio non comparire che comparire inutilizzabile.
  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const p3 = await ctx3.newPage();
  await p3.goto(`${BASE}${ROTTA}`, { waitUntil: "domcontentloaded" });
  await senzaTour(p3);
  await p3.getByRole("button", { name: /Risultati/ }).click();
  await p3.waitForTimeout(2000 * fattoreAttesa());
  const banner = await p3.locator("[data-consenso]").count();
  const richiamo = await p3.locator('[data-vetrina="richiamo"]').count();
  if (!banner) throw new Error("il banner del consenso non c'è: il controllo non prova niente");
  if (richiamo) throw new Error("il richiamo si apre sotto il banner del consenso");
  await ctx3.close();
});

await agisci("il comando porta alla porta della fascia giusta", async () => {
  // Si riapre in un contesto pulito: la chiusura è ricordata nel browser precedente.
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}${ROTTA}`, { waitUntil: "domcontentloaded" });
  await senzaTour(p2);
  await scegliCookie(p2);
  await p2.getByRole("button", { name: /Risultati/ }).click();
  await p2.locator('[data-vetrina="richiamo-cta"]').waitFor({ timeout: 20_000 * fattoreAttesa() });
  await p2.locator('[data-vetrina="richiamo-cta"]').click();
  await p2.waitForURL(`**/attiva/${PIANO_PROPOSTO}`, { timeout: 20_000 * fattoreAttesa() });
  const t = await p2.locator("main").innerText();
  if (!t.includes(piano.nome)) throw new Error(`la porta non nomina «${piano.nome}»`);
  await ctx2.close();
});

await agisci("iscrivendosi da lì si arriva al pagamento di quella fascia", async () => {
  await registraEEntra(page, sql, { base: BASE, nome: "Da Vetrina", email: EMAIL, pwd: PWD_COLLAUDO });
  await page.goto(`${BASE}/impostazioni/abbonamento?fascia=${PIANO_PROPOSTO}`, {
    waitUntil: "domcontentloaded",
  });
  const d = page.getByRole("dialog");
  await d.waitFor({ timeout: 30_000 * fattoreAttesa() });
  const t = await d.innerText();
  if (!t.includes(piano.nome)) throw new Error(`il dialogo si è aperto su un'altra fascia: ${t.slice(0, 60)}`);
  if (!t.includes(euro(anno.importo))) throw new Error("il dialogo non mostra il prezzo del listino");
  return `${piano.nome} · ${euro(anno.importo)}`;
});

const ko = riepilogo("Vetrina: dal richiamo alla cassa");
await sql.end();
await browser.close();
if (ko > 0) process.exitCode = 1;
