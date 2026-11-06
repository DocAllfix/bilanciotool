// L'abbonamento in mano al cliente: scegliere il mensile, disdire, ripensarci, passare
// all'annuale. Sostituisce `verifica-estensioni` dal 6 novembre 2026: i blocchi di aziende non
// si vendono più, e ciò che chi paga può fare da solo è questo.
//
//   npm run qa -- gestione-abbonamento
//
// ⚠️ OGNI ESITO SI LEGGE DA STRIPE E DAL DATABASE, mai dallo schermo: un messaggio verde non
// dimostra che l'abbonamento sia cambiato, e su questi comandi si muovono soldi veri.
//
// ⚠️ SOLO CHIAVI DI PROVA: questo collaudo crea un cliente e un abbonamento. Con la chiave viva
// sarebbe un addebito a qualcuno, e si rifiuta di partire.

import { chromium } from "@playwright/test";
import postgres from "postgres";
import Stripe from "stripe";
import { randomUUID, createHmac } from "node:crypto";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";
import { strumenta, contatore, pretendiServerAggiornato, attraversaProtezione, vaiA, spegniTour, fattoreAttesa } from "./comune-collaudo.mjs";
import { PIANI, euro, prezzoDiVendita, risparmioAnnuo } from "../src/lib/prezzi.ts";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const CHIAVE = process.env.STRIPE_SECRET_KEY ?? "";
if (!CHIAVE.startsWith("sk_test_")) {
  console.error("Serve la chiave Stripe di PROVA: questo collaudo crea abbonamenti.");
  process.exit(1);
}
if ((process.env.DATABASE_URL ?? "").includes("hahtljrexrngtfsplbsz") || /^https:\/\/(www\.)?evalisdeck\.it/.test(BASE)) {
  console.log("Gestione abbonamento: in produzione non parte.");
  process.exit(0);
}

const stripe = new Stripe(CHIAVE);
const RUN = Date.now();
const EMAIL = `gestione-${RUN}@example.com`;
const piano = PIANI.azienda;
const mese = prezzoDiVendita(piano, "mese");
const anno = prezzoDiVendita(piano, "anno");

console.log(`\nGestione dell'abbonamento — ${BASE}\n`);
await pretendiServerAggiornato(BASE);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const browser = await chromium.launch({ headless: true });
const pagina = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await attraversaProtezione(pagina);
const sonda = strumenta(pagina);
const { agisci, riepilogo } = contatore(pagina, sonda);

let orgId = null;
let clienteId = null;
let subId = null;

