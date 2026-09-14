// L'ASSISTENZA, comando per comando, con le tre spie a ogni gesto.
//
//   npm run qa -- assistenza [--prod]
//
// ⚠️ Il controllo che vale più di tutti è quello sul COLLEGA: apre la richiesta di un
// altro per indirizzo diretto e deve trovare «non c'è». La visibilità la impone la policy
// della migrazione 0058, ma una pagina che ignorasse il proprietario mostrerebbe la
// conversazione lo stesso in sviluppo — dove la connessione è privilegiata — e la
// differenza si vede solo provandola dal browser.
//
// ⚠️ E ogni esito si legge dal DATABASE, mai dall'interfaccia: un messaggio comparso a
// schermo non dimostra una riga scritta, e una riga scritta non dimostra un'email partita.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { spegniTour, strumenta, contatore, pretendiServerAggiornato, attraversaProtezione, vaiA } from "./comune-collaudo.mjs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const RUN = Date.now();
const emailCliente = `assist-cliente-${RUN}@example.com`;
const emailStaff = `assist-staff-${RUN}@example.com`;

console.log(`\nAssistenza — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });

const cliente = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const staff = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await attraversaProtezione(cliente);
await attraversaProtezione(staff);
const sonda = strumenta(cliente);
// ⚠️ Anche la pagina dello staff ha la sua spia: `agisci` guarda quella del cliente, e
// senza questa un errore di console della coda non lo vedrebbe nessuno.
const sondaStaff = strumenta(staff);
const { agisci, riepilogo } = contatore(cliente, sonda);

const { orgId: orgCliente, userId: idCliente } = await registraEEntra(cliente, sql, {
  base: BASE,
  nome: "Studio Assistito",
  email: emailCliente,
  pwd: PWD_COLLAUDO,
});
const { userId: idStaff } = await registraEEntra(staff, sql, {
  base: BASE,
  nome: "Persona dello staff",
  email: emailStaff,
  pwd: PWD_COLLAUDO,
});
await sql`update org_entitlement set status='active', piano='studio', activated_at=now() where organization_id=${orgCliente}`;

let ticketId = null;

// ── L'assistente guidato ───────────────────────────────────────────────────────────────

await vaiA(cliente, `${BASE}/assistenza`);
await spegniTour(cliente);

await agisci("la pagina si apre con l'assistente e nessuna richiesta", async () => {
  await cliente.waitForSelector("[data-assistente]", { timeout: 30_000 });
  const mie = await cliente.locator("[data-mie-richieste] [data-ticket]").count();
  if (mie !== 0) throw new Error(`un account nuovo mostra ${mie} richieste`);
});

await agisci("scegliendo l'ambito compaiono le domande di quell'ambito", async () => {
  await cliente.getByRole("button", { name: /Abbonamento e fatture/ }).click();
  await cliente.waitForSelector("text=Dove trovo la fattura", { timeout: 15_000 });
});

await agisci("la risposta compare, con il rimando alla pagina giusta", async () => {
  await cliente.getByRole("button", { name: /Dove trovo la fattura/ }).click();
  await cliente.waitForSelector('[data-risposta="fattura"]', { timeout: 15_000 });
  const href = await cliente.locator('[data-risposta="fattura"] a').first().getAttribute("href");
  if (href !== "/impostazioni/abbonamento") throw new Error(`il rimando porta a «${href}»`);
});

await agisci("«non ho risolto» apre la richiesta con l'oggetto già compilato", async () => {
  await cliente.getByRole("button", { name: /Non ho risolto/ }).click();
  await cliente.waitForSelector("[data-form-richiesta]", { timeout: 15_000 });
  const oggetto = await cliente.locator("#oggetto").inputValue();
  if (!/fattura/i.test(oggetto)) throw new Error(`l'oggetto precompilato è «${oggetto}»`);
});

await agisci("la richiesta si invia, e la riga compare nel database", async () => {
  await cliente.fill("#testo", "Non trovo la fattura del primo anno.");
  await cliente.getByRole("button", { name: "Invia la richiesta" }).click();
  await cliente.waitForURL(/\/assistenza\/[^/]+$/, { timeout: 60_000 });
  ticketId = cliente.url().split("/").pop();
  const [t] = await sql`select id, stato, user_id, organization_id from assistenza_ticket where id = ${ticketId}`;
  if (!t) throw new Error("nessuna riga in assistenza_ticket");
  if (t.stato !== "aperto") throw new Error(`stato «${t.stato}» invece di «aperto»`);
  if (t.user_id !== idCliente) throw new Error("il ticket non è intestato a chi l'ha scritto");
  const msg = await sql`select testo, staff from assistenza_messaggio where ticket_id = ${ticketId}`;
  if (msg.length !== 1 || msg[0].staff) throw new Error(`i messaggi sono ${msg.length}, e staff=${msg[0]?.staff}`);
});

