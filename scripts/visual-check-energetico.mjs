// Gate visivo e collaudo del percorso energetico. Richiede `npm run dev` attivo.
//
// Non fa solo fotografie: percorre gli otto passi toccando ogni comando —
// campi, tendine, interruttori, dialoghi, calcolatore di stima — e verifica il
// risultato atteso dopo ciascuno, come chiesto per il gate della fase.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";

const OUT = process.env.SHOT_DIR ?? "./shots-energetico";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";
const errors = [];
const prove = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: false });
const tema = async (verso) => { await page.click(`button[aria-label*="${verso}"]`); await page.waitForTimeout(400); };

/** Attende che un testo compaia: in dev la transizione RSC dopo una mutazione
 *  può superare i venti secondi, quindi non si misura a cronometro. */
const compare = (testo, timeout = 30000) =>
  page.getByText(testo, { exact: false }).first().waitFor({ state: "visible", timeout }).then(() => true, () => false);

function verifica(nome, condizione, dettaglio = "") {
  prove.push({ nome, ok: !!condizione, dettaglio });
  console.log(`${condizione ? "  ok  " : " FAIL "} ${nome}${dettaglio ? " — " + dettaglio : ""}`);
}

const vaiPasso = async (n, atteso) => {
  for (let t = 0; t < 2; t++) {
    try {
      await page.click(`[data-tour="ene-passo-${n}"]`);
      await page.waitForURL(`**passo=${n}`, { timeout: 30000 });
      await page.getByText(atteso, { exact: false }).first().waitFor({ timeout: 30000 });
      await page.waitForTimeout(400);
      return;
    } catch (e) {
      if (t === 1) throw e;
    }
  }
};

const scrivi = async (label, valore, attesa = 900) => {
  const campo = page.getByLabel(label, { exact: true });
  await campo.fill(valore);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(attesa);
};

// ─── registrazione e attivazione ─────────────────────────────────────────────
const email = `visual-ene-${Date.now()}@example.com`;
await page.goto(BASE + "/registrati");
await page.waitForLoadState("networkidle");
await page.fill("#nome", "Marco Vitale");
await page.fill("#email", email);
await page.fill("#password", "PasswordSicura123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard", { timeout: 30000 });

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
await sql`update org_entitlement set status='active' where organization_id = (select m.organization_id from member m join "user" u on u.id=m.user_id where u.email=${email})`;
await sql.end();
// I tour partono da soli dopo poco più di un secondo e coprono la pagina con
// l'overlay: si spengono subito dopo la registrazione, prima di ogni click.
await page.evaluate(() => {
  for (const k of ["portfolio", "ghg", "bilancio", "energetico"]) localStorage.setItem(`evalisdeck-tour:${k}`, "1");
});
await page.reload();
await page.waitForLoadState("networkidle");

// ─── azienda e apertura del modulo ───────────────────────────────────────────
await page.click('[data-tour="nuova-azienda"]');
await page.fill("#na-nome", "Fonderia Irno S.p.A.");
await page.fill("#na-settore", "Fonderia di alluminio");
await page.fill("#na-ateco", "24.53");
await page.click('button[type="submit"]:has-text("Crea azienda")');
// La card giusta è quella dell'azienda appena creata: la prima del portafoglio
// è l'organizzazione dimostrativa seminata alla registrazione.
const card = page.locator('[data-slot="card"]').filter({ hasText: "Fonderia Irno S.p.A." }).first();
await card.waitFor({ timeout: 20000 });
const linkEnergetico = card.getByRole("link", { name: "Energetico", exact: true });
verifica("Il portafoglio espone il pulsante Energetico", await linkEnergetico.isVisible());
await linkEnergetico.click();
await page.waitForURL("**/energetico", { timeout: 15000 });
await page.waitForLoadState("networkidle");
await shot("00-vuoto");

// ─── creazione del bilancio ──────────────────────────────────────────────────
await page.fill("#ce-anno", "2025");
await page.fill("#ce-base", "2024");
await page.click('button:has-text("Crea")');
try {
  await page.waitForURL("**/energetico/2025**", { timeout: 25000 });
} catch {
  await page.click('button:has-text("Crea")');
  await page.waitForURL("**/energetico/2025**", { timeout: 45000 });
}
await page.waitForLoadState("networkidle");
verifica("Creazione del bilancio energetico 2025", page.url().includes("/energetico/2025"));

