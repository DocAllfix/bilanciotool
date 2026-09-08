// Gate visivo del pacchetto identità: loghi, sidebar collassabile, dashboard
// arricchita, navigazione dei passi. Richiede `npm run dev` attivo e le
// credenziali QA (env QA_EMAIL/QA_PASSWORD o default della org di sviluppo).
import { chromium } from "@playwright/test";
import postgres from "postgres";
import { spegniTour } from "./comune-collaudo.mjs";
import { mkdirSync } from "node:fs";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });

const OUT = process.env.SHOT_DIR ?? "./shots-shell";
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3000";
const QA_EMAIL = process.env.QA_EMAIL ?? null;
const PW = process.env.QA_PASSWORD ?? "EvalisDeck2026!";
const errors = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) errors.push(`[${page.url()}] ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror ${page.url()}] ${e.message}`));

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
const go = async (url) => {
  await page.goto(BASE + url);
  await page.waitForLoadState("networkidle");
};
// ⚠️ Si usa il silenziatore CONDIVISO invece di una copia locale. Questa ne aveva una
// ferma a tre chiavi da quando i moduli erano tre, e non chiudeva il velo del benvenuto:
// il collaudo moriva su un pulsante coperto da un video.
const silenziaTour = () => spegniTour(page);

// Landing + auth: logo orizzontale e lockup verticale
await go("/");
await shot("01-landing-header");
await go("/login");
await shot("02-login-logo");

// Accesso: si REGISTRA sempre un conto nuovo (il signup crea lo studio demo con
// l'azienda d'esempio gia' pronta).
//
// ⚠️ Prima si tentava l'accesso con un indirizzo indovinato e si ripiegava sulla
// registrazione se non esisteva. Quel tentativo fallito e' un 401 vero sull'endpoint di
// accesso, e questo collaudo raccoglie gli errori di console: si segnalava da solo, e su
// un database pulito NON POTEVA essere verde. Un collaudo che non sa dove si trova non
// deve indovinare: ci va.
if (QA_EMAIL) {
  // Solo se qualcuno passa esplicitamente un conto esistente (utile contro un ambiente
  // popolato): in quel caso il fallimento e' un difetto e deve vedersi.
  await page.fill("#email", QA_EMAIL);
  await page.fill("#password", PW);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30000 });
} else {
  await go("/registrati");
  await registraEEntra(page, sql, {
    base: BASE,
    nome: "QA Shell",
    email: `qa-shell-${Date.now()}@example.com`,
    pwd: PW,
  });
}
await silenziaTour();
// ⚠️ `networkidle` pretende mezzo secondo di silenzio di rete, e la dashboard con undici
// moduli ci mette fra i quattro e gli otto secondi a rispondere: la ricarica scadeva a
// trenta senza che niente fosse rotto. Si aspetta cio' che serve davvero — che la pagina
// sia lì — invece di una condizione che non e' quella che interessa.
await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator("main").waitFor({ timeout: 60_000 });
await page.waitForTimeout(800);

// Dashboard arricchita
await shot("03-dashboard");

// Sidebar compatta
await page.click('button[aria-label="Comprimi la barra laterale"]');
await page.waitForTimeout(450);
await shot("04-sidebar-compatta");
await page.click('button[aria-label="Espandi la barra laterale"]');
await page.waitForTimeout(450);

