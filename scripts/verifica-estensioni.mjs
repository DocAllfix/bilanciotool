// Le estensioni: si scelgono, si pagano, e sopravvivono al rinnovo.
//
//   BASE=https://evalisdeck.it CONTO=<email in prova> node scripts/verifica-estensioni.mjs
//
// Tre catene distinte, e ognuna può rompersi da sola:
//   1. l'interfaccia mostra un totale — e dev'essere quello che Stripe addebita;
//   2. la sessione di pagamento porta le righe giuste, con le quantità giuste;
//   3. la SECONDA fase dello Schedule le porta ancora — cioè il rinnovo, fra un anno.
//
// La terza è quella per cui esiste questo collaudo: fino a ieri la fase di rinnovo
// conteneva il solo piano, e le estensioni sparivano dodici mesi dopo l'acquisto,
// in silenzio, mentre il cliente perdeva la capacità per cui aveva pagato.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import Stripe from "stripe";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PIANI, ESTENSIONI, euro, prezzoDiVendita, prezzoEstensione } from "../src/lib/prezzi.ts";

const BASE = (process.env.BASE ?? "https://evalisdeck.it").replace(/\/+$/, "");
const PWD = process.env.PWD_CONTO ?? "PasswordSicura123!";
const EMAIL = process.env.CONTO ?? `estensioni-${Date.now()}@example.com`;

// Che cosa si compra in questa prova. Numeri diversi fra loro: due quantità uguali
// nasconderebbero uno scambio fra blocchi e accessi.
const BLOCCHI = 2;
const ACCESSI = 3;
const MARCHIO = true;

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ⚠️ Guardia: questo collaudo COMPRA. Contro un ambiente in modalità viva
// addebiterebbe denaro vero, e la chiave locale non vedrebbe nemmeno gli oggetti creati
// dal sito. Ci si ferma prima, invece di scoprirlo a metà da un «No such customer».
const CHIAVE_VIVA = /_live_/.test(process.env.STRIPE_SECRET_KEY ?? "");
if (CHIAVE_VIVA && !process.env.SO_CHE_E_VIVO) {
  console.error("La chiave Stripe locale è in modalità VIVA: questo collaudo compra davvero.");
  console.error("Se è voluto: SO_CHE_E_VIVO=1 node scripts/verifica-estensioni.mjs");
  process.exit(1);
}

/**
 * Consegna a mano un evento al nostro webhook, firmandolo col segreto di prova.
 *
 * Serve quando il collaudo gira su localhost: Stripe non sa raggiungere una macchina
 * di sviluppo, e senza l'evento non parte niente — né l'attivazione né lo Schedule.
 * L'evento è VERO, ripreso da Stripe: si rifà solo la firma, che è l'unica cosa che
 * cambia fra un mittente e l'altro.
 */
