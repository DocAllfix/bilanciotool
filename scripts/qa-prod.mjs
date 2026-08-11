// QA ESAUSTIVA in produzione: esercita OGNI comando interattivo del prodotto,
// non solo il percorso principale. Non si ferma al primo errore: registra tutto
// e stampa un referto finale. Cattura gli errori console pagina per pagina.
// Uso: node scripts/qa-prod.mjs [url]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";

const BASE = process.argv[2] ?? "https://evalisdeck.vercel.app";
const OUT = process.env.SHOT_DIR ?? "./shots-qa";
mkdirSync(OUT, { recursive: true });

const esiti = [];
const consoleErrors = [];
let sezione = "";
const set = (s) => { sezione = s; esiti.push({ tipo: "sezione", nome: s }); };
const check = async (nome, fn) => {
  try {
    await fn();
    esiti.push({ tipo: "ok", sezione, nome });
  } catch (e) {
    esiti.push({ tipo: "ko", sezione, nome, errore: String(e.message ?? e).split("\n")[0].slice(0, 160) });
  }
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`[${sezione}] ${m.text().slice(0, 200)}`); });
page.on("pageerror", (e) => consoleErrors.push(`[${sezione}] pageerror: ${e.message.slice(0, 200)}`));
// Un solo gestore dei dialoghi, per tutta la sessione. Con `page.once` per ogni
// conferma bastava un dialogo in più (o uno già chiuso in automatico da
// Playwright, che scarta i dialoghi senza gestore) per far morire l'intera QA
// con «Cannot accept dialog which is already handled».
page.on("dialog", (d) => { d.accept().catch(() => {}); });

const chiudiTour = async () => {
  for (let i = 0; i < 3; i++) {
    if (await page.locator(".driver-popover").isVisible().catch(() => false)) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(350);
    } else break;
  }
};
// I tour, partendo da soli dopo ~1,1s, coprono la pagina con l'overlay di
// driver.js e bloccano ogni clic fuori dall'elemento evidenziato: durante la QA
// vanno disattivati alla radice, non chiusi a mano (altrimenti ripartono).
const silenziaTour = () =>
  page.evaluate(() => {
    for (const k of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
      localStorage.setItem(`evalisdeck-tour:${k}`, "1");
    }
  });
const riattivaTour = () =>
  page.evaluate(() => {
    for (const k of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
      localStorage.removeItem(`evalisdeck-tour:${k}`);
    }
  });
const vaiPasso = async (prefisso, n, atteso) => {
  await page.click(`[data-tour="${prefisso}-passo-${n}"]`);
  await page.waitForURL(`**passo=${n}`, { timeout: 30000 });
  if (atteso) await page.getByText(atteso, { exact: false }).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(400);
};

const email = `qa-${Date.now()}@example.com`;
const PW = "PasswordSicura123!";

// ============================================================ 1. AUTENTICAZIONE
set("Autenticazione");
await check("landing risponde", async () => {
  const r = await page.goto(BASE + "/", { waitUntil: "networkidle" });
  if (!r?.ok()) throw new Error(`HTTP ${r?.status()}`);
});
await check("link Accedi dalla landing (header)", async () => {
  await page.getByRole("link", { name: "Accedi" }).first().click();
  await page.waitForURL("**/login", { timeout: 20000 });
});
await check("login con credenziali errate mostra errore", async () => {
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill("#email", "inesistente@example.com");
  await page.fill("#password", "sbagliata123");
  await page.click('button[type="submit"]');
  await page.getByRole("alert").waitFor({ timeout: 20000 });
});
await check("registrazione nuovo studio", async () => {
  await page.goto(BASE + "/registrati", { waitUntil: "networkidle" });
  await registraEEntra(page, sql, { base: BASE, nome: "QA Automatica", email: email, pwd: PW });
});
await page.waitForLoadState("networkidle");