// Card cliccabile: clic sul corpo della card demo → FASCICOLO → inventario.
//
// ⚠️ Dalla Fase 1 (25 agosto 2026, i tre gruppi) la card del portafoglio porta al
// FASCICOLO dell'azienda, non piu' dritta a un modulo: dalla card non si salta piu'
// dentro un singolo percorso, si passa di li'. Questo collaudo era rimasto alla
// navigazione di prima e attendeva `**/ghg**` per sessanta secondi mentre il browser era
// gia' fermo sul fascicolo — moriva con «TimeoutError», che non dice niente di utile.
await page.locator('[data-tour="azienda-demo"] a[aria-label^="Apri"]').click();
await page.waitForURL(/\/aziende\/[^/]+(\?|#|$)/, { timeout: 60000 });
await page.locator('[data-percorsi] [data-modulo="ghg"] a').first().click();
await page.waitForURL("**/ghg**", { timeout: 60000 });
await page.waitForLoadState("networkidle");
await page.getByText("avanzamento").waitFor({ timeout: 60000 });
await silenziaTour();
await shot("05-ghg-wizard-nav");

// ⚠️ LA BARRA LATERALE SU UNO SCHERMO BASSO, MISURATA.
//
// Dentro un'azienda la barra porta il nome, il fascicolo e i quattordici percorsi. Con
// l'<aside> fissa a tutta altezza e in colonna, il contenuto usciva dal riquadro
// PORTANDOSI VIA CIO' CHE STA SOTTO: menu dell'account e interruttore del tema
// irraggiungibili (2 settembre 2026). Cresce a ogni modulo nuovo, quindi si misura.
//
// ⚠️ I DUE MODI DI ROMPERLA SONO DIVERSI, e ciascuno ha la sua asserzione. Provati
// rimettendoli uno per volta:
//   · senza `overflow-y-auto` la scatola resta alta 486 e il contenuto viene TAGLIATO:
//     il piede sta al suo posto e le ultime voci non si raggiungono piu';
//   · senza `min-h-0` E senza overflow la scatola cresce a 853 e il piede finisce a 1047,
//     cioe' trecentosessantasette punti sotto la piega.
//
// ⚠️ E NON si usa `scrollHeight > clientHeight` come prova che «scorre»: e' vero anche
// quando il contenuto e' semplicemente tagliato, ed e' il motivo per cui la prima
// versione di questo controllo restava verde con la barra rotta. Si guarda l'`overflow`
// calcolato, che e' il fatto.
await page.setViewportSize({ width: 1280, height: 680 });
await page.waitForTimeout(400);
const barra = await page.evaluate(() => {
  const aside = document.querySelector("aside");
  if (!aside) return null;
  const cont = aside.querySelector("nav")?.parentElement;
  if (!cont) return { senzaNav: true };
  const y = getComputedStyle(cont).overflowY;
  return {
    voci: aside.querySelectorAll("a").length,
    scorrevole: y === "auto" || y === "scroll",
    eccede: cont.scrollHeight > cont.clientHeight,
    // ⚠️ Il piede e' l'ULTIMO FIGLIO dell'aside, non l'aside: quella e' `fixed` a tutta
    // altezza, quindi il suo bordo inferiore coincide sempre con quello dello schermo e
    // misurarla non poteva mai dare rosso.
    piedeDentro: aside.lastElementChild.getBoundingClientRect().bottom <= window.innerHeight + 1,
  };
});
if (!barra) errors.push("[barra] nessuna <aside> nella shell di un'azienda");
else if (barra.senzaNav) errors.push("[barra] nessun <nav> dentro l'aside: la struttura e' cambiata");
else {
  if (barra.voci < 15) errors.push(`[barra] solo ${barra.voci} voci: non e' la barra contestuale dell'azienda`);
  if (!barra.eccede) errors.push(`[barra] a 680px di altezza le ${barra.voci} voci ci stanno tutte: questo controllo non sta piu' misurando niente`);
  if (!barra.scorrevole) errors.push("[barra] il contenitore delle voci non scorre: le ultime restano tagliate");
  if (!barra.piedeDentro) errors.push("[barra] il piede della barra e' fuori dallo schermo: account e tema irraggiungibili");
}
// L'ultima voce si raggiunge, e al clic risponde LEI. `elementFromPoint` lo dice in tre
// righe, e l'occhio no.
const ultimaVoce = page.locator("aside a").last();
await ultimaVoce.scrollIntoViewIfNeeded().catch(() => {});
const rett = await ultimaVoce.boundingBox();
if (!rett) errors.push("[barra] l'ultima voce non ha un rettangolo: non e' raggiungibile");
else {
  const atteso = (await ultimaVoce.textContent())?.trim() ?? "";
  const colpito = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest("a")?.textContent?.trim() ?? null,
    [rett.x + rett.width / 2, rett.y + rett.height / 2],
  );
  if (colpito !== atteso) errors.push(`[barra] al clic sull'ultima voce risponde «${colpito}» invece di «${atteso}»`);
}
await shot("05b-barra-schermo-basso");
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(300);
// Navigazione a piè di pagina: avanti e indietro
await page.getByRole("button", { name: /Vai al passo 2/ }).click();
await page.waitForURL("**passo=2**", { timeout: 15000 });
await page.getByRole("button", { name: /Torna al passo 1/ }).click();
await page.waitForURL("**passo=1**", { timeout: 15000 });
await shot("06-wizard-indietro");

// Dark mode della dashboard
await go("/dashboard");
await page.click('button[aria-label*="scuro"]');
await page.waitForTimeout(400);
await shot("07-dashboard-dark");
await page.click('button[aria-label*="chiaro"]');

// Mobile
await page.setViewportSize({ width: 390, height: 844 });
await go("/dashboard");
await shot("08-dashboard-mobile");

await browser.close();
if (errors.length) {
  console.error("ERRORI CONSOLE:\n" + errors.join("\n"));
  process.exit(1);
}
console.log(`OK — screenshot in ${OUT}`);
