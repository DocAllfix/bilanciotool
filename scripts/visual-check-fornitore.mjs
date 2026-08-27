// Gate visivo e collaudo del percorso fornitori. Richiede `npm run dev` attivo.
//
// Percorre le sei viste toccando ogni comando — le quattro scelte di risposta,
// le note, la soglia, gli stati del documento, i campi del piano, la
// pubblicazione — e verifica il risultato atteso dopo ciascuno.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { attendiCard, apriModulo } from "./comune-collaudo.mjs";
import { rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const OUT = process.env.SHOT_DIR ?? "./shots-fornitore";
mkdirSync(OUT, { recursive: true });
// ⚠️ IL BERSAGLIO SI LEGGE DALL'AMBIENTE, sempre.
//
// Qui c'era `const BASE = "http://localhost:3000"` scritto a mano, e nove collaudi lo
// facevano. Conseguenza: `npm run qa -- <nome> --su <anteprima>` stampava l'indirizzo
// dell'anteprima e il collaudo parlava con localhost. Il referto DICHIARAVA un bersaglio
// e ne misurava un altro — peggio di non dichiararlo affatto, perche' ci si crede.
//
// E' costato mezza giornata: tre collaudi «falliti sul pulsante PDF dell'anteprima» non
// avevano mai toccato l'anteprima, e i loro «33 su 34» non dicevano niente sul deploy.
const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const errors = [];
const prove = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) errors.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const tema = async (verso) => { await page.click(`button[aria-label*="${verso}"]`); await page.waitForTimeout(400); };

const compare = (testo, timeout = 30000) =>
  page.getByText(testo, { exact: false }).first().waitFor({ state: "visible", timeout }).then(() => true, () => false);

const attendiConteggio = async (conta, atteso, timeout = 30000) => {
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
      await page.click(`[data-tour="sup-vista-${k}"]`);
      await page.waitForURL(`**vista=${k}`, { timeout: 30000 });
      await page.getByText(atteso, { exact: false }).first().waitFor({ timeout: 30000 });
      await page.waitForTimeout(400);
      return;
    } catch (e) {
      if (t === 1) throw e;
    }
  }
};

// ─── registrazione e attivazione ─────────────────────────────────────────────
const email = `visual-forn-${Date.now()}@example.com`;
await page.goto(BASE + "/registrati");
await page.waitForLoadState("networkidle");
// La connessione si apre PRIMA di chi la usa. Con la verifica dell'indirizzo accesa
// e' `registraEEntra` a completare la registrazione, e per farlo legge il token dal
// database: cosi' com'era, `sql` veniva usata prima di esistere e il collaudo moriva
// all'avvio, sempre, senza mai poter diventare ne' verde ne' rosso.
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  await registraEEntra(page, sql, { base: BASE, nome: "Silvia Marino", email: email, pwd: PWD_COLLAUDO });

await sql`update org_entitlement set status='active' where organization_id = (select m.organization_id from member m join "user" u on u.id=m.user_id where u.email=${email})`;
await sql.end();
await page.evaluate(() => {
  for (const k of ["portfolio", "ghg", "bilancio", "energetico", "fornitore"]) {
    localStorage.setItem(`evalisdeck-tour:${k}`, "1");
  }
});
await page.reload();
await page.waitForLoadState("networkidle");

// ─── azienda e apertura del modulo ───────────────────────────────────────────
await page.click('[data-tour="nuova-azienda"]');
await page.fill("#na-nome", "Carpenteria Sarnese S.r.l.");
await page.fill("#na-settore", "Carpenteria metallica");
await page.fill("#na-ateco", "25.11");
await page.click('button[type="submit"]:has-text("Crea azienda")');
// La card del portafoglio non espone piu' un pulsante per percorso: mostra le tre
// caselle di gruppo, e i percorsi si aprono dal fascicolo. Si verifica quello che il
// prodotto fa ADESSO, e in due passi distinti, perche' un solo controllo su tutta la
// catena non direbbe quale dei due anelli si e' rotto.
const card = await attendiCard(page, "Carpenteria Sarnese S.r.l.");
verifica(
  "Il portafoglio espone il gruppo Ecosostenibilita'",
  await card.locator('[data-gruppo="ecosostenibilita"]').isVisible(),
);
await apriModulo(page, "Carpenteria Sarnese S.r.l.", "fornitore");
await page.waitForURL("**/fornitore", { timeout: 15000 });
await page.waitForLoadState("networkidle");
await shot("00-vuoto");

