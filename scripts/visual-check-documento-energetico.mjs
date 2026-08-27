// Anteprima REALE della diagnosi energetica: prepara uno stabilimento con dati
// completi, pubblica lo snapshot, fotografa il documento e produce il PDF vero.
// Richiede `npm run dev` attivo.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const OUT = process.env.SHOT_DIR ?? "./shots-doc-energetico";
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

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1700 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) errors.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

// 1 ── utente attivo ─────────────────────────────────────────────────────────
const email = `visual-dene-${Date.now()}@example.com`;
await page.goto(BASE + "/registrati");
await page.waitForLoadState("networkidle");
// La connessione si apre PRIMA di chi la usa. Con la verifica dell'indirizzo accesa
// e' `registraEEntra` a completare la registrazione, e per farlo legge il token dal
// database: cosi' com'era, `sql` veniva usata prima di esistere e il collaudo moriva
// all'avvio, sempre, senza mai poter diventare ne' verde ne' rosso.
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  await registraEEntra(page, sql, { base: BASE, nome: "Claudia Ferrara", email: email, pwd: PWD_COLLAUDO });
await page.evaluate(() => {
  for (const k of ["portfolio", "ghg", "bilancio", "energetico"]) localStorage.setItem(`evalisdeck-tour:${k}`, "1");
});

const [org] = await sql`select m.organization_id as id, m.user_id as uid from member m join "user" u on u.id=m.user_id where u.email=${email}`;
await sql`update org_entitlement set status='active' where organization_id=${org.id}`;

// 2 ── stabilimento con dati completi via SQL ────────────────────────────────
// Il percorso in interfaccia è già coperto dal collaudo: qui serve un documento
// RICCO da fotografare, quindi il caricamento è diretto e deterministico.
const co = crypto.randomUUID();
await sql`insert into company (id, organization_id, nome, settore, sede, piva, ateco)
  values (${co}, ${org.id}, 'Fonderia Irno S.p.A.', 'Fonderia di alluminio', 'Salerno', '03456780654', '24.53')`;

const [cse] = await sql`select id from content_set where dominio='energy' order by versione desc limit 1`;
const profilo = {
  forma: "Fonderia Irno S.p.A.",
  piva: "03456780654",
  sede: "Salerno, zona industriale, via delle Fornaci 8",
  settore: "Fonderia di alluminio in conchiglia",
  ateco: "24.53",
  referente: "Ing. Claudia Ferrara — Energy Manager",
  sito: "9.400 m² coperti su un lotto di 14.200 m². Capannone del 1996 con copertura in pannello coibentato, ampliamento del reparto finitura nel 2014.",
  attivita: "Fusione di lega di alluminio primaria e secondaria, colata in conchiglia a gravità, trattamento termico T6, finitura meccanica e controllo dimensionale di getti per il settore automotive e per la meccanica agricola.",
  turni: "Tre turni su cinque giorni, 232 giorni lavorativi all'anno. Fermata di manutenzione programmata nelle prime tre settimane di agosto; forni di mantenimento tenuti in temperatura anche nel fine settimana.",
  unitaProd: "tonnellate di getti buoni",
  perimetro: "Tutto lo stabilimento di Salerno: reparto fusione, colata, trattamento termico, finitura, servizi ausiliari e uffici tecnici interni al capannone. È esclusa la palazzina uffici commerciali, alimentata da un contatore separato e non oggetto della diagnosi.",
};

const bal25 = crypto.randomUUID();
const bal24 = crypto.randomUUID();
await sql`insert into energy_balance (id, organization_id, company_id, anno, anno_base, content_set_id, profilo)
  values (${bal25}, ${org.id}, ${co}, 2025, 2024, ${cse.id}, ${sql.json(profilo)}),
         (${bal24}, ${org.id}, ${co}, 2024, 2023, ${cse.id}, ${sql.json(profilo)})`;

