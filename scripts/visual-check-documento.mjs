// Anteprima REALE dei documenti: prepara un'azienda con dati golden, pubblica
// GHG e Bilancio, fotografa le pagine documento e scarica il PDF vero.
// Richiede `npm run dev` attivo.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";

const OUT = process.env.SHOT_DIR ?? "./shots-documento";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";
const errors = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1600 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

// 1. Utente attivo
const email = `visual-doc-${Date.now()}@example.com`;
await page.goto(BASE + "/registrati");
await page.waitForLoadState("networkidle");
  await registraEEntra(page, sql, { base: BASE, nome: "Anna Greco", email: email, pwd: "PasswordSicura123!" });

// Il tour guidato parte da solo al primo accesso e copre la pagina: i suoi
// popover intercettano i clic dello script. Va silenziato prima di procedere.
await page.evaluate(() => {
  for (const k of ["portfolio", "ghg", "bilancio"]) localStorage.setItem(`evalisdeck-tour:${k}`, "1");
});

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const [org] = await sql`select m.organization_id as id, m.user_id as uid from member m join "user" u on u.id=m.user_id where u.email=${email}`;
await sql`update org_entitlement set status='active' where organization_id=${org.id}`;

// 2. Azienda + dati completi via SQL (setup deterministico; i flussi UI sono già
//    coperti dagli e2e — qui serve un documento RICCO da fotografare).
const co = crypto.randomUUID();
await sql`insert into company (id, organization_id, nome, settore, sede, piva, ateco)
  values (${co}, ${org.id}, 'Meccanica Adriatica S.r.l.', 'Componenti meccanici', 'Bari', '07566620723', '25.62')`;

// Inventario GHG 2025 + 2024 (anno base) con voci golden
const [cs] = await sql`select id from content_set where dominio='ghg' order by versione desc limit 1`;
const inv25 = crypto.randomUUID();
const inv24 = crypto.randomUUID();
const boundaries = {
  forma: "Meccanica Adriatica S.r.l.", piva: "07566620723", sede: "Bari, via delle Officine 12",
  settore: "Componenti meccanici di precisione", ateco: "25.62", siti: "Stabilimento di Bari (produzione); deposito di Modugno (logistica)",
  dipendenti: "48", responsabile: "Ing. Paola Ranieri — HSE Manager", consolidamento: "Controllo operativo",
  perimetroOrg: "La società non detiene partecipazioni: il perimetro coincide con la persona giuridica, con i due siti operativi di Bari e Modugno.",
  perimetroOp: "Sono incluse tutte le emissioni dirette (categoria 1) e da energia importata (categoria 2). Le categorie 3-6 sono state esaminate: risultano incluse le trasferte di lavoro, escluse le restanti per non significatività documentata.",
  periodo: "1 gennaio – 31 dicembre", significativita: "Soglia di significatività del 5% sul totale stimato, combinata con la rilevanza per i clienti del settore automotive.",
  metodologia: "Metodo per dati di attività: quantità da fatture e registri moltiplicate per fattori di emissione documentati (ISPRA 2025, DEFRA 2025).",
  verifica: "Verifica in corso", motivoBase: "Il 2024 è il primo esercizio con dati completi e verificabili su entrambi i siti.",
  regolaRicalcolo: "Ricalcolo dell'anno base per variazioni strutturali che modificano il totale delle categorie 1 e 2 di oltre il 5%.",
};
await sql`insert into ghg_inventory (id, organization_id, company_id, anno, anno_base, gwp_set_key, content_set_id, boundaries, ricavi, fte, produzione, um_produzione)
  values (${inv25}, ${org.id}, ${co}, 2025, 2024, 'AR6', ${cs.id}, ${sql.json(boundaries)}, '5200000', '48', '1250', 't'),
         (${inv24}, ${org.id}, ${co}, 2024, 2024, 'AR6', ${cs.id}, ${sql.json(boundaries)}, '4900000', '46', '1180', 't')`;
const voce = (inv, src, cat, desc, fk, um, q, fe, extra = {}) =>
  sql`insert into ghg_activity_row (id, organization_id, inventory_id, source_type_key, category_key, descrizione, factor_key, um, quantita, fe, fe_market, quota_go, fe_biogenic, dq, sede, evidenza)
    values (${crypto.randomUUID()}, ${org.id}, ${inv}, ${src}, ${cat}, ${desc}, ${fk}, ${um}, ${q}, ${fe},
      ${extra.mkt ?? null}, ${extra.go ?? null}, ${extra.bio ?? null}, ${extra.dq ?? "F"}, ${extra.sede ?? "Stabilimento di Bari"}, ${extra.ev ?? "Fatture e registri 2025"})`;