// ─── creazione della valutazione ─────────────────────────────────────────────
await page.fill("#sr-crea-soglia", "60");
await page.click('button:has-text("Avvia")');
verifica("Creazione dell'autovalutazione", await compare("Indice di prontezza"));
await shot("01-quadro-vuoto");
verifica("Senza risposte l'indice è zero, non un punteggio inventato",
  await compare("Ti mancano"));

// ─── anagrafica ──────────────────────────────────────────────────────────────
await vaiVista("anagrafica", "L'azienda valutata");
const scrivi = async (label, valore, attesa = 900) => {
  await page.getByLabel(label, { exact: true }).fill(valore);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(attesa);
};
await scrivi("Azienda: Partita IVA", "05612340658");
verifica("Salvataggio campo per campo con conferma a schermo", await compare("salvato", 8000));
await scrivi("Azienda: Settore di attività", "Carpenteria metallica pesante");
await scrivi("Azienda: Codice ATECO", "25.11");
await scrivi("Azienda: Sede operativa", "Sarno (SA), via dell'Industria 24");
await scrivi("Azienda: Dipendenti", "42");
await scrivi("Azienda: Fatturato (milioni di €)", "8,4");
await scrivi("Richiesta: Committente che ha richiesto la valutazione", "Gruppo capofila di filiera automotive");
await scrivi("Richiesta: Referente interno per la compilazione", "Ing. Silvia Marino");
await scrivi("Richiesta: Termine di consegna", "2026-09-30", 1500);
await shot("02-anagrafica");

// ─── questionario ────────────────────────────────────────────────────────────
await vaiVista("questionario", "Governo della sostenibilità");
verifica("Le aree si aprono e si chiudono", await compare("È stata adottata una politica"));

// Ogni scelta della prima domanda, una per una.
await page.getByLabel("B1: Sì", { exact: true }).click();
await page.waitForTimeout(900);
verifica("La risposta «Sì» si accende subito",
  (await page.getByLabel("B1: Sì", { exact: true }).getAttribute("aria-pressed")) === "true");
await page.getByLabel("B1: In parte", { exact: true }).click();
await page.waitForTimeout(900);
verifica("Cambiare risposta sposta la scelta",
  (await page.getByLabel("B1: In parte", { exact: true }).getAttribute("aria-pressed")) === "true" &&
  (await page.getByLabel("B1: Sì", { exact: true }).getAttribute("aria-pressed")) === "false");
await page.getByLabel("B1: In parte", { exact: true }).click();
await page.waitForTimeout(900);
verifica("Ripremere la stessa scelta la annulla",
  (await page.getByLabel("B1: In parte", { exact: true }).getAttribute("aria-pressed")) === "false");
await page.getByLabel("B1: Non applicabile", { exact: true }).click();
await page.waitForTimeout(900);
await page.getByLabel("Nota per B1", { exact: true }).fill("Non pertinente: l'azienda non ha una direzione distinta dalla proprietà.");
await page.keyboard.press("Tab");
await page.waitForTimeout(1200);
await page.getByLabel("B1: Sì", { exact: true }).click();
await page.waitForTimeout(1200);
verifica("La nota resta dopo aver cambiato risposta",
  (await page.getByLabel("Nota per B1", { exact: true }).inputValue()).startsWith("Non pertinente"));