// Vettori in ingresso. Mensili solo su elettricità e gas: sono i due che hanno
// una stagionalità leggibile.
const mensiliEle = ["205000","198000","201000","186000","192000","188000","196000","104000","199000","207000","203000","201000"];
const mensiliGas = ["21400","19800","17600","13200","10400","8600","8100","4200","9800","15400","19200","21300"];
const vettore = (bal, key, q, costo, mensili = null) =>
  sql`insert into energy_vector_input (id, organization_id, balance_id, vettore_key, quantita, costo, mensili)
    values (${crypto.randomUUID()}, ${org.id}, ${bal}, ${key}, ${q}, ${costo}, ${sql.json(mensili ?? Array(12).fill(""))})`;
await vettore(bal25, "ele", "2280000", "410400", mensiliEle);
await vettore(bal25, "ele_go", "600000", null);
await vettore(bal25, "fv", "145000", null);
await vettore(bal25, "gas", "168800", "101280", mensiliGas);
await vettore(bal25, "gasolio_t", "12400", "22320");
await vettore(bal24, "ele", "2318000", "394060");
await vettore(bal24, "fv", "38000", null);
await vettore(bal24, "gas", "179400", "100464");
await vettore(bal24, "gasolio_t", "13100", "22270");

// Fattore personalizzato: il gas del fornitore ha un potere calorifico misurato.
await sql`insert into energy_company_factor (id, organization_id, company_id, key, kwh_unita, fonte)
  values (${crypto.randomUUID()}, ${org.id}, ${co}, 'gas', '9.83', 'Analisi del fornitore, gennaio 2025')`;

// Usi finali: accesi, con metodo dichiarato, e ripartizione che quadra.
const usi = [
  ["U01", true,  "mis", "Contatore dedicato sulla linea forni fusori."],
  ["U02", true,  "cal", "Da ore di funzionamento e potenza assorbita a regime."],
  ["U03", true,  "mis", "Quadro di reparto con contatore di sottotensione."],
  ["U05", true,  "sti", "Stima da potenza installata e ore di esercizio del forno di preriscaldo."],
  ["U07", true,  "mis", "Contatore dedicato in sala compressori."],
  ["U08", true,  "cal", "Da ore a carico dei gruppi frigo e potenza di targa."],
  ["U10", true,  "cal", "Da potenza dei ventilatori di aspirazione fumi e ore di marcia."],
  ["U13", true,  "cal", "Da consumo di gas al netto dei forni, con bilancio stagionale."],
  ["U15", true,  "sti", "Da censimento dei corpi illuminanti e ore di accensione."],
  ["U16", true,  "sti", "Da potenza delle postazioni e della sala server."],
  ["U19", true,  "mis", "Erogazioni registrate al distributore interno di gasolio."],
  ["U20", true,  "mis", "Rifornimenti della flotta da carte carburante."],
];
for (const [k, attivo, metodo, nota] of usi)
  await sql`insert into energy_end_use_state (id, organization_id, balance_id, uso_key, attivo, metodo, nota)
    values (${crypto.randomUUID()}, ${org.id}, ${bal25}, ${k}, ${attivo}, ${metodo}, ${nota})`;

const cella = (uso, vet, q) =>
  sql`insert into energy_allocation (id, organization_id, balance_id, uso_key, vettore_key, quantita)
    values (${crypto.randomUUID()}, ${org.id}, ${bal25}, ${uso}, ${vet}, ${q})`;
// Elettricità: 2.280.000 kWh (il fotovoltaico si somma alle utenze di processo)
await cella("U01", "ele", "1180000");
await cella("U02", "ele", "342000");
await cella("U03", "ele", "196000");
await cella("U07", "ele", "289000");
await cella("U08", "ele", "118000");
await cella("U10", "ele", "84000");
await cella("U15", "ele", "48000");
await cella("U16", "ele", "23000");
await cella("U01", "fv", "145000");
// Gas: 168.800 Smc
await cella("U02", "gas", "94800");
await cella("U05", "gas", "38600");
await cella("U13", "gas", "35400");
// Autotrazione: 12.400 l
await cella("U19", "gasolio_t", "7600");
await cella("U20", "gasolio_t", "4800");

