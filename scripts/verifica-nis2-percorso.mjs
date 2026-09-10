// I DUE PERCORSI NIS2, comando per comando, con le tre spie a ogni gesto.
//
//   npm run qa -- nis2-percorso
//
// ⚠️ Il controllo che vale piu' di tutti sta in fondo: si risponde a un requisito
// nell'AUTOVALUTAZIONE, si apre il SISTEMA DI GESTIONE, e si verifica NEL DATABASE che la
// riga sia una sola e porti quel valore. E' la decisione che governa tutto lo schema, e se
// un domani qualcuno separasse le tabelle non uscirebbe nessun errore: solo due numeri
// diversi per la stessa azienda, in due schermate che si aprono entrambe.
//
// ⚠️ E l'altro che conta: un controllo dichiarato «attuato» con la verifica scaduta deve
// comparire come «da verificare». E' la regola meno ovvia del modulo, e la sola che un
// lettore distratto toglierebbe credendo di semplificare.

import "dotenv/config";
import { chromium } from "@playwright/test";
import postgres from "postgres";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import {
  attraversaProtezione,
  contatore,
  pretendiPdfVero,
  pretendiServerAggiornato,
  spegniTour,
  strumenta,
} from "./comune-collaudo.mjs";
import { registraEEntra } from "./comune-registrazione.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** I nomi con cui i tre documenti si consegnano al committente. */
const NOMI_CONSEGNA = {
  conformita_nis2: "Relazione sul livello di conformita NIS2 (D.Lgs. 138-2024)",
  relazione_nis2: "Relazione sul sistema di gestione NIS2 (D.Lgs. 138-2024)",
  controlli_nis2: "Catalogo dei controlli NIS2 (D.Lgs. 138-2024)",
};

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");

const RUN = Date.now();
const email = `nis2-${RUN}@example.com`;
const NOME_AZIENDA = `Reti Adriatiche ${String(RUN).slice(-6)} S.p.A.`;

console.log(`\nNIS2 — i due percorsi — ${BASE}\n`);
if (!/^https?:\/\/localhost/.test(BASE)) await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await attraversaProtezione(page);
const guasti = strumenta(page);
const { agisci, respinto, riepilogo } = contatore(page, guasti);

const { orgId } = await registraEEntra(page, sql, {
  base: BASE,
  nome: "Studio NIS2",
  email,
  pwd: PWD_COLLAUDO,
});
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
await spegniTour(page);

