// Il giro guidato della vetrina: parte da solo, spiega, e non si mette in mezzo.
//
//   npm run qa -- vetrina-tour
//
// ⚠️ È L'UNICO TOUR SU UNA PAGINA PUBBLICA, e su una pagina che ha anche la scelta sui cookie
// e un richiamo all'acquisto in basso. Tre cose che possono coprirsi a vicenda: questo
// collaudo esiste per la stessa ragione di `qa -- benvenuto-velo`, dove il velo del giro si
// apriva sopra il video e rendeva incliccabile il pulsante per proseguire.

import { chromium } from "@playwright/test";
import { strumenta, contatore, fattoreAttesa } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const ROTTA = "/percorsi/bilancio-energetico";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const sonda = strumenta(page);
const { agisci, riepilogo } = contatore(page, sonda);

const velo = () => page.locator(".driver-overlay");
const finestra = () => page.locator("[data-consenso]");

await agisci("⚠️ col consenso aperto il giro NON parte", async () => {
  // ⚠️ L'attesa è della VETRINA, non del cancello generale di `avviaTour`: il banner dei
  // cookie non si dichiara finestra (segnarlo così impediva al giro del benvenuto di
  // partire, e due controlli di `qa -- benvenuto` l'hanno detto subito). Qui il giro aspetta
  // la scelta perché un velo sopra il consenso lo renderebbe incliccabile, e quella scelta
  // è dovuta.
  await page.goto(`${BASE}${ROTTA}`, { waitUntil: "domcontentloaded" });
  await finestra().waitFor({ state: "attached", timeout: 10_000 * fattoreAttesa() });
  await page.waitForTimeout(2500 * fattoreAttesa());
  if (await velo().count()) throw new Error("il velo del giro si è aperto sopra il consenso");
  return "il banner è lì, il giro aspetta";
});

await agisci("fatta la scelta, il giro parte da solo — E DAL RISULTATO", async () => {
  // ⚠️ IL CONTROLLO CHE CONTA È IL PASSO, non la frase. Il giro cominciava dai consumi, cioè
  // dal lavoro: spiegava il mezzo a chi non aveva ancora visto il fine. Ora porta la persona
  // sul passo 4 e le mostra la diagnosi finita. Un controllo sul solo testo della prima
  // tappa sarebbe verde anche se la pagina fosse rimasta sui consumi.
  await page.getByRole("button", { name: "Rifiuta", exact: true }).click();
  await finestra().waitFor({ state: "detached", timeout: 15_000 * fattoreAttesa() });
  await velo().waitFor({ timeout: 20_000 * fattoreAttesa() });
  if (!(await page.locator('[data-vetrina="passo-risultati"]').count())) {
    throw new Error("il giro è partito, ma non sui risultati");
  }
  const t = await page.locator(".driver-popover").innerText();
  if (!/diagnosi finita/i.test(t)) throw new Error(`la prima tappa dice: ${t.slice(0, 60)}`);
});

await agisci("⚠️ col giro aperto il richiamo all'acquisto NON si mostra", async () => {
  // Aprendo sul risultato, la condizione «valore consegnato» è vera dal primo istante:
  // senza il velo fra i marcatori, il banner si aprirebbe SOTTO il giro, col pulsante che
  // non risponde al clic. È la famiglia del velo sopra il video di benvenuto, prevista
  // invece che scoperta — e la prova è che il richiamo non c'è mentre il velo c'è.
  if (!(await velo().count())) throw new Error("il velo non c'è: il controllo non prova niente");
  await page.waitForTimeout(1500 * fattoreAttesa());
  if (await page.locator('[data-vetrina="richiamo"]').count()) {
    throw new Error("il richiamo si è aperto sotto il velo del giro");
  }
});

await agisci("le tappe si percorrono fino in fondo", async () => {
  let tappe = 1;
  for (let i = 0; i < 10; i++) {
    const avanti = page.getByRole("button", { name: /Avanti|Fine|Ho capito/i });
    if (!(await avanti.count())) break;
    await avanti.first().click();
    await page.waitForTimeout(400 * fattoreAttesa());
    if (!(await velo().count())) break;
    tappe++;
  }
  if (tappe < 4) throw new Error(`il giro si è fermato alla tappa ${tappe}`);
  if (await velo().count()) throw new Error("il velo è rimasto aperto alla fine del giro");
  return `${tappe} tappe`;
});

await agisci("finito il giro, il richiamo si arma da solo", async () => {
  // L'ordine conta: il velo se n'è andato, quindi il banner d'acquisto non finisce sotto.
  // E non serve premere niente: si è già sui risultati, quindi il richiamo deve comparire
  // per conto proprio entro il giro di controllo del cancello (mezzo secondo).
  await page.locator('[data-vetrina="richiamo"]').waitFor({ timeout: 20_000 * fattoreAttesa() });
  if (await velo().count()) throw new Error("velo e richiamo insieme");
});

await agisci("alla visita dopo il giro non riparte", async () => {
  await page.goto(`${BASE}${ROTTA}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000 * fattoreAttesa());
  if (await velo().count()) throw new Error("riparte a ogni visita: dopo due volte è un fastidio");
});

await agisci("ma si può rifare col comando, quando lo si chiede", async () => {
  await page.locator('[data-vetrina="tour"]').click();
  await velo().waitFor({ timeout: 15_000 * fattoreAttesa() });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600 * fattoreAttesa());
  if (await velo().count()) throw new Error("con Esc il velo non si chiude");
});

const ko = riepilogo("Vetrina: il giro guidato");
await browser.close();
if (ko > 0) process.exitCode = 1;
