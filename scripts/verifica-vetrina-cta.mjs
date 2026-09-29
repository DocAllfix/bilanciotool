// Dal richiamo della vetrina fino alla cassa.
//
//   npm run qa -- vetrina-cta
//
// La vetrina esiste per convertire: questo collaudo percorre la strada intera — risultati →
// richiamo → `/attiva/<fascia>` → iscrizione → pagina dei piani col dialogo aperto sulla
// fascia giusta. La catena finale è già provata da `qa -- attivazione`; qui si verifica che
// il richiamo ci si agganci davvero, e che dica il vero sul prezzo.
//
// ⚠️ IL CONTROLLO CHE CONTA PIÙ DI TUTTI è quello sui posti: la frase che promette il prezzo
// d'introduzione si confronta con la RIGA DEL DATABASE, non col numero scritto nel banner. Un
// contatore che non scende è una scarsità inventata, cioè la cosa che questo meccanismo è
// stato costruito per non essere.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { strumenta, contatore, fattoreAttesa, spegniTour } from "./comune-collaudo.mjs";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import {
  PIANI, FASCIA_INTRODUZIONE, POSTI_INTRODUZIONE, FONDATORI,
  euro, prezzoDiVendita, promozioneInCorso,
} from "../src/lib/prezzi.ts";
import { rigaPosti } from "../src/features/vetrina/posti.ts";

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

const piano = PIANI[FASCIA_INTRODUZIONE];
const anno1 = prezzoDiVendita(piano, "anno1");

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

await agisci("il prezzo è quello del listino, e non c'è nessun barrato inventato", async () => {
  const t = await page.locator('[data-vetrina="richiamo"]').innerText();
  if (!t.includes(euro(anno1.importo))) throw new Error(`non mostra ${euro(anno1.importo)}`);
  // ⚠️ Oggi nessuna fascia ha un prezzo di lancio: un barrato qui sarebbe un prezzo mai
  // praticato, cioè pubblicità ingannevole. Il controllo si riadatta da solo se un giorno
  // la promozione esisterà davvero.
  const barrati = await page.locator('[data-vetrina="richiamo"] .line-through').count();
  if (promozioneInCorso()) {
    if (!barrati) throw new Error("c'è una promozione in corso e il listino non è barrato");
  } else if (barrati) {
    throw new Error("mostra un prezzo barrato senza nessuno sconto vero");
  }
  return `${euro(anno1.importo)}${promozioneInCorso() ? " (con barrato)" : " senza barrato"}`;
});

await agisci("⚠️ i posti dichiarati sono quelli del database", async () => {
  const [r] = await sql`
    select count(*)::int n from org_entitlement
    where piano = ${FASCIA_INTRODUZIONE} and status = 'active'`;
  const attesa = rigaPosti(Math.max(0, POSTI_INTRODUZIONE - r.n), POSTI_INTRODUZIONE);
  const riga = page.locator('[data-vetrina="posti"]');
  const presente = (await riga.count()) > 0;

  if (attesa === null) {
    if (presente) throw new Error("i posti sono finiti e il richiamo li promette ancora");
    return `posti esauriti (${r.n} attivazioni): il richiamo tace, ed è giusto`;
  }
  if (!presente) throw new Error(`restano posti (${r.n} attivazioni) e il richiamo non lo dice`);
  const mostrato = (await riga.innerText()).replace(/\s+/g, " ").trim();
  if (mostrato !== attesa) throw new Error(`mostra «${mostrato}», il database dice «${attesa}»`);
  return mostrato;
});

await agisci("nomina il Programma Fondatori, con i posti veri", async () => {
  const t = await page.locator('[data-vetrina="richiamo"]').innerText();
  if (!t.includes(String(FONDATORI.posti))) throw new Error("non dice quanti posti sono");
  if (!t.includes(euro(FONDATORI.primoAnno))) throw new Error("non dice quanto costa");
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
  await p2.waitForURL(`**/attiva/${FASCIA_INTRODUZIONE}`, { timeout: 20_000 * fattoreAttesa() });
  const t = await p2.locator("main").innerText();
  if (!t.includes(piano.nome)) throw new Error(`la porta non nomina «${piano.nome}»`);
  await ctx2.close();
});

await agisci("iscrivendosi da lì si arriva al pagamento di quella fascia", async () => {
  await registraEEntra(page, sql, { base: BASE, nome: "Da Vetrina", email: EMAIL, pwd: PWD_COLLAUDO });
  await page.goto(`${BASE}/impostazioni/abbonamento?fascia=${FASCIA_INTRODUZIONE}`, {
    waitUntil: "domcontentloaded",
  });
  const d = page.getByRole("dialog");
  await d.waitFor({ timeout: 30_000 * fattoreAttesa() });
  const t = await d.innerText();
  if (!t.includes(piano.nome)) throw new Error(`il dialogo si è aperto su un'altra fascia: ${t.slice(0, 60)}`);
  if (!t.includes(euro(anno1.importo))) throw new Error("il dialogo non mostra il prezzo del listino");
  return `${piano.nome} · ${euro(anno1.importo)}`;
});

const ko = riepilogo("Vetrina: dal richiamo alla cassa");
await sql.end();
await browser.close();
if (ko > 0) process.exitCode = 1;