await voce(inv25, "1a", "1", "Gas naturale — centrale termica", "gas_smc", "Smc", "42500", "1.9755");
await voce(inv25, "1b", "1", "Gasolio flotta furgoni", "gasolio_auto", "litri", "8600", "2.687");
await voce(inv25, "1c", "1", "Ricarica R410A climatizzazione", "r410a", "kg", "6", "2088", { dq: "M" });
await voce(inv25, "2a", "2", "Energia elettrica siti produttivi", "ee_loc", "kWh", "612000", "0.2565", { mkt: "0.457", go: "180000", dq: "M" });
await voce(inv25, "3d", "3", "Trasferte aeree commerciali", "aereo_corto", "pax·km", "38000", "0.158", { dq: "S", ev: "Note spese 2025" });
await voce(inv24, "1a", "1", "Gas naturale — centrale termica", "gas_smc", "Smc", "45800", "1.9755");
await voce(inv24, "1b", "1", "Gasolio flotta furgoni", "gasolio_auto", "litri", "9400", "2.687");
await voce(inv24, "2a", "2", "Energia elettrica siti produttivi", "ee_loc", "kWh", "598000", "0.2565", { mkt: "0.457", go: "120000", dq: "M" });
for (const [k, st, mot] of [["1a","in",null],["1b","in",null],["1c","in",null],["1d","na","Nessun processo chimico o fisico che generi emissioni non di combustione."],["2a","in",null],["3d","in",null],["4e","out","Rifiuti gestiti dal consorzio del distretto: quota non significativa (<1% del totale stimato)."]])
  await sql`insert into ghg_source_selection (id, organization_id, inventory_id, source_type_key, stato, motivazione)
    values (${crypto.randomUUID()}, ${org.id}, ${inv25}, ${k}, ${st}, ${mot})`;
await sql`insert into ghg_target (id, organization_id, company_id, nome, ambito, riduzione_pct, anno_target, note)
  values (${crypto.randomUUID()}, ${org.id}, ${co}, 'Riduzione emissioni dirette e da energia', '12', '30', 2030, 'Fotovoltaico 200 kWp e contratto GO al 100%')`;
for (const k of ["v1","v2","v4","v6","v7","v8"])
  await sql`insert into ghg_checklist_status (id, organization_id, inventory_id, requirement_key, stato)
    values (${crypto.randomUUID()}, ${org.id}, ${inv25}, ${k}, 'ok')`;

// Bilancio 2025: progetto, materialità, KPI, gestione, capitoli con diagrammi
const [csr] = await sql`select id from content_set where dominio='report' order by versione desc limit 1`;
const proj = crypto.randomUUID();
await sql`insert into report_project (id, organization_id, company_id, anno, content_set_id, standard, perimetro, profilo, soglia_materialita)
  values (${proj}, ${org.id}, ${co}, 2025, ${csr.id}, 'GRI 2021 — opzione con riferimento',
    'Tutte le sedi operative della società: stabilimento di Bari e deposito di Modugno.',
    ${sql.json({ forma: "S.r.l.", piva: "07566620723", sede: "Bari", settore: "Componenti meccanici di precisione", ateco: "25.62", sitiop: "Bari (produzione), Modugno (logistica)", mercati: "Automotive e meccanica agricola, Italia ed export UE (60/40)", contatto: "sostenibilita@esempio.it" })}, '3')`;
for (const [t, i, f] of [["T01",4,3],["T02",4,4],["T06",3,3],["T07",5,4],["T08",3,3],["T10",4,3],["T13",4,4],["T16",3,3],["T03",2,2],["T04",2,1],["T09",3,2],["T14",2,3]])
  await sql`insert into materiality_assessment (id, organization_id, project_id, topic_key, score_impact, score_financial)
    values (${crypto.randomUUID()}, ${org.id}, ${proj}, ${t}, ${i}, ${f})`;
const kpi = async (anno, k, v) => sql`insert into kpi_value (id, organization_id, company_id, anno, kpi_key, valore)
  values (${crypto.randomUUID()}, ${org.id}, ${co}, ${anno}, ${k}, ${v})`;