// Dataset di esempio del prototipo, per il golden.
const rispondi = async (chiave, etichetta) => {
  await page.getByLabel(`${chiave}: ${etichetta}`, { exact: true }).click();
  await page.waitForTimeout(420);
};
const apriArea = async (nome) => {
  await page.getByLabel(`Apri l'area ${nome}`).click().catch(() => {});
  await page.waitForTimeout(500);
};
for (const k of ["B4"]) await rispondi(k, "Sì");
for (const k of ["B2"]) await rispondi(k, "In parte");
await apriArea("Ambiente");
for (const k of ["E1", "E5", "E7"]) await rispondi(k, "Sì");
for (const k of ["E2"]) await rispondi(k, "In parte");
for (const k of ["E4", "E8"]) await rispondi(k, "No");
await apriArea("Lavoro e diritti umani");
for (const k of ["S1", "S3", "S4"]) await rispondi(k, "Sì");
for (const k of ["S2", "S5"]) await rispondi(k, "In parte");
for (const k of ["S6", "S7"]) await rispondi(k, "No");
await apriArea("Etica e conformità");
for (const k of ["G1", "G6"]) await rispondi(k, "Sì");
for (const k of ["G3"]) await rispondi(k, "In parte");
for (const k of ["G2", "G4"]) await rispondi(k, "No");
await apriArea("Catena di fornitura");
for (const k of ["P2"]) await rispondi(k, "Sì");
for (const k of ["P1"]) await rispondi(k, "In parte");
for (const k of ["P4"]) await rispondi(k, "No");
await shot("03-questionario");
await page.click('button:has-text("Ricalcola")');
await page.waitForTimeout(2500);

// ─── quadro: il golden del prototipo ─────────────────────────────────────────
await vaiVista("quadro", "Indice di prontezza");
verifica("L'indice riproduce il golden del prototipo", await compare("58", 20000));
// 83 governo · 58 ambiente · 59 sociale · 50 etica · 50 filiera: il golden
// estratto eseguendo compute() del prototipo sul suo dataset di esempio.
const NOMI_AREA = ["Governo della sostenibilità", "Ambiente", "Lavoro e diritti umani", "Etica e conformità", "Catena di fornitura"];
const ATTESI = ["83", "58", "59", "50", "50"];
const perArea = [];
for (const nome of NOMI_AREA) {
  perArea.push(await page.getByText(`${nome} · peso`).first().locator("..").innerText());
}
verifica("I punteggi per area sono quelli del prototipo",
  ATTESI.every((n, i) => perArea[i].includes(n)),
  perArea.map((t, i) => `${NOMI_AREA[i].slice(0, 8)}=${t.replace(/\s+/g, " ").split(" ").pop()}`).join(" · "));
verifica("La distanza dalla soglia è dichiarata", await compare("Ti mancano"));
await shot("04-quadro");
await tema("scuro");
await shot("05-quadro-dark");
await tema("chiaro");

// La soglia la fissa il committente.
await scrivi("Soglia richiesta dal committente", "50", 2500);
verifica("Alzare o abbassare la soglia cambia il verdetto", await compare("punti sopra", 20000));
await scrivi("Soglia richiesta dal committente", "60", 2500);

// ─── piano ───────────────────────────────────────────────────────────────────
await vaiVista("piano", "azioni");
const righePiano = await page.getByRole("row").count();
verifica("Il piano elenca le 13 lacune dichiarate", righePiano === 14, `${righePiano - 1} righe`);
const primaRiga = await page.getByRole("row").nth(1).innerText();
verifica("La prima azione è quella che rende di più", primaRiga.includes("P4"), primaRiga.replace(/\n/g, " | ").slice(0, 120));
await page.getByLabel("Responsabile per P4", { exact: true }).fill("Direzione acquisti");
await page.keyboard.press("Tab");
await page.waitForTimeout(1200);
await page.getByLabel("Scadenza per P4", { exact: true }).fill("2026-06-30");
await page.keyboard.press("Tab");
await page.waitForTimeout(1200);
await page.getByLabel("Stato dell'azione P4", { exact: true }).click();
await page.waitForTimeout(300);
await page.getByRole("option", { name: "In corso" }).click();
await page.waitForTimeout(1500);
verifica("Il piano d'azione si compila sulla riga della lacuna",
  (await page.getByLabel("Responsabile per P4", { exact: true }).inputValue()) === "Direzione acquisti");