// ─── azienda ─────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await spegniTour(page);
await page.click('[data-tour="nuova-azienda"]');
await page.fill("#na-nome", NOME_AZIENDA);
await page.fill("#na-settore", "Energia");
await page.click('button[type="submit"]:has-text("Crea azienda")');
await page.waitForURL(/\/aziende\/[^/]+(\?|#|$)/, { timeout: 30_000 });
const companyId = page.url().match(/aziende\/([^/?#]+)/)[1];
await spegniTour(page);

/** Il valore di un requisito, letto dal DATABASE e non dalla pagina. */
const livelloDi = async (key) => {
  const [r] = await sql`select livello, non_applicabile from nis2_requirement_state
                        where company_id = ${companyId} and requirement_key = ${key}`;
  return r ?? null;
};

/** L'identificativo di un indicatore, dal database: nella pagina non c'e'. */
const idIndicatore = async (codice) => {
  const [r] = await sql`select id from nis2_indicator where company_id = ${companyId} and codice = ${codice}`;
  if (!r) throw new Error(`indicatore ${codice} assente`);
  return r.id;
};

const vaiA = async (percorso, vista) => {
  await page.goto(`${BASE}/aziende/${companyId}/${percorso}${vista ? `?vista=${vista}` : ""}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(700);
  await spegniTour(page);
};

// ═══════════════════════════════════ AUTOVALUTAZIONE ═════════════════════════
console.log("\n— Autovalutazione —");

await vaiA("nis2");
await agisci("il percorso si apre e propone l'apertura", async () => {
  await page.getByRole("button", { name: /Apri l'autovalutazione/i }).waitFor({ timeout: 15_000 });
});

await agisci("apertura del percorso", async () => {
  await page.getByRole("button", { name: /Apri l'autovalutazione/i }).click();
  await page.waitForTimeout(2500);
  const [r] = await sql`select 1 from nis2_assessment where company_id = ${companyId}`;
  if (!r) throw new Error("nessuna riga in nis2_assessment");
});

await agisci("⚠️ aprire l'autovalutazione NON accende il sistema di gestione", async () => {
  const [r] = await sql`select 1 from nis2_system where company_id = ${companyId}`;
  if (r) throw new Error("nis2_system creato senza che nessuno l'abbia aperto");
});

// ─── ambito ──────────────────────────────────────────────────────────────────
await vaiA("nis2", "ambito");

await agisci("la classificazione parte NON DETERMINATA, e la pagina spiega che non e' «fuori ambito»", async () => {
  // ⚠️ La prima versione di questo controllo cercava l'ASSENZA della locuzione «fuori
  // ambito» e falliva: la pagina la contiene apposta, per dire che non e' quello. Un
  // controllo sull'assenza di una parola punisce la spiegazione insieme all'errore.
  const t = await page.locator("main").innerText();
  if (!/non determinata/i.test(t)) throw new Error("manca la dicitura «non determinata»");
  if (!/Non significa «fuori ambito»/i.test(t)) {
    throw new Error("non spiega la differenza fra «non determinata» e «fuori ambito»");
  }
});

await agisci("settore: Energia (Allegato I)", async () => {
  await page.getByRole("combobox", { name: "Settore di attività" }).click();
  await page.getByRole("option", { name: /^Energia · Allegato 1$/ }).click();
  await page.waitForTimeout(1800);
});

await agisci("dimensione: grande impresa", async () => {
  await page.getByRole("combobox", { name: "Parametro dimensionale" }).click();
  await page.getByRole("option", { name: "Grande impresa" }).click();
  await page.waitForTimeout(1800);
});

await agisci("→ classificazione ESSENZIALE, con la via scritta", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const t = await page.locator("main").innerText();
  if (!/Soggetto essenziale/i.test(t)) throw new Error("non classifica come essenziale");
  if (!/Allegato I/i.test(t)) throw new Error("non dice DA DOVE viene la classificazione");
  if (!/10 milioni/i.test(t)) throw new Error("non riporta il massimo edittale");
});

await agisci("⚠️ nel database NON c'e' nessuna colonna «classe»: si calcola", async () => {
  const c = await sql`select column_name from information_schema.columns
                      where table_name = 'nis2_profile' and column_name in ('classe','classificazione')`;
  if (c.length) throw new Error("la classificazione e' persistita: puo' restare indietro dai suoi ingredienti");
});

await agisci("un criterio specifico scavalca la dimensione", async () => {
  await page.getByRole("combobox", { name: "Parametro dimensionale" }).click();
  await page.getByRole("option", { name: "Microimpresa o piccola impresa" }).click();
  await page.waitForTimeout(1600);
  await page.getByRole("checkbox", { name: /^C1:/ }).check();
  await page.waitForTimeout(1800);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const t = await page.locator("main").innerText();
  if (!/Soggetto essenziale/i.test(t)) throw new Error("il criterio non ha scavalcato la dimensione");
  if (!/criterio specifico/i.test(t)) throw new Error("non dice che ha deciso il criterio");
});

await agisci("tolto il criterio, torna grande impresa in Allegato I", async () => {
  await page.getByRole("checkbox", { name: /^C1:/ }).uncheck();
  await page.waitForTimeout(1500);
  await page.getByRole("combobox", { name: "Parametro dimensionale" }).click();
  await page.getByRole("option", { name: "Grande impresa" }).click();
  await page.waitForTimeout(1800);
});

await agisci("l'assetto si salva un campo per volta", async () => {
  await page.fill("#nis2-responsabile", "M. Rossi");
  await page.locator("#nis2-organo").click();
  await page.waitForTimeout(1500);
  await page.fill("#nis2-organo", "Consiglio di amministrazione");
  await page.locator("#nis2-responsabile").click();
  await page.waitForTimeout(1800);
  const [p] = await sql`select organo, responsabile from nis2_profile where company_id = ${companyId}`;
  if (p.responsabile !== "M. Rossi") throw new Error("il responsabile e' stato azzerato salvando l'organo");
  if (p.organo !== "Consiglio di amministrazione") throw new Error("l'organo non e' stato salvato");
});

await agisci("la data della comunicazione ACN", async () => {
  await page.fill("#nis2-comunicazioneIl", "2026-01-15");
  await page.locator("#nis2-organo").click();
  await page.waitForTimeout(1800);
  const [p] = await sql`select comunicazione_il from nis2_profile where company_id = ${companyId}`;
  if (p.comunicazione_il !== "2026-01-15") throw new Error("data non salvata");
});

// ─── verifica ────────────────────────────────────────────────────────────────
await vaiA("nis2", "requisiti");

await agisci("i requisiti dell'autovalutazione sono 124, non 126", async () => {
  const t = await page.locator('[data-slot="conteggio-risultati"]').innerText();
  if (!/^124 requisiti/.test(t)) throw new Error(`ne mostra «${t}»`);
});

await agisci("G.11 e G.12 NON compaiono qui: sono del solo sistema di gestione", async () => {
  if (await page.locator('[data-requisito="G.11"]').count()) throw new Error("G.11 e' visibile nell'autovalutazione");
  if (await page.locator('[data-requisito="G.12"]').count()) throw new Error("G.12 e' visibile nell'autovalutazione");
});

await agisci("valuto G.01 al livello 4", async () => {
  await page.getByRole("button", { name: "G.01: livello 4 · Attuata e verificata" }).click();
  await page.waitForTimeout(1800);
  const r = await livelloDi("G.01");
  if (r?.livello !== 4) throw new Error(`nel database il livello e' ${r?.livello}`);
});

await agisci("⚠️ un requisito su 124 NON da' 100%: da' 1%", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const t = await page.locator("main").innerText();
  if (/conformità 100%/i.test(t)) throw new Error("media sui soli valutati: e' il difetto del prototipo");
  if (!/conformità 1%/i.test(t)) throw new Error(`la percentuale non e' 1%: ${t.slice(0, 200)}`);
});

await agisci("ripremere lo stesso livello annulla la valutazione", async () => {
  await page.getByRole("button", { name: "G.01: livello 4 · Attuata e verificata" }).click();
  await page.waitForTimeout(1800);
  const r = await livelloDi("G.01");
  if (r?.livello !== null) throw new Error(`il livello e' rimasto ${r?.livello}`);
  await page.getByRole("button", { name: "G.01: livello 4 · Attuata e verificata" }).click();
  await page.waitForTimeout(1600);
});

await agisci("l'evidenza si salva senza toccare il livello", async () => {
  await page.fill("#ev-G\\.01", "Delibera CdA del 12 marzo");
  await page.locator("#nis2-cerca").click();
  await page.waitForTimeout(1800);
  const r = await livelloDi("G.01");
  if (r?.livello !== 4) throw new Error("salvare l'evidenza ha azzerato il livello");
  const [e] = await sql`select evidenza from nis2_requirement_state
                        where company_id = ${companyId} and requirement_key = 'G.01'`;
  if (e.evidenza !== "Delibera CdA del 12 marzo") throw new Error("evidenza non salvata");
});

await agisci("«non applicabile» azzera il livello ed esce dal denominatore", async () => {
  await page.fill("#nis2-cerca", "R.01");
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "R.01: livello 2 · Attuata parzialmente" }).click();
  await page.waitForTimeout(1600);
  await page.getByRole("checkbox", { name: "R.01: non applicabile" }).check();
  await page.waitForTimeout(1800);
  const r = await livelloDi("R.01");
  if (!r?.non_applicabile) throw new Error("non e' stato marcato non applicabile");
  if (r.livello !== null) throw new Error(`il livello e' rimasto ${r.livello}`);
});

await agisci("il filtro «solo da valutare» restringe l'elenco", async () => {
  await page.fill("#nis2-cerca", "");
  await page.waitForTimeout(400);
  await page.getByRole("checkbox", { name: /solo i requisiti non ancora valutati/i }).check();
  await page.waitForTimeout(800);
  const t = await page.locator('[data-slot="conteggio-risultati"]').innerText();
  const n = Number(t.match(/^(\d+)/)?.[1]);
  if (!(n > 0 && n < 124)) throw new Error(`il filtro non restringe: «${t}»`);
  await page.getByRole("checkbox", { name: /solo i requisiti non ancora valutati/i }).uncheck();
  await page.waitForTimeout(500);
});

// ─── quadro ──────────────────────────────────────────────────────────────────
await vaiA("nis2", "quadro");

await agisci("il quadro dice che i non valutati pesano zero", async () => {
  const t = await page.locator("main").innerText();
  if (!/pesano zero/i.test(t)) throw new Error("non spiega perche' la percentuale e' bassa");
});

await agisci("gli scostamenti sono i valutati SOTTO l'obiettivo", async () => {
  // ⚠️ Il riquadro degli scostamenti compare solo se ce n'e' almeno uno, e finora non ce
  // n'erano: G.01 sta a 4 e R.01 e' non applicabile. La prima versione di questo controllo
  // lo cercava comunque e accusava il prodotto di non distinguerli — mentre non c'era
  // niente da distinguere. Il presupposto si COSTRUISCE, non si spera.
  await vaiA("nis2", "requisiti");
  await page.fill("#nis2-cerca", "A.01");
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "A.01: livello 1 · Pianificata" }).click();
  await page.waitForTimeout(1900);
  await vaiA("nis2", "quadro");
  const t = await page.locator("main").innerText();
  if (!/istruttoria da completare/i.test(t)) {
    throw new Error("non distingue gli scostamenti dai requisiti non valutati");
  }
  if (!/A.01/.test(t)) throw new Error("A.01 non compare fra gli scostamenti");
});