// ============================================================ 2. SHELL E DEMO
set("Shell e stato demo");
await check("banner demo visibile", async () => {
  await page.getByText(/Stai esplorando la demo/).waitFor({ timeout: 20000 });
});
await check("tour parte da solo", async () => {
  await page.locator(".driver-popover").waitFor({ timeout: 10000 });
});
await check("tour: pulsante Avanti", async () => {
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.waitForTimeout(500);
});
await check("tour: chiusura con X", async () => {
  await page.locator(".driver-popover-close-btn").click();
  await page.waitForTimeout(500);
  if (await page.locator(".driver-popover").isVisible()) throw new Error("popover ancora aperto");
});
await check("tour: riapertura dal pulsante Tour", async () => {
  await page.getByRole("button", { name: "Tour" }).click();
  await page.locator(".driver-popover").waitFor({ timeout: 10000 });
  await chiudiTour();
});
// Verificato il tour, si silenzia per il resto della QA (il suo overlay
// bloccherebbe i clic sul resto della pagina).
await silenziaTour();
await check("toggle tema scuro e ritorno", async () => {
  await page.click('button[aria-label*="scuro"]');
  await page.waitForTimeout(500);
  await page.click('button[aria-label*="chiaro"]');
  await page.waitForTimeout(400);
});
await check("paywall demo: creazione azienda bloccata dal server", async () => {
  await page.click('[data-tour="nuova-azienda"]');
  await page.fill("#na-nome", "Bloccata Srl");
  await page.click('button[type="submit"]:has-text("Crea azienda")');
  const alert = page.getByRole("alert");
  await alert.waitFor({ timeout: 20000 });
  const testo = await alert.textContent();
  if (!/abbonamento/i.test(testo ?? "")) throw new Error(`messaggio inatteso: ${testo}`);
  await page.keyboard.press("Escape");
});
await page.screenshot({ path: `${OUT}/qa-01-dashboard-demo.png` });

// Attivazione (fino a Stripe: flag su DB)
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
await sql`update org_entitlement set status='active' where organization_id = (
  select m.organization_id from member m join "user" u on u.id = m.user_id where u.email = ${email})`;
await sql.end();
await page.reload({ waitUntil: "networkidle" });
await chiudiTour();

// ============================================================ 3. PORTAFOGLIO
set("Portafoglio");
await check("creazione azienda dopo attivazione", async () => {
  await page.click('[data-tour="nuova-azienda"]');
  await page.fill("#na-nome", "QA Test S.p.A.");
  await page.fill("#na-settore", "Test industriale");
  await page.fill("#na-sede", "Milano");
  await page.fill("#na-ateco", "25.62");
  await page.click('button[type="submit"]:has-text("Crea azienda")');
  await page.getByText("QA Test S.p.A.").waitFor({ timeout: 25000 });
});
await check("archiviazione azienda", async () => {
  const card = page.locator(".group", { hasText: "QA Test S.p.A." });
  await card.getByRole("button", { name: "Altre azioni" }).click();
  await page.getByRole("menuitem", { name: /Archivia/ }).click();
  await page.getByText("Archivio", { exact: true }).waitFor({ timeout: 25000 });
});
await check("ripristino azienda archiviata", async () => {
  // La card in archivio è l'ultima con il pulsante azioni sotto il titolo "Archivio"
  await page.getByText("Archivio", { exact: true }).waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "Altre azioni" }).last().click();
  await page.getByRole("menuitem", { name: /Ripristina/ }).click();
  await page.waitForTimeout(3000);
  await page.getByText("QA Test S.p.A.").first().waitFor({ timeout: 20000 });
});

