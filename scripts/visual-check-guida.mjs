// Collaudo della pagina Guida: contenuti veri, comandi che fanno qualcosa, due temi.
//
// La prova che conta è la terza: il pulsante «rivedi i tour» deve togliere davvero i
// segni da localStorage. Un comando che cambia solo la propria etichetta è la bugia
// più facile da scrivere e la più difficile da vedere.
//
//   node scripts/visual-check-guida.mjs

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const errori = [];
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]); }
};

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
await ctx.addInitScript(() => {
  for (const p of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
    try { localStorage.setItem(`evalisdeck-tour:${p}`, "1"); } catch {}
  }
});
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errori.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errori.push(`[pageerror] ${e.message}`));

const RUN = Date.now();
const email = `guida-${RUN}@example.com`;
const PWD = PWD_COLLAUDO;

await check("accesso e apertura della guida", async () => {
  await registraEEntra(page, sql, { base: BASE, nome: "Sara Conti", email: email, pwd: PWD });
  const rifiuta = page.getByRole("button", { name: "Rifiuta", exact: true });
  if (await rifiuta.count()) { await rifiuta.click(); await page.waitForTimeout(400); }
  await page.goto(`${BASE}/guida`, { waitUntil: "networkidle" });
  if (!/Guida all/.test(await page.locator("h1").innerText())) throw new Error("non è la guida");
});

await check("ci sono tutti i percorsi, con norma e documento prodotto", async () => {
  const t = await page.locator("main").innerText();
  const attesi = [
    ["Inventario GHG", "ISO 14064-1", "Rapporto GHG"],
    ["Bilancio di sostenibilità", "GRI", "Bilancio di sostenibilità"],
    ["Bilancio energetico", "UNI CEI EN 16247", "Bilancio energetico"],
    ["Autovalutazione ESG", "ISO 20400", "Attestato"],
    ["Statement of Applicability (SoA)", "ISO/IEC 27001", "Statement of Applicability"],
    ["Sistema di gestione integrato QAS", "ISO 9001", "Riesame di direzione"],
    ["Sistema di gestione SA8000/2026", "SA8000:2026", "Manuale del sistema SA8000/2026"],
    ["Due diligence di filiera", "OCSE", "Dichiarazione annuale sulla due diligence di filiera"],
    ["Prevenzione della corruzione", "ISO 37001", "Relazione annuale sulla prevenzione della corruzione"],
    ["Modello 231", "231/2001", "Matrice reati-processi"],
    ["Gestione delle segnalazioni", "24/2023", "Relazione periodica sulle segnalazioni"],
  ];
  // ⚠️ Un percorso puo' non produrre ancora un documento, e la guida deve DIRLO invece
  // di tacere: una scheda che non nomina un'uscita, in mezzo ad altre che la nominano,
  // si legge come una svista. Il sistema di gestione ESG e' in questo stato finche' i
  // suoi quattro documenti non arrivano.
  if (!t.includes("Implementazione del sistema di gestione ESG")) {
    throw new Error("manca il percorso del sistema di gestione ESG");
  }
  // ⚠️ Non si pretende che ESISTA un percorso senza documenti: ce n'era uno — il
  // sistema di gestione ESG, prima che i suoi quattro documenti arrivassero — e questo
  // controllo pretendeva la frase che lo dichiarava. Il giorno in cui quel percorso ha
  // avuto i suoi documenti, il controllo e' diventato rosso per un motivo che col
  // prodotto non c'entrava: era migliorato.
  //
  // Il fatto da verificare e' l'altro: che OGNI scheda dica che cosa produce, o dichiari
  // di non produrre ancora niente. Nessuna deve tacere.
  const schede = await page.locator("[data-percorsi] [data-modulo]").all();
  for (const sch of schede) {
    const testo = await sch.innerText();
    if (!/Produce|Non produce ancora/.test(testo)) {
      const nome = testo.slice(0, 40).replace(/\s+/g, " ");
      throw new Error(`il percorso «${nome}» non dice che cosa produce`);
    }
  }
  for (const [nome, norma, doc] of attesi) {
    for (const pezzo of [nome, norma, doc]) {
      if (!t.includes(pezzo)) throw new Error(`manca «${pezzo}» (percorso ${nome})`);
    }
  }
  // Annuali e fotografie non vanno confusi. NON si conta quanti sono di ciascun tipo: un
  // numero fisso diventerebbe rosso al primo modulo aggiunto, per un motivo che col
  // prodotto non c'entra. Si verifica il FATTO che conta — che le due nature esistano
  // entrambe e che ogni percorso ne dichiari una.
  // Il numero dei percorsi NON si scrive qui: si legge dagli ancoraggi, che vengono
  // dal registro. Un percorso aggiunto si presenta da solo, e questo controllo non
  // diventa rosso per un motivo che col prodotto non c'entra.
  const annuali = (t.match(/Si compila per esercizio/g) ?? []).length;
  const fotografie = (t.match(/fotografia dello stato corrente/g) ?? []).length;
  const percorsi = await page.locator("[data-percorsi] [data-modulo]").count();
  if (annuali < 1 || fotografie < 1) {
    throw new Error(`le due nature devono esserci entrambe: ${annuali} annuali, ${fotografie} fotografie`);
  }
  if (annuali + fotografie !== percorsi) {
    throw new Error(`${percorsi} percorsi ma ${annuali + fotografie} dichiarano la propria natura`);
  }
});

