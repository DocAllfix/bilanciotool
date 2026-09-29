// La vetrina pubblica del Bilancio energetico: si apre senza account, si tocca, e non scrive.
//
//   npm run qa -- vetrina-energia
//
// ⚠️ I NUMERI ATTESI LI CALCOLA QUESTO FILE, leggendo i fattori dal catalogo del seme. Non
// chiama `calcola()`: un controllo che interroga la stessa funzione che sta collaudando è un
// elenco confrontato con la propria copia, e due copie sono sempre d'accordo.
//
// ⚠️ E il controllo che vale più di tutti è l'ultimo: dopo il caricamento la pagina non deve
// mandare NIENTE a noi. È la proprietà che rende la vetrina aperta a chiunque senza account,
// senza difese antispam e senza pulizie: se un giorno qualcuno ci attaccasse un salvataggio,
// questo collaudo diventa rosso prima che arrivi in produzione.

import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { strumenta, contatore, fattoreAttesa, spegniTour } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const ROTTA = "/percorsi/bilancio-energetico";

const leggi = (f) => JSON.parse(readFileSync(`src/lib/db/seeds/data/${f}`, "utf8"));
const FATTORI = leggi("energy-vector-factors.json");
const VETTORI = leggi("energy-vectors.json");
const USI = leggi("energy-end-uses.json");

/** kWh attesi: quantità per il potere di conversione, senza i sottovettori — `ele_go` è un
 *  dettaglio dell'elettrica, e sommarlo conterebbe l'energia due volte. */
function kwhAttesi(righe) {
  let tot = 0;
  for (const [k, q] of Object.entries(righe)) {
    const def = VETTORI.find((v) => v.k === k);
    if (!def || def.sub) continue;
    tot += Number(q) * Number(FATTORI[k].kwh);
  }
  return Math.round(tot);
}

