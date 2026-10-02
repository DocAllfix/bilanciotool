import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { inviaNotificaVendita } from "@/lib/email";
import { euro } from "@/lib/calc/compensi/importi";
import { giornoItaliano, oraItaliana } from "@/lib/calc/comune/tempo-italia";

// La mail di vendita al committente: una per ogni fattura PAGATA, con importi e dati
// fiscali, perché da lì si emette la fattura elettronica (Stripe non parla con lo SdI).
//
// ⚠️ PERCHÉ ESISTE (2 ottobre 2026). Alla cassa chiediamo il codice destinatario, e il
// codice restava dentro la singola sessione di pagamento: il webhook non lo leggeva, non
// finiva sul cliente Stripe né nel nostro database, e la notifica di Stripe al venditore
// non lo riporta. Per trovarlo bisognava aprire quel pagamento nel pannello; al rinnovo,
// un anno dopo, non c'era più da nessuna parte.
//
// ⚠️ UNA FATTURA PAGATA, NON UN CHECKOUT. Sono abbonamenti annuali: il primo acquisto e
// ogni rinnovo producono una fattura pagata, e ciascuna va fatturata allo SdI. Il rinnovo
// non passa dalla cassa, quindi agganciarsi alla sessione di checkout avrebbe perso tutti i
// rinnovi. Importi e dati del cliente si leggono dalla FATTURA, riletta da Stripe con la
// versione delle API dell'SDK (`parent.subscription_details`, non il vecchio campo
// `subscription`): il contenuto dell'evento dipende dalla versione dell'endpoint e non si
// usa. Codice destinatario e codice fiscale si leggono dalla sessione di checkout che ha
// creato l'abbonamento — che resta su Stripe e si ritrova anche al rinnovo — salvo che sul
// cliente Stripe sia stata scritta a mano una correzione (`metadata.sdi`,
// `metadata.codice_fiscale`), che vince.
//
// ⚠️ TRE CANCELLI, e servono tutti e tre perché il committente non deve ricevere mail che
// non siano vendite vere e nuove:
//   1. `VENDITE_NOTIFICHE_A` esiste SOLO in produzione su Vercel: in sviluppo, nei test e
//      nelle anteprime non c'è un destinatario, quindi non parte niente;
//   2. solo fatture `livemode`: i collaudi pagano con le chiavi di prova;
//   3. solo fatture pagate dal momento del rilascio in avanti (`NOTIFICHE_VENDITA_DAL`):
//      un evento vecchio ritentato da Stripe, o rimandato a mano dal pannello, non arriva
//      come una vendita nuova. Deciso col committente: «solo dai prossimi acquisti».
// Più un quarto, di buon senso: una fattura a zero (coupon al 100%) non è una vendita.
//
// ⚠️ È BEST-EFFORT, e sta DOPO che l'evento è segnato completato (vedi la rotta): una mail
// che non parte non deve far fallire l'attivazione di chi ha pagato, e una mail mandata
// prima di segnare completato verrebbe rimandata a ogni ritentativo di Stripe.

/** Il momento del rilascio: le fatture pagate prima non generano mail. */
// Le 09:45 italiane del 2 ottobre 2026, prima del rilascio: ogni fattura pagata da qui in
// avanti è una vendita nuova; quelle di prima — anche se Stripe le ritentasse, o qualcuno
// le rimandasse dal pannello — non generano mail.
export const NOTIFICHE_VENDITA_DAL = new Date("2026-10-02T07:45:00Z");

export type Decisione = { manda: true } | { manda: false; perche: string };

export function deveNotificare(
  f: { livemode: boolean; pagataIl: number | null; importoPagato: number },
  dal: Date = NOTIFICHE_VENDITA_DAL,
): Decisione {
  if (!f.livemode) return { manda: false, perche: "fattura di prova" };
  if (f.pagataIl === null) return { manda: false, perche: "fattura senza data di pagamento" };
  if (f.pagataIl * 1000 < dal.getTime()) return { manda: false, perche: "pagata prima dell'attivazione delle notifiche" };
  if (f.importoPagato <= 0) return { manda: false, perche: "fattura a zero" };
  return { manda: true };
}

export type Vendita = {
  tipo: string;
  numero: string | null;
  pagataIl: string;
  righe: { descrizione: string; importo: string }[];
  /** `null` quando Stripe non ha calcolato imposte: «0,00» si leggerebbe come vendita esente. */
  imponibile: string | null;
  iva: string | null;
  totale: string;
  ragioneSociale: string | null;
  email: string | null;
  indirizzo: string | null;
  partitaIva: string | null;
  codiceFiscale: string | null;
  sdi: string | null;
  urlFattura: string | null;
  urlPannello: string;
};

const TIPI: Record<string, string> = {
  subscription_create: "Primo acquisto",
  subscription_cycle: "Rinnovo annuale",
  subscription_update: "Modifica dell'abbonamento",
};