// ═══════════════════════════════ SISTEMA DI GESTIONE ═════════════════════════
console.log("\n— Sistema di gestione —");

await vaiA("sgnis2");
await agisci("apertura del sistema di gestione", async () => {
  await page.getByRole("button", { name: /Apri il sistema di gestione/i }).click();
  await page.waitForTimeout(2500);
  const [r] = await sql`select 1 from nis2_system where company_id = ${companyId}`;
  if (!r) throw new Error("nessuna riga in nis2_system");
});

// ⚠️ IL CONTROLLO CHE VALE PIU' DI TUTTI.
await vaiA("sgnis2", "requisiti");
await agisci("⚠️ LA RISPOSTA E' UNA SOLA: G.01 e' gia' valutato qui", async () => {
  const t = await page.locator("main").innerText();
  if (!/stesse risposte/i.test(t)) throw new Error("la schermata non dichiara che le risposte sono condivise");
  const premuto = await page
    .getByRole("button", { name: "G.01: livello 4 · Attuata e verificata" })
    .getAttribute("aria-pressed");
  if (premuto !== "true") throw new Error("il livello dato nell'autovalutazione non compare qui");
});

await agisci("qui i requisiti sono 126: G.11 e G.12 esistono solo in questo percorso", async () => {
  const t = await page.locator('[data-slot="conteggio-risultati"]').innerText();
  if (!/^126 requisiti/.test(t)) throw new Error(`ne mostra «${t}»`);
  if (!(await page.locator('[data-requisito="G.11"]').count())) throw new Error("G.11 non c'e'");
});