// ============================================================ 4. PERCORSO GHG
set("Percorso GHG (azienda demo)");
await check("apertura inventario GHG della demo", async () => {
  const demo = page.locator('[data-tour="azienda-demo"]');
  await demo.locator('a[href$="/ghg"]').first().click();
  await page.waitForURL("**/ghg/**", { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await silenziaTour();
  await chiudiTour();
});
await check("passo 1: salvataggio campo confini", async () => {
  await vaiPasso("ghg", 1, "Identificazione");
  await page.fill("#b-responsabile", "QA Responsabile");
  await page.keyboard.press("Tab");
  await page.getByText("Salvato", { exact: false }).waitFor({ timeout: 20000 });
});
await check("passo 1: dati del periodo (intensità)", async () => {
  await page.fill("#m-fte", "50");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1500);
});
await check("passo 2: sorgente inclusa", async () => {
  await vaiPasso("ghg", 2, "Sorgenti valutate");
  await page.getByRole("group", { name: /Combustione mobile/ }).getByRole("button", { name: "Inclusa" }).click();
  await page.waitForTimeout(2000);
});
await check("passo 2: esclusione senza motivazione richiede la motivazione", async () => {
  await page.getByRole("group", { name: /Emissioni fuggitive/ }).getByRole("button", { name: "Esclusa" }).click();
  await page.getByText(/Scrivi la motivazione/i).waitFor({ timeout: 10000 });
});
await check("passo 2: esclusione con motivazione salvata", async () => {
  await page.getByLabel(/Motivazione per Emissioni fuggitive/).fill("Nessun impianto con gas refrigeranti soggetti a ricarica.");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(2500);
});
await check("passo 3: aggiunta voce con anteprima calcolo", async () => {
  await vaiPasso("ghg", 3, "Aggiungi voce");
  await page.click('[data-tour="aggiungi-voce"]');
  await page.fill("#v-q", "1000");
  await page.getByText(/tCO₂e/).first().waitFor({ timeout: 10000 });
  await page.click('button:has-text("Salva voce")');
  await page.waitForTimeout(3000);
});
await check("passo 3: cambio categoria aggiorna il fattore", async () => {
  await page.click('[data-tour="aggiungi-voce"]');
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: /Cat\. 2/ }).click();
  await page.waitForTimeout(600);
  const um = await page.locator("#v-um").inputValue();
  if (um !== "kWh") throw new Error(`unità non aggiornata: ${um}`);
  await page.getByRole("button", { name: "Annulla" }).click();
});
await check("passo 3: duplica voce", async () => {
  await page.locator('button[aria-label="Duplica"]').first().click();
  await page.waitForTimeout(3000);
});
await check("passo 3: modifica voce", async () => {
  await page.locator('button[aria-label="Modifica"]').first().click();
  await page.fill("#v-desc", "Voce modificata da QA");
  await page.click('button:has-text("Salva voce")');
  await page.getByText("Voce modificata da QA").waitFor({ timeout: 25000 });
});
await check("passo 3: elimina voce", async () => {
  await page.locator('button[aria-label="Elimina"]').first().click();
  await page.waitForTimeout(3000);
});
await check("passo 3: filtro per categoria", async () => {
  await page.getByLabel("Filtro categoria").click();
  await page.getByRole("option", { name: "Categoria 2" }).click();
  await page.waitForTimeout(1200);
  await page.getByLabel("Filtro categoria").click();
  await page.getByRole("option", { name: "Tutte le categorie" }).click();
  await page.waitForTimeout(800);
});
await check("passo 4: override fattore di emissione", async () => {
  await vaiPasso("ghg", 4, "Fonte e anno");
  const campo = page.getByLabel("Fattore Gas naturale").first();
  await campo.fill("1.98");
  await page.keyboard.press("Tab");
  await page.getByText("modificato").first().waitFor({ timeout: 25000 });
});
await check("passo 4: ripristino valore di piattaforma", async () => {
  await page.locator('button[aria-label*="Ripristina"]').first().click();
  await page.waitForTimeout(3000);
});
await check("passo 5: risultati coerenti", async () => {
  await vaiPasso("ghg", 5, "Totale location-based");
  await page.getByText("Composizione per scope").waitFor({ timeout: 20000 });
  await page.getByText("Doppia rendicontazione").waitFor({ timeout: 10000 });
});
await page.screenshot({ path: `${OUT}/qa-02-ghg-risultati.png` });
await check("passo 6: aggiunta obiettivo", async () => {
  await vaiPasso("ghg", 6, "Anno base");
  await page.fill("#ob-nome", "Obiettivo QA");
  await page.fill("#ob-rid", "20");
  await page.fill("#ob-anno", "2032");
  await page.getByRole("button", { name: "Aggiungi obiettivo" }).click();
  await page.getByText("Obiettivo QA").waitFor({ timeout: 25000 });
});
await check("passo 6: eliminazione obiettivo", async () => {
  await page.locator('button[aria-label="Elimina obiettivo"]').first().click();
  await page.waitForTimeout(3000);
});
await check("passo 7: stato checklist", async () => {
  await vaiPasso("ghg", 7, "Requisiti soddisfatti");
  await page.getByRole("group", { name: /Confini organizzativi definiti/ }).getByRole("button", { name: "Parziale" }).click();
  await page.waitForTimeout(2500);
});
await check("passo 8: pubblicazione + PDF", async () => {
  await vaiPasso("ghg", 8, "Pubblica il documento");
  await page.click('[data-tour="pubblica-documento"]');
  const popup = await page.waitForEvent("popup", { timeout: 60000 });
  await popup.waitForLoadState("networkidle");
  const id = popup.url().split("/documento/")[1];
  const res = await popup.request.get(`${BASE}/api/documenti/${id}/pdf`, { timeout: 120000 });
  if (!res.ok()) throw new Error(`PDF HTTP ${res.status()}`);
  const body = await res.body();
  if (body.subarray(0, 5).toString() !== "%PDF-") throw new Error("non è un PDF");
  await popup.close();
});

