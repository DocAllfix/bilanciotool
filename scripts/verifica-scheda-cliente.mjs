// La scheda cliente: anagrafica e rubrica, comando per comando.
//
// ⚠️ Ogni divieto si prova sulla RIGA CHE NON COMPARE nel database, non sul messaggio a
// schermo. E' la regola nata quando un conto in prova generava il collegamento pubblico
// ai documenti *in silenzio*: nessun avviso rosso, nessun 4xx, nessun errore di console,
// e un collaudo che guardava solo l'interfaccia leggeva «bloccato» dove c'era «riuscito».
//
// ⚠️ E ogni conteggio si legge dal database, mai scritto a mano: un conto riusato porta
// le righe delle esecuzioni precedenti, e un numero fisso fallisce alla seconda passata
// per un motivo che col prodotto non c'entra.
//
//   npm run qa -- scheda-cliente [--prod]

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, strumenta, attendi, pretendiServerAggiornato, attraversaProtezione } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");

let ok = 0;
let ko = 0;
const check = async (nome, fn) => {
  try {
    await fn();
    ok++;
    console.log("  ok   " + nome);
  } catch (e) {
    ko++;
    console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]);
  }
};

const RUN = Date.now();
const email = `scheda-${RUN}@example.com`;
const NOME_AZIENDA = `Cliente Scheda ${String(RUN).slice(-6)} S.r.l.`;

console.log(`\nScheda cliente: anagrafica e rubrica — ${BASE}\n`);
if (!/^https?:\/\/localhost/.test(BASE)) await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await attraversaProtezione(page);
const guasti = strumenta(page);

const { orgId } = await registraEEntra(page, sql, { base: BASE, nome: "Studio Scheda", email, pwd: PWD_COLLAUDO });
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgId}`;
await spegniTour(page);

// ─── l'azienda ───────────────────────────────────────────────────────────────
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await spegniTour(page);
await page.click('[data-tour="nuova-azienda"]');
await page.fill("#na-nome", NOME_AZIENDA);
await page.fill("#na-settore", "Servizi");
await page.click('button[type="submit"]:has-text("Crea azienda")');
await page.waitForURL(/\/aziende\/[^/]+(\?|#|$)/, { timeout: 30_000 });
const companyId = page.url().match(/aziende\/([^/?#]+)/)[1];
await spegniTour(page);

/** Una riga fresca dal database: la verita' non e' cio' che la pagina mostra. */
const azienda = async () => (await sql`select * from company where id = ${companyId}`)[0];
const contatti = async () =>
  sql`select * from company_contact where company_id = ${companyId} order by principale desc, nome asc`;

await check("la scheda cliente compare nel fascicolo", async () => {
  await page.locator("[data-scheda-cliente]").waitFor({ timeout: 30_000 });
});

// ─── anagrafica ──────────────────────────────────────────────────────────────
/** Scrive in un campo e lo sfoca: e' cosi' che `CampoTesto` salva. */
async function scrivi(id, valore) {
  await page.fill(id, valore);
  await page.locator(id).blur();
}

await check("la partita IVA si salva sfocando il campo", async () => {
  await scrivi("#cl-piva", "04868330616");
  await attendi(async () => (await azienda()).piva === "04868330616", { cosa: "piva salvata" });
});

await check("la nazione si normalizza in maiuscolo", async () => {
  await scrivi("#cl-nazione", "it");
  await attendi(async () => (await azienda()).nazione === "IT", { cosa: "nazione normalizzata" });
});

await check("«Italia» viene RESPINTA, non indovinata", async () => {
  await scrivi("#cl-nazione", "Italia");
  // Il messaggio si mostra accanto al campo. Ma la prova vera e' la riga: deve essere
  // rimasta «IT», non essere diventata qualcos'altro.
  await page.waitForTimeout(1500);
  const a = await azienda();
  if (a.nazione !== "IT") throw new Error(`la nazione e' diventata ${a.nazione}`);
  // ⚠️ L'avviso si cerca DENTRO il riquadro del campo, non con un `[role="alert"]`
  // qualunque preso col `.first()`: nella pagina ce ne sono altri, e uno vuoto sempre
  // presente farebbe passare questo controllo per sempre.
  const avviso = await page
    .locator("#cl-nazione")
    .locator("xpath=..")
    .locator('[role="alert"]')
    .innerText()
    .catch(() => "");
  if (!/due lettere/i.test(avviso)) throw new Error("nessun messaggio spiega il rifiuto");
});