/** Il riallineamento che farebbe il webhook: l'evento è firmato col segreto di prova. */
async function consegna(tipo, oggetto) {
  const segreto = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segreto) throw new Error("STRIPE_WEBHOOK_SECRET assente");
  const corpo = JSON.stringify({
    id: `evt_${randomUUID()}`,
    object: "event",
    type: tipo,
    created: Math.floor(Date.now() / 1000),
    data: { object: oggetto },
  });
  const t = Math.floor(Date.now() / 1000);
  const firma = createHmac("sha256", segreto).update(`${t}.${corpo}`).digest("hex");
  const r = await fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${firma}` },
    body: corpo,
  });
  if (!r.ok) throw new Error(`il webhook ha risposto ${r.status}`);
}

const riga = async () => (await sql`select status, piano, periodo, disdetta_a_fine_periodo from org_entitlement where organization_id = ${orgId}`)[0];
const idDi = async (lookup) => (await stripe.prices.list({ lookup_keys: [lookup], limit: 1, active: true })).data[0].id;

/** Aspetta il FATTO nel database, non un segnale che gli assomiglia. */
async function aspetta(condizione, descrizione) {
  const scade = Date.now() + 30_000 * fattoreAttesa();
  for (;;) {
    const r = await riga();
    if (condizione(r)) return r;
    if (Date.now() > scade) throw new Error(`${descrizione}: la riga dice ${JSON.stringify(r)}`);
    await new Promise((f) => setTimeout(f, 500));
  }
}

const apriAbbonamento = async (query = "") => {
  await vaiA(pagina, `${BASE}/impostazioni/abbonamento${query}`);
  await pagina.locator("[data-stato-abbonamento]").waitFor({ timeout: 30_000 * fattoreAttesa() });
  await spegniTour(pagina);
};

try {
  await agisci("ci si iscrive: l'account è in demo", async () => {
    ({ orgId } = await registraEEntra(pagina, sql, { base: BASE, nome: "Gestione Collaudo", email: EMAIL, pwd: PWD_COLLAUDO }));
    if ((await riga()).status !== "demo") throw new Error(`stato ${(await riga()).status}`);
  });

  await agisci("arrivando col mensile scelto, la finestra si apre sul mensile", async () => {
    await apriAbbonamento(`?fascia=${piano.key}&periodo=mese`);
    const d = pagina.getByRole("dialog");
    await d.waitFor({ timeout: 30_000 * fattoreAttesa() });
    const t = await d.innerText();
    if (!t.includes(piano.nome)) throw new Error(`si è aperta su un'altra fascia: ${t.slice(0, 60)}`);
    if (!t.includes(euro(mese.importo))) throw new Error(`non mostra ${euro(mese.importo)}`);
    const premuto = await d.locator('[data-periodo="mese"]').getAttribute("aria-pressed");
    if (premuto !== "true") throw new Error("non è sul mensile");
  });

  await agisci("⚠️ la cassa di Stripe riceve davvero il prezzo MENSILE", async () => {
    const d = pagina.getByRole("dialog");
    await d.getByRole("button", { name: /^Paga / }).click();
    await pagina.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 * fattoreAttesa() });
    const id = new URL(pagina.url()).pathname.split("/").find((x) => x.startsWith("cs_test_"));
    if (!id) throw new Error(`indirizzo inatteso: ${pagina.url().slice(0, 80)}`);
    const s = await stripe.checkout.sessions.retrieve(id, { expand: ["line_items.data.price"] });
    const righe = s.line_items.data;
    if (righe.length !== 1) throw new Error(`${righe.length} righe in cassa`);
    if (righe[0].price.lookup_key !== mese.lookup) throw new Error(`in cassa c'è ${righe[0].price.lookup_key}`);
    if (righe[0].price.recurring?.interval !== "month") throw new Error("il prezzo non è mensile");
    if (s.metadata?.periodo !== "mese") throw new Error(`metadati: ${JSON.stringify(s.metadata)}`);
    await stripe.checkout.sessions.expire(id);
  });

  await agisci("con l'abbonamento mensile attivo, la pagina lo dice", async () => {
    const cliente = await stripe.customers.create({
      email: EMAIL,
      name: "Gestione Collaudo",
      address: { line1: "Via Roma 1", postal_code: "80100", city: "Napoli", country: "IT" },
      metadata: { organizationId: orgId },
    });
    clienteId = cliente.id;
    const pm = await stripe.paymentMethods.create({ type: "card", card: { token: "tok_visa" } });
    await stripe.paymentMethods.attach(pm.id, { customer: cliente.id });
    await stripe.customers.update(cliente.id, { invoice_settings: { default_payment_method: pm.id } });
    await sql`insert into stripe_customer (organization_id, stripe_customer_id, created_at)
              values (${orgId}, ${cliente.id}, now())
              on conflict (organization_id) do update set stripe_customer_id = excluded.stripe_customer_id`;
    const sub = await stripe.subscriptions.create({
      customer: cliente.id,
      items: [{ price: await idDi(mese.lookup), quantity: 1 }],
      automatic_tax: { enabled: true },
      metadata: { organizationId: orgId, piano: piano.key, periodo: "mese" },
    });
    subId = sub.id;
    await consegna("customer.subscription.created", await stripe.subscriptions.retrieve(subId));
    await aspetta((r) => r.status === "active" && r.periodo === "mese", "l'account non è attivo sul mensile");

    await apriAbbonamento();
    const stato = await pagina.locator("[data-stato-abbonamento]").innerText();
    if (!/si rinnova ogni mese/.test(stato)) throw new Error(`la pagina dice: ${stato}`);
    if (await pagina.getByRole("heading", { name: "I piani" }).count()) throw new Error("propone ancora i piani a chi ne ha uno");
  });

  await agisci("⚠️ disdire: Stripe smette di rinnovare, e l'account resta attivo", async () => {
    await pagina.getByRole("button", { name: "Disdici il rinnovo" }).click();
    const d = pagina.getByRole("dialog");
    await d.getByText(/resta pienamente attivo/).waitFor({ timeout: 10_000 });
    await d.getByRole("button", { name: "Disdici il rinnovo" }).click();
    const r = await aspetta((x) => x.disdetta_a_fine_periodo === true, "la disdetta non è registrata");
    if (r.status !== "active") throw new Error(`stato ${r.status}: una disdetta non spegne il periodo pagato`);
    const sub = await stripe.subscriptions.retrieve(subId);
    if (!sub.cancel_at_period_end) throw new Error("su Stripe l'abbonamento si rinnova ancora");
    await pagina.getByRole("button", { name: "Annulla la disdetta" }).waitFor({ timeout: 30_000 * fattoreAttesa() });
    const stato = await pagina.locator("[data-stato-abbonamento]").innerText();
    if (!/disdetto/i.test(stato)) throw new Error(`la pagina dice: ${stato}`);
    const az = await sql`select azione from audit_log where organization_id = ${orgId} and azione = 'billing.abbonamento.disdici'`;
    if (!az.length) throw new Error("la disdetta non è nel registro attività");
  });

  await agisci("ripensarci: la disdetta si ritira, su Stripe e qui", async () => {
    await pagina.getByRole("button", { name: "Annulla la disdetta" }).click();
    const d = pagina.getByRole("dialog");
    await d.getByRole("button", { name: /continua a rinnovarlo/ }).click();
    await aspetta((x) => x.disdetta_a_fine_periodo === false, "la disdetta è ancora registrata");
    const sub = await stripe.subscriptions.retrieve(subId);
    if (sub.cancel_at_period_end) throw new Error("su Stripe resta disdetto");
    await pagina.getByRole("button", { name: "Disdici il rinnovo" }).waitFor({ timeout: 30_000 * fattoreAttesa() });
  });

  await agisci("⚠️ passare all'annuale: l'anno riparte da oggi, e la parte di mese non usata si scala", async () => {
    const comando = pagina.getByRole("button", { name: /Passa all'annuale/ });
    const etichetta = await comando.innerText();
    const risparmio = euro(risparmioAnnuo(piano));
    if (!etichetta.includes(risparmio)) throw new Error(`il comando non dice il risparmio: ${etichetta}`);
    await comando.click();
    const d = pagina.getByRole("dialog");
    await d.getByRole("button", { name: /^Paga / }).click();
    await aspetta((x) => x.periodo === "anno", "il periodo non è passato all'annuale");

    const sub = await stripe.subscriptions.retrieve(subId, { expand: ["latest_invoice"] });
    const voce = sub.items.data[0];
    if (voce.price.lookup_key !== anno.lookup) throw new Error(`ora punta a ${voce.price.lookup_key}`);
    if (sub.pending_update) throw new Error("il cambio è rimasto in sospeso");
    if (sub.schedule) throw new Error("è comparso uno Schedule");
    // ⚠️ L'anno riparte DA OGGI: senza `billing_cycle_anchor: "now"` Stripe tiene la vecchia
    // ricorrenza e addebita un pro rata, mentre la finestra dice «paghi l'annuale».
    const giorni = (voce.current_period_end - voce.current_period_start) / 86_400;
    if (giorni < 360) throw new Error(`il periodo copre ${Math.round(giorni)} giorni, non un anno`);
    const f = sub.latest_invoice;
    if (f.status !== "paid") throw new Error(`fattura ${f.status}`);
    // L'imponibile è l'annuale meno la parte di mese non usata: mai più dell'annuale, e mai
    // meno dell'annuale meno un mese intero.
    if (f.subtotal > anno.importo || f.subtotal < anno.importo - mese.importo) {
      throw new Error(`imponibile ${euro(f.subtotal)}, atteso fra ${euro(anno.importo - mese.importo)} e ${euro(anno.importo)}`);
    }
    await pagina.getByRole("button", { name: "Disdici il rinnovo" }).waitFor({ timeout: 30_000 * fattoreAttesa() });
    if (await pagina.getByRole("button", { name: /Passa all'annuale/ }).count()) {
      throw new Error("propone ancora il passaggio a chi è già annuale");
    }
    const stato = await pagina.locator("[data-stato-abbonamento]").innerText();
    if (!/si rinnova ogni anno/.test(stato)) throw new Error(`la pagina dice: ${stato}`);
  });

  await agisci("⚠️ un abbonamento con lo Schedule del listino vecchio non offre i comandi", async () => {
    // Stripe rifiuta di cambiare direttamente un abbonamento governato da uno Schedule, e
    // l'errore di Stripe non deve arrivare al cliente: per lui resta «scrivici».
    const sch = await stripe.subscriptionSchedules.create({ from_subscription: subId });
    await consegna("customer.subscription.updated", await stripe.subscriptions.retrieve(subId));
    await apriAbbonamento();
    if (await pagina.locator("[data-comandi-abbonamento]").count()) {
      throw new Error("mostra i comandi su un abbonamento con Schedule");
    }
    const t = await pagina.locator("main").innerText();
    if (!/disdire il rinnovo scrivi a/i.test(t)) throw new Error("non dice a chi scrivere");
    await stripe.subscriptionSchedules.release(sch.id);
  });
} finally {
  const esito = riepilogo("Gestione dell'abbonamento");
  try {
    if (subId) await stripe.subscriptions.cancel(subId);
    if (clienteId) await stripe.customers.del(clienteId);
  } catch (e) {
    console.log("  (pulizia su Stripe non riuscita:", String(e.message).slice(0, 100) + ")");
  }
  if (orgId) await sql`delete from stripe_subscription where organization_id = ${orgId}`;
  await browser.close();
  await sql.end();
  // ⚠️ `riepilogo` restituisce i ROSSI: il vero va mappato su 1, non su 0.
  process.exitCode = esito ? 1 : 0;
}