function testo(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

function indirizzoDi(a: Stripe.Address | null | undefined): string | null {
  if (!a) return null;
  const cittaRiga = [a.postal_code, a.city, a.state ? `(${a.state})` : null].filter(Boolean).join(" ");
  return testo([a.line1, a.line2, cittaRiga, a.country].filter(Boolean).join(", "));
}

function campo(sessione: Stripe.Checkout.Session | null, chiave: string): string | null {
  const c = sessione?.custom_fields?.find((x) => x.key === chiave);
  return testo(c?.text?.value);
}

/**
 * Giorno e ora ITALIANI, scritti a mano: niente `toLocale*`, che dipende dall'ICU del
 * runtime, e niente fuso del processo, che su Vercel è UTC. Un pagamento fatto alle 23:30
 * italiane d'estate starebbe, in UTC, ancora nel giorno prima — e il giorno è proprio ciò
 * che serve alla fattura.
 */
function dataItaliana(secondi: number): string {
  const istante = new Date(secondi * 1000);
  const [a, m, g] = giornoItaliano(istante).split("-");
  return `${g}/${m}/${a} alle ${oraItaliana(istante)}`;
}

export function componiVendita(
  fattura: Stripe.Invoice,
  sessione: Stripe.Checkout.Session | null,
  correzioni: Record<string, string> | null,
): Vendita {
  const eur = (c: number) => `${euro(c)} €`;
  // ⚠️ Se Stripe non ha calcolato imposte non si scrive «IVA 0,00 €»: chi fattura lo
  // leggerebbe come una vendita esente. Il listino dichiara i prezzi IVA esclusa, e
  // l'IVA va trattata da chi emette la fattura — la mail lo dice invece di inventarla.
  const tasse = fattura.total_taxes ?? [];
  const iva = tasse.length ? tasse.reduce((s, t) => s + t.amount, 0) : null;
  const imponibile = iva === null ? null : (fattura.total_excluding_tax ?? fattura.total - iva);

  const piva =
    (fattura.customer_tax_ids ?? []).map((t) => t.value).filter(Boolean).join(", ") ||
    (sessione?.customer_details?.tax_ids ?? []).map((t) => t.value).filter(Boolean).join(", ") ||
    null;

  return {
    tipo: TIPI[fattura.billing_reason ?? ""] ?? "Pagamento",
    numero: fattura.number,
    pagataIl: dataItaliana(fattura.status_transitions.paid_at ?? fattura.created),
    righe: fattura.lines.data.map((r) => ({ descrizione: r.description ?? "—", importo: eur(r.amount) })),
    imponibile: imponibile === null ? null : eur(imponibile),
    iva: iva === null ? null : eur(iva),
    totale: eur(fattura.total),
    ragioneSociale: testo(fattura.customer_name) ?? testo(sessione?.customer_details?.name),
    email: testo(fattura.customer_email) ?? testo(sessione?.customer_details?.email),
    indirizzo: indirizzoDi(fattura.customer_address) ?? indirizzoDi(sessione?.customer_details?.address),
    partitaIva: piva,
    codiceFiscale: testo(correzioni?.codice_fiscale) ?? campo(sessione, "codicefiscale"),
    sdi: testo(correzioni?.sdi) ?? campo(sessione, "sdi"),
    urlFattura: fattura.hosted_invoice_url ?? null,
    urlPannello: `https://dashboard.stripe.com/invoices/${fattura.id}`,
  };
}

/**
 * Manda la mail di vendita per una fattura pagata, se tutti i cancelli lo permettono.
 * Non solleva mai: restituisce che cosa è successo, e la rotta lo scrive nei log.
 */
export async function notificaVendita(evento: Stripe.Event): Promise<string> {
  if (evento.type !== "invoice.paid") return "non è una fattura pagata";
  const destinatario = process.env.VENDITE_NOTIFICHE_A?.trim();
  if (!destinatario) return "nessun destinatario configurato";

  const idFattura = (evento.data.object as { id?: string }).id;
  if (!idFattura) return "evento senza fattura";

  try {
    const fattura = await stripe().invoices.retrieve(idFattura);
    const decisione = deveNotificare({
      livemode: fattura.livemode,
      pagataIl: fattura.status_transitions.paid_at ?? null,
      importoPagato: fattura.amount_paid,
    });
    if (!decisione.manda) return decisione.perche;

    const sub = fattura.parent?.subscription_details?.subscription;
    const subId = typeof sub === "string" ? sub : (sub?.id ?? null);
    const sessione = subId
      ? ((await stripe().checkout.sessions.list({ subscription: subId, limit: 1 })).data[0] ?? null)
      : null;

    const idCliente = typeof fattura.customer === "string" ? fattura.customer : (fattura.customer?.id ?? null);
    const cliente = idCliente ? await stripe().customers.retrieve(idCliente) : null;
    const correzioni = cliente && !cliente.deleted ? (cliente.metadata ?? null) : null;

    const { sent } = await inviaNotificaVendita(destinatario, componiVendita(fattura, sessione, correzioni));
    return sent ? "mail di vendita inviata" : "mail di vendita NON inviata";
  } catch (e) {
    console.error("[billing] mail di vendita fallita per", idFattura, e);
    return "mail di vendita fallita";
  }
}