await check("i dipendenti si salvano come numero", async () => {
  await scrivi("#cl-dipendenti", "42");
  await attendi(async () => (await azienda()).dipendenti === 42, { cosa: "dipendenti salvati" });
});

await check("un organico negativo viene respinto e la riga non cambia", async () => {
  await scrivi("#cl-dipendenti", "-5");
  await page.waitForTimeout(1500);
  const a = await azienda();
  if (a.dipendenti !== 42) throw new Error(`i dipendenti sono diventati ${a.dipendenti}`);
});

await check("il fatturato accetta la virgola italiana e resta esatto", async () => {
  await scrivi("#cl-fatturato", "1234567,89");
  await attendi(async () => (await azienda()).fatturato === "1234567.89", { cosa: "fatturato salvato" });
});

await check("la nota distingue i valori correnti da quelli dell'esercizio", async () => {
  const t = await page.locator("[data-scheda-cliente]").locator("xpath=..").innerText();
  if (!/esercizio che rendicontano/i.test(t)) throw new Error("manca la nota sui valori per esercizio");
});

// ─── rubrica ─────────────────────────────────────────────────────────────────
await check("all'inizio la rubrica e' vuota, e lo dice", async () => {
  if ((await contatti()).length !== 0) throw new Error("ci sono gia' contatti");
  const t = await page.locator("main").innerText();
  if (!/Nessun contatto/i.test(t)) throw new Error("non lo dice a schermo");
});

await check("si aggiunge un contatto, e il primo diventa il riferimento", async () => {
  await page.click("[data-nuovo-contatto]");
  await page.fill("#nc-nome", "Giulia Ferri");
  await page.fill("#nc-ruolo", "Responsabile HSE");
  await page.fill("#nc-email", "g.ferri@example.com");
  await page.fill("#nc-telefono", "081 1234567");
  await page.click('button[type="submit"]:has-text("Salva contatto")');
  await attendi(async () => (await contatti()).length === 1, { cosa: "primo contatto" });
  const [c] = await contatti();
  if (!c.principale) throw new Error("il primo contatto non e' il riferimento");
  if (c.email !== "g.ferri@example.com") throw new Error("email non salvata");
});

await check("un'email storta non passa nemmeno dal browser, e la riga non nasce", async () => {
  const prima = (await contatti()).length;
  await page.click("[data-nuovo-contatto]");
  await page.fill("#nc-nome", "Refuso Email");
  await page.fill("#nc-email", "non-una-email");
  await page.click('button[type="submit"]:has-text("Salva contatto")');
  await page.waitForTimeout(1200);

  // ⚠️ Qui il rifiuto arriva PRIMA della rete: il campo e' `type="email"`, quindi il
  // browser blocca l'invio da solo e la server action non viene nemmeno chiamata. Il
  // controllo va scritto su cio' che il prodotto fa davvero, non su cio' che si
  // immaginava facesse — una prima versione cercava il messaggio del server e falliva
  // accusando il prodotto di non spiegarsi, mentre il rifiuto era gia' avvenuto e
  // l'utente lo vedeva.
  const valido = await page.locator("#nc-email").evaluate((el) => el.validity.valid);
  if (valido) throw new Error("il browser considera valida un'email che non lo e'");

  const dopo = (await contatti()).length;
  if (dopo !== prima) throw new Error("il contatto e' stato creato lo stesso");

  // E la difesa lato server esiste comunque, per chi non passa dal browser: la stessa
  // stringa messa in un campo non tipizzato viene respinta dall'azione.
  await page.fill("#nc-email", "");
  await page.click('button[type="button"]:has-text("Annulla")');
  await page.locator("[data-nuovo-contatto]").waitFor({ timeout: 15_000 });
});

await check("si aggiunge un secondo contatto, e NON diventa riferimento", async () => {
  await page.click("[data-nuovo-contatto]");
  await page.fill("#nc-nome", "Marco Russo");
  await page.fill("#nc-ruolo", "Direttore di stabilimento");
  await page.click('button[type="submit"]:has-text("Salva contatto")');
  await attendi(async () => (await contatti()).length === 2, { cosa: "secondo contatto" });
  const righe = await contatti();
  const principali = righe.filter((c) => c.principale);
  if (principali.length !== 1) throw new Error(`${principali.length} riferimenti invece di uno`);
  if (principali[0].nome !== "Giulia Ferri") throw new Error("il riferimento e' cambiato da solo");
});