await agisci("modificare da qui si vede anche nell'autovalutazione", async () => {
  await page.getByRole("button", { name: "G.01: livello 1 · Pianificata" }).click();
  await page.waitForTimeout(1800);
  const righe = await sql`select livello from nis2_requirement_state
                          where company_id = ${companyId} and requirement_key = 'G.01'`;
  if (righe.length !== 1) throw new Error(`nel database ci sono ${righe.length} righe per G.01, non una`);
  if (righe[0].livello !== 1) throw new Error(`il livello e' ${righe[0].livello}`);
  await vaiA("nis2", "requisiti");
  const premuto = await page
    .getByRole("button", { name: "G.01: livello 1 · Pianificata" })
    .getAttribute("aria-pressed");
  if (premuto !== "true") throw new Error("l'autovalutazione non vede la modifica fatta nel sistema");
});

// ─── controlli ───────────────────────────────────────────────────────────────
await vaiA("sgnis2", "controlli");

await agisci("i controlli sono 68 e partono tutti senza stato", async () => {
  const t = await page.locator('[data-slot="conteggio-risultati"]').innerText();
  if (!/^68 controlli/.test(t)) throw new Error(`ne mostra «${t}»`);
});

await agisci("dichiaro G-01 attuato", async () => {
  await page.getByRole("combobox", { name: "Stato dichiarato di G-01" }).click();
  // ⚠️ `exact`: senza, «Attuato» corrisponde anche a «Non attuato» e Playwright si
  // ferma con «resolved to 2 elements». La corrispondenza per sottostringa e' il
  // valore predefinito, e su un elenco di stati e' quasi sempre sbagliata.
  await page.getByRole("option", { name: "Attuato", exact: true }).click();
  await page.waitForTimeout(1800);
  const [r] = await sql`select stato from nis2_control_state
                        where company_id = ${companyId} and control_key = 'G-01'`;
  if (r?.stato !== "attuato") throw new Error(`nel database lo stato e' ${r?.stato}`);
});

