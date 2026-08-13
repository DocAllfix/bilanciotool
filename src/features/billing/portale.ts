import { db } from "@/lib/db";
import { stripeCustomer } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe/client";
import { env } from "@/lib/env";

// Il portale clienti di Stripe: fatture, ricevute e metodo di pagamento.
//
// ⚠️ **Il cambio piano è SPENTO, e non è una dimenticanza.** Ogni abbonamento porta uno
// Schedule a due fasi — primo anno al suo prezzo, poi rinnovo ridotto per sempre — e un
// cambio piano fatto dal portale riscrive le righe scavalcando lo Schedule. Il
// risultato non è prevedibile a occhio: può lasciare il cliente al prezzo del primo
// anno per sempre, o farlo saltare al rinnovo con dodici mesi di anticipo. Chi vuole
// cambiare piano ci scrive, e lo facciamo noi sapendo cosa stiamo toccando.
//
// **La disdetta è spenta per la stessa ragione**: la pagina dell'abbonamento dice che
// si disdice scrivendoci, e due strade diverse per la stessa cosa — una che avverte e
// una che esegue e basta — sono il modo di perdere un cliente che voleva solo capire
// quanto avrebbe pagato l'anno prossimo.
//
// Resta acceso l'aggiornamento dei dati fiscali: sono quelli che finiscono in fattura,
// e correggere una partita IVA sbagliata non deve richiedere un'email.

const NOME_CONFIGURAZIONE = "evalisdeck-portale-v1";

/**
 * La configurazione del portale, creata una volta e poi riusata.
 *
 * Si riconosce dai metadata e non dal nome, come per i prezzi: il nome è testo che si
 * cambia dal cruscotto, i metadata no. Senza questo, ogni apertura del portale ne
 * creerebbe una nuova, e fra un anno ce ne sarebbero centinaia — tutte diverse nel
 * momento in cui una regola cambia.
 */
async function configurazione(): Promise<string> {
  const esistenti = await stripe().billingPortal.configurations.list({ limit: 100, active: true });
  const gia = esistenti.data.find((c) => c.metadata?.chiave === NOME_CONFIGURAZIONE);
  if (gia) return gia.id;

  const creata = await stripe().billingPortal.configurations.create({
    metadata: { chiave: NOME_CONFIGURAZIONE },
    business_profile: {
      headline: "EvalisDeck — il tuo abbonamento",
      privacy_policy_url: `${base()}/privacy`,
      terms_of_service_url: `${base()}/termini`,
    },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      // La ragione sociale e la partita IVA finiscono nella fattura elettronica:
      // correggerle è la ragione principale per cui un cliente apre questa pagina.
      customer_update: { enabled: true, allowed_updates: ["name", "address", "tax_id", "email"] },
      subscription_update: { enabled: false },
      subscription_cancel: { enabled: false },
    },
  });
  return creata.id;
}

const base = () => (env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** L'indirizzo del portale per lo studio, o `null` se non ha mai pagato niente. */
export async function urlPortale(orgId: string): Promise<string | null> {
  const [cliente] = await db
    .select({ id: stripeCustomer.stripeCustomerId })
    .from(stripeCustomer)
    .where(eq(stripeCustomer.organizationId, orgId))
    .limit(1);
  // Nessun cliente Stripe: lo studio è stato attivato a mano, o non ha mai pagato.
  // Mandarlo su una pagina di Stripe che non lo conosce sarebbe un vicolo cieco.
  if (!cliente) return null;

  const sessione = await stripe().billingPortal.sessions.create({
    customer: cliente.id,
    configuration: await configurazione(),
    locale: "it",
    return_url: `${base()}/impostazioni/abbonamento`,
  });
  return sessione.url;
}