// ── Il confine: un altro account non la vede ──────────────────────────────────────────

/**
 * La pagina «non trovata» dell'applicazione, ASPETTATA.
 *
 * ⚠️ Due lezioni di questo progetto, tutte e due pagate qui in mezz'ora.
 *  1. le parole sono quelle vere della pagina: cercandone di inventate («404», «non
 *     esiste») il controllo falliva su una pagina giusta, e accusava il prodotto;
 *  2. il corpo si ASPETTA. `domcontentloaded` si risolve quando arriva il guscio, e il
 *     contenuto arriva dopo in streaming: letto subito, l'`innerText` è la sola barra
 *     laterale — che si legge «guscio vuoto», cioè esattamente il difetto che la pagina
 *     «non trovata» esiste per evitare. Misurato: la stessa rotta, letta subito, dice
 *     «niente», e aspettata dice «Questa pagina non c'è».
 */
async function pretendiNonTrovata(page, cosaNonDeveVedersi) {
  // ⚠️ Si corre la pagina «non trovata» CONTRO il contenuto vietato, invece di aspettare
  // solo la prima: aspettando solo quella, un prodotto che mostra la conversazione di un
  // altro fallisce con «Timeout» — che è il referto che non dice cosa è successo. Provato
  // togliendo il filtro sul proprietario: il messaggio ora nomina il difetto.
  const vietato = cosaNonDeveVedersi
    ? page.waitForSelector(`text=${cosaNonDeveVedersi}`, { timeout: 20_000 }).then(() => "vietato")
    : new Promise(() => {});
  const esito = await Promise.race([
    page.waitForSelector("text=Questa pagina non c", { timeout: 20_000 }).then(() => "nonTrovata"),
    vietato,
  ]).catch(() => "niente");

  if (esito === "vietato") {
    throw new Error("il contenuto di un altro è visibile: il proprietario non viene verificato");
  }
  if (esito !== "nonTrovata") {
    const testo = await page.locator("body").innerText();
    if (/error occurred|digest/i.test(testo)) {
      throw new Error(`la pagina risponde con un errore invece di «non c'è»: «${testo.slice(0, 160)}»`);
    }
    throw new Error(`la pagina non dice che non c'è: «${testo.slice(0, 200)}»`);
  }
}

await agisci("⚠️ un altro account che apre l'indirizzo trova «non c'è», non la conversazione", async () => {
  await vaiA(staff, `${BASE}/assistenza/${ticketId}`);
  await pretendiNonTrovata(staff, "Non trovo la fattura del primo anno");
});

await agisci("⚠️ per chi non è staff la coda NON ESISTE: «non c'è», non un errore", async () => {
  // ⚠️ Trovato al primo giro: con `requirePlatformAdmin` la pagina sollevava, e dentro un
  // componente server un'eccezione diventa un 500 — «An error occurred in the Server
  // Components render» a schermo e un `ForbiddenError` nei log a ogni curiosità. E
  // «riservato allo staff» confermerebbe comunque che l'area c'è.
  await vaiA(staff, `${BASE}/staff/assistenza`);
  if (await staff.locator("[data-coda-staff]").count()) {
    throw new Error("la coda si è aperta a un account senza ruolo di piattaforma");
  }
  await pretendiNonTrovata(staff, "Coda assistenza");
});

// ── Lo staff risponde ─────────────────────────────────────────────────────────────────

await sql`update "user" set platform_role='admin' where id = ${idStaff}`;

await agisci("lo staff vede la richiesta in coda, con nome e studio", async () => {
  await vaiA(staff, `${BASE}/staff/assistenza`);
  await staff.waitForSelector("[data-coda-staff]", { timeout: 30_000 });
  if (!(await staff.locator(`[data-ticket="${ticketId}"]`).count())) {
    throw new Error("la richiesta non compare in coda");
  }
  const riga = await staff.locator(`[data-ticket="${ticketId}"]`).innerText();
  if (!riga.includes("Studio Assistito")) throw new Error(`la riga non dice da quale studio arriva: «${riga}»`);
});

await agisci("lo staff risponde: il messaggio è segnato staff e il ticket passa «in attesa»", async () => {
  await staff.click(`[data-ticket="${ticketId}"]`);
  await staff.waitForSelector("[data-conversazione]", { timeout: 30_000 });
  await staff.fill("#risposta", "La trovi nel portale dei pagamenti, sezione fatture.");
  await staff.click("[data-invia]");
  await staff.waitForTimeout(1500);
  const msg = await sql`select testo, staff from assistenza_messaggio where ticket_id = ${ticketId} order by created_at`;
  if (msg.length !== 2) throw new Error(`i messaggi sono ${msg.length}`);
  if (!msg[1].staff) throw new Error("la risposta dello staff non è segnata come tale");
  const [t] = await sql`select stato from assistenza_ticket where id = ${ticketId}`;
  if (t.stato !== "in_attesa") throw new Error(`stato «${t.stato}» invece di «in_attesa»`);
});

