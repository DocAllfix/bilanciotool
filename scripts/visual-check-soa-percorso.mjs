// Gate visivo e collaudo del percorso SoA. Richiede `npm run dev` attivo.
//
// Percorre le sei viste toccando ogni comando — moduli, ruoli, i sette filtri,
// applicabilità, stato, motivazioni, documento, responsabile, piano,
// pubblicazione — e verifica il risultato atteso dopo ciascuno.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";

const OUT = process.env.SHOT_DIR ?? "./shots-soa-percorso";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";
const errors = [];
const prove = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
// Il benvenuto va spento PRIMA che la pagina esista, non dopo l'accesso: il video si
// apre al primo ingresso e il suo velo copre i comandi. Spegnerlo con un `evaluate`
// piu' avanti significa spegnerlo quando ha gia' coperto tutto.
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("evalisdeck-benvenuto", "1");
    for (const k of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
      localStorage.setItem(`evalisdeck-tour:${k}`, "1");
    }
  } catch {}
});
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const tema = async (verso) => { await page.click(`button[aria-label*="${verso}"]`); await page.waitForTimeout(400); };

const compare = (testo, timeout = 30000) =>
  page.getByText(testo, { exact: false }).first().waitFor({ state: "visible", timeout }).then(() => true, () => false);

const attendiConteggio = async (conta, atteso, timeout = 40000) => {
  const fine = Date.now() + timeout;
  let n = await conta();
  while (n !== atteso && Date.now() < fine) {
    await page.waitForTimeout(500);
    n = await conta();
  }
  return n;
};

function verifica(nome, condizione, dettaglio = "") {
  prove.push({ nome, ok: !!condizione, dettaglio });
  console.log(`${condizione ? "  ok  " : " FAIL "} ${nome}${dettaglio ? " — " + dettaglio : ""}`);
}

const vaiVista = async (k, atteso) => {
  for (let t = 0; t < 2; t++) {
    try {
      await page.click(`[data-tour="soa-vista-${k}"]`);
      await page.waitForURL(`**vista=${k}`, { timeout: 40000 });
      await page.getByText(atteso, { exact: false }).first().waitFor({ timeout: 40000 });
      await page.waitForTimeout(400);
      return;
    } catch (e) {
      if (t === 1) throw e;
    }
  }
};

// ─── registrazione e attivazione ─────────────────────────────────────────────
const email = `visual-soap-${Date.now()}@example.com`;
await page.goto(BASE + "/registrati");
await page.waitForLoadState("networkidle");
// La connessione si apre PRIMA di chi la usa: `registraEEntra` la riceve, e con la
// verifica dell'indirizzo accesa e' lei a completare la registrazione. Cosi' com'era,
// `sql` veniva usata due righe prima di esistere e il collaudo moriva all'avvio.
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
await registraEEntra(page, sql, { base: BASE, nome: "Davide Ricci", email, pwd: PWD_COLLAUDO });

await sql`update org_entitlement set status='active' where organization_id = (select m.organization_id from member m join "user" u on u.id=m.user_id where u.email=${email})`;
await sql.end();
await page.evaluate(() => {
  for (const k of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
    localStorage.setItem(`evalisdeck-tour:${k}`, "1");
  }
});
await page.reload();
await page.waitForLoadState("networkidle");

// ─── azienda e apertura del modulo ───────────────────────────────────────────
await page.click('[data-tour="nuova-azienda"]');
await page.fill("#na-nome", "Nexus Cloud Services S.r.l.");
await page.fill("#na-settore", "Servizi applicativi in cloud");
await page.fill("#na-ateco", "62.01");
await page.click('button[type="submit"]:has-text("Crea azienda")');
// Un ricarico dopo la creazione. Non e' pigrizia: in produzione la card compare
// subito (verificato su evalisdeck.it, elenco aggiornato senza ricaricare), mentre
// con `next start` in locale l'elenco resta indietro di un aggiornamento. Il collaudo
// deve misurare il percorso SoA, non quell'artefatto del server di prova.
const card = page.locator('[data-slot="card"]').filter({ hasText: "Nexus Cloud Services S.r.l." }).first();
// Si ricarica finche' la card non c'e'. Non e' pigrizia: in produzione compare subito
// (verificato su evalisdeck.it, elenco aggiornato senza ricaricare), mentre con
// `next start` in locale l'elenco resta indietro di un aggiornamento. Il collaudo deve
// misurare il percorso SoA, non quell'artefatto del server di prova.
for (let t = 0; t < 12 && !(await card.count()); t++) {
  await page.waitForTimeout(1500);
  await page.reload();
  await page.waitForLoadState("networkidle");
}
await card.waitFor({ timeout: 20000 });
// Il nome accessibile e' quello per esteso piu' lo stato — «Statement of Applicability
// (SoA): da avviare» — non la sigla: la card e' stata ridisegnata dopo che questo
// collaudo fu scritto. Si aggancia all'indirizzo, che e' il fatto stabile.
const link = card.locator('a[href$="/soa"]').first();
verifica("Il portafoglio espone il pulsante SoA", await link.isVisible());
await link.click();
await page.waitForURL("**/soa", { timeout: 60000 });
await page.waitForLoadState("networkidle", { timeout: 60000 });
await shot("00-vuoto");