await agisci("⚠️ attuato SENZA verifica registrata → «Da verificare»", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const t = await page.locator('[data-controllo="G-01"] [data-slot="stato-effettivo"]').innerText();
  if (!/da verificare/i.test(t)) throw new Error(`lo stato effettivo e' «${t}»`);
});

await agisci("⚠️ attuato con verifica SCADUTA → «Da verificare»", async () => {
  await page.fill("#uv-G-01", "2020-01-01");
  await page.locator("#re-G-01").click();
  await page.waitForTimeout(2000);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const t = await page.locator('[data-controllo="G-01"] [data-slot="stato-effettivo"]').innerText();
  if (!/da verificare/i.test(t)) throw new Error(`lo stato effettivo e' «${t}»`);
});

await agisci("verifica recente → torna «Attuato»", async () => {
  const oggi = new Date().toISOString().slice(0, 10);
  await page.fill("#uv-G-01", oggi);
  await page.locator("#re-G-01").click();
  await page.waitForTimeout(2000);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const t = await page.locator('[data-controllo="G-01"] [data-slot="stato-effettivo"]').innerText();
  if (!/^attuato$/i.test(t.trim())) throw new Error(`lo stato effettivo e' «${t}»`);
});

await agisci("responsabile ed evidenza non azzerano lo stato", async () => {
  await page.fill("#re-G-01", "IT Manager");
  await page.locator("#ev-G-01").click();
  await page.waitForTimeout(1600);
  await page.fill("#ev-G-01", "Delibera 12/2026");
  await page.locator("#re-G-01").click();
  await page.waitForTimeout(1900);
  const [r] = await sql`select stato, responsabile, evidenza, ultima_verifica from nis2_control_state
                        where company_id = ${companyId} and control_key = 'G-01'`;
  if (r.stato !== "attuato") throw new Error("lo stato e' stato azzerato");
  if (r.responsabile !== "IT Manager") throw new Error("il responsabile e' stato azzerato");
  if (r.evidenza !== "Delibera 12/2026") throw new Error("l'evidenza non e' stata salvata");
  if (!r.ultima_verifica) throw new Error("la data di verifica e' stata azzerata");
});