// ========================================================= 5. PERCORSO BILANCIO
set("Percorso Bilancio (azienda demo)");
await check("apertura bilancio della demo", async () => {
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  await silenziaTour();
  await chiudiTour();
  const demo = page.locator('[data-tour="azienda-demo"]');
  await demo.locator('a[href$="/bilancio"]').first().click();
  await page.waitForURL("**/bilancio/**", { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await silenziaTour();
  await chiudiTour();
});
await check("passo 1: campo profilo salvato", async () => {
  await vaiPasso("bil", 1, "Identità");
  await page.fill("#p-mercati", "Italia ed export UE (QA)");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(2500);
});
await check("passo 2: punteggio materialità", async () => {
  await vaiPasso("bil", 2, "Matrice di doppia rilevanza");
  await page.getByLabel("Impatto T05").click();
  await page.getByRole("option", { name: "3", exact: true }).click();
  await page.waitForTimeout(2500);
});
await check("passo 2: guida del tema si apre", async () => {
  await page.getByLabel(/Guida Biodiversità/).click();
  await page.getByText(/Dove trovare le informazioni/).waitFor({ timeout: 15000 });
});
await check("passo 2: proposta ATECO", async () => {
  await page.click('[data-tour="proposta-ateco"]');
  await page.getByText(/Proposta indicativa|Nessuna proposta/).waitFor({ timeout: 20000 });
});
await check("passo 2: cambio soglia", async () => {
  await page.getByLabel("Soglia di materialità").click();
  await page.getByRole("option", { name: "≥ 4", exact: true }).click();
  await page.waitForTimeout(2500);
  await page.getByLabel("Soglia di materialità").click();
  await page.getByRole("option", { name: "≥ 3", exact: true }).click();
  await page.waitForTimeout(2500);
});
await page.screenshot({ path: `${OUT}/qa-03-materialita.png` });
await check("passo 3: KPI con derivato aggiornato", async () => {
  await vaiPasso("bil", 3, "Energia");
  await page.getByLabel("Prelievo idrico totale 2025").fill("4200");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(3000);
});
await check("passo 4: politica su tema materiale", async () => {
  await vaiPasso("bil", 4, "tema materiale");
  await page.locator("#pol-T02").fill("Politica di efficienza energetica aggiornata (QA).");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(2500);
});
await check("passo 5: editor capitolo scrive e salva", async () => {
  await vaiPasso("bil", 5, "capitoli discorsivi");
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await editor.pressSequentially(" Aggiunta QA al capitolo.", { delay: 12 });
  await page.waitForTimeout(3000);
});
await check("passo 5: aggiunta diagramma dai dati", async () => {
  await page.getByLabel(/Aggiungi diagramma a Lettera/).click();
  await page.getByRole("option", { name: /Composizione dei consumi/ }).click();
  await page.waitForTimeout(3500);
});
await check("passo 5: rimozione elemento visivo", async () => {
  await page.locator('button[aria-label="Elimina elemento"]').first().click();
  await page.waitForTimeout(3000);
});
await check("passo 6: gap analysis con navigazione", async () => {
  await vaiPasso("bil", 6, "Pronto a pubblicare");
  await page.getByRole("button", { name: /Vai al passo/ }).first().click();
  await page.waitForTimeout(2500);
});
await check("passo 7: pubblicazione bilancio + PDF", async () => {
  await page.goto(page.url().split("?")[0] + "?passo=7", { waitUntil: "networkidle" });
  await silenziaTour();
  await chiudiTour();
  await page.click('[data-tour="pubblica-documento"]');
  const popup = await page.waitForEvent("popup", { timeout: 90000 });
  await popup.waitForLoadState("networkidle");
  await popup.screenshot({ path: `${OUT}/qa-04-documento-bilancio.png` });
  const id = popup.url().split("/documento/")[1];
  const res = await popup.request.get(`${BASE}/api/documenti/${id}/pdf`, { timeout: 120000 });
  if (!res.ok()) throw new Error(`PDF HTTP ${res.status()}`);
  await popup.close();
});

// ====================================================== 6. DIAGNOSI ENERGETICA
set("Diagnosi energetica");
let companyDemo = null;
await check("apertura del modulo energetico dal portafoglio", async () => {
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  await silenziaTour();
  await chiudiTour();
  const card = page.locator('[data-slot="card"]').filter({ hasText: "(demo)" }).first();
  await card.locator('a[href$="/energetico"]').first().click();
  await page.waitForURL("**/energetico**", { timeout: 40000 });
  companyDemo = page.url().match(/aziende\/([^/]+)/)?.[1] ?? null;
});
await check("creazione del bilancio energetico", async () => {
  await page.fill("#ce-anno", "2025");
  await page.fill("#ce-base", "2024");
  await page.click('button:has-text("Crea")');
  await page.waitForURL("**/energetico/2025**", { timeout: 60000 });
});
await check("passo 2: consumo e costo di un vettore", async () => {
  await vaiPasso("ene", 2, "Consumi annui");
  await page.getByLabel("Energia elettrica prelevata dalla rete: quantità in kWh", { exact: true }).fill("2280000");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1500);
  await page.getByLabel("Gas naturale: quantità in Smc", { exact: true }).fill("186000");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1500);
  await page.reload();
  await page.getByText("4.087.920").first().waitFor({ timeout: 40000 });
});
await check("passo 3: matrice di ripartizione e quadratura", async () => {
  await vaiPasso("ene", 3, "Uso finale");
  await page.getByLabel("Forni fusori e processi termici primari — Energia elettrica prelevata dalla rete in kWh", { exact: true }).fill("2280000");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1200);
  await page.getByLabel("Riscaldamento degli ambienti — Gas naturale in Smc", { exact: true }).fill("186000");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1500);
  await page.getByText("2 su 2").first().waitFor({ timeout: 20000 });
});
await check("passo 4: indicatori dai denominatori", async () => {
  await vaiPasso("ene", 4, "Variabili di riferimento");
  await page.getByLabel("Produzione dell'esercizio 2025", { exact: true }).fill("1200");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1200);
  await page.click('button:has-text("Ricalcola")');
  await page.getByText("3406,6").first().waitFor({ timeout: 60000 });
});
await check("pubblicazione della diagnosi e PDF serverless", async () => {
  await vaiPasso("ene", 8, "Versioni pubblicate");
  const [popup] = await Promise.all([
    page.waitForEvent("popup", { timeout: 120000 }),
    page.click('[data-tour="pubblica-documento"]'),
  ]);
  await popup.waitForLoadState("networkidle");
  await popup.getByText("4.087.920").first().waitFor({ timeout: 30000 });
  const id = popup.url().split("/documento/")[1];
  const res = await popup.request.get(`${BASE}/api/documenti/${id}/pdf`, { timeout: 180000 });
  if (!res.ok()) throw new Error(`PDF HTTP ${res.status()}`);
  await popup.close();
});
await page.screenshot({ path: `${OUT}/qa-06-energetico.png` });