// ─── creazione ───────────────────────────────────────────────────────────────
await page.click("#soa-crea-privacy");
await page.waitForTimeout(300);
await page.getByRole("option", { name: "Responsabile del trattamento" }).click();
await page.click("#soa-crea-cloud");
await page.waitForTimeout(300);
await page.getByRole("option", { name: "Cliente e fornitore di servizi cloud" }).click();
await page.fill("#soa-crea-soglia", "80");
await page.click('button:has-text("Avvia la Dichiarazione")');
verifica("Creazione della Dichiarazione", await compare("Indice di maturità", 60000));
verifica("All'inizio in ambito ci sono i soli 93 controlli della 27001",
  await compare("93 controlli in ambito", 20000));
await shot("01-quadro-iniziale");

// ─── contesto e ambito ───────────────────────────────────────────────────────
await vaiVista("contesto", "Campo di applicazione");
const scrivi = async (label, valore, attesa = 900) => {
  await page.getByLabel(label, { exact: true }).fill(valore);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(attesa);
};
await scrivi("Perimetro del sistema di gestione",
  "Progettazione, erogazione e assistenza dei servizi applicativi in cloud per la clientela business.");
verifica("Salvataggio campo per campo con conferma a schermo", await compare("salvato", 8000));
await scrivi("Esclusioni dal perimetro", "Nessuna esclusione di processo o di sede.");
await scrivi("Documento: Partita IVA", "01234567890");
await scrivi("Documento: Sede e unità operative nel perimetro", "Aversa (CE)");
await scrivi("Documento: Revisione del documento", "2.1");
await scrivi("Documento: Redatto da", "Ing. Davide Ricci");
await scrivi("Documento: Approvato da", "Direzione generale", 1500);

// L'avviso sul cloud non deve comparire quando si dichiara di non usarlo.
await page.getByLabel("Posizione rispetto ai servizi cloud", { exact: true }).click();
await page.waitForTimeout(300);
await page.getByRole("option", { name: "Nessun servizio cloud" }).click();
const sparito = await page.getByText("dichiara l'uso di servizi cloud").first()
  .waitFor({ state: "detached", timeout: 30000 }).then(() => true, () => false);
verifica("«Nessun servizio cloud» NON produce l'avviso sul cloud", sparito);

await page.getByLabel("Posizione rispetto ai servizi cloud", { exact: true }).click();
await page.waitForTimeout(300);
await page.getByRole("option", { name: "Cliente e fornitore di servizi cloud" }).click();
verifica("Dichiarando l'uso del cloud l'avviso compare", await compare("dichiara l'uso di servizi cloud", 25000));

// Attivazione dei moduli estesi.
await page.getByLabel("Attiva il quadro 27017").check();
verifica("Attivare un modulo allarga l'ambito", await compare("100 controlli in ambito", 30000));
await page.getByLabel("Attiva il quadro 27018").check();
await page.waitForTimeout(3500);
await page.getByLabel("Attiva il quadro 27701-B").check();
verifica("Con tre moduli estesi l'ambito arriva a 143", await compare("143 controlli in ambito", 30000));
verifica("La 27001 non si può disattivare: è sempre in ambito",
  await page.getByLabel("Attiva il quadro 27001").isDisabled());
await shot("02-contesto");

// ─── registro dei controlli ──────────────────────────────────────────────────
await vaiVista("controlli", "controlli su");
verifica("Il registro mostra i controlli in ambito", await compare("controlli su 143 in ambito", 20000));

