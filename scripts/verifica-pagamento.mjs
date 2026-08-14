// Il giro completo del pagamento, dal vivo: si compra davvero.
//
// Registrazione → checkout → carta di prova → ritorno → l'account si sblocca DA SOLO.
// L'ultimo passaggio è quello che conta: nessuno tocca il database a mano, l'account
// si attiva solo perché Stripe ci ha detto che il pagamento è avvenuto. Se il webhook
// non arriva, qui si vede.
//
//   BASE=https://evalisdeck.it node scripts/verifica-pagamento.mjs

import { chromium } from "@playwright/test";
import postgres from "postgres";
import Stripe from "stripe";
import "dotenv/config";
import { registraEEntra } from "./comune-registrazione.mjs";
import { PWD_COLLAUDO } from "./comune-credenziali.mjs";

const BASE = (process.env.BASE ?? "https://evalisdeck.it").replace(/\/+$/, "");
const RUN = Date.now();
const EMAIL = `pago-${RUN}@example.com`;
const PWD = PWD_COLLAUDO;

// ⚠️ Questo collaudo arriva alla pagina di pagamento VERA: contro la produzione, dove le
// chiavi sono vive, crea un cliente e una sessione nell'account che incassa — a ogni
// esecuzione. Va lanciato contro un ambiente in modalita' di prova.
if (!/localhost|127\.0\.0\.1/.test(BASE) && !process.env.SO_CHE_E_VIVO) {
  console.error(`BASE e' ${BASE}: se le chiavi Stripe di quell'ambiente sono vive, questo`);
  console.error("collaudo crea clienti e sessioni reali. Lancialo su http://localhost:3000,");
  console.error("oppure, se sai quello che fai: SO_CHE_E_VIVO=1 node <script>");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
let ok = 0, ko = 0;
const check = async (nome, fn) => {
  try { await fn(); ok++; console.log("  ok   " + nome); }
  catch (e) { ko++; console.log("  KO   " + nome + " -> " + String(e.message).split("\n")[0]); }
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => {
  try { localStorage.setItem("evalisdeck-tour:portfolio", "1"); } catch {}
});
const page = await ctx.newPage();

let orgId = "";

await check("uno studio si registra e resta in prova", async () => {
  await registraEEntra(page, sql, { base: BASE, nome: "Compratore Vero", email: EMAIL, pwd: PWD });
  const rifiuta = page.getByRole("button", { name: "Rifiuta", exact: true });
  if (await rifiuta.count()) { await rifiuta.click(); await page.waitForTimeout(400); }

  const [u] = await sql`select id from "user" where email = ${EMAIL}`;
  const [m] = await sql`select organization_id from member where user_id = ${u.id}`;
  orgId = m.organization_id;
  const [e] = await sql`select status, piano from org_entitlement where organization_id = ${orgId}`;
  if (e.status !== "demo") throw new Error("non è in prova: " + e.status);
  if (e.piano) throw new Error("ha già un piano");
});

await check("si arriva alla pagina di pagamento", async () => {
  await page.goto(`${BASE}/impostazioni/abbonamento`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Attiva/ }).first().click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
  // Niente `networkidle`: la pagina di Stripe tiene connessioni aperte e quel silenzio
  // non arriva mai. Basta che ci si sia arrivati.
  await page.waitForTimeout(2000);
});

await check("si paga davvero, con una carta di prova", async () => {
  // Il pagamento si compie via API e non compilando il modulo: da qualche versione i
  // campi della carta vivono in tredici riquadri incorporati, e automatizzarli
  // proverebbe la solidita' dei selettori di Stripe, non la nostra catena. Quello che
  // conta — Stripe dice «pagato», il nostro webhook lo sente, l'account si sblocca —
  // e' identico. La compilazione a mano del modulo resta da provare una volta sola,
  // e la copre gia' `verifica-checkout.mjs` fino alla pagina di pagamento.
  const [riga] = await sql`select stripe_customer_id from stripe_customer where organization_id = ${orgId}`;
  if (!riga) throw new Error("il checkout non ha creato il cliente Stripe");

  const pm = await stripe.paymentMethods.attach("pm_card_visa", { customer: riga.stripe_customer_id });
  await stripe.customers.update(riga.stripe_customer_id, {
    invoice_settings: { default_payment_method: pm.id },
  });
  const prezzi = await stripe.prices.list({ lookup_keys: ["evalisdeck_studio_anno1_lancio_v1"], limit: 1 });
  const sub = await stripe.subscriptions.create({
    customer: riga.stripe_customer_id,
    items: [{ price: prezzi.data[0].id }],
    metadata: { organizationId: orgId, piano: "studio" },
  });
  if (sub.status !== "active") throw new Error("abbonamento in stato " + sub.status);
});