await shot("06-piano");

// ─── evidenze ────────────────────────────────────────────────────────────────
await vaiVista("documenti", "Evidenze attese");
await page.getByLabel("B1: Disponibile", { exact: true }).click();
await page.waitForTimeout(900);
verifica("Lo stato del documento si accende subito",
  (await page.getByLabel("B1: Disponibile", { exact: true }).getAttribute("aria-pressed")) === "true");
await page.getByLabel("E4: Da produrre", { exact: true }).click();
await page.waitForTimeout(900);
await page.getByLabel("S2: Da aggiornare", { exact: true }).click();
await page.waitForTimeout(1500);
const banda = await page.getByText("Disponibile").first().locator("..").locator("..").innerText();
verifica("Il riepilogo delle evidenze si aggiorna", banda.includes("1"), banda.replace(/\n/g, " | ").slice(0, 120));
await shot("07-evidenze");

// ─── attestato ───────────────────────────────────────────────────────────────
await vaiVista("attestato", "Versioni pubblicate");
verifica("All'inizio non risulta nessun attestato emesso",
  await compare("Nessuna versione ancora pubblicata", 15000));
await page.click('[data-tour="pubblica-documento"]');
const doc = await page.waitForEvent("popup", { timeout: 90000 });
await doc.waitForLoadState("networkidle");
await doc.waitForTimeout(600);
verifica("L'attestato si apre appena pubblicato", doc.url().includes("/documento/"));
verifica("Riporta l'indice congelato", await doc.getByText("58").first().isVisible().catch(() => false));
verifica("Riporta il codice di verifica",
  await doc.getByText(/^SR-[0-9A-Z]{7}$/).first().isVisible().catch(() => false));
verifica("Il disclaimer sulla natura del documento è in chiaro",
  await doc.getByText("Non costituisce certificazione, non deriva da verifica ispettiva di parte terza").isVisible().catch(() => false));
verifica("L'attestato non porta un anno di esercizio",
  (await doc.getByText(/Attestato ESG · versione/).innerText()).includes("versione 1"));
await doc.setViewportSize({ width: 1280, height: 1400 });
await doc.screenshot({ path: `${OUT}/08-attestato.png` });

const scarico = doc.waitForEvent("download", { timeout: 120000 }).catch(() => null);
await doc.getByRole("button", { name: /Scarica PDF/ }).click();
const file = await scarico;
verifica("Il PDF si scarica col nome giusto, senza anno",
  file !== null && (await file.suggestedFilename()) === "attestato-esg-v1.pdf",
  file ? await file.suggestedFilename() : "nessun download");
await doc.close();

await page.reload();
await page.waitForLoadState("networkidle");
verifica("La revisione compare nell'elenco", await compare("v1", 20000));
await page.click('[data-tour="pubblica-documento"]');
const doc2 = await page.waitForEvent("popup", { timeout: 90000 });
await doc2.waitForLoadState("networkidle");
verifica("Ripubblicare crea la revisione successiva",
  await doc2.getByText("versione 2").isVisible().catch(() => false));
await doc2.close();
await page.reload();
await page.waitForLoadState("networkidle");
const revisioni = await attendiConteggio(() => page.getByText(/^v[12]$/).count(), 2);
verifica("Le revisioni precedenti restano consultabili", revisioni === 2, `${revisioni} revisioni`);
await shot("09-attestato-versioni");

// ─── mobile ──────────────────────────────────────────────────────────────────
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await vaiVista("quadro", "Indice di prontezza");
await shot("10-mobile-quadro");
await vaiVista("questionario", "Governo della sostenibilità");
await shot("11-mobile-questionario");

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