// Variabili di riferimento, entrambi gli anni.
const driver = (anno, k, v) =>
  sql`insert into energy_driver_value (id, organization_id, company_id, anno, driver_key, valore)
    values (${crypto.randomUUID()}, ${org.id}, ${co}, ${anno}, ${k}, ${v})`;
for (const [k, v25, v24] of [
  ["prod", "1284", "1196"],
  ["sup", "2600", "2600"],
  ["suptot", "9400", "9400"],
  ["vol", "62000", "62000"],
  ["add", "58", "56"],
  ["ore", "5568", "5424"],
  ["gg", "1180", "1240"],
  ["fatt", "14600000", "13400000"],
]) { await driver(2025, k, v25); await driver(2024, k, v24); }

// Programma di miglioramento.
const misura = (pos, desc, vet, q, inv, inc, uso, stato, anno, note) =>
  sql`insert into energy_measure (id, organization_id, balance_id, descrizione, vettore_key, quantita, investimento, incentivo, uso_key, stato, anno_previsto, note, posizione)
    values (${crypto.randomUUID()}, ${org.id}, ${bal25}, ${desc}, ${vet}, ${q}, ${inv}, ${inc}, ${uso}, ${stato}, ${anno}, ${note}, ${pos})`;
await misura(0, "Recupero del calore dai fumi del forno fusorio per il preriscaldo delle billette e dell'aria comburente", "gas", "22400", "148000", "44400", "U01", "approvato", 2026, "Scambiatore fumi-aria con by-pass automatico; intervento già valutato in sede di diagnosi 2024.");
await misura(1, "Sostituzione dei due compressori a vite a velocità fissa con macchine a giri variabili e rifacimento della rete", "ele", "104000", "96000", "28800", "U07", "approvato", 2026, "Le perdite della rete misurate a impianto fermo valgono il 24% dell'aria prodotta.");
await misura(2, "Coibentazione dei forni di mantenimento e dei canali di colata", "gas", "13600", "42000", "12600", "U02", "valutato", 2026, "Termografia eseguita a novembre 2025: dispersioni concentrate su portelli e canali.");
await misura(3, "Relamping a LED dei reparti fusione, finitura e magazzino con regolazione per zone", "ele", "31000", "58000", "0", "U15", "valutato", 2027, null);
await misura(4, "Rifasamento centralizzato e rifacimento del quadro generale", "ele", "18000", "31000", "0", null, "proposto", 2027, null);
await misura(5, "Impianto fotovoltaico in copertura, ampliamento a 400 kWp", "ele", "216000", "320000", "0", null, "proposto", 2028, "Superficie disponibile verificata; pratica di connessione da avviare.");

// Capitoli, con i diagrammi generati dai dati.
const capitolo = async (key, testo, media = []) => {
  const nid = crypto.randomUUID();
  const doc = { type: "doc", content: testo.split(/\n\n/).map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })) };
  await sql`insert into energy_narrative (id, organization_id, balance_id, template_key, contenuto)
    values (${nid}, ${org.id}, ${bal25}, ${key}, ${sql.json(doc)})`;
  for (const [i, m] of media.entries())
    await sql`insert into energy_media (id, organization_id, narrative_id, tipo, chart_key, didascalia, larghezza, posizione)
      values (${crypto.randomUUID()}, ${org.id}, ${nid}, 'chart', ${m[0]}, ${m[1]}, ${m[2] ?? "piena"}, ${i})`;
};

