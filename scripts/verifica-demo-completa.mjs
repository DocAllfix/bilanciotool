// Collaudo dell'azienda dimostrativa: TUTTI i percorsi mostrano numeri veri.
//
//   node scripts/verifica-demo-completa.mjs
//
// Inserire righe nel database non basta: il motore le deve leggere e i risultati
// devono tornare. Questo collaudo guarda le PAGINE, non le tabelle — la quadratura
// della ripartizione, l'indice del fornitore, l'indice della SoA. Un seed che scrive
// dati incoerenti passa qualunque controllo sul database e fa vedere al primo cliente
// un prodotto che non torna.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const EMAIL = `demo-completa-${RUN}@example.com`;
const PWD = PWD_COLLAUDO;

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const errori = [];
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]); }
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
// Il giro di benvenuto qui darebbe fastidio: si sta collaudando il contenuto delle
// pagine, non l'accoglienza. Che l'accoglienza funzioni lo dice verifica-benvenuto.
await ctx.addInitScript(() => {
  try { localStorage.setItem("evalisdeck-benvenuto", "1"); } catch {}
});
const page = await ctx.newPage();
page.on("pageerror", (e) => errori.push(e.message));

let az;
await check("la registrazione crea l'azienda dimostrativa con tutti i percorsi", async () => {
  const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Chi Prova", email: EMAIL, pwd: PWD });
  const [c] = await sql`select id from company where organization_id = ${orgId} and is_demo = true`;
  if (!c) throw new Error("nessuna azienda dimostrativa");
  az = c.id;
  // ⚠️ Ogni radice si interroga per nome: un modulo nuovo che il seme dimenticasse
  // resterebbe invisibile a un controllo che ne guarda solo tre.
  const RADICI = [
    ["energy_balance", "la diagnosi energetica"],
    ["supplier_assessment", "l'autovalutazione ESG"],
    ["soa_declaration", "la Dichiarazione di Applicabilità"],
    ["bribery_system", "il sistema ISO 37001"],
    ["mog_model", "il Modello 231"],
    ["wb_system", "il sistema delle segnalazioni"],
    ["qas_system", "il sistema integrato QAS"],
    ["sa_system", "il sistema SA8000/2026"],
    ["chain_program", "il programma di due diligence di filiera"],
  ];
  const mancanti = [];
  for (const [tabella, nome] of RADICI) {
    const r = await sql.unsafe(`select id from ${tabella} where company_id = $1`, [az]);
    if (!r.length) mancanti.push(nome);
  }
  if (mancanti.length) throw new Error("la dimostrativa non ha: " + mancanti.join(", "));
});

await check("i consumi per vettore sono quelli dell'inventario GHG", async () => {
  // Passo 2. Le quantita' stanno nei campi, non nel testo: `innerText` non le vede,
  // e un controllo sul solo testo direbbe «manca» anche quando c'e'.
  await page.goto(`${BASE}/aziende/${az}/energetico/2025?passo=2`, { waitUntil: "networkidle" });
  const valori = await page.locator("input").evaluateAll((n) => n.map((x) => x.value));
  const numeri = valori.map((v) => Number(String(v).replace(/\./g, "").replace(",", ".")));
  for (const atteso of [612000, 42500, 8600]) {
    if (!numeri.includes(atteso)) throw new Error(`manca il consumo ${atteso}`);
  }
});

await check("la ripartizione per uso finale quadra su tutti i vettori", async () => {
  await page.goto(`${BASE}/aziende/${az}/energetico/2025?passo=3`, { waitUntil: "networkidle" });
  const t = await page.locator("body").innerText();
  // Se un vettore non quadrasse, la pagina lo direbbe: e' il primo controllo del
  // passo 3, ed e' esattamente cio' che un consulente guarda per fidarsi del dato.
  if (/non quadra|residuo da ripartire|da ripartire/i.test(t)) {
    throw new Error("la pagina segnala una ripartizione che non quadra: " + t.match(/.{0,80}(?:non quadra|da ripartire).{0,40}/i)?.[0]);
  }
  if (/NaN|Infinity/.test(t)) throw new Error("valore non calcolato in pagina");
});

await check("gli indicatori e gli interventi si calcolano", async () => {
  await page.goto(`${BASE}/aziende/${az}/energetico/2025?passo=4`, { waitUntil: "networkidle" });
  const t4 = await page.locator("body").innerText();
  if (/NaN|Infinity/.test(t4)) throw new Error("indicatore non calcolato");
  await page.goto(`${BASE}/aziende/${az}/energetico/2025?passo=5`, { waitUntil: "networkidle" });
  const t5 = await page.locator("body").innerText();
  if (/NaN|Infinity/.test(t5)) throw new Error("ritorno dell'investimento non calcolato");
  // Il compressore e' l'intervento approvato: senza costo dell'energia il tempo di
  // ritorno non si calcola, e l'assenza del segno «anni» lo rivelerebbe.
  if (!/anni|mesi/i.test(t5)) throw new Error("nessun tempo di ritorno mostrato");
});