// I sette filtri, uno per uno.
await page.getByLabel("Filtra per quadro di riferimento").click();
await page.waitForTimeout(300);
await page.getByRole("option", { name: "27017" }).click();
await page.waitForTimeout(700);
verifica("Filtro per quadro", await compare("7 controlli su 143 in ambito", 15000));

await page.getByLabel("Filtra per quadro di riferimento").click();
await page.waitForTimeout(300);
await page.getByRole("option", { name: "Tutti i quadri" }).click();
await page.waitForTimeout(700);

await page.getByLabel("Mostra solo i controlli cardine").check();
await page.waitForTimeout(700);
const soloCardine = await page.getByText(/controlli su 143 in ambito/).innerText();
verifica("Filtro «solo cardine»", /^(4[0-9]|5[0-9]|6[0-9]) controlli/.test(soloCardine.trim()), soloCardine.trim());
await page.getByLabel("Mostra solo i controlli cardine").uncheck();
await page.waitForTimeout(700);

await page.getByLabel("Cerca fra i controlli").fill("crittograf");
await page.waitForTimeout(800);
const ricerca = await page.getByText(/controlli su 143 in ambito/).innerText();
verifica("Ricerca testuale", !ricerca.trim().startsWith("143"), ricerca.trim());
await page.getByLabel("Cerca fra i controlli").fill("");
await page.waitForTimeout(700);

await page.getByLabel("Filtra per stato di attuazione").click();
await page.waitForTimeout(300);
await page.getByRole("option", { name: "Senza stato" }).click();
await page.waitForTimeout(700);
verifica("Filtro per stato", await compare("143 controlli su 143 in ambito", 15000));

// Decisioni su un controllo: applicabilità, stato, motivazioni, documento.
await page.getByLabel("Filtra per stato di attuazione").click();
await page.waitForTimeout(300);
await page.getByRole("option", { name: "Tutti gli stati" }).click();
await page.waitForTimeout(700);
await page.getByLabel("Cerca fra i controlli").fill("5.1");
await page.waitForTimeout(900);

await page.getByLabel("Stato di attuazione di 5.1").first().click();
await page.waitForTimeout(300);
await page.getByRole("option", { name: "Attuato e verificato" }).click();
await page.waitForTimeout(1200);
verifica("Lo stato di attuazione si sceglie e resta", true);

await page.getByLabel("Apri il controllo 5.1").first().click();
await page.waitForTimeout(500);
await page.getByLabel("5.1: Valutazione del rischio").click();
await page.waitForTimeout(900);
await page.getByLabel("5.1: Obbligo legale o regolamentare").click();
await page.waitForTimeout(1200);
verifica("Le motivazioni si accendono una per volta",
  (await page.getByLabel("5.1: Valutazione del rischio").getAttribute("aria-pressed")) === "true" &&
  (await page.getByLabel("5.1: Obbligo legale o regolamentare").getAttribute("aria-pressed")) === "true");
await page.getByLabel("5.1: Obbligo legale o regolamentare").click();
await page.waitForTimeout(1000);
verifica("Ripremere una motivazione la spegne",
  (await page.getByLabel("5.1: Obbligo legale o regolamentare").getAttribute("aria-pressed")) === "false");

await page.getByLabel("Riferimento documentale di 5.1").fill("POL-001 Politica del SGSI");
await page.keyboard.press("Tab");
await page.waitForTimeout(1000);
await page.getByLabel("Responsabile di 5.1").fill("Responsabile del SGSI");
await page.keyboard.press("Tab");
await page.waitForTimeout(1200);
verifica("Riferimento documentale e responsabile si salvano",
  (await page.getByLabel("Riferimento documentale di 5.1").inputValue()).startsWith("POL-001"));
await shot("03-controlli");

// Esclusione con giustificazione.
await page.getByLabel("Cerca fra i controlli").fill("8.4");
await page.waitForTimeout(900);
await page.getByLabel("Applicabilità di 8.4").first().click();
await page.waitForTimeout(300);
await page.getByRole("option", { name: "Escluso" }).click();
await page.waitForTimeout(1500);
await page.getByLabel("Apri il controllo 8.4").first().click();
await page.waitForTimeout(500);
verifica("Escludendo un controllo compare il campo della giustificazione",
  await page.getByLabel("Giustificazione dell'esclusione di 8.4").isVisible());