await agisci("l'avviso conta i controlli da verificare", async () => {
  await page.getByRole("combobox", { name: "Stato dichiarato di G-02" }).click();
  // ⚠️ `exact`: senza, «Attuato» corrisponde anche a «Non attuato» e Playwright si
  // ferma con «resolved to 2 elements». La corrispondenza per sottostringa e' il
  // valore predefinito, e su un elenco di stati e' quasi sempre sbagliata.
  await page.getByRole("option", { name: "Attuato", exact: true }).click();
  await page.waitForTimeout(2000);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const t = await page.locator('[data-slot="avviso-verifiche"]').innerText();
  if (!/verifica periodica scaduta|nessuna verifica registrata/i.test(t)) {
    throw new Error(`l'avviso non spiega il motivo: «${t}»`);
  }
});

// ─── roadmap ─────────────────────────────────────────────────────────────────
await vaiA("sgnis2", "roadmap");

await agisci("⚠️ i termini decorrono dalla comunicazione: 15 gennaio + 9 mesi = 15 ottobre", async () => {
  const t = await page.locator('[data-tour="sgnis2-termini"]').innerText();
  if (!/15\/10\/2026/.test(t)) throw new Error(`il termine di notifica non e' il 15 ottobre: «${t}»`);
  if (!/15\/07\/2027/.test(t)) throw new Error("il termine delle misure non e' il 15 luglio 2027");
});

await agisci("una fase si dichiara, e l'avanzamento invece si misura", async () => {
  await page.getByRole("combobox", { name: /Stato della fase Governance/i }).click();
  await page.getByRole("option", { name: "In corso" }).click();
  await page.waitForTimeout(1900);
  const [r] = await sql`select stato from nis2_phase_state
                        where company_id = ${companyId} and phase_key = 'f1'`;
  if (r?.stato !== "in_corso") throw new Error(`lo stato e' ${r?.stato}`);
  const t = await page.locator('[data-fase="f1"]').innerText();
  if (!/%/.test(t)) throw new Error("la fase non mostra l'avanzamento misurato");
});

// ─── indicatori ──────────────────────────────────────────────────────────────
await vaiA("sgnis2", "indicatori");

await agisci("i 19 indicatori di base si caricano", async () => {
  await page.getByRole("button", { name: /Carica i 19 indicatori/i }).click();
  await page.waitForTimeout(6000);
  const [{ n }] = await sql`select count(*)::int n from nis2_indicator where company_id = ${companyId}`;
  if (n !== 19) throw new Error(`ne sono stati creati ${n}`);
});

await agisci("una rilevazione produce stato e andamento", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.fill("#pe-" + (await idIndicatore("M-01")), "2026-01");
  await page.fill("#va-" + (await idIndicatore("M-01")), "97");
  await page.locator('[data-indicatore="M-01"] button[type="submit"]').click();
  // ⚠️ Si aspetta il FATTO, non un tempo: `router.refresh()` su questa pagina impiega
  // secondi, e un'attesa fissa leggeva lo stato di prima («non rilevato») accusando il
  // motore di non calcolare. Stessa famiglia di `networkidle`: la condizione che
  // interessa e' che il valore sia arrivato.
  await page
    .locator('[data-indicatore="M-01"] [data-slot="stato-indicatore"]')
    .filter({ hasText: /in attenzione|a target|fuori target/i })
    .waitFor({ timeout: 20_000 });
  const t = await page.locator('[data-indicatore="M-01"] [data-slot="stato-indicatore"]').innerText();
  // Copertura MFA: target 100, soglia 95, crescente. 97 sta in mezzo.
  if (!/in attenzione/i.test(t)) throw new Error(`lo stato e' «${t}»`);
});