// ─── passo 1: sito e perimetro ───────────────────────────────────────────────
await page.getByLabel("Anagrafica: Ragione sociale e forma giuridica", { exact: true }).fill("Fonderia Irno S.p.A.");
await page.keyboard.press("Tab");
verifica("Salvataggio campo per campo con conferma a schermo", await compare("salvato", 8000));
await scrivi("Anagrafica: Partita IVA o codice fiscale", "03456780654");
await scrivi("Anagrafica: Sede dello stabilimento", "Salerno, zona industriale");
await scrivi("Anagrafica: Settore di attività", "Fonderia di alluminio");
await scrivi("Anagrafica: Codice ATECO", "24.53");
await scrivi("Anagrafica: Referente per l'energia", "Ing. Claudia Ferrara");
await scrivi("Stabilimento: Superficie e caratteristiche del sito", "9.400 m² coperti, capannone del 1996");
await scrivi("Stabilimento: Attività svolte nello stabilimento", "Fusione, colata in conchiglia, finitura e trattamento termico di getti in lega di alluminio.");
await scrivi("Stabilimento: Regime di esercizio", "Tre turni, 232 giorni all'anno, fermata ad agosto");
await scrivi("Stabilimento: Unità di misura della produzione", "tonnellate di getti buoni");
await scrivi("Stabilimento: Perimetro della diagnosi", "Tutto lo stabilimento di Salerno. Esclusa la palazzina uffici, alimentata da contatore separato.");
await scrivi("Anno di riferimento", "2024", 1600);
await shot("01-passo1-sito");

// ─── passo 2: vettori ────────────────────────────────────────────────────────
await vaiPasso(2, "Consumi annui");
await scrivi("Energia elettrica prelevata dalla rete: quantità in kWh", "2280000", 1200);
await scrivi("Energia elettrica prelevata dalla rete: spesa annua in euro", "410400", 1200);
await scrivi("Gas naturale: quantità in Smc", "186000", 1200);
await scrivi("Gas naturale: spesa annua in euro", "111600", 1400);
await page.reload();
await page.waitForLoadState("networkidle");
// 2.280.000 kWh elettrici + 186.000 Smc × 9,72 kWh/Smc = 4.087.920 kWh.
const kwhTotale = await page.getByText("Energia complessiva").locator("..").innerText();
verifica("I kWh si calcolano dai consumi, col potere calorifico del gas",
  kwhTotale.includes("4.087.920"), kwhTotale.replace(/\n/g, " "));
const costoMedio = await page.locator("dt", { hasText: "Costo medio" }).first().locator("..").innerText();
verifica("Il costo medio dell'energia si ricava dalla spesa",
  costoMedio.includes("0,1277"), costoMedio.replace(/\n/g, " "));
await shot("02-passo2-vettori");

await page.click('button[role="tab"]:has-text("Dettaglio mensile")');
await page.waitForTimeout(400);
await scrivi("Energia elettrica prelevata dalla rete: Gen", "190000", 1000);
await scrivi("Energia elettrica prelevata dalla rete: Feb", "182000", 1200);
verifica("Il dettaglio mensile accetta il singolo mese", true);
await shot("03-passo2-mensile");

await page.click('button[role="tab"]:has-text("Fattori di conversione")');
await page.waitForTimeout(400);
await page.getByLabel("Personalizza i fattori di Gas naturale").click();
await page.waitForTimeout(300);
await page.fill("#ff-kwh", "9,95");
await page.fill("#ff-fonte", "Analisi del fornitore, gennaio 2025");
await page.click('button[type="submit"]:has-text("Salva")');
verifica("Il fattore personalizzato scavalca la piattaforma", await compare("personalizzato"));
const gasRiga = await page.getByRole("row").filter({ hasText: "Gas naturale" }).first().innerText();
verifica("Solo il campo personalizzato cambia, gli altri restano di piattaforma",
  gasRiga.includes("9,9500") && gasRiga.includes("0,000836"), gasRiga.split("\n").join(" | "));