for (const [k, v25, v24] of [
  ["en_ele","612000","598000"],["en_ele_go","180000","120000"],["en_auto","42000","0"],["en_gas","42500","45800"],
  ["en_flotta_d","8600","9400"],["ac_prel","3400","3600"],["ri_np","96","104"],["ri_p","11","14"],["ri_rec","82","78"],
  ["ma_tot","1480","1420"],["ma_ric","210","160"],["hr_tot","48","46"],["hr_don","14","12"],["hr_ind","44","42"],
  ["hr_u30","9","8"],["hr_o50","15","14"],["hr_ass","5","4"],["hr_ces","3","5"],["hr_dis","2","2"],
  ["si_ore","79000","76500"],["si_inf","1","3"],["si_gg","12","61"],["fo_ore","640","410"],["fo_sic","280","220"],
  ["re_don","29400","28100"],["re_uom","31200","30400"],["ec_ric","5200000","4900000"],["ec_for","118","121"],
  ["ec_loc","94","95"],["go_forq","36","18"],["go_cda","5","5"],["go_cdad","2","2"],["go_seg","1","0"],["go_cor","0","0"],["go_san","0","1"],
]) { await kpi(2025, k, v25); await kpi(2024, k, v24); }
for (const [t, pol, az, target, base, anno, resp] of [
  ["T01","Politica energetica e climatica approvata dal CdA a marzo 2024, integrata nel sistema di gestione ISO 14001.","Installazione dell'impianto fotovoltaico da 200 kWp sul tetto dello stabilimento; contratto di fornitura con Garanzia d'Origine per il 30% dei prelievi.","−30% Scope 1+2","2024","2030","HSE Manager"],
  ["T07","Sistema di gestione della sicurezza conforme ISO 45001, con obiettivo infortuni zero.","Programma di near-miss reporting (38 segnalazioni raccolte), formazione specifica sui carrelli e nuova segnaletica di reparto.","Indice di frequenza < 10","2024","2027","RSPP"],
  ["T13","Sistema qualità IATF 16949 per le forniture automotive.","Riduzione della difettosità a 12 ppm; audit di seconda parte superati con i tre clienti principali.","Difettosità < 10 ppm","2025","2027","Quality Manager"],
])
  await sql`insert into topic_management (id, organization_id, project_id, topic_key, politica, azioni, target, anno_base, anno_target, responsabile)
    values (${crypto.randomUUID()}, ${org.id}, ${proj}, ${t}, ${pol}, ${az}, ${target}, ${base}, ${anno}, ${resp})`;