// ==================================================== 7. ATTESTATO FORNITORE
set("Autovalutazione fornitore");
await check("apertura del modulo fornitore e creazione", async () => {
  await page.goto(`${BASE}/aziende/${companyDemo}/fornitore`, { waitUntil: "networkidle", timeout: 90000 });
  await silenziaTour();
  await chiudiTour();
  await page.click('button:has-text("Avvia")');
  await page.getByText("Indice di prontezza").first().waitFor({ timeout: 60000 });
});
await check("questionario: la risposta si accende e ripremendo si annulla", async () => {
  await page.click('[data-tour="sup-vista-questionario"]');
  await page.waitForURL("**vista=questionario", { timeout: 40000 });
  await page.getByLabel("B1: Sì", { exact: true }).click();
  await page.waitForTimeout(1500);
  if ((await page.getByLabel("B1: Sì", { exact: true }).getAttribute("aria-pressed")) !== "true") {
    throw new Error("la risposta non si accende");
  }
  await page.getByLabel("B1: Sì", { exact: true }).click();
  await page.waitForTimeout(1500);
  if ((await page.getByLabel("B1: Sì", { exact: true }).getAttribute("aria-pressed")) !== "false") {
    throw new Error("ripremere non annulla la scelta");
  }
  await page.getByLabel("B1: Sì", { exact: true }).click();
  await page.waitForTimeout(1500);
});
await check("pubblicazione dell'attestato, disclaimer e PDF", async () => {
  await page.click('[data-tour="sup-vista-attestato"]');
  await page.waitForURL("**vista=attestato", { timeout: 40000 });
  const [popup] = await Promise.all([
    page.waitForEvent("popup", { timeout: 120000 }),
    page.click('[data-tour="pubblica-documento"]'),
  ]);
  await popup.waitForLoadState("networkidle");
  await popup.getByText("Non costituisce certificazione").first().waitFor({ timeout: 30000 });
  const id = popup.url().split("/documento/")[1];
  const res = await popup.request.get(`${BASE}/api/documenti/${id}/pdf`, { timeout: 180000 });
  if (!res.ok()) throw new Error(`PDF HTTP ${res.status()}`);
  await popup.close();
});
await page.screenshot({ path: `${OUT}/qa-07-fornitore.png` });