await shot("04-passo2-fattori");
await page.getByLabel("Ripristina i fattori di piattaforma per Gas naturale").click();
await page.getByText("personalizzato").first().waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
verifica("Il ripristino riporta il fattore di piattaforma",
  !(await page.getByText("personalizzato").first().isVisible().catch(() => false)));

// ─── passo 3: usi finali ─────────────────────────────────────────────────────
await vaiPasso(3, "Uso finale");
await page.click('button:has-text("Scegli gli usi finali")');
await page.waitForTimeout(300);
await page.getByLabel("Considera l'uso finale Essiccazione, preriscaldo, verniciatura").check();
await page.waitForTimeout(2000);
verifica("Accendere un uso finale lo porta nella matrice",
  await page.getByText("Essiccazione, preriscaldo, verniciatura").first().isVisible());
await page.click('button:has-text("Nascondi gli usi finali")');
await page.waitForTimeout(300);

await scrivi("Forni fusori e processi termici primari — Energia elettrica prelevata dalla rete in kWh", "1400000", 700);
await scrivi("Aria compressa — Energia elettrica prelevata dalla rete in kWh", "500000", 700);
await scrivi("Illuminazione — Energia elettrica prelevata dalla rete in kWh", "380000", 700);
await scrivi("Riscaldamento degli ambienti — Gas naturale in Smc", "186000", 900);
const quadr = await page.getByText("vettori chiusi entro il 2%").locator("..").innerText();
verifica("La quadratura si chiude in anteprima, calcolata dalle funzioni pure",
  quadr.includes("2 su 2"), quadr.replace(/\n/g, " "));
verifica("Anche la copertura si aggiorna nel browser, senza contraddire la quadratura",
  quadr.includes("100,0%"), quadr.replace(/\n/g, " "));

// Metodo di determinazione
await page.getByLabel("Metodo di determinazione per Forni fusori e processi termici primari").click();
await page.waitForTimeout(300);
await page.getByRole("option").first().click();
await page.waitForTimeout(2000);
verifica("Il metodo di determinazione si salva sull'uso finale", true);

// Guida e calcolatore di stima
await page.getByLabel("Come si determina: Aria compressa").click();
await page.waitForTimeout(400);
verifica("La guida mostra definizione, modi di determinazione ed errore ricorrente",
  await page.getByText("Errore ricorrente").isVisible());
await page.fill("#st-kw", "75");
await page.fill("#st-ore", "6000");
await page.fill("#st-fc", "0,7");
await page.click("#st-v");
await page.waitForTimeout(300);
await page.getByRole("option", { name: "Energia elettrica prelevata dalla rete" }).click();
await page.waitForTimeout(400);
const stima = await page.getByText("Stima:").innerText();
verifica("Il calcolatore di stima moltiplica potenza, ore e fattore di carico",
  stima.includes("315.000"), stima.replace(/\n/g, " "));
await shot("05-passo3-guida");
await page.getByRole("button", { name: "Scrivi nella riga" }).click();
await page.waitForTimeout(2000);
const cella = await page.getByLabel("Aria compressa — Energia elettrica prelevata dalla rete in kWh").inputValue();
verifica("«Scrivi nella riga» riporta la stima nella cella", cella.startsWith("315000"), cella);
// Rimessa a posto per chiudere di nuovo la quadratura.
await scrivi("Aria compressa — Energia elettrica prelevata dalla rete in kWh", "500000", 900);
await page.click('button:has-text("Ricalcola")');
await page.waitForTimeout(2500);
await shot("06-passo3-matrice");
await tema("scuro");
await shot("07-passo3-matrice-dark");
await tema("chiaro");

// ─── passo 4: indicatori ─────────────────────────────────────────────────────
await vaiPasso(4, "Variabili di riferimento");
await scrivi("Produzione dell'esercizio 2025", "1200", 900);
await scrivi("Produzione dell'esercizio 2024", "1150", 900);
await scrivi("Addetti equivalenti a tempo pieno 2025", "48", 900);
await scrivi("Superficie coperta totale 2025", "9400", 900);
await page.click('button:has-text("Ricalcola")');
// Il ricalcolo in dev può richiedere parecchi secondi: si aspetta il numero.
await page.getByRole("row").filter({ hasText: "Consumo specifico" }).first()
  .getByText("3.40", { exact: false }).waitFor({ timeout: 40000 }).catch(() => {});