const capitolo = async (key, testo, media = []) => {
  const sid = crypto.randomUUID();
  const doc = { type: "doc", content: testo.split(/\n\n/).map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })) };
  await sql`insert into narrative_section (id, organization_id, project_id, template_key, contenuto)
    values (${sid}, ${org.id}, ${proj}, ${key}, ${sql.json(doc)})`;
  for (const [i, ch] of media.entries())
    await sql`insert into media_asset (id, organization_id, section_id, tipo, chart_key, didascalia, larghezza, posizione)
      values (${crypto.randomUUID()}, ${org.id}, ${sid}, 'chart', ${ch[0]}, ${ch[1]}, ${ch[2] ?? "full"}, ${i})`;
};
await capitolo("lettera", "Il 2025 è stato l'anno in cui la sostenibilità è passata dai propositi ai numeri. Abbiamo installato il fotovoltaico, ridotto di un terzo gli infortuni e — per la prima volta — misurato per intero le nostre emissioni secondo la ISO 14064-1.\n\nQuesto documento racconta come lavoriamo: ai nostri clienti, alle banche che ci accompagnano e soprattutto alle 48 persone che ogni giorno costruiscono questa azienda.", [["emissioni","Emissioni Scope 1 e 2: confronto 2024-2025."]]);
await capitolo("identita", "Meccanica Adriatica nasce a Bari nel 1987 come officina di tornitura conto terzi. Oggi produce componenti meccanici di precisione per l'automotive e la meccanica agricola, con 48 dipendenti e un fatturato di 5,2 milioni di euro.\n\nLa proprietà è alla seconda generazione familiare; dal 2019 l'azienda è certificata ISO 9001 e IATF 16949, dal 2023 ISO 14001 e 45001.", [["persone","Composizione dell'organico al 31 dicembre 2025.", "half"]]);
await capitolo("business", "Il modello è semplice: trasformiamo acciaio e leghe in componenti finiti per i capofiliera, con lavorazioni CNC ad alta precisione e controllo qualità al 100% sulle serie critiche.\n\nL'energia è il secondo costo dopo i materiali: per questo l'efficienza energetica è insieme una scelta ambientale e industriale.", [["energia","Composizione dei consumi energetici 2025."]]);
await capitolo("catena", "A monte: acciai da fornitori italiani e tedeschi qualificati (94 fornitori su 118 hanno sede in Italia). A valle: consegne dirette ai capofiliera con vettori consorziati.\n\nDal 2025 la qualifica fornitori include criteri ambientali e sociali: 36 fornitori sono già stati valutati.", [["fornitori","Provenienza e valutazione ESG dei fornitori."]]);
await capitolo("stake", "L'analisi di doppia rilevanza ha coinvolto direzione, RSPP, responsabili di funzione e — tramite questionario — i tre clienti principali e le rappresentanze sindacali.\n\nSono risultati materiali 8 temi su 18 valutati: clima ed energia, economia circolare, salute e sicurezza, condizioni di lavoro, competenze, qualità di prodotto e filiera responsabile.", [["materialita","Matrice di doppia rilevanza 2025."]]);
await capitolo("metodo", "Il bilancio è redatto con riferimento ai GRI Standards 2021 e tiene conto della struttura del modulo VSME. I dati provengono dai sistemi gestionali aziendali e dall'inventario GHG redatto secondo ISO 14064-1.\n\nDove il dato puntuale non era disponibile è stata usata una stima documentata, indicata nel testo.");
await capitolo("impegni", "Per il triennio 2026-2028: portare la quota rinnovabile oltre il 50%, completare la qualifica ESG dell'albo fornitori, ottenere la certificazione della parità di genere UNI/PdR 125 e ridurre l'indice di frequenza infortuni sotto quota 10.", [["sicurezza","Indici infortunistici: confronto biennale."],["rifiuti","Gestione dei rifiuti 2024-2025.", "half"]]);
await sql.end();

// 3. Pubblica entrambi i documenti via UI e fotografa
const apri = async (percorso) => { await page.goto(BASE + percorso); await page.waitForLoadState("networkidle"); };
await apri(`/aziende/${co}/ghg/2025?passo=8`);
await page.click('[data-tour="pubblica-documento"]');
const popupGhg = await page.waitForEvent("popup", { timeout: 60000 });
await popupGhg.waitForLoadState("networkidle");
await popupGhg.setViewportSize({ width: 1280, height: 1600 });
await popupGhg.screenshot({ path: `${OUT}/01-doc-ghg-inizio.png` });
await popupGhg.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45));
await popupGhg.screenshot({ path: `${OUT}/02-doc-ghg-meta.png` });
const urlGhg = popupGhg.url();

await apri(`/aziende/${co}/bilancio/2025?passo=7`);
await page.click('[data-tour="pubblica-documento"]');
const popupBil = await page.waitForEvent("popup", { timeout: 60000 });
await popupBil.waitForLoadState("networkidle");
await popupBil.setViewportSize({ width: 1280, height: 1600 });
await popupBil.screenshot({ path: `${OUT}/03-doc-bilancio-copertina.png` });
await popupBil.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.28));
await popupBil.waitForTimeout(300);
await popupBil.screenshot({ path: `${OUT}/04-doc-bilancio-materialita.png` });
await popupBil.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
await popupBil.waitForTimeout(300);
await popupBil.screenshot({ path: `${OUT}/05-doc-bilancio-ambiente.png` });
const urlBil = popupBil.url();

// 4. PDF reali (stessa pipeline della route: chromium locale)
for (const [nome, url] of [["rapporto-ghg-2025.pdf", urlGhg], ["bilancio-2025.pdf", urlBil]]) {
  const p2 = await ctx.newPage();
  await p2.goto(url, { waitUntil: "networkidle" });
  const pdf = await p2.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
  writeFileSync(`${OUT}/${nome}`, pdf);
  await p2.close();
}

console.log("EMAIL_TEST=" + email);
console.log("GHG=" + urlGhg);
console.log("BILANCIO=" + urlBil);
if (errors.length) {
  console.log("CONSOLE_ERRORS:");
  for (const e of errors) console.log("  " + e);
  process.exitCode = 1;
} else {
  console.log("CONSOLE_ERRORS: nessuno");
}
await browser.close();
