import { db } from "@/lib/db";
import { stripeCustomer, organization } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { stripe, idPrezzo } from "@/lib/stripe/client";
import { PIANI, prezzoDiVendita, type PianoKey } from "@/lib/prezzi";
import { env } from "@/lib/env";
import { logAudit } from "@/lib/audit";
import { withTenant } from "@/lib/db/tenant";
import { indirizzoCorrente } from "@/lib/indirizzo";

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

/**
 * Il cliente Stripe dello STUDIO, non della persona: l'abbonamento è dell'organizzazione.
 *
 * Le due operazioni su `stripe_customer` girano dentro `withTenant`, e non è una
 * formalità: quella tabella ha una policy RLS, e la policy legge `app.org_id` — che
 * esiste solo dentro la transazione di `withTenant`. Con la connessione grezza funziona
 * finché la connessione è privilegiata, e il giorno in cui diventa `app_rls` l'inserimento
 * viene rifiutato: «new row violates row-level security policy». Cioè **nessuno riesce
 * più a pagare**. Provato dal vivo, non dedotto.
 */
async function clienteDelloStudio(orgId: string, email: string): Promise<string> {
  const esistente = await withTenant({ orgId }, (tx) =>
    tx
      .select({ id: stripeCustomer.stripeCustomerId })
      .from(stripeCustomer)
      .where(eq(stripeCustomer.organizationId, orgId))
      .limit(1),
  );
  if (esistente[0]) return esistente[0].id;

  // `organization` è una tabella di Better Auth senza policy: resta sulla connessione
  // normale, come tutto il resto del suo mondo.
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

  // ⚠️ Si restituisce il cliente REGISTRATO, non quello appena creato.
  //
  // Fra la lettura qui sopra e questo inserimento non c'e' nessun lucchetto: due richieste
  // concorrenti leggono entrambe «non c'e'» e creano entrambe un cliente su Stripe. Il
  // vincolo di unicita' sulla tabella (PK su `organization_id`) fa vincere una sola riga —
  // ma protegge il DATABASE, non Stripe, dove i clienti restano due.
  //
  // Prima qui c'era `return cliente.id`, cioe' il cliente appena creato: il perdente della
  // corsa apriva la sessione di pagamento su un cliente che il nostro database non
  // conosce. L'attivazione reggeva (il webhook segue `metadata.organizationId`), ma il
  // portale apre le fatture sul cliente REGISTRATO: chi aveva appena pagato non trovava
  // le proprie ricevute.
  //
  // `onConflictDoNothing().returning()` torna vuoto quando ha perso: in quel caso si
  // rilegge la riga vincente e si usa quella. Il cliente creato di troppo resta su Stripe
  // senza abbonamenti — inerte, e visibile nel cruscotto.
  const inserito = await withTenant({ orgId }, (tx) =>
    tx
      .insert(stripeCustomer)
      .values({ organizationId: orgId, stripeCustomerId: cliente.id })
      .onConflictDoNothing()
      .returning({ id: stripeCustomer.stripeCustomerId }),
  );
  if (inserito[0]) return inserito[0].id;

  const vincente = await withTenant({ orgId }, (tx) =>
    tx
      .select({ id: stripeCustomer.stripeCustomerId })
      .from(stripeCustomer)
      .where(eq(stripeCustomer.organizationId, orgId))
      .limit(1),
  );
  if (!vincente[0]) throw new Error("Cliente di fatturazione non registrato: riprova fra poco.");
  console.error("[billing] corsa sul cliente Stripe per", orgId, "- creato di troppo:", cliente.id);
  return vincente[0].id;
}

export type EsitoCheckout = { url: string };

export async function creaSessioneCheckout(opts: {
  userId: string;
  orgId: string;
  email: string;
  piano: PianoKey;
  /** Estensioni acquistate insieme al piano, come quantità. */
  aziendeExtra?: number;
}): Promise<EsitoCheckout> {
  const piano = PIANI[opts.piano];
  if (piano.trattativa) throw new Error("Il piano Enterprise si concorda, non si acquista online.");

  const prezzo = prezzoDiVendita(piano, "anno1");
  if (!prezzo) throw new Error("Piano senza prezzo acquistabile.");

  const base = indirizzoCorrente().replace(/\/+$/, "");
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
  // ⚠️ Accessi e marchio non si vendono piu': gli accessi sono inclusi in ogni fascia e il
  // marchio dello studio pure. Le loro chiavi Stripe restano riconosciute in
  // `ESTENSIONI_RITIRATE`, ma nessuna sessione nuova puo' piu' crearle.

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