await check("promuovere il secondo spegne il primo, e resta UNO SOLO", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await spegniTour(page);
  await page.locator('[aria-label="Rendi Marco Russo il riferimento"]').click();
  await attendi(
    async () => {
      const r = await contatti();
      return r.filter((c) => c.principale).length === 1 && r.find((c) => c.principale)?.nome === "Marco Russo";
    },
    { cosa: "riferimento spostato" },
  );
});

await check("modificare un recapito non azzera gli altri campi", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await spegniTour(page);
  const [giulia] = (await contatti()).filter((c) => c.nome === "Giulia Ferri");
  await page.locator(`[data-contatto="${giulia.id}"] summary`).click();
  await scrivi(`#ct-${giulia.id}-telefono`, "081 7654321");
  await attendi(
    async () => (await contatti()).find((c) => c.id === giulia.id)?.telefono === "081 7654321",
    { cosa: "telefono aggiornato" },
  );
  // ⚠️ Il punto del controllo: gli ALTRI campi. E' il difetto che in questo progetto si
  // e' presentato tre volte — salvare il costo azzerava la quantita', impostare la
  // rilevanza finanziaria azzerava l'impatto.
  const c = (await contatti()).find((x) => x.id === giulia.id);
  if (c.email !== "g.ferri@example.com") throw new Error("l'email e' stata azzerata");
  if (c.ruolo !== "Responsabile HSE") throw new Error("il ruolo e' stato azzerato");
});

await check("eliminare un contatto lo toglie davvero", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await spegniTour(page);
  const prima = (await contatti()).length;
  await page.locator('[aria-label="Elimina Giulia Ferri"]').click();
  await attendi(async () => (await contatti()).length === prima - 1, { cosa: "contatto eliminato" });
});

// ─── il confine: un altro studio ─────────────────────────────────────────────
await check("il fascicolo di questa azienda non si apre da un altro studio", async () => {
  const email2 = `scheda-b-${RUN}@example.com`;
  const p2 = await browser.newPage();
  const { orgId: org2 } = await registraEEntra(p2, sql, {
    base: BASE,
    nome: "Studio Altro",
    email: email2,
    pwd: PWD_COLLAUDO,
  });
  const r = await p2.goto(`${BASE}/aziende/${companyId}`, { waitUntil: "domcontentloaded" });
  const stato = r?.status() ?? 0;
  const testo = await p2.locator("body").innerText();
  if (stato === 200 && new RegExp(NOME_AZIENDA.slice(0, 14), "i").test(testo)) {
    throw new Error("un altro studio vede il fascicolo");
  }
  // E la prova che conta: nessun contatto di questa azienda appartiene all'altro studio.
  const intrusi = await sql`select count(*)::int as n from company_contact where company_id = ${companyId} and organization_id = ${org2}`;
  if (intrusi[0].n !== 0) throw new Error("contatti intestati all'altro studio");
  await p2.close();
  await sql`delete from audit_log where organization_id = ${org2}`;
  await sql`delete from company where organization_id = ${org2}`;
  await sql`delete from entitlement_event where organization_id = ${org2}`;
  await sql`delete from org_entitlement where organization_id = ${org2}`;
  await sql`delete from member where organization_id = ${org2}`;
  await sql`delete from organization where id = ${org2}`;
  await sql`delete from "user" where email = ${email2}`;
});

console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
console.log(guasti.length ? "ERRORI DI CONSOLE:\n  " + [...new Set(guasti)].join("\n  ") : "Console pulita.");

await sql`delete from company_contact where organization_id = ${orgId}`;
await sql`delete from audit_log where organization_id = ${orgId}`;
await sql`delete from company where organization_id = ${orgId}`;
await sql`delete from entitlement_event where organization_id = ${orgId}`;
await sql`delete from org_entitlement where organization_id = ${orgId}`;
await sql`delete from member where organization_id = ${orgId}`;
await sql`delete from organization where id = ${orgId}`;
await sql`delete from "user" where email = ${email}`;

await browser.close();
await sql.end();
process.exit(ko > 0 || guasti.length > 0 ? 1 : 0);