await check("l'autovalutazione ESG ha un indice sopra la soglia richiesta", async () => {
  await page.goto(`${BASE}/aziende/${az}/fornitore`, { waitUntil: "networkidle" });
  const t = await page.locator("body").innerText();
  const m = t.match(/\b(\d{1,3})\s*\/\s*100\b/) ?? t.match(/Indice[^0-9]{0,40}(\d{1,3})/i);
  if (!m) throw new Error("nessun indice in pagina: " + t.slice(0, 160).replace(/\n/g, " "));
  const indice = Number(m[1]);
  console.log(`       indice fornitore: ${indice}`);
  if (!(indice > 60)) throw new Error(`indice ${indice}: sotto la soglia, la dimostrazione parte male`);
  if (indice >= 95) throw new Error(`indice ${indice}: troppo alto, il piano d'azione resta vuoto`);
  if (/NaN/.test(t)) throw new Error("valore non calcolato in pagina");
});

await check("il piano del fornitore elenca le lacune da recuperare", async () => {
  const t = await page.locator("body").innerText();
  if (!/catena di fornitura/i.test(t)) throw new Error("le aree non compaiono");
});

await check("la Dichiarazione conta i controlli in ambito e ha un indice", async () => {
  await page.goto(`${BASE}/aziende/${az}/soa`, { waitUntil: "networkidle" });
  const t = await page.locator("body").innerText();
  if (/NaN/.test(t)) throw new Error("valore non calcolato in pagina");
  // 93 dell'Allegato A piu' i 7 della 27017: il quadro cloud e' acceso nel profilo.
  if (!/\b100\b/.test(t)) throw new Error("non risultano 100 controlli in ambito");
  const m = t.match(/\b(\d{1,3})\s*\/\s*100\b/) ?? t.match(/Indice[^0-9]{0,40}(\d{1,3})/i);
  if (m) console.log(`       indice SoA: ${m[1]}`);
});

await check("le esclusioni della SoA sono tutte motivate", async () => {
  const escluse = await sql`select count(*)::int n from soa_control_decision d
    join soa_declaration s on s.id = d.declaration_id
    where s.company_id = ${az} and d.applicabile = false and (d.giustificazione is null or d.giustificazione = '')`;
  if (escluse[0].n) throw new Error(`${escluse[0].n} esclusioni senza motivazione`);
});

await check("il fascicolo dell'azienda mostra OGNI percorso, e nessuno da avviare", async () => {
  // I percorsi si contano dalle ancore strutturali, non dai nomi scritti qui: un
  // elenco a mano non si accorge di un modulo aggiunto al registro e resta verde
  // mentre la dimostrativa e' rimasta indietro — che e' esattamente cio' che era
  // successo prima del 13 agosto 2026, quando i percorsi seminati erano due su cinque.
  await page.goto(`${BASE}/aziende/${az}`, { waitUntil: "networkidle" });
  const voci = page.locator("[data-percorsi] [data-modulo]");
  const quanti = await voci.count();
  // ⚠️ Quanti percorsi abbia il prodotto NON si scrive qui. Il numero era fisso a
  // undici, e sarebbe diventato rosso al dodicesimo per un motivo che con la
  // dimostrativa non c'entra. Si chiede alla GUIDA, che elenca il registro intero:
  // due superfici che derivano dalla stessa fonte devono dire lo stesso numero, e se
  // divergono e' la dimostrativa a essere rimasta indietro — che e' esattamente cio'
  // che questo controllo esiste per cogliere.
  const p2 = await page.context().newPage();
  await p2.goto(`${BASE}/guida`, { waitUntil: "domcontentloaded" });
  await p2.locator("[data-percorsi]").waitFor({ timeout: 60_000 });
  const attesi = await p2.locator("[data-percorsi] [data-modulo]").count();
  await p2.close();
  if (attesi === 0) throw new Error("la guida non elenca nessun percorso: il controllo non puo' misurare niente");
  if (quanti < attesi) {
    throw new Error(`il fascicolo mostra ${quanti} percorsi, il prodotto ne ha ${attesi}`);
  }
  const fermi = [];
  for (let i = 0; i < quanti; i++) {
    const chiave = await voci.nth(i).getAttribute("data-modulo");
    const testo = await voci.nth(i).innerText();
    if (!testo.trim()) throw new Error(`il percorso ${chiave} non mostra nulla`);
    if (/Non avviato/i.test(testo)) fermi.push(chiave);
  }
  if (fermi.length) throw new Error(`percorsi non avviati sulla dimostrativa: ${fermi.join(", ")}`);
});

await sql.end();
await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(errori.length ? "ERRORI: " + errori.join(" | ") : "Nessun errore di pagina.");
if (ko > 0) process.exitCode = 1;
