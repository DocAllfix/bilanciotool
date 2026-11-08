// Il rinnovo, visto davvero: annuale e mensile.
//
//   npm run qa -- rinnovo              (annuale: un anno e un giorno)
//   npm run qa -- rinnovo --mensile    (mensile: un mese e un giorno)
//
// Chiavi di PROVA obbligatorie. Si usa un OROLOGIO DI PROVA di Stripe (`test_clock`): si crea
// l'abbonamento, si sposta il tempo oltre la scadenza, e si guarda cosa resta. Nessuna attesa
// e nessuna simulazione fatta da noi: è Stripe a far scattare il rinnovo.
//
// ⚠️ DAL 6 NOVEMBRE 2026 IL PREZZO È LO STESSO A OGNI RINNOVO, e NON SI CREA PIÙ LO SCHEDULE.
// Le cose che devono succedere, e ognuna può rompersi da sola:
//   1. il webhook NON aggancia uno Schedule: su un mensile sarebbe un danno, perché la fase
//      uno durerebbe un mese e la due addebiterebbe per un anno un prezzo di rinnovo;
//   2. al rinnovo la fattura vale lo stesso imponibile, con l'IVA sopra;
//   3. il periodo nel nostro database si sposta in avanti, e l'account resta attivo;
//   4. l'anteprima della prossima fattura — quella che il cron usa per il preavviso — dice
//      lo stesso importo che Stripe addebita davvero.

import postgres from "postgres";
import Stripe from "stripe";
import { randomUUID, createHmac } from "node:crypto";
import "dotenv/config";
import { PIANI, euro, prezzoDiVendita } from "../src/lib/prezzi.ts";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ⚠️ Solo chiavi di prova. Gli orologi di prova NON esistono in modalità viva, e un
// abbonamento creato con la chiave viva sarebbe un cliente vero che paga davvero.
if (/_live_/.test(process.env.STRIPE_SECRET_KEY ?? "")) {
  console.error("La chiave Stripe è in modalità VIVA: gli orologi di prova non esistono lì,");
  console.error("e questo collaudo creerebbe un abbonamento vero. Usa la chiave di prova.");
  process.exit(1);
}

const MENSILE = process.argv.includes("--mensile");
const periodo = MENSILE ? "mese" : "anno";
const RUN = Date.now();
const orgId = `org-rinnovo-${RUN}`;
const userId = `user-rinnovo-${RUN}`;

const piano = PIANI.azienda;
const prezzo = prezzoDiVendita(piano, periodo);

let ok = 0;
const falliti = [];
async function prova(nome, fn) {
  try {
    await fn();
    ok++;
    console.log("  ok  ", nome);
  } catch (e) {
    falliti.push({ nome, motivo: String(e.message).split("\n")[0] });
    console.log("  KO  ", nome, "->", String(e.message).split("\n")[0].slice(0, 160));
  }
}

/** Consegna a mano un evento al nostro webhook, firmandolo col segreto di prova.
 *
 *  L'OGGETTO è vero, riletto da Stripe; la BUSTA che lo avvolge la costruiamo qui, e va tenuta
 *  il più vicino possibile a quella vera: mancava `created`, che Stripe mette sempre, e il
 *  collaudo trovò un difetto per il motivo sbagliato. */
async function consegna(tipo, oggetto) {
  const segreto = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segreto) throw new Error("STRIPE_WEBHOOK_SECRET assente: non posso firmare l'evento");
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
  if (!r.ok) throw new Error(`il webhook ha risposto ${r.status}: ${(await r.text()).slice(0, 160)}`);
}

const idDi = async (lookup) => {
  const l = await stripe.prices.list({ lookup_keys: [lookup], limit: 1, active: true });
  if (!l.data[0]) throw new Error(`prezzo «${lookup}» assente su Stripe: lancia stripe-bootstrap`);
  return l.data[0].id;
};

console.log(`\nRinnovo ${MENSILE ? "MENSILE" : "ANNUALE"} — ${BASE}`);
console.log(`  atteso a ogni rinnovo: ${euro(prezzo.importo)} + IVA\n`);

let clockId = null;
let subId = null;

