// Il secondo anno, visto davvero.
//
//   node scripts/verifica-rinnovo.mjs            (chiavi di PROVA, obbligatorio)
//
// È l'unico comportamento del pagamento che nessuno ha mai osservato accadere, e non è
// un dettaglio: è il rinnovo, cioè il modello di ricavo dal secondo anno in poi. Fino a
// oggi sapevamo che lo Schedule a due fasi *si crea* con i valori giusti; che cosa
// succeda quando la prima fase finisce era una deduzione.
//
// Si usa un OROLOGIO DI PROVA di Stripe (`test_clock`): si crea l'abbonamento, si sposta
// il tempo di un anno e un giorno, e si guarda cosa resta. Nessun'attesa di dodici mesi
// e nessuna simulazione fatta da noi: è Stripe a far scattare il rinnovo.
//
// Le tre cose che devono succedere, e ognuna può rompersi da sola:
//   1. il piano passa al prezzo di RINNOVO, non resta a quello del primo anno;
//   2. le estensioni si portano dietro il proprio prezzo (era il difetto della fase 2,
//      corretto ad agosto: sparivano al primo rinnovo, in silenzio);
//   3. `subscription_schedule.released` NON deve disattivare l'account. Con
//      `end_behavior: "release"` lo Schedule si stacca a fasi esaurite e l'abbonamento
//      continua da solo: è il comportamento voluto, e un webhook che lo leggesse come
//      una disdetta spegnerebbe il servizio a un cliente che ha appena pagato.

import postgres from "postgres";
import Stripe from "stripe";
import { randomUUID, createHmac } from "node:crypto";
import "dotenv/config";
import { PIANI, ESTENSIONI, euro, prezzoDiVendita, prezzoEstensione } from "../src/lib/prezzi.ts";

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

const RUN = Date.now();
const orgId = `org-rinnovo-${RUN}`;
const userId = `user-rinnovo-${RUN}`;

const BLOCCHI = 2;
const ACCESSI = 3;

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
 *  L'evento è VERO, riletto da Stripe: si rifà solo la firma. */