// ============================================================ 8. SOA ISO 27001
set("Dichiarazione di Applicabilità");
await check("apertura del modulo SoA e creazione", async () => {
  await page.goto(`${BASE}/aziende/${companyDemo}/soa`, { waitUntil: "networkidle", timeout: 120000 });
  await silenziaTour();
  await chiudiTour();
  await page.click('button:has-text("Avvia la Dichiarazione")');
  await page.getByText("93 controlli in ambito").first().waitFor({ timeout: 120000 });
});
await check("attivare un modulo esteso allarga l'ambito", async () => {
  await page.click('[data-tour="soa-vista-contesto"]');
  await page.waitForURL("**vista=contesto", { timeout: 40000 });
  await page.getByLabel("Attiva il quadro 27017").check();
  await page.getByText("100 controlli in ambito").first().waitFor({ timeout: 90000 });
});
await check("registro: ricerca, stato di attuazione e motivazione", async () => {
  await page.click('[data-tour="soa-vista-controlli"]');
  await page.waitForURL("**vista=controlli", { timeout: 60000 });
  await page.getByLabel("Cerca fra i controlli").fill("5.1");
  await page.waitForTimeout(1200);
  await page.getByLabel("Stato di attuazione di 5.1").first().click();
  await page.getByRole("option", { name: "Attuato e verificato" }).click();
  await page.waitForTimeout(1800);
  await page.getByLabel("Apri il controllo 5.1").first().click();
  await page.waitForTimeout(700);
  await page.getByLabel("5.1: Valutazione del rischio").click();
  await page.waitForTimeout(1800);
});
await check("pubblicazione della Dichiarazione, nota 6.1.3 d) e PDF", async () => {
  await page.click('[data-tour="soa-vista-documento"]');
  await page.waitForURL("**vista=documento", { timeout: 60000 });
  const [popup] = await Promise.all([
    page.waitForEvent("popup", { timeout: 180000 }),
    page.click('[data-tour="pubblica-documento"]'),
  ]);
  await popup.waitForLoadState("networkidle");
  await popup.getByText("6.1.3 lettera d)").first().waitFor({ timeout: 60000 });
  const id = popup.url().split("/documento/")[1];
  const res = await popup.request.get(`${BASE}/api/documenti/${id}/pdf`, { timeout: 240000 });
  if (!res.ok()) throw new Error(`PDF HTTP ${res.status()}`);
  await popup.close();
});
await page.screenshot({ path: `${OUT}/qa-08-soa.png` });