try {
  await sql`insert into "user" (id, name, email, email_verified, created_at, updated_at)
            values (${userId}, 'Titolare Rinnovo', ${`rinnovo-${RUN}@example.com`}, true, now(), now())`;
  await sql`insert into organization (id, name, slug, created_at)
            values (${orgId}, 'Studio Rinnovo', ${`rinnovo-${RUN}`}, now())`;
  await sql`insert into member (id, organization_id, user_id, role, created_at)
            values (${randomUUID()}, ${orgId}, ${userId}, 'owner', now())`;
  await sql`insert into org_entitlement (organization_id, status) values (${orgId}, 'demo')`;

  await prova("si crea l'abbonamento su un orologio di prova", async () => {
    const clock = await stripe.testHelpers.testClocks.create({
      frozen_time: Math.floor(Date.now() / 1000),
      name: `rinnovo-${RUN}`,
    });
    clockId = clock.id;
    const cliente = await stripe.customers.create({
      email: `rinnovo-${RUN}@example.com`,
      name: "Studio Rinnovo",
      // Un cliente in Italia: è l'indirizzo a far calcolare a Stripe Tax il 22%.
      address: { line1: "Via Roma 1", postal_code: "80100", city: "Napoli", country: "IT" },
      test_clock: clockId,
      metadata: { organizationId: orgId },
    });
    // Senza carta la fattura del rinnovo non si paga: si misurerebbe l'assenza della carta.
    const pm = await stripe.paymentMethods.create({ type: "card", card: { token: "tok_visa" } });
    await stripe.paymentMethods.attach(pm.id, { customer: cliente.id });
    await stripe.customers.update(cliente.id, { invoice_settings: { default_payment_method: pm.id } });
    await sql`insert into stripe_customer (organization_id, stripe_customer_id, created_at)
              values (${orgId}, ${cliente.id}, now())`;

    const sub = await stripe.subscriptions.create({
      customer: cliente.id,
      items: [{ price: await idDi(prezzo.lookup), quantity: 1 }],
      automatic_tax: { enabled: true },
      metadata: { organizationId: orgId, piano: piano.key, periodo },
    });
    subId = sub.id;
    await consegna("customer.subscription.created", await stripe.subscriptions.retrieve(subId));
  });

  await prova("l'account è attivo, col piano e il periodo giusti", async () => {
    const [e] = await sql`select status, piano, periodo, disdetta_a_fine_periodo from org_entitlement
                          where organization_id=${orgId}`;
    if (e.status !== "active") throw new Error(`stato ${e.status}`);
    if (e.piano !== piano.key) throw new Error(`piano ${e.piano}`);
    if (e.periodo !== periodo) throw new Error(`periodo ${e.periodo}, atteso ${periodo}`);
    if (e.disdetta_a_fine_periodo) throw new Error("risulta disdetto");
  });

  await prova("⚠️ il webhook NON ha agganciato uno Schedule", async () => {
    const sub = await stripe.subscriptions.retrieve(subId);
    if (sub.schedule) throw new Error(`c'è lo Schedule ${sub.schedule}: su un mensile sarebbe un danno`);
  });

  await prova("l'anteprima del preavviso dice l'importo giusto", async () => {
    const a = await stripe.invoices.createPreview({ subscription: subId });
    const imponibile = a.total_excluding_tax ?? a.subtotal;
    if (imponibile !== prezzo.importo) throw new Error(`anteprima ${euro(imponibile)}, atteso ${euro(prezzo.importo)}`);
  });

  console.log(`\n— si sposta l'orologio oltre la scadenza —`);

  await prova("l'orologio avanza", async () => {
    const sub = await stripe.subscriptions.retrieve(subId);
    const fine = sub.items.data[0].current_period_end;
    await stripe.testHelpers.testClocks.advance(clockId, { frozen_time: fine + 86_400 });
    // Stripe elabora il salto in modo asincrono: l'attesa è generosa di proposito.
    const scade = Date.now() + 300_000;
    for (;;) {
      const c = await stripe.testHelpers.testClocks.retrieve(clockId);
      if (c.status === "ready") break;
      if (c.status === "internal_failure") throw new Error("l'orologio di prova è fallito");
      if (Date.now() > scade) throw new Error(`l'orologio è ancora «${c.status}» dopo 5 minuti`);
      await new Promise((r) => setTimeout(r, 5_000));
    }
  });

  await prova("il prezzo non è cambiato, e la riga è la stessa", async () => {
    const sub = await stripe.subscriptions.retrieve(subId);
    const riga = sub.items.data[0];
    if (riga.price.lookup_key !== prezzo.lookup) throw new Error(`ora punta a ${riga.price.lookup_key}`);
    if (!["active", "trialing"].includes(sub.status)) throw new Error(`stato Stripe ${sub.status}`);
    if (sub.schedule) throw new Error("è comparso uno Schedule");
  });

  await prova("la fattura del rinnovo è pagata: stesso imponibile, IVA sopra", async () => {
    const fatture = await stripe.invoices.list({ subscription: subId, limit: 5 });
    const pagate = fatture.data.filter((f) => f.status === "paid");
    if (pagate.length < 2) {
      throw new Error(`fatture pagate: ${pagate.length} (${fatture.data.map((f) => f.status).join(", ")})`);
    }
    const rinnovo = pagate[0];
    if (rinnovo.billing_reason !== "subscription_cycle") throw new Error(`motivo ${rinnovo.billing_reason}`);
    if (rinnovo.subtotal !== prezzo.importo) {
      throw new Error(`imponibile ${euro(rinnovo.subtotal)}, atteso ${euro(prezzo.importo)}`);
    }
    const iva = rinnovo.total - rinnovo.subtotal;
    if (Math.abs(iva - prezzo.importo * 0.22) > 2) throw new Error(`IVA ${euro(iva)}`);
    if (rinnovo.amount_paid !== rinnovo.total) throw new Error(`pagato ${euro(rinnovo.amount_paid)} su ${euro(rinnovo.total)}`);
    console.log(`       rinnovo: ${euro(rinnovo.subtotal)} + IVA ${euro(iva)} = ${euro(rinnovo.total)}`);
  });

  await prova("dopo il rinnovo l'account resta attivo, e la scadenza si è spostata", async () => {
    const [prima] = await sql`select current_period_end from org_entitlement where organization_id=${orgId}`;
    await consegna("customer.subscription.updated", await stripe.subscriptions.retrieve(subId));
    const [e] = await sql`select status, piano, periodo, current_period_end from org_entitlement
                          where organization_id=${orgId}`;
    if (e.status !== "active") throw new Error(`l'account è finito in «${e.status}» dopo il rinnovo`);
    if (e.piano !== piano.key) throw new Error(`il piano è diventato «${e.piano}»`);
    if (e.periodo !== periodo) throw new Error(`il periodo è diventato «${e.periodo}»`);
    if (!e.current_period_end || e.current_period_end.getTime() <= prima.current_period_end.getTime()) {
      throw new Error("la data di rinnovo non è stata spostata in avanti");
    }
  });
} finally {
  // L'orologio si porta via clienti, abbonamenti e fatture creati sopra.
  try {
    if (clockId) await stripe.testHelpers.testClocks.del(clockId);
  } catch (e) {
    console.log("  (orologio non rimosso:", String(e.message).slice(0, 80) + ")");
  }
  await sql`delete from audit_log where organization_id=${orgId}`;
  await sql`delete from stripe_subscription where organization_id=${orgId}`;
  await sql`delete from stripe_customer where organization_id=${orgId}`;
  await sql`delete from org_entitlement where organization_id=${orgId}`;
  await sql`delete from member where organization_id=${orgId}`;
  await sql`delete from organization where id=${orgId}`;
  await sql`delete from "user" where id=${userId}`;
  await sql.end();
}

console.log(`\nRinnovo ${periodo}: ${ok} ok, ${falliti.length} falliti`);
if (falliti.length) {
  console.log("\nDA GUARDARE:");
  for (const f of falliti) console.log(`  · ${f.nome}\n      ${f.motivo}`);
}
process.exit(falliti.length ? 1 : 0);
