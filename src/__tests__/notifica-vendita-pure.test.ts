import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import type Stripe from "stripe";

// La mail di vendita al committente (`features/billing/notifica-vendita.ts`).
//
// ⚠️ IL RISCHIO CHE QUESTO FILE ESISTE PER EVITARE è una mail che non doveva partire: il
// committente l'ha detto in chiaro, «niente mail di prova e niente vecchi pagamenti al mio
// indirizzo». Quindi si provano soprattutto i NO — prova, pagamento vecchio, importo zero,
// nessun destinatario — e il sì una volta sola, sul percorso intero.
//
// Niente parte davvero: Stripe è simulato e la chiamata a Resend è intercettata. Si guarda
// l'HTML che sarebbe partito, non una ricostruzione: due copie della stessa cosa sono sempre
// d'accordo.

vi.mock("@/lib/env", () => ({
  env: { RESEND_API_KEY: "re_finta", RESEND_FROM: "posta@evalisdeck.it", NODE_ENV: "test" },
}));

const stripeFinto = {
  invoices: { retrieve: vi.fn() },
  checkout: { sessions: { list: vi.fn() } },
  customers: { retrieve: vi.fn() },
};
vi.mock("@/lib/stripe/client", () => ({ stripe: () => stripeFinto }));

const spedite: { to: string; subject: string; html: string }[] = [];
beforeAll(() => {
  vi.stubGlobal("fetch", async (_u: string, init: { body: string }) => {
    spedite.push(JSON.parse(init.body));
    return { ok: true, status: 200, text: async () => "" } as unknown as Response;
  });
});

const { deveNotificare, componiVendita, notificaVendita, NOTIFICHE_VENDITA_DAL } = await import(
  "@/features/billing/notifica-vendita"
);

const DOPO = Math.floor(NOTIFICHE_VENDITA_DAL.getTime() / 1000) + 3600;
const PRIMA = Math.floor(NOTIFICHE_VENDITA_DAL.getTime() / 1000) - 3600;

function fattura(p: Partial<Stripe.Invoice> = {}): Stripe.Invoice {
  return {
    id: "in_1",
    livemode: true,
    number: "ABC-0001",
    billing_reason: "subscription_create",
    amount_paid: 42700,
    total: 42700,
    total_excluding_tax: 35000,
    total_taxes: [{ amount: 7700 }],
    created: DOPO,
    status_transitions: { paid_at: DOPO },
    customer: "cus_1",
    customer_name: "Studio Rossi S.r.l.",
    customer_email: "amministrazione@studiorossi.it",
    customer_address: { line1: "Via Roma 1", line2: null, postal_code: "81031", city: "Aversa", state: "CE", country: "IT" },
    customer_tax_ids: [{ type: "eu_vat", value: "IT01234567890" }],
    hosted_invoice_url: "https://invoice.stripe.com/i/abc",
    lines: { data: [{ description: "Un'azienda × 1", amount: 35000 }] },
    parent: { subscription_details: { subscription: "sub_1" } },
    ...p,
  } as unknown as Stripe.Invoice;
}

function sessione(campi: Record<string, string | null>): Stripe.Checkout.Session {
  return {
    custom_fields: Object.entries(campi).map(([key, value]) => ({ key, text: { value } })),
    customer_details: { name: "Dalla sessione", email: "s@x.it", address: null, tax_ids: [{ value: "IT99999999999" }] },
  } as unknown as Stripe.Checkout.Session;
}

describe("quando la mail parte, e soprattutto quando NO", () => {
  const vera = { livemode: true, pagataIl: DOPO, importoPagato: 42700 };

  it("parte per un pagamento vero, pagato dopo il rilascio, con un importo", () => {
    expect(deveNotificare(vera)).toEqual({ manda: true });
  });

  it("⚠️ NON parte per un pagamento di prova", () => {
    expect(deveNotificare({ ...vera, livemode: false }).manda).toBe(false);
  });

  it("⚠️ NON parte per un pagamento precedente al rilascio — i clienti già passati non sono vendite nuove", () => {
    expect(deveNotificare({ ...vera, pagataIl: PRIMA }).manda).toBe(false);
  });

  it("NON parte per una fattura a zero o senza data di pagamento", () => {
    expect(deveNotificare({ ...vera, importoPagato: 0 }).manda).toBe(false);
    expect(deveNotificare({ ...vera, pagataIl: null }).manda).toBe(false);
  });

  it("la soglia è proprio il momento del rilascio: un secondo prima no, un secondo dopo sì", () => {
    const t = Math.floor(NOTIFICHE_VENDITA_DAL.getTime() / 1000);
    expect(deveNotificare({ ...vera, pagataIl: t - 1 }).manda).toBe(false);
    expect(deveNotificare({ ...vera, pagataIl: t }).manda).toBe(true);
  });
});

