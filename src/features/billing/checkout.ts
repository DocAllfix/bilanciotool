import { db } from "@/lib/db";
import { stripeCustomer, organization } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { stripe, idPrezzo } from "@/lib/stripe/client";
import { PIANI, prezzoDiVendita, type PianoKey } from "@/lib/prezzi";
import { env } from "@/lib/env";
import { logAudit } from "@/lib/audit";
import { withTenant } from "@/lib/db/tenant";

// Il checkout: si apre una sessione ospitata da Stripe e si manda lì il cliente.
//
// La pagina di pagamento è di Stripe e non nostra: i dati della carta non toccano mai
// il nostro server, e non c'è niente da mettere in sicurezza che non sia già in
// sicurezza. In cambio si rinuncia a controllarne l'aspetto, che per quattro campi è
// un buon affare.
//
// ⚠️ Qui NON si attiva nessun abbonamento. L'account si sblocca solo quando Stripe ci
// dice che il pagamento è avvenuto, dal webhook. Sbloccare al ritorno dal browser
// significherebbe fidarsi di chi sta pagando: basta chiudere la pagina di Stripe e
// tornare a mano sull'indirizzo di successo.

/** Il cliente Stripe dello STUDIO, non della persona: l'abbonamento è dell'organizzazione. */
async function clienteDelloStudio(orgId: string, email: string): Promise<string> {
  const esistente = await db
    .select({ id: stripeCustomer.stripeCustomerId })
    .from(stripeCustomer)
    .where(eq(stripeCustomer.organizationId, orgId))
    .limit(1);
  if (esistente[0]) return esistente[0].id;

  const [org] = await db
    .select({ nome: organization.name })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  const cliente = await stripe().customers.create({
    email,
    name: org?.nome ?? undefined,
    // L'organizzazione viaggia nei metadata: il webhook arriva senza sessione e senza
    // contesto, e questo è l'unico filo che riporta un pagamento al suo studio.
    metadata: { organizationId: orgId },
  });

  await db
    .insert(stripeCustomer)
    .values({ organizationId: orgId, stripeCustomerId: cliente.id })
    .onConflictDoNothing();
  return cliente.id;
}

export type EsitoCheckout = { url: string };

export async function creaSessioneCheckout(opts: {
  userId: string;
  orgId: string;
  email: string;
  piano: PianoKey;
  /** Estensioni acquistate insieme al piano, come quantità. */
  aziendeExtra?: number;
  accessiExtra?: number;
  whiteLabel?: boolean;
}): Promise<EsitoCheckout> {
  const piano = PIANI[opts.piano];
  if (piano.trattativa) throw new Error("Il piano Enterprise si concorda, non si acquista online.");

  const prezzo = prezzoDiVendita(piano, "anno1");
  if (!prezzo) throw new Error("Piano senza prezzo acquistabile.");

  const base = (env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const cliente = await clienteDelloStudio(opts.orgId, opts.email);

  const righe: { price: string; quantity: number }[] = [
    { price: await idPrezzo(prezzo.lookup), quantity: 1 },
  ];
  // Le estensioni entrano nella stessa sessione: un solo pagamento, un solo abbonamento.
  const { ESTENSIONI, prezzoEstensione } = await import("@/lib/prezzi");
  if (opts.aziendeExtra) {
    righe.push({
      price: await idPrezzo(prezzoEstensione(ESTENSIONI.bloccoAziende).lookup),
      quantity: Math.ceil(opts.aziendeExtra / ESTENSIONI.bloccoAziende.aziende),
    });
  }
  if (opts.accessiExtra) {
    righe.push({ price: await idPrezzo(prezzoEstensione(ESTENSIONI.accesso).lookup), quantity: opts.accessiExtra });
  }
  if (opts.whiteLabel) {
    righe.push({ price: await idPrezzo(prezzoEstensione(ESTENSIONI.whiteLabel).lookup), quantity: 1 });
  }

  const sessione = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: cliente,
    line_items: righe,
    locale: "it",
    // Il filo che riporta il pagamento allo studio, in due punti: la sessione e
    // l'abbonamento. Il webhook di rinnovo, fra un anno, vedrà solo il secondo.
    client_reference_id: opts.orgId,
    subscription_data: {
      metadata: { organizationId: opts.orgId, piano: opts.piano },
    },
    metadata: { organizationId: opts.orgId, piano: opts.piano },
    // Dati fiscali italiani raccolti ADESSO, non dopo. Senza partita IVA e codice
    // destinatario non si emette una fattura elettronica, e rincorrere un cliente che
    // ha già pagato per farsi dare un dato è il modo peggiore di iniziare un rapporto.
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    // Il campo per il codice sconto. Serve a due cose, e la seconda vale più della prima:
    //  · vendere — una promozione si fa creando un codice su Stripe, senza toccare il
    //    codice e senza aspettare una distribuzione;
    //  · **collaudare l'incasso vero senza spendere una cifra vera**: un codice al 99%
    //    fa pagare quindici euro invece di millecinquecento, passando dagli STESSI
    //    prezzi, dallo stesso webhook e dallo stesso Schedule a due fasi. Un prodotto
    //    finto da dieci euro proverebbe un prezzo che non vendiamo, e per essere
    //    riconosciuto come piano richiederebbe di alterare il listino.
    // L'importo scontato si vede sulla pagina di Stripe PRIMA di pagare: se il codice
    // non attecchisse, si vedrebbe il prezzo pieno e non si andrebbe avanti.
    allow_promotion_codes: true,
    // Obbligatorio quando il cliente Stripe esiste già: senza, Stripe rifiuta la
    // sessione perché non saprebbe dove scrivere la ragione sociale e l'indirizzo che
    // sta per chiedere. Sono anche i dati che serviranno alla fattura elettronica,
    // quindi vogliamo proprio che finiscano sul cliente e non solo sulla sessione.
    customer_update: { name: "auto", address: "auto" },
    custom_fields: [
      {
        key: "sdi",
        label: { type: "custom", custom: "Codice destinatario o PEC" },
        type: "text",
        optional: false,
        text: { minimum_length: 6, maximum_length: 60 },
      },
    ],
    // `session_id` serve alla pagina di rientro per raccontare cosa è stato comprato.
    // Non serve — e non basterebbe — ad attivare l'abbonamento: quello lo fa il webhook.
    success_url: `${base}/impostazioni/abbonamento/benvenuto?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/impostazioni/abbonamento?annullato=1`,
  });

  await withTenant({ userId: opts.userId, orgId: opts.orgId }, (tx) =>
    logAudit(tx, {
      organizationId: opts.orgId,
      userId: opts.userId,
      azione: "billing.checkout.apri",
      entita: "organization",
      entitaId: opts.orgId,
      dettagli: { piano: opts.piano, importo: prezzo.importo, lookup: prezzo.lookup },
    }),
  );

  if (!sessione.url) throw new Error("Stripe non ha restituito un indirizzo di pagamento.");
  return { url: sessione.url };
}