await agisci("⚠️ il VERSO si dice a parole, non con una freccia sola", async () => {
  const t = await page.locator('[data-indicatore="H-01"]').innerText();
  if (!/scendere è un miglioramento/i.test(t)) {
    throw new Error("non dice che per questo indicatore scendere e' un risultato");
  }
});

await agisci("un valore che non e' un numero viene rifiutato", async () => {
  const id = await idIndicatore("M-01");
  await page.fill("#pe-" + id, "2026-02");
  await page.fill("#va-" + id, "circa novanta");
  await page.locator('[data-indicatore="M-01"] button[type="submit"]').click();
  await page.waitForTimeout(1800);
  const [r] = await sql`select 1 from nis2_indicator_reading r
                        join nis2_indicator i on i.id = r.indicator_id
                        where i.company_id = ${companyId} and r.periodo = '2026-02'`;
  if (r) throw new Error("la rilevazione non numerica e' stata scritta");
});

await agisci("rilanciare il caricamento non sovrascrive i target tarati", async () => {
  const id = await idIndicatore("M-01");
  await page.fill("#tg-" + id, "88");
  await page.locator("#sg-" + id).click();
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: /Carica i 19 indicatori/i }).click();
  await page.waitForTimeout(3000);
  const [r] = await sql`select target from nis2_indicator where company_id = ${companyId} and codice = 'M-01'`;
  if (String(r.target) !== "88") throw new Error(`il target e' tornato a ${r.target}`);
});

// ─── documenti ───────────────────────────────────────────────────────────────
await vaiA("nis2", "documenti");
await agisci("l'autovalutazione pubblica la Relazione sulla conformita'", async () => {
  await page.getByRole("button", { name: /Pubblica/i }).first().click();
  await page.waitForTimeout(9000);
  const [r] = await sql`select tipo, anno, versione from document_snapshot
                        where company_id = ${companyId} and tipo = 'conformita_nis2'`;
  if (!r) throw new Error("nessuno snapshot pubblicato");
  if (r.anno !== 0) throw new Error(`l'anno e' ${r.anno}, non SENZA_ESERCIZIO`);
});

await agisci("il documento porta il codice di verifica", async () => {
  const [r] = await sql`select c.codice from document_codice c
                        join document_snapshot s on s.id = c.snapshot_id
                        where s.company_id = ${companyId} and s.tipo = 'conformita_nis2'`;
  if (!r?.codice) throw new Error("nessun codice emesso: il documento non sarebbe verificabile");
});

// ─── i due documenti del sistema di gestione ─────────────────────────────────
await vaiA("sgnis2", "documenti");
await agisci("il sistema di gestione pubblica la Relazione e il Catalogo dei controlli", async () => {
  // Due documenti distinti perche' hanno due lettori: la relazione va all'organo di
  // amministrazione e si legge in mezz'ora, il catalogo e' la tabella che un ispettore
  // sfoglia. Portare all'organo sessantotto righe significa non farsi leggere.
  const bottoni = page.getByRole("button", { name: /Pubblica/i });
  const quanti = await bottoni.count();
  if (quanti < 2) throw new Error(`solo ${quanti} pulsanti di pubblicazione: i documenti del sistema sono due`);
  for (let i = 0; i < quanti; i++) {
    await bottoni.nth(i).click();
    await page.waitForTimeout(9000);
  }
  const righe = await sql`select tipo, anno from document_snapshot
                          where company_id = ${companyId} and tipo in ('relazione_nis2', 'controlli_nis2')`;
  const tipi = righe.map((r) => r.tipo).sort();
  if (tipi.join(",") !== "controlli_nis2,relazione_nis2") {
    throw new Error(`pubblicati ${tipi.join(", ") || "nessuno"} invece dei due del sistema`);
  }
  // ⚠️ L'anno deve essere SENZA_ESERCIZIO: finendo nel ramo sbagliato del CHECK, la
  // seconda relazione diventerebbe la versione 2 della prima, con lo stesso nome di file.
  const sbagliati = righe.filter((r) => r.anno !== 0).map((r) => r.tipo);
  if (sbagliati.length) throw new Error(`anno diverso da SENZA_ESERCIZIO su: ${sbagliati.join(", ")}`);
});