describe("che cosa porta la mail", () => {
  it("importi e dati del cliente dalla FATTURA, codici dalla SESSIONE", () => {
    const v = componiVendita(fattura(), sessione({ sdi: "M5UXCR1", codicefiscale: "01234567890" }), null);
    expect(v).toMatchObject({
      tipo: "Primo acquisto",
      numero: "ABC-0001",
      imponibile: "350,00 €",
      iva: "77,00 €",
      totale: "427,00 €",
      ragioneSociale: "Studio Rossi S.r.l.",
      partitaIva: "IT01234567890",
      sdi: "M5UXCR1",
      codiceFiscale: "01234567890",
      indirizzo: "Via Roma 1, 81031 Aversa (CE), IT",
    });
  });

  it("⚠️ un rinnovo si chiama rinnovo: è la seconda fattura da emettere, non un duplicato", () => {
    expect(componiVendita(fattura({ billing_reason: "subscription_cycle" }), null, null).tipo).toBe("Rinnovo annuale");
  });

  it("⚠️ senza imposte calcolate da Stripe IVA e imponibile restano vuoti, non «0,00»", () => {
    const v = componiVendita(fattura({ total_taxes: [] }), null, null);
    expect(v.iva).toBeNull();
    expect(v.imponibile).toBeNull();
    expect(v.totale).toBe("427,00 €");
  });

  it("una correzione scritta a mano sul cliente Stripe vince sul codice della sessione", () => {
    const v = componiVendita(fattura(), sessione({ sdi: "VECCHIO1" }), { sdi: "NUOVO123" });
    expect(v.sdi).toBe("NUOVO123");
  });

  it("senza codici e senza sessione i campi restano vuoti, non inventati", () => {
    const v = componiVendita(fattura(), null, null);
    expect(v.sdi).toBeNull();
    expect(v.codiceFiscale).toBeNull();
  });

  it("la partita IVA, se la fattura non l'ha fotografata, si prende dalla sessione", () => {
    expect(componiVendita(fattura({ customer_tax_ids: [] }), sessione({}), null).partitaIva).toBe("IT99999999999");
  });

  it("⚠️ la data è quella ITALIANA: alle 00:30 di qui, in UTC è ancora il giorno prima", () => {
    // 2 ottobre 2026, 22:30 UTC = 3 ottobre, 00:30 in Italia (ora legale).
    const t = Date.UTC(2026, 9, 2, 22, 30) / 1000;
    const v = componiVendita(fattura({ status_transitions: { paid_at: t } as Stripe.Invoice.StatusTransitions }), null, null);
    expect(v.pagataIl).toBe("03/10/2026 alle 00:30");
  });
});