// ================================================================ 9. MOBILE
set("Mobile");
await check("dashboard mobile con menu a scomparsa", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  await silenziaTour();
  await chiudiTour();
  await page.getByRole("button", { name: "Apri menu" }).click();
  await page.getByRole("link", { name: "Impostazioni" }).click();
  await page.waitForURL("**/impostazioni", { timeout: 20000 });
});
await page.screenshot({ path: `${OUT}/qa-05-mobile.png` });
await check("landing mobile", async () => {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /Prova la demo/ }).first().waitFor({ timeout: 15000 });
});

// ================================================================ 10. USCITA
set("Uscita e pagine pubbliche");
await page.setViewportSize({ width: 1440, height: 950 });
await check("logout dal menu utente", async () => {
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  await silenziaTour();
  await chiudiTour();
  await page.getByRole("button", { name: "Menu utente" }).click();
  await page.getByRole("menuitem", { name: "Esci" }).click();
  await page.waitForURL("**/login", { timeout: 25000 });
});
await check("area riservata protetta dopo il logout", async () => {
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  if (!page.url().includes("/login")) throw new Error(`accesso non protetto: ${page.url()}`);
});
for (const p of ["/privacy", "/termini", "/cookie", "/llms.txt", "/robots.txt", "/sitemap.xml", "/api/health"]) {
  await check(`pagina pubblica ${p}`, async () => {
    const r = await page.goto(BASE + p);
    if (!r?.ok()) throw new Error(`HTTP ${r?.status()}`);
  });
}

// ================================================================= REFERTO
await browser.close();
const ok = esiti.filter((e) => e.tipo === "ok").length;
const ko = esiti.filter((e) => e.tipo === "ko");
console.log("\n════════ REFERTO QA PRODUZIONE ════════");
for (const e of esiti) {
  if (e.tipo === "sezione") console.log(`\n▸ ${e.nome}`);
  else if (e.tipo === "ok") console.log(`  ✓ ${e.nome}`);
  else console.log(`  ✗ ${e.nome}\n      ${e.errore}`);
}
console.log(`\n${ok} controlli superati · ${ko.length} falliti`);
console.log(`Errori console: ${consoleErrors.length}`);
for (const e of [...new Set(consoleErrors)].slice(0, 12)) console.log("  " + e);
if (ko.length || consoleErrors.length) process.exitCode = 1;