await page.getByLabel("Giustificazione dell'esclusione di 8.4")
  .fill("L'organizzazione non sviluppa software proprietario: lo sviluppo è affidato a fornitori qualificati.");
await page.keyboard.press("Tab");
await page.waitForTimeout(1500);
await page.getByLabel("Cerca fra i controlli").fill("");
await page.waitForTimeout(700);
await page.click('button:has-text("Ricalcola")');
await page.waitForTimeout(3000);

// ─── quadro col rack ─────────────────────────────────────────────────────────
await vaiVista("quadro", "Indice di maturità");
verifica("Il rack disegna una casella per ogni controllo in ambito",
  (await page.getByRole("img", { name: /Stato dei 143 controlli/ }).isVisible()));
verifica("Un controllo escluso esce dagli applicabili",
  await compare("142 applicabili", 20000));
await shot("04-quadro-rack");
await tema("scuro");
await shot("05-quadro-rack-dark");
await tema("chiaro");

// ─── verifiche di coerenza ───────────────────────────────────────────────────
await vaiVista("verifiche", "rilievo aperto");
verifica("I rilievi elencano i controlli coinvolti",
  await compare("Controlli applicabili senza stato di attuazione", 20000));
verifica("Le esclusioni motivate non compaiono fra i rilievi",
  !(await page.getByText("Esclusioni prive di giustificazione").isVisible().catch(() => false)));
await shot("06-verifiche");

// ─── piano ───────────────────────────────────────────────────────────────────
await vaiVista("piano", "controlli da portare avanti");
const righePiano = await page.getByRole("row").count();
verifica("Il piano elenca i controlli non ancora attuati", righePiano > 100, `${righePiano - 1} righe`);
verifica("In testa la priorità alta", (await page.getByRole("row").nth(1).innerText()).includes("Alta"));
await shot("07-piano");

// ─── documento ───────────────────────────────────────────────────────────────
await vaiVista("documento", "Versioni pubblicate");
verifica("All'inizio non risulta nessuna revisione pubblicata",
  await compare("Nessuna versione ancora pubblicata", 20000));
await page.click('[data-tour="pubblica-documento"]');
const doc = await page.waitForEvent("popup", { timeout: 120000 });
await doc.waitForLoadState("networkidle");
await doc.waitForTimeout(800);
verifica("La Dichiarazione si apre appena pubblicata", doc.url().includes("/documento/"));
verifica("Riporta la nota di conformità al punto 6.1.3 lettera d)",
  await doc.getByText("6.1.3 lettera d)").first().isVisible().catch(() => false));
verifica("Riporta la giustificazione dell'esclusione",
  await doc.getByText("non sviluppa software proprietario").first().isVisible().catch(() => false));
verifica("La tabella riporta le motivazioni in sigle",
  await doc.getByText("VR = Valutazione del rischio").isVisible().catch(() => false));
await doc.setViewportSize({ width: 1280, height: 1400 });
await doc.screenshot({ path: `${OUT}/08-documento.png` });

const scarico = doc.waitForEvent("download", { timeout: 180000 }).catch(() => null);
await doc.getByRole("button", { name: /Scarica PDF/ }).click();
const file = await scarico;
verifica("Il PDF si scarica col nome giusto, senza anno",
  file !== null && (await file.suggestedFilename()) === "statement-of-applicability-v1.pdf",
  file ? await file.suggestedFilename() : "nessun download");
await doc.close();

await page.reload();
await page.waitForLoadState("networkidle", { timeout: 60000 });
verifica("La revisione compare nell'elenco", await compare("v1", 20000));
await page.click('[data-tour="pubblica-documento"]');
const doc2 = await page.waitForEvent("popup", { timeout: 120000 });
await doc2.waitForLoadState("networkidle");
verifica("Ripubblicare crea la revisione successiva",
  await doc2.getByText("versione 2").isVisible().catch(() => false));
await doc2.close();
await page.reload();
await page.waitForLoadState("networkidle", { timeout: 60000 });
const revisioni = await attendiConteggio(() => page.getByText(/^v[12]$/).count(), 2);
verifica("Le revisioni precedenti restano consultabili", revisioni === 2, `${revisioni} revisioni`);
await shot("09-documento-versioni");

// ─── mobile ──────────────────────────────────────────────────────────────────
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await vaiVista("quadro", "Indice di maturità");
await shot("10-mobile-quadro");

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