describe("il percorso intero, con Stripe simulato e la posta intercettata", () => {
  const evento = { type: "invoice.paid", data: { object: { id: "in_1" } } } as unknown as Stripe.Event;
  const precedente = process.env.VENDITE_NOTIFICHE_A;

  beforeEach(() => {
    spedite.length = 0;
    vi.clearAllMocks();
    stripeFinto.invoices.retrieve.mockResolvedValue(fattura());
    stripeFinto.checkout.sessions.list.mockResolvedValue({ data: [sessione({ sdi: "M5UXCR1" })] });
    stripeFinto.customers.retrieve.mockResolvedValue({ deleted: false, metadata: {} });
  });
  afterEach(() => {
    if (precedente === undefined) delete process.env.VENDITE_NOTIFICHE_A;
    else process.env.VENDITE_NOTIFICHE_A = precedente;
  });

  it("⚠️ senza destinatario configurato non chiede niente a Stripe e non manda niente", async () => {
    delete process.env.VENDITE_NOTIFICHE_A;
    expect(await notificaVendita(evento)).toBe("nessun destinatario configurato");
    expect(stripeFinto.invoices.retrieve).not.toHaveBeenCalled();
    expect(spedite).toHaveLength(0);
  });

  it("⚠️ un pagamento di prova non manda niente nemmeno col destinatario configurato", async () => {
    process.env.VENDITE_NOTIFICHE_A = "vendite@esempio.it";
    stripeFinto.invoices.retrieve.mockResolvedValue(fattura({ livemode: false }));
    expect(await notificaVendita(evento)).toBe("fattura di prova");
    expect(spedite).toHaveLength(0);
  });

  it("un pagamento vero manda UNA mail, all'indirizzo configurato, col codice destinatario", async () => {
    process.env.VENDITE_NOTIFICHE_A = "vendite@esempio.it";
    expect(await notificaVendita(evento)).toBe("mail di vendita inviata");
    expect(spedite).toHaveLength(1);
    expect(spedite[0].to).toBe("vendite@esempio.it");
    expect(spedite[0].html).toContain("M5UXCR1");
    expect(spedite[0].html).toContain("427,00 €");
    // L'abbonamento si trova nel posto della versione nuova delle API, e da lì la sessione.
    expect(stripeFinto.checkout.sessions.list).toHaveBeenCalledWith({ subscription: "sub_1", limit: 1 });
  });

  it("⚠️ la ragione sociale la scrive chi paga: nell'HTML arriva neutralizzata", async () => {
    process.env.VENDITE_NOTIFICHE_A = "vendite@esempio.it";
    stripeFinto.invoices.retrieve.mockResolvedValue(fattura({ customer_name: "<script>x</script>" }));
    await notificaVendita(evento);
    expect(spedite[0].html).not.toContain("<script>x</script>");
  });

  it("un dato mancante si legge «non indicato», e la mail dice come si fattura senza codice", async () => {
    process.env.VENDITE_NOTIFICHE_A = "vendite@esempio.it";
    stripeFinto.checkout.sessions.list.mockResolvedValue({ data: [] });
    await notificaVendita(evento);
    expect(spedite[0].html).toContain("non indicato");
    expect(spedite[0].html).toContain("0000000");
  });

  it("un guasto di Stripe non solleva: la rotta ha già segnato l'evento completato", async () => {
    process.env.VENDITE_NOTIFICHE_A = "vendite@esempio.it";
    stripeFinto.invoices.retrieve.mockRejectedValue(new Error("rete giù"));
    const errore = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await notificaVendita(evento)).toBe("mail di vendita fallita");
    errore.mockRestore();
  });

  it("gli altri eventi non vengono nemmeno guardati", async () => {
    process.env.VENDITE_NOTIFICHE_A = "vendite@esempio.it";
    await notificaVendita({ type: "customer.subscription.updated", data: { object: {} } } as unknown as Stripe.Event);
    expect(stripeFinto.invoices.retrieve).not.toHaveBeenCalled();
  });
});

describe("la cassa e la mail parlano delle stesse chiavi", () => {
  // ⚠️ Una guardia sul SORGENTE: la mail legge i campi `sdi` e `codicefiscale` della
  // sessione. Rinominarli alla cassa la renderebbe muta in silenzio — il codice
  // destinatario arriverebbe «non indicato» per sempre, e nessun test lo direbbe.
  const cassa = readFileSync("src/features/billing/checkout.ts", "utf8");

  it("i due campi esistono, con le chiavi che la mail legge", () => {
    expect(cassa).toMatch(/key:\s*"sdi"/);
    expect(cassa).toMatch(/key:\s*"codicefiscale"/);
  });

  // Il blocco di un campo, dalla sua chiave alla chiusura: basta a leggerne `optional` e
  // l'etichetta senza confondere i due campi fra loro.
  const blocco = (chiave: string) => {
    const i = cassa.indexOf(`key: "${chiave}"`);
    expect(i).toBeGreaterThan(-1);
    return cassa.slice(i, cassa.indexOf("},\n      }", i) + 1 || undefined);
  };

  it("⚠️ il codice destinatario è obbligatorio, ma con la via d'uscita scritta per privati ed esteri", () => {
    const sdi = blocco("sdi");
    expect(sdi).toMatch(/optional:\s*false/);
    // Obbligatorio senza dire che cosa scrive chi non ce l'ha lasciava fuori dalla cassa
    // privati e clienti esteri: è il motivo per cui il 2 ottobre era diventato facoltativo.
    expect(sdi).toMatch(/0000000/);
    expect(cassa).toMatch(/custom_text:[\s\S]*0000000[\s\S]*XXXXXXX/);
  });

  it("⚠️ il codice fiscale resta facoltativo: un cliente estero non ce l'ha", () => {
    expect(blocco("codicefiscale")).toMatch(/optional:\s*true/);
  });

  it("le etichette stanno nei 50 caratteri di Stripe, la spiegazione nei 1200", () => {
    const etichette = [...cassa.matchAll(/custom:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(etichette.length).toBe(2);
    for (const e of etichette) expect(e.length).toBeLessThanOrEqual(50);
    const msg = cassa.match(/message:\s*"([^"]+)"/)?.[1] ?? "";
    expect(msg.length).toBeGreaterThan(0);
    expect(msg.length).toBeLessThanOrEqual(1200);
  });
});