await agisci("chi ha scritto vede la risposta e lo stato «tocca a te»", async () => {
  await vaiA(cliente, `${BASE}/assistenza/${ticketId}`);
  await cliente.waitForSelector('[data-messaggio="staff"]', { timeout: 30_000 });
  const stato = await cliente.locator("[data-stato]").getAttribute("data-stato");
  if (stato !== "in_attesa") throw new Error(`la pagina dice «${stato}»`);
});

await agisci("lo staff segna risolta, e chi ha scritto la vede chiusa", async () => {
  await staff.click("[data-chiudi]");
  await staff.waitForTimeout(1500);
  const [t] = await sql`select stato from assistenza_ticket where id = ${ticketId}`;
  if (t.stato !== "chiuso") throw new Error(`stato «${t.stato}»`);
});

// ── L'abbonamento scaduto NON chiude l'assistenza ─────────────────────────────────────

await agisci("⚠️ con l'abbonamento SCADUTO si scrive lo stesso, e il ticket si riapre", async () => {
  // Chi ha l'abbonamento scaduto è proprio chi ha bisogno di scrivere, e spesso scrive per
  // pagare. Il paywall non tocca questa pagina, ed è dichiarato anche nei test.
  await sql`update org_entitlement set status='expired' where organization_id = ${orgCliente}`;
  await vaiA(cliente, `${BASE}/assistenza/${ticketId}`);
  // ⚠️ Si aspetta la CONVERSAZIONE e poi il pulsante ATTIVO, non si scrive appena arriva
  // il guscio. Sull'anteprima la pagina arriva prima che React sia vivo: scrivendo subito,
  // il testo finisce nel campo ma non nello stato, «Invia» resta disattivato e il clic
  // scade — che si legge «il prodotto non lascia scrivere». In locale non si vede mai.
  await cliente.waitForSelector("[data-conversazione]", { timeout: 60_000 });
  await cliente.fill("#risposta", "Ho lo stesso problema anche col rinnovo.");
  const attivo = await cliente
    .waitForSelector("[data-invia]:not([disabled])", { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (!attivo) {
    // Un secondo tentativo, DICHIARATO: se React si è idratato dopo il primo `fill`, il
    // campo va riscritto perché lo stato lo registri. Se anche così resta spento, il
    // difetto è del prodotto e il controllo lo dice.
    await cliente.fill("#risposta", "");
    await cliente.fill("#risposta", "Ho lo stesso problema anche col rinnovo.");
    await cliente.waitForSelector("[data-invia]:not([disabled])", { timeout: 20_000 }).catch(() => {
      throw new Error("«Invia» resta disattivato dopo aver scritto: il testo non arriva allo stato");
    });
  }
  await cliente.click("[data-invia]");
  let n = 0;
  for (let i = 0; i < 30 && n !== 3; i++) {
    await cliente.waitForTimeout(500);
    [{ n }] = await sql`select count(*)::int n from assistenza_messaggio where ticket_id = ${ticketId}`;
  }
  if (n !== 3) throw new Error(`i messaggi sono ${n}: la risposta non è stata scritta`);
  const [t] = await sql`select stato from assistenza_ticket where id = ${ticketId}`;
  if (t.stato !== "aperto") throw new Error(`rispondendo a una richiesta chiusa lo stato è «${t.stato}»`);
});

await agisci("la voce «Assistenza» è nella barra e porta qui", async () => {
  await vaiA(cliente, `${BASE}/dashboard`);
  await spegniTour(cliente);
  const voce = cliente.locator('aside a[href="/assistenza"]').first();
  if (!(await voce.count())) throw new Error("la voce non c'è nella barra laterale");
  await voce.click();
  await cliente.waitForSelector("[data-assistenza]", { timeout: 30_000 });
});

await agisci("le pagine dello staff non hanno lasciato guasti in console", async () => {
  const guasti = sondaStaff.nuovi();
  if (guasti.length) throw new Error(guasti.join(" | ").slice(0, 240));
});

const esito = riepilogo("Assistenza");

// Pulizia: il collaudo non lascia righe dietro di sé. Un residuo di un'esecuzione morta a
// metà viene poi trovato da un'altra guardia, che accusa il prodotto al posto suo.
await sql`delete from assistenza_ticket where organization_id = ${orgCliente}`;
await browser.close();
await sql.end();
// ⚠️ `riepilogo` restituisce i ROSSI: il vero va mappato su 1, non su 0.
process.exit(esito ? 1 : 0);