async function consegnaEvento(evento) {
  const segreto = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segreto) throw new Error("STRIPE_WEBHOOK_SECRET assente: non posso firmare l'evento");
  const corpo = JSON.stringify(evento);
  const t = Math.floor(Date.now() / 1000);
  const { createHmac } = await import("node:crypto");
  const firma = createHmac("sha256", segreto).update(`${t}.${corpo}`).digest("hex");
  const r = await fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${firma}` },
    body: corpo,
  });
  if (!r.ok) throw new Error(`il webhook ha risposto ${r.status}: ${(await r.text()).slice(0, 160)}`);
}
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0].slice(0, 200)); }
};

const piano = PIANI.studio;
const pAnno1 = prezzoDiVendita(piano, "anno1");
const pRinnovo = prezzoDiVendita(piano, "rinnovo");
const pBlocco = prezzoEstensione(ESTENSIONI.bloccoAziende);
const pAccesso = prezzoEstensione(ESTENSIONI.accesso);
const pMarchio = prezzoEstensione(ESTENSIONI.whiteLabel);
const estensioni = BLOCCHI * pBlocco.importo + ACCESSI * pAccesso.importo + (MARCHIO ? pMarchio.importo : 0);
const ATTESO_ANNO1 = pAnno1.importo + estensioni;
const ATTESO_RINNOVO = pRinnovo.importo + estensioni;
console.log(`  atteso: primo anno ${euro(ATTESO_ANNO1)} · rinnovo ${euro(ATTESO_RINNOVO)}\n`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("evalisdeck-benvenuto", "1");
    for (const p of ["portfolio", "ghg", "bilancio", "energetico", "fornitore", "soa"]) {
      localStorage.setItem(`evalisdeck-tour:${p}`, "1");
    }
  } catch {}
});
const page = await ctx.newPage();

let orgId = "";
await check("uno studio in prova arriva alla scelta del piano", async () => {
  if (process.env.CONTO) {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill("#email", EMAIL);
    await page.fill("#password", PWD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 40_000 });
  } else {
    await registraEEntra(page, sql, { base: BASE, nome: "Compra Estensioni", email: EMAIL, pwd: PWD });
  }
  const rifiuta = page.getByRole("button", { name: "Rifiuta", exact: true });
  if (await rifiuta.count()) { await rifiuta.click(); await page.waitForTimeout(400); }
  const [u] = await sql`select id from "user" where email = ${EMAIL}`;
  const [m] = await sql`select organization_id from member where user_id = ${u.id}`;
  orgId = m.organization_id;
  // Si riporta in prova: la prova comincia da chi non ha ancora comprato.
  await sql`update org_entitlement set status='demo', piano=null, aziende_extra=0, accessi_extra=0,
    white_label=false, activated_at=null where organization_id=${orgId}`;
  await sql`delete from stripe_subscription where organization_id=${orgId}`;
  await page.goto(`${BASE}/impostazioni/abbonamento`, { waitUntil: "networkidle" });
});

await check("il dialogo di acquisto si apre e offre le tre estensioni", async () => {
  await page.getByRole("button", { name: /^Attiva$/ }).nth(1).click(); // Studio è il secondo
  await page.waitForTimeout(800);
  const d = page.getByRole("dialog");
  if (!(await d.count())) throw new Error("nessun dialogo");
  const t = await d.innerText();
  if (!/Blocchi da 5 aziende/.test(t)) throw new Error("manca il blocco aziende");
  if (!/Accessi aggiuntivi/.test(t)) throw new Error("mancano gli accessi");
  if (!/marchio del tuo studio/i.test(t)) throw new Error("manca il white-label");
});

await check("il totale mostrato cambia con quello che si sceglie", async () => {
  const d = page.getByRole("dialog");
  const prima = await d.innerText();
  if (!prima.includes(euro(pAnno1.importo))) throw new Error("il totale iniziale non è il prezzo del piano");
  for (let i = 0; i < BLOCCHI; i++) await d.getByRole("button", { name: /^Aggiungi: Blocchi/ }).click();
  for (let i = 0; i < ACCESSI; i++) await d.getByRole("button", { name: /^Aggiungi: Accessi/ }).click();
  if (MARCHIO) await d.getByRole("button", { name: /marchio del tuo studio/i }).click();
  await page.waitForTimeout(400);
  const dopo = await d.innerText();
  if (!dopo.includes(euro(ATTESO_ANNO1))) {
    throw new Error(`il primo anno non dice ${euro(ATTESO_ANNO1)}: ${dopo.replace(/\n/g, " | ").slice(-220)}`);
  }
  if (!dopo.includes(euro(ATTESO_RINNOVO))) throw new Error(`il rinnovo non dice ${euro(ATTESO_RINNOVO)}`);
  // La capacità dichiarata deve corrispondere a quello che si sta comprando.
  const aziende = piano.aziende + BLOCCHI * ESTENSIONI.bloccoAziende.aziende;
  if (!dopo.includes(`${aziende} aziende`)) throw new Error(`non dichiara ${aziende} aziende`);
  if (!dopo.includes(`${piano.accessi + ACCESSI} accessi`)) throw new Error("non dichiara gli accessi giusti");
});

let sessionId = null;
await check("si arriva a Stripe, e la sessione porta le righe giuste", async () => {
  await page.getByRole("dialog").getByRole("button", { name: /^Paga / }).click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
  const m = page.url().match(/(cs_test_[A-Za-z0-9]+|cs_live_[A-Za-z0-9]+)/);
  if (!m) throw new Error("nessun identificativo di sessione nell'indirizzo");
  sessionId = m[1];

  const s = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items.data.price"] });
  const righe = s.line_items.data.map((r) => ({ lookup: r.price.lookup_key, q: r.quantity }));
  const trova = (lookup) => righe.find((r) => r.lookup === lookup);
  if (!trova(pAnno1.lookup)) throw new Error(`manca il piano: ${JSON.stringify(righe)}`);
  if (trova(pBlocco.lookup)?.q !== BLOCCHI) throw new Error(`blocchi: ${JSON.stringify(righe)}`);
  if (trova(pAccesso.lookup)?.q !== ACCESSI) throw new Error(`accessi: ${JSON.stringify(righe)}`);
  if (MARCHIO && !trova(pMarchio.lookup)) throw new Error("manca il white-label");
  // L'invariante che conta: si mostra ciò che si addebita.
  if (s.amount_total !== ATTESO_ANNO1) {
    throw new Error(`Stripe addebiterebbe ${euro(s.amount_total)} invece di ${euro(ATTESO_ANNO1)}`);
  }
});

await check("si paga davvero e l'account si sblocca con le estensioni", async () => {
  // Il pagamento si compie via API: automatizzare i tredici riquadri della carta
  // proverebbe i selettori di Stripe, non la nostra catena. Le RIGHE però sono quelle
  // vere della sessione appena creata, non inventate qui.
  const [cli] = await sql`select stripe_customer_id from stripe_customer where organization_id = ${orgId}`;
  if (!cli) throw new Error("il checkout non ha creato il cliente Stripe");
  const pm = await stripe.paymentMethods.attach("pm_card_visa", { customer: cli.stripe_customer_id });
  await stripe.customers.update(cli.stripe_customer_id, {
    invoice_settings: { default_payment_method: pm.id },
  });
  const s = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items.data.price"] });
  const items = s.line_items.data.map((r) => ({ price: r.price.id, quantity: r.quantity }));
  const sub = await stripe.subscriptions.create({
    customer: cli.stripe_customer_id,
    items,
    metadata: { organizationId: orgId, piano: "studio" },
  });
  if (sub.status !== "active") throw new Error("abbonamento in stato " + sub.status);

  // In locale Stripe non ci arriva: l'evento glielo si porta a mano, firmato.
  // Gli eventi compaiono con qualche istante di ritardo rispetto all'oggetto che li
  // ha generati: chiederli subito e una volta sola non li trova.
  if (/localhost|127\.0\.0\.1/.test(BASE)) {
    let nostro = null;
    for (let i = 0; i < 10 && !nostro; i++) {
      const eventi = await stripe.events.list({ types: ["customer.subscription.created"], limit: 20 });
      nostro = eventi.data.find((ev) => ev.data?.object?.id === sub.id) ?? null;
      if (!nostro) await new Promise((r) => setTimeout(r, 2000));
    }
    if (!nostro) throw new Error("l'evento dell'abbonamento non si trova su Stripe");
    await consegnaEvento(nostro);
    await new Promise((r) => setTimeout(r, 2000));
  }

  let e;
  for (let i = 0; i < 20; i++) {
    [e] = await sql`select status, piano, aziende_extra, accessi_extra, white_label
      from org_entitlement where organization_id = ${orgId}`;
    if (e.status === "active" && e.piano) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (e.status !== "active") throw new Error("dopo un minuto è ancora " + e.status);
  const attesoAziende = BLOCCHI * ESTENSIONI.bloccoAziende.aziende;
  if (e.aziende_extra !== attesoAziende) throw new Error(`aziende extra: ${e.aziende_extra} invece di ${attesoAziende}`);
  if (e.accessi_extra !== ACCESSI) throw new Error(`accessi extra: ${e.accessi_extra} invece di ${ACCESSI}`);
  if (e.white_label !== MARCHIO) throw new Error(`white label: ${e.white_label}`);
});

await check("la capacità sulla pagina rispecchia quello che è stato comprato", async () => {
  await page.goto(`${BASE}/impostazioni/abbonamento`, { waitUntil: "networkidle" });
  const t = await page.locator("main").innerText();
  const aziende = piano.aziende + BLOCCHI * ESTENSIONI.bloccoAziende.aziende;
  if (!t.includes(`di ${aziende}`)) throw new Error(`non dichiara ${aziende} aziende totali`);
  if (!t.includes(`di ${piano.accessi + ACCESSI}`)) throw new Error("non dichiara gli accessi totali");
  if (!/Documenti col marchio del tuo studio/i.test(t)) throw new Error("non elenca il white-label acquistato");
});

await check("IL RINNOVO PORTA ANCORA LE ESTENSIONI", async () => {
  // Il motivo per cui esiste questo collaudo. Prima la seconda fase conteneva il solo
  // piano: fra dodici mesi il cliente avrebbe perso dieci aziende e tre accessi.
  // Lo Schedule si chiede a STRIPE, non al nostro database: da noi l'identificativo lo
  // scrive un evento successivo (`subscription.updated`, che parte quando lo Schedule
  // si aggancia), e in locale quell'evento non lo consegna nessuno. La verità su cosa
  // pagherà il cliente sta comunque di là.
  let schedule = null;
  for (let i = 0; i < 12 && !schedule; i++) {
    const [s] = await sql`select stripe_subscription_id, stripe_schedule_id from stripe_subscription
      where organization_id = ${orgId}`;
    if (s?.stripe_schedule_id) { schedule = s.stripe_schedule_id; break; }
    if (s?.stripe_subscription_id) {
      const sub = await stripe.subscriptions.retrieve(s.stripe_subscription_id);
      if (sub.schedule) schedule = typeof sub.schedule === "string" ? sub.schedule : sub.schedule.id;
    }
    if (!schedule) await new Promise((r) => setTimeout(r, 3000));
  }
  if (!schedule) throw new Error("nessun piano a due fasi creato");
  const sch = await stripe.subscriptionSchedules.retrieve(schedule);
  if (sch.phases.length < 2) throw new Error("una fase sola");
  if (sch.end_behavior !== "release") throw new Error("end_behavior: " + sch.end_behavior);

  const seconda = sch.phases[1].items;
  const prezzi = await Promise.all(
    seconda.map(async (i) => {
      const p = await stripe.prices.retrieve(typeof i.price === "string" ? i.price : i.price.id);
      return { lookup: p.lookup_key, importo: p.unit_amount, q: i.quantity ?? 1 };
    }),
  );
  const trova = (lookup) => prezzi.find((p) => p.lookup === lookup);
  if (!trova(pRinnovo.lookup)) throw new Error(`la fase 2 non ha il rinnovo: ${JSON.stringify(prezzi)}`);
  if (trova(pBlocco.lookup)?.q !== BLOCCHI) throw new Error(`la fase 2 perde i blocchi: ${JSON.stringify(prezzi)}`);
  if (trova(pAccesso.lookup)?.q !== ACCESSI) throw new Error(`la fase 2 perde gli accessi: ${JSON.stringify(prezzi)}`);
  if (MARCHIO && !trova(pMarchio.lookup)) throw new Error("la fase 2 perde il white-label");

  const totale = prezzi.reduce((s, p) => s + p.importo * p.q, 0);
  if (totale !== ATTESO_RINNOVO) {
    throw new Error(`il rinnovo costerebbe ${euro(totale)} invece di ${euro(ATTESO_RINNOVO)}`);
  }
  console.log(`       fase 2: ${prezzi.map((p) => `${p.lookup}×${p.q}`).join(" + ")} = ${euro(totale)}`);
});

let urlPortale = null;
await check("il portale clienti si apre", async () => {
  await page.goto(`${BASE}/impostazioni/abbonamento`, { waitUntil: "networkidle" });
  const b = page.getByRole("button", { name: /Fatture e metodo di pagamento/i });
  if (!(await b.count())) throw new Error("nessun comando per le fatture");
  await b.click();
  await page.waitForURL(/billing\.stripe\.com/, { timeout: 60_000 });
  await page.waitForTimeout(3000);
  urlPortale = page.url();
});

await check("il portale offre fatture e carta, e NON il cambio piano", async () => {
  // Senza questa riga il controllo leggerebbe la pagina precedente e passerebbe anche
  // quando il portale non si è mai aperto: un verde falso è peggio di un rosso.
  if (!urlPortale) throw new Error("il portale non si è aperto: niente da verificare");
  const t = await page.locator("body").innerText();
  console.log("       portale dice: " + t.replace(/\s+/g, " ").slice(0, 200));
  if (!/(fattur|ricevut|storico|invoice|billing history)/i.test(t)) throw new Error("non mostra le fatture");
  if (!/(metodo di pagamento|payment method|carta|card)/i.test(t)) throw new Error("non mostra il metodo di pagamento");
  // Le due cose che romperebbero lo Schedule a due fasi.
  if (/(Aggiorna piano|Cambia piano|Update plan)/i.test(t)) throw new Error("offre il cambio piano");
  if (/(Annulla piano|Annulla abbonamento|Cancel plan|Disdici)/i.test(t)) throw new Error("offre la disdetta");
  void urlPortale;
});

await check("un collaboratore non apre il portale dello studio", async () => {
  // `requireStudioAdmin`: la cronologia dei pagamenti non è roba da invitato. Si prova
  // dal database, abbassando il ruolo e richiamando la pagina.
  const [u] = await sql`select id from "user" where email = ${EMAIL}`;
  await sql`update member set role='member' where user_id=${u.id} and organization_id=${orgId}`;
  await page.goto(`${BASE}/impostazioni/abbonamento`, { waitUntil: "networkidle" });
  const b = page.getByRole("button", { name: /Fatture e metodo di pagamento/i });
  if (!(await b.count())) throw new Error("il comando non c'è nemmeno per il titolare: prova inconcludente");
  let respinto = true;
  if (await b.count()) {
    await b.click();
    await page.waitForTimeout(4000);
    respinto = !/billing\.stripe\.com/.test(page.url());
  }
  await sql`update member set role='owner' where user_id=${u.id} and organization_id=${orgId}`;
  if (!respinto) throw new Error("un collaboratore è entrato nel portale");
});

await sql.end();
await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
if (ko > 0) process.exitCode = 1;