await capitolo("sintesi",
  "Lo stabilimento consuma 2,3 GWh di energia elettrica e 169.000 Smc di gas naturale, per una spesa energetica di 534.000 euro all'anno. Due terzi dell'energia vanno alle attività principali, e i soli forni fusori pesano per il 46% dei consumi elettrici.\n\nLa diagnosi individua tre interventi già approvati che valgono insieme un risparmio di 348 MWh all'anno, pari al 7,4% del consumo del sito, con un ritorno medio inferiore ai quattro anni. Il recupero del calore dai fumi del forno fusorio è il primo per convenienza e va avviato entro il 2026.\n\nRispetto al 2024 il consumo specifico è sceso del 7,4%, da 2.644 a 2.449 kWh per tonnellata di getti buoni: il risultato viene dall'aumento della produzione a parità di carichi ausiliari, non da un intervento di efficienza. È un miglioramento reale ma fragile, che si perde alla prima flessione degli ordini.");

await capitolo("contesto",
  "La Fonderia Irno lavora leghe di alluminio primarie e secondarie con colata in conchiglia a gravità, per componenti destinati all'automotive e alla meccanica agricola. Lo stabilimento occupa 9.400 metri quadri coperti in zona industriale a Salerno e impiega 58 addetti equivalenti.\n\nIl ciclo produttivo è organizzato su tre turni per cinque giorni, con 232 giorni lavorativi all'anno. I forni di mantenimento restano in temperatura anche nel fine settimana: è la ragione principale del consumo che il sito registra anche a produzione ferma.");

await capitolo("impianti",
  "Il reparto fusione dispone di due forni fusori a induzione da 1.500 kW ciascuno e di quattro forni di mantenimento a gas da 180 kW. Il trattamento termico è servito da un forno a tunnel con recupero parziale sull'aria di combustione, installato nel 2014.\n\nLa sala compressori ospita due macchine a vite da 75 kW a velocità fissa, del 2009, con essiccatore a ciclo frigorifero. La rete di distribuzione dell'aria compressa è quella originaria del capannone: la prova di svuotamento a impianto fermo ha misurato perdite pari al 24% dell'aria prodotta.\n\nL'illuminazione è ancora a vapori di sodio nei reparti fusione e finitura, con corpi da 400 W e accensione per campate intere.",
  [["flussi", "Dai vettori energetici alle aree funzionali dello stabilimento."]]);

await capitolo("metodo",
  "I consumi di energia elettrica e gas naturale provengono dalle fatture dei fornitori per l'intero esercizio 2025, riconciliate con le letture dei contatori di stabilimento. Il gasolio per autotrazione è ricavato dalle erogazioni del distributore interno e dalle carte carburante della flotta.\n\nIl potere calorifico del gas naturale è quello dichiarato dal fornitore nell'analisi di gennaio 2025, pari a 9,83 kWh per Smc, e sostituisce il valore convenzionale di libreria. Tutti gli altri fattori di conversione sono quelli della libreria di piattaforma.\n\nLa ripartizione sugli usi finali è misurata per i forni fusori, le macchine di formatura, l'aria compressa e l'autotrazione; calcolata per i forni di mantenimento, il freddo, l'aspirazione e il riscaldamento; stimata per essiccazione, illuminazione e uffici. Il metodo adottato è dichiarato per ciascuna utenza nella tabella del capitolo 7.");

await capitolo("analisi",
  "Il 52% dell'energia elettrica dello stabilimento è assorbito dai soli forni fusori, e le prime tre utenze coprono l'80% del consumo: è su queste che ogni intervento va misurato per primo.\n\nL'aria compressa è la seconda utenza ausiliaria e la più inefficiente. Con perdite al 24% e due compressori a velocità fissa che modulano per soffio, l'impianto lavora quasi sempre lontano dal punto di miglior rendimento. Un quarto dei 289 MWh assorbiti se ne va prima di raggiungere un utilizzatore.\n\nL'andamento mensile mostra un consumo di base che il sito assorbe anche ad agosto, con la produzione ferma per tre settimane: sono i forni di mantenimento tenuti in temperatura, l'aria compressa in stand-by e l'illuminazione dei reparti. È la parte che nessun aumento di produzione diluisce, e la si legge nel grafico mensile come lo zoccolo che resta anche nel mese di fermata.\n\nIl gas naturale segue invece un profilo stagionale netto, con il minimo estivo e il massimo a gennaio: la quota di riscaldamento ambienti è quindi separabile dal processo, e va trattata come un capitolo a sé.",
  [["pareto", "Usi finali in ordine di consumo, con la curva cumulata."], ["mensile", "Consumi mensili per categoria di vettore, con il consumo di base."]]);