await check("il pulsante dei tour toglie DAVVERO i segni da localStorage", async () => {
  const prima = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith("evalisdeck-tour:")).length,
  );
  if (prima === 0) throw new Error("nessun segno da togliere: la prova non direbbe niente");
  await page.getByRole("button", { name: /rivedi i tour/i }).click();
  await page.waitForTimeout(300);
  const dopo = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith("evalisdeck-tour:")).length,
  );
  if (dopo !== 0) throw new Error(`ne restano ${dopo} su ${prima}`);
  const t = await page.locator("main").innerText();
  if (!/Fatto/.test(t)) throw new Error("il pulsante non conferma");
});

await check("le domande si aprono e si leggono", async () => {
  const domande = page.locator("main details");
  const n = await domande.count();
  if (n < 6) throw new Error("solo " + n + " domande");
  await domande.first().locator("summary").click();
  await page.waitForTimeout(200);
  const testo = await domande.first().innerText();
  if (testo.length < 200) throw new Error("la risposta non si è aperta: " + testo.slice(0, 80));
});

await check("il collegamento all'abbonamento porta dove dice", async () => {
  await page.getByRole("link", { name: /Piano e limiti/i }).click();
  await page.waitForURL("**/impostazioni/abbonamento", { timeout: 20_000 });
  await page.goto(`${BASE}/guida`, { waitUntil: "networkidle" });
});

await check("niente caratteri storti né spazi mangiati", async () => {
  const t = await page.locator("main").innerText();
  if (/Ã|â€|Â/.test(t)) throw new Error("mojibake");
  // Il JSX mangia lo spazio dopo un'espressione a fine riga: si vede solo sul reso.
  if (/pulsanteTour|dalla\s{2,}|[a-zà-ù][A-ZÀ-Ù][a-zà-ù]{3,}/.test(t.replace(/EvalisDeck|GRI|ESRS|VSME|ISO|SoA|PDF|KPI/g, ""))) {
    throw new Error("parole incollate: " + (t.match(/[a-zà-ù][A-ZÀ-Ù][a-zà-ù]{3,}/) ?? [])[0]);
  }
});

await check("regge in tema scuro e su schermo stretto", async () => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload({ waitUntil: "networkidle" });
  if (!(await page.getByRole("button", { name: /rivedi i tour/i }).isVisible())) {
    throw new Error("il comando dei tour sparisce al buio");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  const scorrimento = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (scorrimento) throw new Error("la pagina scorre in orizzontale sul telefono");
  await page.emulateMedia({ colorScheme: "light" });
});

await sql.end();
await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(errori.length ? "ERRORI CONSOLE:\n" + errori.join("\n") : "Console pulita.");
if (ko > 0 || errori.length) process.exitCode = 1;
