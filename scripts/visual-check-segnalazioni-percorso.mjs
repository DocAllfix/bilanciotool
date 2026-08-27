// Collaudo del percorso Segnalazioni: un controllo per ogni comando.
//
// ⚠️ Ogni verifica guarda il DATABASE, non il messaggio a schermo. In questo modulo la
// differenza pesa più che altrove: la prova di un divieto è la riga che non compare, e
// la prova dell'audit in lettura è la riga che compare — nessuna delle due si vede
// nell'interfaccia.
//
// ⚠️ Il nome dell'azienda porta il timestamp: con un nome fisso, a ogni esecuzione se ne
// creerebbe un'altra identica e le query di verifica pescherebbero la riga di una corsa
// precedente.
//
//   npm run qa -- segnalazioni-percorso

import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, attendi, pretendiServerAggiornato, fattoreAttesa } from "./comune-collaudo.mjs";
import { rumoreDiPiattaforma } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = process.env.SHOT_DIR ?? "./shots-segnalazioni";
mkdirSync(OUT, { recursive: true });

const RUN = Date.now();
const email = `wb-${RUN}@example.com`;
const AZIENDA = `Cantieri Irpini ${String(RUN).slice(-6)} S.r.l.`;

const errori = [];
let ok = 0, ko = 0;
const verifica = (nome, cond, dettaglio = "") => {
  if (cond) { ok++; console.log("  ok   " + nome + (dettaglio ? " — " + dettaglio : "")); }
  else { ko++; console.log(" FAIL  " + nome + (dettaglio ? " — " + dettaglio : "")); }
};

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
page.on("console", (m) => { if (m.type() === "error" && !rumoreDiPiattaforma(m.text())) errori.push(m.text().slice(0, 150)); });
page.on("pageerror", (e) => errori.push("pageerror: " + e.message.slice(0, 150)));
page.on("response", (r) => {
  if (r.status() >= 400) errori.push(`${r.status()} ${r.url().replace(BASE, "")}`);
});

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

console.log(`\nGestione delle segnalazioni — ${BASE}\n`);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio WB", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
const [az] = await sql`insert into company (id, organization_id, nome, settore, is_demo)
  values (gen_random_uuid(), ${orgId}, ${AZIENDA}, 'Costruzioni', false) returning id`;
await spegniTour(page);

const U = `${BASE}/aziende/${az.id}/segnalazioni`;
const assetto = async () => (await sql`select * from wb_system where company_id = ${az.id}`)[0];
const vaiVista = async (k, ancora) => {
  await page.click(`[data-tour="wb-vista-${k}"]`);
  await page.waitForURL(`**vista=${k}`, { timeout: 30_000 });
  if (ancora) await page.locator(ancora).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
};