await capitolo("azioni",
  "Gli interventi sono ordinati per convenienza, non per dimensione. I primi tre sono già approvati e coprono da soli l'80% del risparmio individuato; gli ultimi due restano proposte da istruire, perché richiedono una verifica di connessione e una valutazione di cassa che esula dalla diagnosi.\n\nIl recupero di calore dai fumi del forno fusorio è il primo per ritorno e va avviato entro il primo semestre 2026, quando è già prevista la fermata di manutenzione del forno: eseguirlo in quella finestra evita una fermata dedicata.\n\nGli interventi sull'aria compressa vanno eseguiti insieme, non in sequenza: sostituire i compressori senza rifare la rete sposterebbe il problema, non lo risolverebbe.",
  [["interventi", "Interventi in ordine di risparmio energetico."]]);

await capitolo("monitor",
  "Da gennaio 2026 il consumo elettrico dei forni fusori, della sala compressori e del reparto finitura è letto mensilmente dai contatori dedicati già installati, e riportato in un foglio di monitoraggio insieme alla produzione del mese.\n\nGli indicatori da seguire sono tre: il consumo specifico per tonnellata di getti buoni, il consumo elettrico dell'aria compressa per metro cubo prodotto e il consumo di base rilevato nelle settimane di fermata. Il primo dice se il sito migliora, il secondo se l'intervento sull'aria compressa ha funzionato, il terzo se i forni di mantenimento sono gestiti meglio.\n\nLa responsabilità del monitoraggio è dell'Energy Manager, con verifica trimestrale in direzione. Alla fine del 2026 gli stessi indicatori saranno confrontati con quelli di questa diagnosi.",
  [["indicatori", "Variazione degli indicatori rispetto all'anno di riferimento."]]);

await sql.end();

// 3 ── pubblicazione dalla interfaccia ───────────────────────────────────────
await page.goto(`${BASE}/aziende/${co}/energetico/2025?passo=8`);
await page.waitForLoadState("networkidle");
await page.click('[data-tour="pubblica-documento"]');
const doc = await page.waitForEvent("popup", { timeout: 90000 });
await doc.waitForLoadState("networkidle");
await doc.setViewportSize({ width: 1280, height: 1700 });
await doc.waitForTimeout(800);

const url = doc.url();
const quote = [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.95];
for (const [i, q] of quote.entries()) {
  await doc.evaluate((qq) => window.scrollTo(0, document.body.scrollHeight * qq), q);
  await doc.waitForTimeout(350);
  await doc.screenshot({ path: `${OUT}/${String(i + 1).padStart(2, "0")}-diagnosi.png` });
}

// 4 ── PDF vero (stessa pipeline della route) ────────────────────────────────
const p2 = await ctx.newPage();
await p2.goto(url, { waitUntil: "networkidle" });
const pdf = await p2.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
writeFileSync(`${OUT}/diagnosi-energetica-2025.pdf`, pdf);
await p2.close();

console.log("EMAIL_TEST=" + email);
console.log("COMPANY=" + co);
console.log("DOCUMENTO=" + url);
console.log("PDF=" + OUT + "/diagnosi-energetica-2025.pdf (" + Math.round(pdf.length / 1024) + " KB)");
if (errors.length) {
  console.log("CONSOLE_ERRORS:");
  for (const e of errors) console.log("  " + e);
  process.exitCode = 1;
} else {
  console.log("CONSOLE_ERRORS: nessuno");
}
await browser.close();