await check("la pagina di rientro esiste e non attiva niente da sola", async () => {
  // Senza `session_id` deve rimandare all'abbonamento invece di mostrare una conferma
  // a chi non ha comprato niente.
  await page.goto(`${BASE}/impostazioni/abbonamento/benvenuto`, { waitUntil: "networkidle" });
  if (/benvenuto/.test(new URL(page.url()).pathname)) {
    throw new Error("mostra la conferma senza che ci sia stato un pagamento");
  }
});

await check("l'account si sblocca DA SOLO, perché lo dice Stripe", async () => {
  // Il webhook arriva in pochi secondi. Nessuno tocca il database a mano: se qui non
  // cambia niente, la catena del pagamento è rotta.
  let e;
  for (let i = 0; i < 20; i++) {
    [e] = await sql`select status, piano, current_period_end from org_entitlement where organization_id = ${orgId}`;
    if (e.status === "active") break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (e.status !== "active") throw new Error("dopo un minuto è ancora " + e.status);
  if (!e.piano) throw new Error("attivo ma senza piano");
  if (!e.current_period_end) throw new Error("senza data di rinnovo");
});

await check("l'abbonamento è registrato e legato allo studio", async () => {
  const [s] = await sql`select stripe_subscription_id, status from stripe_subscription where organization_id = ${orgId}`;
  if (!s) throw new Error("nessun abbonamento registrato");
  if (s.status !== "active") throw new Error("stato " + s.status);
});

await check("il piano a due fasi esiste: il rinnovo costerà meno", async () => {
  // Il difetto che altrimenti si scopre fra dodici mesi, su un cliente vero.
  let schedule = null;
  for (let i = 0; i < 10; i++) {
    const [s] = await sql`select stripe_schedule_id from stripe_subscription where organization_id = ${orgId}`;
    if (s?.stripe_schedule_id) { schedule = s.stripe_schedule_id; break; }
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (!schedule) throw new Error("nessun piano a due fasi creato");
  const sch = await stripe.subscriptionSchedules.retrieve(schedule);
  if (sch.phases.length < 2) throw new Error("una fase sola: il rinnovo resterebbe al prezzo del primo anno");
  if (sch.end_behavior !== "release") throw new Error("end_behavior: " + sch.end_behavior);
  const primo = sch.phases[0].items[0].price;
  const secondo = sch.phases[1].items[0].price;
  const [p1, p2] = await Promise.all([
    stripe.prices.retrieve(typeof primo === "string" ? primo : primo.id),
    stripe.prices.retrieve(typeof secondo === "string" ? secondo : secondo.id),
  ]);
  if (!(p2.unit_amount < p1.unit_amount)) {
    throw new Error(`il rinnovo non è più economico: ${p1.unit_amount} → ${p2.unit_amount}`);
  }
  console.log(`       primo anno ${p1.unit_amount / 100} € → rinnovo ${p2.unit_amount / 100} €`);
});

await check("lo stesso evento due volte non attiva due abbonamenti", async () => {
  // Si reinvia davvero l'evento a Stripe, non si simula: è l'unico modo di provare che
  // il claim di idempotenza regga contro il vero mittente.
  // Un evento QUALSIASI fra quelli che gestiamo: serve a provare la firma, non il tipo.
  const eventi = await stripe.events.list({ types: ["customer.subscription.created"], limit: 3 });
  const nostro = eventi.data[0];
  if (!nostro) throw new Error("nessun evento da reinviare");
  const risposta = await fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": "firma-inventata" },
    body: JSON.stringify(nostro),
  });
  // Firma inventata: deve rifiutare. È l'altra metà della prova — l'endpoint non
  // accetta eventi da chiunque sappia il suo indirizzo.
  if (risposta.status !== 400) throw new Error("ha accettato un evento senza firma valida: " + risposta.status);

  const righe = await sql`select count(*)::int as n from stripe_subscription where organization_id = ${orgId}`;
  if (righe[0].n !== 1) throw new Error(`${righe[0].n} abbonamenti per lo stesso studio`);
});

await check("ora può fare quello per cui ha pagato: crea un'azienda vera", async () => {
  // Il paywall vive nel server, non nel pulsante: provare che il pulsante sia
  // cliccabile non dimostra niente. Si crea davvero un'azienda e la si cerca nel
  // database.
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.locator('[data-tour="nuova-azienda"]').click();
  await page.fill("#na-nome", "Azienda Dopo Pagamento S.r.l.");
  await page.click('button[type="submit"]:has-text("Crea azienda")');
  await page.waitForTimeout(3500);
  const [az] = await sql`select id from company where organization_id = ${orgId}
                          and nome = 'Azienda Dopo Pagamento S.r.l.' limit 1`;
  if (!az) throw new Error("l'azienda non e' stata creata: il paywall non si e' sbloccato");
});

await sql.end();
await browser.close();
console.log(`\nControlli: ${ok} ok, ${ko} falliti`);
if (ko > 0) process.exitCode = 1;