const numero = (t) => Number(String(t).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const sonda = strumenta(page);
const { agisci, riepilogo } = contatore(page, sonda);

// Che cosa esce verso di noi: si raccoglie DA SUBITO, e si guarda dopo il primo gesto.
const uscite = [];
page.on("request", (r) => {
  const u = r.url();
  if (!u.startsWith(BASE)) return;
  if (r.method() === "GET") return; // documenti, script e fogli di stile
  // ⚠️ `/monitoraggio` è il tunnel di Sentry, non un salvataggio: esiste per aggirare i
  // blocchi pubblicitari e porta errori e prestazioni, non i numeri di chi sta provando.
  // Si esclude per NOME, non allargando il filtro: una server action di Next è una POST
  // verso questa stessa rotta, ed è esattamente ciò che questo controllo deve cogliere.
  if (u.includes("/monitoraggio")) return;
  uscite.push(`${r.method()} ${u.replace(BASE, "")}`);
});

// ⚠️ Il giro guidato parte da solo alla prima visita e il suo velo intercetta i clic: si
// spegne, come in tutti gli altri collaudi. Ha il proprio banco di prova, `qa -- vetrina-tour`.
const vai = async () => {
  const r = await page.goto(`${BASE}${ROTTA}`, { waitUntil: "domcontentloaded" });
  await spegniTour(page);
  return r;
};

await agisci("la vetrina si apre senza account", async () => {
  const r = await vai();
  if (r.status() !== 200) throw new Error(`risponde ${r.status()}`);
  await page.locator('[data-vetrina="strumento"]').waitFor({ timeout: 20_000 * fattoreAttesa() });
  // Nessun rinvio all'accesso: è il punto di tutta la pagina.
  if (/\/login/.test(page.url())) throw new Error("ha rimandato all'accesso");
});

await agisci("un percorso che non ha vetrina risponde 404", async () => {
  // ⚠️ Si CHIEDE la pagina, non la si apre nel browser: un 404 caricato davvero scrive un
  // errore in console, e le tre spie lo raccoglierebbero come guasto del prodotto — mentre
  // è la cosa che gli stiamo chiedendo di fare. Allargare il filtro dei 404 avrebbe
  // nascosto anche quelli veri per tutto il resto del giro.
  const r = await ctx.request.get(`${BASE}/percorsi/non-esiste`);
  if (r.status() !== 404) throw new Error(`risponde ${r.status()} invece di 404`);
});

await agisci("parte dall'esempio, e i kWh sono quelli del catalogo", async () => {
  const mostrato = numero(await page.locator('[data-vetrina="kwh-totale"]').innerText());
  const atteso = kwhAttesi({ ele: 612000, ele_go: 180000, fv: 42000, gas: 42500, gasolio_t: 8600 });
  if (Math.abs(mostrato - atteso) > 1) throw new Error(`mostra ${mostrato}, il catalogo dice ${atteso}`);
  return `${mostrato} kWh`;
});

await agisci("cambiando un consumo il totale segue, del valore giusto", async () => {
  // Il gas vale 9,72 kWh allo Smc: raddoppiarlo deve spostare il totale di 42.500 × 9,72.
  await page.locator("#q-gas").fill("85000");
  await page.waitForTimeout(400 * fattoreAttesa());
  const dopo = numero(await page.locator('[data-vetrina="kwh-totale"]').innerText());
  const atteso = kwhAttesi({ ele: 612000, fv: 42000, gas: 85000, gasolio_t: 8600 });
  if (Math.abs(dopo - atteso) > 1) throw new Error(`dopo la modifica mostra ${dopo}, atteso ${atteso}`);
  return `${dopo} kWh`;
});

await agisci("la quadratura si accorge che il gas non è più ripartito", async () => {
  await page.getByRole("button", { name: /Usi finali/ }).click();
  await page.waitForTimeout(300 * fattoreAttesa());
  const t = await page.locator('[data-vetrina="quadratura-gas"]').innerText();
  if (/quadra/.test(t)) throw new Error("dice che quadra, ma mancano 42.500 Smc da ripartire");
  if (!/da ripartire/.test(t)) throw new Error(`non spiega che cosa manca: «${t}»`);
  return t.replace(/\s+/g, " ");
});

await agisci("si ricomincia dall'esempio, e torna a quadrare", async () => {
  await page.locator('[data-vetrina="ricomincia"]').click();
  await page.waitForTimeout(400 * fattoreAttesa());
  const t = await page.locator('[data-vetrina="quadratura-gas"]').innerText();
  if (!/quadra/.test(t)) throw new Error(`dopo il ripristino la quadratura dice «${t}»`);
});

await agisci("i risultati mostrano i grafici della diagnosi", async () => {
  await page.getByRole("button", { name: /Risultati/ }).click();
  await page.waitForTimeout(500 * fattoreAttesa());
  for (const parte of ["sankey", "pareto", "tessere"]) {
    if (!(await page.locator(`[data-vetrina="${parte}"]`).count())) throw new Error(`manca ${parte}`);
  }
  // I grafici sono SVG veri, non immagini: se un giorno diventassero `<img>` avremmo una
  // figura che non segue più i numeri di chi la sta guardando.
  const archi = await page.locator('[data-vetrina="sankey"] svg path').count();
  if (archi < 3) throw new Error(`il diagramma di flusso ha ${archi} archi`);
  const barre = await page.locator('[data-vetrina="pareto"] svg rect').count();
  if (barre < 5) throw new Error(`la graduatoria ha ${barre} barre`);
  return `${archi} archi, ${barre} barre`;
});

await agisci("i passi che stanno nell'account sono dichiarati, non nascosti", async () => {
  const t = await page.locator("main").innerText();
  for (const atteso of ["Interventi", "Bilancio", "Racconto"]) {
    if (!t.includes(atteso)) throw new Error(`non nomina il passo «${atteso}»`);
  }
  if (!/nell'account|non si registra|resta nel tuo browser/i.test(t)) {
    throw new Error("non dice che cosa resta fuori dalla prova");
  }
});

await agisci("⚠️ la vetrina non manda NIENTE a noi", async () => {
  // Dopo tutti i gesti di questo collaudo: nessuna POST, nessuna server action.
  if (uscite.length) throw new Error(`ha scritto: ${uscite.slice(0, 3).join(" · ")}`);
  return "zero richieste in uscita";
});

await agisci("da telefono niente sfondamento, e la tabella scorre per conto suo", async () => {
  await page.setViewportSize({ width: 360, height: 780 });
  await vai();
  await page.waitForTimeout(600 * fattoreAttesa());
  const sfondo = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (sfondo > 0) throw new Error(`la pagina sfonda di ${sfondo}px`);
  const scorre = await page.evaluate(() => {
    const t = document.querySelector('[data-vetrina="passo-vettori"] .overflow-x-auto');
    return t ? t.scrollWidth > t.clientWidth : false;
  });
  if (!scorre) throw new Error("la tabella non scorre nel proprio contenitore");
  await page.setViewportSize({ width: 1440, height: 1000 });
});

await agisci("il catalogo dichiarato nella pagina è quello vero", async () => {
  const t = await page.locator("main").innerText();
  // Il catalogo intero: è il numero che dicono anche la home, la guida e il seme. Uno dei
  // dodici è un dettaglio dell'elettrica, ma resta un vettore del catalogo — e due numeri
  // per la stessa cosa, su due pagine dello stesso sito, sono un difetto in sé.
  const vettoriVeri = VETTORI.length;
  if (!t.includes(String(vettoriVeri))) throw new Error(`non dichiara i ${vettoriVeri} vettori`);
  if (!t.includes(String(USI.length))) throw new Error(`non dichiara i ${USI.length} usi finali`);
  return `${vettoriVeri} vettori · ${USI.length} usi`;
});

const ko = riepilogo("Vetrina del Bilancio energetico");
await browser.close();
if (ko > 0) process.exitCode = 1;