// ─── stato vuoto e creazione ─────────────────────────────────────────────────
await page.goto(U, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[data-tour="wb-crea"]').waitFor({ timeout: 60_000 });
verifica("Lo stato vuoto invita ad avviare la gestione", true);
await shot("00-vuoto");

await page.click('[data-tour="wb-crea"]');
await page.locator("[data-tour^='wb-vista-']").first().waitFor({ timeout: 60_000 });
// ⚠️ Il numero delle viste NON si scrive a mano. Questa riga diceva «sei» ed era rossa
// da quando il corpus ne ha aggiunte tre, senza che nessuno se ne accorgesse: nessuno
// aveva piu' lanciato questo collaudo. Ora si verifica il FATTO che conta — che ci siano
// le viste proprie del modulo PIU' le quattro comuni a tutti i moduli di conformita' —
// e un modulo che ne aggiunge una non fa diventare rosso niente.
const vistewb = await page.locator("[data-tour^='wb-vista-']").evaluateAll((n) =>
  n.map((e) => e.getAttribute("data-tour").replace("wb-vista-", "")),
);
verifica("L'assetto si crea e apre le sue viste", vistewb.length >= 6, vistewb.join(" · "));
verifica("…comprese le tre del corpus e i documenti",
  ["procedure", "moduli", "registri", "documenti"].every((v) => vistewb.includes(v)));

const a0 = await assetto();
verifica("Il catalogo si congela alla creazione", a0?.content_set_id === "wb-v1", a0?.content_set_id);
verifica("La ragione sociale si eredita dall'azienda", a0?.ragione === AZIENDA);

// ⚠️ Le tre forme nascono INSIEME all'assetto e SPENTE: «previste e non attive» è uno
// stato diverso da «mancanti», e il rimedio è diverso — accenderle, non istituirle.
const canali0 = await sql`select forma, attiva from wb_channel where system_id = ${a0.id} order by forma`;
verifica("Le tre forme di legge nascono insieme all'assetto", canali0.length === 3, canali0.map((c) => c.forma).join(", "));
verifica("…e nascono tutte SPENTE", canali0.every((c) => c.attiva === false));
await shot("01-quadro");

verifica(
  "Il quadro dichiara il canale non conforme all'art. 4",
  (await page.getByText("Canale non conforme").count()) > 0,
);

// ─── canale ──────────────────────────────────────────────────────────────────
await vaiVista("canale", '[data-tour="wb-canale"]');
verifica("La vista canale mostra le tre forme", (await page.locator('[data-slot="interruttore-canale"]').count()) === 3);

const interruttori = page.locator('[data-slot="interruttore-canale"]');
await interruttori.nth(0).click();
await attendi(async () => {
  const r = await sql`select count(*)::int n from wb_channel where system_id = ${a0.id} and attiva = true`;
  return r[0].n === 1;
}, { entro: 30_000 * fattoreAttesa(), cosa: "la prima forma accesa" });
verifica("Un interruttore accende una modalità", true);

// ⚠️ Con una forma su tre il canale resta NON conforme: le tre sono cumulative, ed è
// esattamente ciò che il prototipo non sapeva vedere.
await page.waitForTimeout(600);
verifica(
  "Con una sola forma attiva il canale resta non conforme",
  (await page.locator('[data-slot="canale-esito"]').innerText()).includes("non soddisfa"),
);

await interruttori.nth(1).click();
await interruttori.nth(2).click();
await attendi(async () => {
  const r = await sql`select count(*)::int n from wb_channel where system_id = ${a0.id} and attiva = true`;
  return r[0].n === 3;
}, { entro: 30_000 * fattoreAttesa(), cosa: "tutte e tre le forme accese" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator('[data-slot="canale-esito"]').waitFor({ timeout: 30_000 });
verifica(
  "Con tutte e tre attive il canale è conforme",
  (await page.locator('[data-slot="canale-esito"]').innerText()).includes("soddisfa l'art. 4"),
);

const idCanale = canali0[0]?.forma;
await page.getByLabel("Come è realizzata", { exact: true }).first().fill("Piattaforma dedicata su segnalazioni.example");
await page.keyboard.press("Tab");
await attendi(async () => {
  const r = await sql`select count(*)::int n from wb_channel where system_id = ${a0.id} and descrizione is not null`;
  return r[0].n === 1;
}, { entro: 30_000 * fattoreAttesa(), cosa: "la descrizione del canale salvata" });
verifica("La descrizione di una modalità si salva sfocandosi", true, idCanale);

await page.getByLabel("Attiva dal", { exact: true }).first().fill("2026-02-01");
await attendi(async () => {
  const r = await sql`select count(*)::int n from wb_channel where system_id = ${a0.id} and attivato_il = '2026-02-01'`;
  return r[0].n === 1;
}, { entro: 30_000 * fattoreAttesa(), cosa: "la data di attivazione salvata" });
verifica("La data di attivazione si salva", true);
await shot("02-canale");

// ─── la consultazione sindacale: i tre verdetti ──────────────────────────────
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator('[data-slot="consultazione"]').waitFor({ timeout: 30_000 });
verifica(
  "Canale attivo senza consultazione: il rilievo compare",
  (await page.locator('[data-slot="consultazione"]').innerText()).includes("non risulta"),
);

await vaiVista("assetto", '[data-tour="wb-assetto"]');
await page.getByLabel("Consultazione sindacale effettuata il", { exact: true }).fill("2026-03-01");
await attendi(async () => (await assetto())?.consultazione_sindacale === "2026-03-01",
  { entro: 30_000 * fattoreAttesa(), cosa: "la consultazione sindacale salvata" });
await vaiVista("canale", '[data-slot="consultazione"]');
verifica(
  "⚠️ Consultazione DOPO l'attivazione: dichiarata tardiva",
  (await page.locator('[data-slot="consultazione"]').innerText()).includes("successiva"),
);

await vaiVista("assetto", '[data-tour="wb-assetto"]');
await page.getByLabel("Consultazione sindacale effettuata il", { exact: true }).fill("2026-01-10");
await attendi(async () => (await assetto())?.consultazione_sindacale === "2026-01-10",
  { entro: 30_000 * fattoreAttesa(), cosa: "la consultazione anticipata" });
await vaiVista("canale", '[data-slot="consultazione"]');
verifica(
  "Consultazione PRIMA dell'attivazione: nessun rilievo",
  (await page.locator('[data-slot="consultazione"]').innerText()).includes("prima dell"),
);

// ─── assetto: obbligo e condivisione ─────────────────────────────────────────
await vaiVista("assetto", '[data-tour="wb-assetto"]');
await page.getByLabel("Gestore", { exact: true }).fill("Organismo di Vigilanza");
await page.keyboard.press("Tab");
await attendi(async () => (await assetto())?.gestore === "Organismo di Vigilanza",
  { entro: 30_000 * fattoreAttesa(), cosa: "il gestore salvato" });
verifica("Un campo dell'assetto si salva sfocandosi", true);

await page.getByLabel("Media dei lavoratori subordinati nell'ultimo anno", { exact: true }).fill("1.200");
await page.keyboard.press("Tab");
await attendi(async () => (await assetto())?.addetti === "1.200",
  { entro: 30_000 * fattoreAttesa(), cosa: "il numero di addetti salvato" });
verifica("Il numero di addetti accetta la forma italiana", true, "1.200");
await shot("03-assetto");

// ─── registro: il numero progressivo ─────────────────────────────────────────
await vaiVista("registro", '[data-tour="wb-registro"]');
verifica("Il registro vuoto spiega dove arrivano le segnalazioni",
  (await page.getByText("arrivano sul canale dell").count()) > 0);

const apriFascicolo = async (data) => {
  await page.click('[data-tour="wb-nuovo"]');
  await page.locator("#wb-nf-data").waitFor({ timeout: 30_000 });
  await page.fill("#wb-nf-data", data);
  await page.getByRole("button", { name: "Apri il fascicolo" }).click();
  await page.waitForURL("**/fascicolo/**", { timeout: 30_000 });
  return page.url().split("/fascicolo/")[1];
};

const f1 = await apriFascicolo("2026-03-25");
verifica("Aprire un fascicolo porta ALLA SUA pagina", !!f1);
const [r1] = await sql`select numero from wb_report where id = ${f1}`;
verifica("Il primo fascicolo prende il numero 1", r1?.numero === 1, String(r1?.numero));

// ⚠️ L'audit in lettura: è l'unica lettura del prodotto che scrive, e la prova è la riga.
const [acc1] = await sql`select count(*)::int n from audit_log
  where organization_id = ${orgId} and azione = 'segnalazioni.fascicolo.read'`;
verifica("⚠️ Aprire il fascicolo lascia una riga nel registro degli accessi", acc1.n >= 1, `${acc1.n} accessi`);
await shot("04-fascicolo");

// ─── il fascicolo: campi e pannelli ──────────────────────────────────────────
await page.getByLabel("Codice del segnalante", { exact: true }).fill("CI-2026-001");
await page.keyboard.press("Tab");
await attendi(async () => {
  const [r] = await sql`select codice from wb_report where id = ${f1}`;
  return r?.codice === "CI-2026-001";
}, { entro: 30_000 * fattoreAttesa(), cosa: "il codice salvato" });
verifica("Un campo del fascicolo si salva sfocandosi", true);

// I termini calcolati dalle stesse funzioni pure del server: il 25 marzo è il caso in
// cui il prototipo perdeva un giorno per il cambio d'ora.
verifica(
  "Il termine dell'avviso è quello di legge, senza sfasamenti di fuso",
  (await page.getByText("Termine: 01/04/2026").count()) > 0,
);

await page.getByRole("tab", { name: "Ammissibilità" }).click();
await page.locator('[data-slot="pannello-esito"]').waitFor({ timeout: 30_000 });
verifica(
  "Con nessun elemento valutato l'esito non esiste",
  (await page.locator('[data-slot="pannello-esito"]').innerText()).includes("non ancora determinato"),
);

for (const c of ["wb-f-oggetto", "wb-f-legittimato", "wb-f-contesto", "wb-f-elementi"]) {
  await page.locator(`#${c}`).click();
  await page.getByRole("option", { name: "Sì", exact: true }).click();
  await page.waitForTimeout(300);
}
await page.waitForTimeout(800);
verifica(
  "⚠️ Quattro elementi su cinque: l'esito resta indeterminato",
  (await page.locator('[data-slot="pannello-esito"]').innerText()).includes("non ancora determinato"),
);

await page.locator("#wb-f-nonPersonale").click();
await page.getByRole("option", { name: "Sì", exact: true }).click();
await attendi(async () => {
  const [r] = await sql`select amm_non_personale from wb_report where id = ${f1}`;
  return r?.amm_non_personale === "Sì";
}, { entro: 30_000 * fattoreAttesa(), cosa: "il quinto elemento salvato" });
await page.waitForTimeout(800);
verifica(
  "Con tutti e cinque gli elementi l'esito è «Ammissibile»",
  (await page.locator('[data-slot="pannello-esito"]').innerText()).includes("Ammissibile"),
);
await shot("05-ammissibilita");

// ─── il rischio di ritorsione ────────────────────────────────────────────────
await page.getByRole("tab", { name: "Tutele" }).click();
await page.locator("#wb-f-rit-identitaConoscibile").waitFor({ timeout: 30_000 });
for (const c of ["identitaConoscibile", "sovraordinato", "contestoRistretto", "precedenti", "rapportoPrecario"]) {
  await page.locator(`#wb-f-rit-${c}`).click();
  await page.getByRole("option", { name: c === "identitaConoscibile" || c === "sovraordinato" ? "Sì" : "No", exact: true }).click();
  await page.waitForTimeout(300);
}
await page.waitForTimeout(800);
verifica(
  "⚠️ Cinque fattori su sei: il livello NON si dichiara",
  (await page.locator('[data-slot="pannello-esito"]').last().innerText()).includes("non determinato"),
);

await page.locator("#wb-f-rit-giaEsposto").click();
await page.getByRole("option", { name: "No", exact: true }).click();
await attendi(async () => {
  const [r] = await sql`select rit_gia_esposto from wb_report where id = ${f1}`;
  return r?.rit_gia_esposto === "No";
}, { entro: 30_000 * fattoreAttesa(), cosa: "il sesto fattore salvato" });
await page.waitForTimeout(800);
const pannelloRit = await page.locator('[data-slot="pannello-esito"]').last().innerText();
verifica("Con tutti e sei il livello è «Medio» e il monitoraggio è dovuto",
  /Rischio medio/i.test(pannelloRit) && /dovuto/.test(pannelloRit), pannelloRit.slice(0, 60));
await shot("06-tutele");

// ─── conformità ──────────────────────────────────────────────────────────────
await page.goto(`${U}?vista=conformita`, { waitUntil: "domcontentloaded" });
await page.locator('[data-tour="wb-conformita"]').waitFor({ timeout: 30_000 });
// ⚠️ Il primo capo è GIÀ aperto: la vista non deve accogliere con dieci righe chiuse.
// La prima versione di questo controllo lo cliccava «per aprirlo» e in realtà lo
// CHIUDEVA, poi accusava il prodotto di non avere i pulsanti dei requisiti. Il rosso
// era del collaudo, e indicava il posto sbagliato.
verifica(
  "Il primo capo è già aperto all'ingresso",
  (await page.getByRole("button", { name: "A.01: Conforme", exact: true }).count()) === 1,
);
await page.getByRole("button", { name: "A.01: Conforme", exact: true }).click();
await attendi(async () => {
  const [r] = await sql`select stato from wb_requirement_state
    where system_id = ${a0.id} and requirement_key = 'A.01'`;
  return r?.stato === "Conforme";
}, { entro: 30_000 * fattoreAttesa(), cosa: "il requisito A.01 valutato" });
verifica("Un requisito si valuta con un clic", true);

// Ripremere annulla: la stessa convenzione dell'autovalutazione fornitore.
await page.getByRole("button", { name: "A.01: Conforme", exact: true }).click();
await attendi(async () => {
  const [r] = await sql`select stato from wb_requirement_state
    where system_id = ${a0.id} and requirement_key = 'A.01'`;
  return r?.stato === null;
}, { entro: 30_000 * fattoreAttesa(), cosa: "il requisito riportato a non valutato" });
verifica("Ripremere lo stesso stato annulla la valutazione", true);
await shot("07-conformita");

// ─── il numero progressivo non si riusa ──────────────────────────────────────
await page.goto(`${U}?vista=registro`, { waitUntil: "domcontentloaded" });
await page.locator('[data-tour="wb-registro"]').waitFor({ timeout: 30_000 });
const f2 = await apriFascicolo("2026-04-01");
const [r2] = await sql`select numero from wb_report where id = ${f2}`;
verifica("Il secondo fascicolo prende il numero 2", r2?.numero === 2, String(r2?.numero));

// Eliminazione: due clic, e la conferma spiega la differenza con la CANCELLAZIONE per
// decorso del termine — sono due fatti diversi, e a distanza di anni la differenza conta.
await page.getByRole("button", { name: "Elimina il fascicolo" }).click();
await page.getByRole("button", { name: "Elimina", exact: true }).click();
await page.waitForURL("**vista=registro**", { timeout: 30_000 });
await attendi(async () => {
  const [r] = await sql`select count(*)::int n from wb_report where id = ${f2}`;
  return r.n === 0;
}, { entro: 30_000 * fattoreAttesa(), cosa: "il secondo fascicolo eliminato" });
verifica("Un fascicolo si elimina, e la conferma distingue eliminazione da cancellazione", true);

const f3 = await apriFascicolo("2026-04-10");
const [r3] = await sql`select numero from wb_report where id = ${f3}`;
verifica("⚠️ Dopo un'eliminazione il numero NON torna indietro", r3?.numero === 3, String(r3?.numero));

// ─── documenti ───────────────────────────────────────────────────────────────
//
// ⚠️ Si spegne una modalità PRIMA di pubblicare, ed è deliberato: il ramo che vale la
// pena provare è quello in cui il documento deve DIRE una cosa scomoda. Una relazione
// che tacesse la non conformità del canale sarebbe il danno vero — e la prima versione
// di questo collaudo pretendeva quel rilievo dopo aver acceso tutte e tre le forme,
// cioè accusava il documento di non dire una cosa che era giusto non dire.
await sql`update wb_channel set attiva = false
  where system_id = ${a0.id} and forma = 'Incontro diretto'`;

await page.goto(`${U}?vista=documenti`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /^Pubblica/ }).waitFor({ timeout: 30_000 });
verifica("La vista documenti dichiara che la relazione non contiene identità",
  (await page.getByText("Non contiene").count()) > 0);
await shot("08-documenti");

// ─── pubblicazione e PDF ─────────────────────────────────────────────────────
await page.click('[data-tour="pubblica-documento"]');
// ⚠️ Se la pubblicazione fallisce, il popup non arriva MAI e l'attesa scade dopo due
// minuti dicendo soltanto «Timeout»: il motivo resta scritto a schermo, dove nessuno lo
// legge. Qui si corre il popup contro il messaggio d'errore, e vince chi arriva.
const doc = await Promise.race([
  page.waitForEvent("popup", { timeout: 120_000 }),
  (async () => {
    // ⚠️ Si aspetta un avviso con del TESTO dentro: `[role="alert"]` puo' essere un
    // contenitore sempre presente e vuoto, e correrci contro il popup lo farebbe vincere
    // sempre — il collaudo direbbe «rifiutata» su una pubblicazione riuscita.
    const testo = await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[role="alert"]')]
          .map((n) => n.textContent?.trim() ?? "")
          .find((t) => t.length > 3) ?? null,
      undefined,
      { timeout: 120_000 },
    );
    throw new Error("La pubblicazione e' stata rifiutata: " + String(await testo.jsonValue()).slice(0, 300));
  })(),
]);
await doc.waitForLoadState("networkidle", { timeout: 120_000 });
await doc.setViewportSize({ width: 1280, height: 1700 });
await doc.waitForTimeout(800);

const [snap] = await sql`select id, tipo, anno, versione, dati from document_snapshot
  where company_id = ${az.id} order by versione desc limit 1`;
verifica("La relazione si pubblica come snapshot", snap?.tipo === "relazione_wb", snap?.tipo);
verifica("…senza esercizio, perché le revisioni sono una serie unica", snap?.anno === 0, String(snap?.anno));

// ⚠️ La prova che conta: il contenuto delle segnalazioni NON è nello snapshot. Questo
// documento può raggiungere il portale cliente, e il portale è per AZIENDA: se un
// giorno qualcuno aggiungesse `fatti` o `oggetto` al prospetto, uscirebbe da solo.
const testoSnap = JSON.stringify(snap?.dati ?? {});
verifica("⚠️ Lo snapshot non porta il contenuto delle segnalazioni",
  !/"fatti"/.test(testoSnap) && !/"oggetto"/.test(testoSnap) && !/"coinvolti"/.test(testoSnap));
verifica("…né il codice del segnalante", !/CI-2026-001/.test(testoSnap));
// Il giorno rispetto al quale i termini sono giudicati è congelato: senza, la relazione
// consegnata cambierebbe verdetto col passare delle settimane.
verifica("Il giorno di riferimento dei termini è congelato", /"riferitaAl"/.test(testoSnap));

const testoDoc = await doc.locator(".doc-corpo").innerText();
verifica("Il documento dichiara in chiaro la propria natura", /Natura del documento/.test(testoDoc));
// ⚠️ Lo spazio dopo il grassetto si misura sul testo RESO, mai a occhio e mai sul
// sorgente. Guardando la fotografia sembrava mangiato — «documento.La» — e non lo era:
// il serif stringe il punto contro la maiuscola. La regola del progetto dice di
// misurare, e qui ha salvato una correzione che avrebbe rotto una frase giusta.
const iNatura = testoDoc.indexOf("Natura del documento");
verifica("Lo spazio dopo il grassetto non è mangiato",
  /Natura del documento\.\s+La relazione/.test(testoDoc),
  JSON.stringify(testoDoc.slice(iNatura, iNatura + 45)));
verifica("…e il rilievo sul canale non conforme", /non soddisfa l/.test(testoDoc));
// Sotto i cinque casi l'avvertenza sulla riconoscibilità compare da sola.
verifica("Sotto i cinque casi avverte sulla riconoscibilità", /rendere riconoscibili/.test(testoDoc));

const p2 = await page.context().newPage();
await p2.goto(doc.url(), { waitUntil: "networkidle" });
const pdf = await p2.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
writeFileSync(`${OUT}/relazione-segnalazioni.pdf`, pdf);
await p2.close();
verifica("Il PDF si genera e non è vuoto", pdf.length > 20_000, `${Math.round(pdf.length / 1024)} KB`);
await doc.screenshot({ path: `${OUT}/09-relazione.png`, fullPage: false });
await sql`delete from document_snapshot where organization_id = ${orgId}`;

// ─── referto ─────────────────────────────────────────────────────────────────
await sql`delete from wb_report where organization_id = ${orgId}`;
await sql`delete from wb_requirement_state where organization_id = ${orgId}`;
await sql`delete from wb_channel where organization_id = ${orgId}`;
await sql`delete from wb_system where organization_id = ${orgId}`;
await sql`delete from company where organization_id = ${orgId}`;
await sql`delete from audit_log where organization_id = ${orgId}`;
await sql`delete from org_entitlement where organization_id = ${orgId}`;
await sql`delete from member where organization_id = ${orgId}`;
await sql`delete from organization where id = ${orgId}`;
await sql`delete from "user" where email = ${email}`;

console.log(`\nSegnalazioni: ${ok} ok, ${ko} ko`);
if (errori.length) {
  console.log("\nErrori di console o richieste fallite:");
  for (const e of [...new Set(errori)]) console.log("  " + e);
}
await browser.close();
await sql.end();
process.exit(ko || errori.length ? 1 : 0);