await agisci("⚠️ i TRE PDF sono documenti veri, e si contano le PAGINE", async () => {
  // ⚠️ La domanda non e' «quanto pesa» ma «quante pagine ha». Su un'anteprima protetta il
  // generatore apre il proprio indirizzo con Chromium e riceve la pagina di accesso di
  // Vercel: ne esce un PDF valido, byte magici giusti, e due documenti DIVERSI dello
  // stesso peso identico. Una pagina di accesso e' una pagina sola.
  const righe = await sql`select id, tipo from document_snapshot
                          where company_id = ${companyId}
                            and tipo in ('conformita_nis2', 'relazione_nis2', 'controlli_nis2')
                          order by tipo`;
  if (righe.length !== 3) throw new Error(`${righe.length} snapshot invece di tre`);
  const misure = [];
  for (const r of righe) {
    const risposta = await page.request.get(`${BASE}/api/documenti/${r.id}/pdf`);
    if (!risposta.ok()) throw new Error(`${r.tipo}: HTTP ${risposta.status()}`);
    const buf = await risposta.body();
    const { byte, pagine } = pretendiPdfVero(buf);
    misure.push({ tipo: r.tipo, byte, pagine });
    // ⚠️ I PDF si consegnano dallo STESSO passaggio che li verifica, quando qualcuno lo
    // chiede con `SALVA_PDF=<cartella>`. Uno script a parte che li rigenera per la
    // consegna sarebbe una seconda strada verso lo stesso file, e le due divergono: si
    // consegnerebbe un documento che nessuno ha contato.
    if (process.env.SALVA_PDF) {
      mkdirSync(process.env.SALVA_PDF, { recursive: true });
      const dove = join(process.env.SALVA_PDF, `${NOMI_CONSEGNA[r.tipo] ?? r.tipo}.pdf`);
      writeFileSync(dove, buf);
      console.log(`       salvato: ${dove}`);
    }
  }
  // E due documenti diversi non possono pesare uguale: e' il sintomo esatto con cui il
  // difetto dell'anteprima si e' fatto vedere la prima volta.
  const pesi = new Set(misure.map((m) => m.byte));
  if (pesi.size !== misure.length) {
    throw new Error(`due documenti diversi pesano uguale: ${misure.map((m) => `${m.tipo} ${m.byte}`).join(" | ")}`);
  }
  for (const m of misure) console.log(`       ${m.tipo}: ${Math.round(m.byte / 1024)} KB · ${m.pagine} pagine`);
});

const esito = riepilogo("NIS2 — i due percorsi");

await browser.close();
await sql.end();
// ⚠️ `riepilogo` restituisce QUANTI ROSSI ci sono, non «e' andata bene». Qui c'era
// `esito ? 0 : 1`, che e' l'esatto contrario: con dei falliti usciva ZERO — successo — e
// con tutto verde usciva UNO. Chi legge il codice d'uscita (qa.mjs, la CI,
// `giro-completo`, `qa-anteprima`) riceveva sempre la risposta sbagliata, e nel verso
// peggiore: un collaudo rosso riferito come verde. Scoperto l'8 settembre 2026 leggendo
// «44 ok, 0 falliti» accanto a un exit 1.
process.exit(esito ? 1 : 0);