async function consegna(tipo, oggetto) {
  const segreto = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segreto) throw new Error("STRIPE_WEBHOOK_SECRET assente: non posso firmare l'evento");
  const corpo = JSON.stringify({
    id: `evt_${randomUUID()}`,
    object: "event",
    type: tipo,
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

const piano = PIANI.studio;
const pAnno1 = prezzoDiVendita(piano, "anno1");
const pRinnovo = prezzoDiVendita(piano, "rinnovo");
const pBlocco = prezzoEstensione(ESTENSIONI.bloccoAziende);
const pAccesso = prezzoEstensione(ESTENSIONI.accesso);
const estensioni = BLOCCHI * pBlocco.importo + ACCESSI * pAccesso.importo;
const ATTESO_RINNOVO = pRinnovo.importo + estensioni;

const idDi = async (lookup) => {
  const l = await stripe.prices.list({ lookup_keys: [lookup], limit: 1, active: true });
  if (!l.data[0]) throw new Error(`prezzo «${lookup}» assente su Stripe`);
  return l.data[0].id;
};

console.log(`\n  atteso al rinnovo: ${euro(ATTESO_RINNOVO)}`);
console.log(`  (piano ${euro(pRinnovo.importo)} + ${BLOCCHI} blocchi + ${ACCESSI} accessi)\n`);

let clockId = null;
let subId = null;

try {
  // ─── lo studio ─────────────────────────────────────────────────────────────
  await sql`insert into "user" (id, name, email, email_verified, created_at, updated_at)
            values (${userId}, 'Titolare Rinnovo', ${`rinnovo-${RUN}@example.com`}, true, now(), now())`;
  await sql`insert into organization (id, name, slug, created_at)
            values (${orgId}, 'Studio Rinnovo', ${`rinnovo-${RUN}`}, now())`;
  await sql`insert into member (id, organization_id, user_id, role, created_at)
            values (${randomUUID()}, ${orgId}, ${userId}, 'owner', now())`;
  await sql`insert into org_entitlement (organization_id, status) values (${orgId}, 'demo')`;

  console.log("— primo anno —");

  await prova("si crea l'abbonamento su un orologio di prova", async () => {
    const clock = await stripe.testHelpers.testClocks.create({
      frozen_time: Math.floor(Date.now() / 1000),
      name: `rinnovo-${RUN}`,
    });
    clockId = clock.id;

    const cliente = await stripe.customers.create({
      email: `rinnovo-${RUN}@example.com`,
      name: "Studio Rinnovo",
      test_clock: clockId,
      metadata: { organizationId: orgId },
    });
    // Un metodo di pagamento serve davvero: senza, la fattura del rinnovo non si paga e
    // l'abbonamento finisce in `past_due` — si misurerebbe l'assenza della carta, non il
    // comportamento dello Schedule.
    const pm = await stripe.paymentMethods.create({ type: "card", card: { token: "tok_visa" } });
    await stripe.paymentMethods.attach(pm.id, { customer: cliente.id });
    await stripe.customers.update(cliente.id, { invoice_settings: { default_payment_method: pm.id } });

    // La chiave di `stripe_customer` e' l'organizzazione: una sola riga per studio, senza
    // identificativo proprio.
    await sql`insert into stripe_customer (organization_id, stripe_customer_id, created_at)
              values (${orgId}, ${cliente.id}, now())`;

    const sub = await stripe.subscriptions.create({
      customer: cliente.id,
      items: [
        { price: await idDi(pAnno1.lookup), quantity: 1 },
        { price: await idDi(pBlocco.lookup), quantity: BLOCCHI },
        { price: await idDi(pAccesso.lookup), quantity: ACCESSI },
      ],
      metadata: { organizationId: orgId, piano: "studio" },
    });
    subId = sub.id;

    // È il webhook a fare tutto: attivazione e Schedule a due fasi. In locale Stripe non
    // ci arriva, quindi l'evento glielo si porta a mano.
    const completo = await stripe.subscriptions.retrieve(subId);
    await consegna("customer.subscription.created", completo);
  });

  await prova("l'account è attivo, col piano e le estensioni comprate", async () => {
    const [e] = await sql`select status, piano, aziende_extra, accessi_extra from org_entitlement
                          where organization_id=${orgId}`;
    if (e.status !== "active") throw new Error(`stato ${e.status}`);
    if (e.piano !== "studio") throw new Error(`piano ${e.piano}`);
    const azienderAttese = BLOCCHI * ESTENSIONI.bloccoAziende.aziende;
    if (e.aziende_extra !== azienderAttese) throw new Error(`aziende extra ${e.aziende_extra}`);
    if (e.accessi_extra !== ACCESSI) throw new Error(`accessi extra ${e.accessi_extra}`);
  });

  await prova("lo Schedule ha due fasi, e la seconda porta il rinnovo PIÙ le estensioni", async () => {
    const sub = await stripe.subscriptions.retrieve(subId);
    if (!sub.schedule) throw new Error("nessuno Schedule creato");
    const sch = await stripe.subscriptionSchedules.retrieve(
      typeof sub.schedule === "string" ? sub.schedule : sub.schedule.id,
    );
    if (sch.phases.length !== 2) throw new Error(`fasi: ${sch.phases.length}`);
    if (sch.end_behavior !== "release") throw new Error(`end_behavior ${sch.end_behavior}`);

    let totale = 0;
    for (const voce of sch.phases[1].items) {
      const p = await stripe.prices.retrieve(typeof voce.price === "string" ? voce.price : voce.price.id);
      totale += p.unit_amount * (voce.quantity ?? 1);
    }
    if (totale !== ATTESO_RINNOVO) {
      throw new Error(`la fase 2 vale ${euro(totale)}, atteso ${euro(ATTESO_RINNOVO)}`);
    }
  });

  // ─── un anno dopo ──────────────────────────────────────────────────────────
  console.log("\n— si sposta l'orologio di un anno —");

  await prova("l'orologio avanza oltre la fine del primo anno", async () => {
    const sub = await stripe.subscriptions.retrieve(subId);
    const fine = sub.items.data[0].current_period_end;
    await stripe.testHelpers.testClocks.advance(clockId, { frozen_time: fine + 86_400 });

    // Stripe elabora il salto in modo asincrono: si aspetta che l'orologio torni pronto.
    // È l'unico punto lento del collaudo, e l'attesa è generosa di proposito.
    const scade = Date.now() + 300_000;
    for (;;) {
      const c = await stripe.testHelpers.testClocks.retrieve(clockId);
      if (c.status === "ready") break;
      if (c.status === "internal_failure") throw new Error("l'orologio di prova è fallito");
      if (Date.now() > scade) throw new Error(`l'orologio è ancora «${c.status}» dopo 5 minuti`);
      await new Promise((r) => setTimeout(r, 5_000));
    }
  });

  await prova("l'abbonamento è passato al prezzo di RINNOVO, estensioni comprese", async () => {
    const sub = await stripe.subscriptions.retrieve(subId);
    let totale = 0;
    const chiavi = [];
    for (const voce of sub.items.data) {
      const p = await stripe.prices.retrieve(voce.price.id);
      totale += p.unit_amount * (voce.quantity ?? 1);
      chiavi.push(`${p.lookup_key}×${voce.quantity ?? 1}`);
    }
    if (totale !== ATTESO_RINNOVO) {
      throw new Error(`ora vale ${euro(totale)}, atteso ${euro(ATTESO_RINNOVO)} — ${chiavi.join(" + ")}`);
    }
    if (!chiavi.some((c) => /rinnovo/.test(c))) throw new Error(`nessuna riga di rinnovo: ${chiavi.join(" + ")}`);
  });

  await prova("lo Schedule si è staccato, e l'abbonamento continua da solo", async () => {
    // `end_behavior: "release"`: a fasi esaurite lo Schedule lascia l'abbonamento vivo.
    // È il comportamento voluto, e il motivo per cui `subscription_schedule.released`
    // NON è una disdetta.
    const sub = await stripe.subscriptions.retrieve(subId);
    if (!["active", "trialing"].includes(sub.status)) throw new Error(`stato Stripe ${sub.status}`);
  });

  await prova("dopo il rinnovo l'account resta attivo, col piano e le estensioni", async () => {
    // Gli eventi che Stripe avrebbe mandato, consegnati a mano perché il collaudo gira
    // in locale. Anche quello che il nostro webhook ignora: se lo leggesse come una
    // disdetta, spegnerebbe un cliente che ha appena pagato.
    const sub = await stripe.subscriptions.retrieve(subId);
    await consegna("customer.subscription.updated", sub);
    if (sub.schedule) {
      const sch = await stripe.subscriptionSchedules.retrieve(
        typeof sub.schedule === "string" ? sub.schedule : sub.schedule.id,
      );
      await consegna("subscription_schedule.released", sch);
    }

    const [e] = await sql`select status, piano, aziende_extra, accessi_extra, current_period_end
                          from org_entitlement where organization_id=${orgId}`;
    if (e.status !== "active") throw new Error(`l'account è finito in «${e.status}» dopo il rinnovo`);
    if (e.piano !== "studio") throw new Error(`il piano è diventato «${e.piano}»`);
    if (e.accessi_extra !== ACCESSI) throw new Error(`gli accessi extra sono ${e.accessi_extra}`);
    if (e.aziende_extra !== BLOCCHI * ESTENSIONI.bloccoAziende.aziende) {
      throw new Error(`le aziende extra sono ${e.aziende_extra}`);
    }
    if (!e.current_period_end || e.current_period_end.getTime() < Date.now()) {
      throw new Error("la data di rinnovo non è stata spostata in avanti");
    }
  });

  await prova("la fattura del secondo anno è stata pagata", async () => {
    const fatture = await stripe.invoices.list({ subscription: subId, limit: 5 });
    const pagate = fatture.data.filter((f) => f.status === "paid");
    if (pagate.length < 2) {
      throw new Error(`fatture pagate: ${pagate.length} (${fatture.data.map((f) => f.status).join(", ")})`);
    }
    const seconda = pagate[0];
    if (seconda.amount_paid !== ATTESO_RINNOVO) {
      throw new Error(`la seconda fattura è di ${euro(seconda.amount_paid)}, atteso ${euro(ATTESO_RINNOVO)}`);
    }
  });
} finally {
  // Pulizia: l'orologio si porta via clienti, abbonamenti e fatture creati sopra.
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

console.log(`\nRinnovo: ${ok} ok, ${falliti.length} falliti`);
if (falliti.length) {
  console.log("\nDA GUARDARE:");
  for (const f of falliti) console.log(`  · ${f.nome}\n      ${f.motivo}`);
}
process.exit(falliti.length ? 1 : 0);