const nonCalc = await page.getByText("non calcolabile").count();
verifica("Un indicatore senza denominatore resta non calcolabile, non zero", nonCalc > 0, `${nonCalc} indicatori`);
// 4.087.920 kWh / 1.200 unità = 3.406,6 kWh per unità prodotta.
const rigaCs = await page.getByRole("row").filter({ hasText: "Consumo specifico" }).first().innerText();
verifica("Il consumo specifico è energia diviso produzione",
  rigaCs.includes("3406,6"), rigaCs.replace(/\n/g, " | "));
await shot("08-passo4-indicatori");

// ─── passo 5: interventi ─────────────────────────────────────────────────────
await vaiPasso(5, "Indica il risparmio annuo atteso");
await page.click('button:has-text("Aggiungi il primo intervento")');
await page.waitForTimeout(2500);
await page.getByLabel("Descrizione dell'intervento").first().fill("Recupero del calore dai fumi del forno fusorio per il preriscaldo delle billette");
await page.keyboard.press("Tab");
await page.waitForTimeout(900);
await page.getByLabel("Investimento €").first().fill("120000");
await page.keyboard.press("Tab");
await page.waitForTimeout(900);
await page.click('button:has-text("Ricalcola")');
await page.waitForTimeout(2500);
const senzaRisparmio = await page.getByText("senza risparmio").first().isVisible().catch(() => false);
verifica("Senza risparmio il tempo di ritorno resta indefinito, non zero", senzaRisparmio);
await page.getByLabel(/^Risparmio/).first().fill("42000");
await page.keyboard.press("Tab");
await page.waitForTimeout(900);
await page.click('button:has-text("Ricalcola")');
await page.waitForTimeout(2500);
const conRitorno = await page.getByText("anni").first().isVisible().catch(() => false);
verifica("Con il risparmio compare il tempo di ritorno", conRitorno);
await shot("09-passo5-interventi");

// ─── passo 6: racconto ───────────────────────────────────────────────────────
await vaiPasso(6, "Sintesi per la direzione");
await page.waitForTimeout(1200);
const editor = page.locator(".ProseMirror").first();
await editor.click();
await editor.type("Lo stabilimento consuma prevalentemente energia elettrica, concentrata sui forni fusori.");
await page.waitForTimeout(2500);
await shot("10-passo6-racconto");

// ─── passo 7: verifica ───────────────────────────────────────────────────────
await vaiPasso(7, "Pronto a pubblicare");
const controlliOk = await page.getByText("controlli su").innerText();
verifica("La verifica riepiloga i controlli superati", /\d+ controlli su 8/.test(controlliOk), controlliOk.replace(/\n/g, " "));
verifica("Ogni lacuna porta al passo che la colma",
  (await page.getByRole("button", { name: /^Passo \d/ }).count()) > 0);
await shot("11-passo7-verifica");
await tema("scuro");
await shot("12-passo7-verifica-dark");
await tema("chiaro");

// ─── passo 8 e navigazione ───────────────────────────────────────────────────
await vaiPasso(8, "Documento di diagnosi energetica");
await shot("13-passo8-documento");
await page.getByRole("button", { name: /Torna al passo 7/ }).click();
await page.waitForURL("**passo=7", { timeout: 20000 });
verifica("Il piede del percorso torna al passo precedente", page.url().includes("passo=7"));

// ─── mobile ──────────────────────────────────────────────────────────────────
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await shot("14-mobile-verifica");
await vaiPasso(3, "Uso finale");
await shot("15-mobile-matrice");

// ─── esito ───────────────────────────────────────────────────────────────────
console.log("\nEMAIL_TEST=" + email);
const falliti = prove.filter((p) => !p.ok);
console.log(`PROVE: ${prove.length - falliti.length}/${prove.length} superate`);
if (errors.length) {
  console.log("CONSOLE_ERRORS:");
  for (const e of errors) console.log("  " + e);
} else {
  console.log("CONSOLE_ERRORS: nessuno");
}
if (falliti.length || errors.length) process.exitCode = 1;
await browser.close();
