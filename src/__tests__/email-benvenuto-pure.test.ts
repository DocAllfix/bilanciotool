import { describe, it, expect, vi, beforeAll } from "vitest";

// L'email di benvenuto: quella che legge chi ha appena pagato.
//
// ⚠️ PERCHÉ ESISTE QUESTO FILE. Alla cassa chiediamo partita IVA e codice destinatario,
// obbligatori: stiamo chiedendo al cliente i dati per fatturare. Poi Stripe gli manda la
// RICEVUTA — la prova che la carta è passata — mentre la fattura vera vive nel portale, e
// nessuno gli aveva mai detto dov'è. Uno studio con partita IVA quella fattura la gira al
// commercialista: se non la trova, scrive a noi.
//
// La versione precedente diceva soltanto «la ricevuta del pagamento ti arriva separatamente
// da Stripe»: vero, e insufficiente, perché nominava il documento che serve meno.
//
// ⚠️ E IL CONTROLLO GUARDA L'HTML CHE PARTE DAVVERO, intercettando la chiamata a Resend.
// Una prima versione di questo file ricomponeva il corpo da sé e lo confrontava con la
// propria copia: due copie della stessa cosa sono sempre d'accordo, e il test sarebbe
// rimasto verde con la funzione vera cambiata sotto.

vi.mock("@/lib/env", () => ({
  env: { RESEND_API_KEY: "re_finta", RESEND_FROM: "posta@evalisdeck.it", NODE_ENV: "test" },
}));

const spedite: { to: string; subject: string; html: string }[] = [];

beforeAll(() => {
  vi.stubGlobal("fetch", async (_u: string, init: { body: string }) => {
    spedite.push(JSON.parse(init.body));
    return { ok: true, status: 200, text: async () => "" } as unknown as Response;
  });
});

const { sendBenvenutoEmail } = await import("@/lib/email");

const D = {
  piano: "Un'azienda",
  aziende: 1,
  accessi: 3,
  url: "https://evalisdeck.it/dashboard",
  urlAbbonamento: "https://evalisdeck.it/impostazioni/abbonamento",
};

async function inviata(d = D) {
  spedite.length = 0;
  const esito = await sendBenvenutoEmail("titolare@studio.it", d);
  expect(esito.sent, "l'email non è nemmeno partita: il controllo non prova niente").toBe(true);
  expect(spedite).toHaveLength(1);
  return spedite[0];
}

describe("l'email di benvenuto", () => {
  it("⚠️ nomina le FATTURE, non solo la ricevuta", async () => {
    const m = await inviata();
    expect(m.html).toMatch(/fattur/i);
    expect(m.html).toMatch(/ricevuta/i);
  });

  it("⚠️ il collegamento alle fatture porta alla pagina dell'abbonamento", async () => {
    // Un testo che dice «le trovi in Impostazioni → Abbonamento» senza un collegamento
    // cliccabile costringe chi legge a cercarsela: è l'attrito che quella riga esiste per
    // togliere. Si pretende l'`href`, non la frase.
    const m = await inviata();
    expect(m.html).toContain(`href="${D.urlAbbonamento}"`);
  });

  it("il richiamo principale resta quello che fa cominciare a lavorare", async () => {
    // Le fatture sono un'informazione, non l'azione: il pulsante vero porta al prodotto.
    const m = await inviata();
    expect(m.html).toContain(`href="${D.url}"`);
    expect(m.html).toMatch(/Crea la prima azienda/);
  });

  it("⚠️ non promette la fattura elettronica, che non emettiamo", async () => {
    // Quella via SdI resta la casella aperta in PRE-LAUNCH.md: nominarla qui, in un'email
    // a chi ha appena pagato, sarebbe un impegno che il prodotto non mantiene.
    const m = await inviata();
    expect(m.html).not.toMatch(/fattura elettronica|SdI/i);
    // E la ricevuta resta attribuita a Stripe come MITTENTE: quella frase è vera finché
    // «Successful payments» è acceso nel pannello. Chi la cambia deve passare di qui.
    expect(m.html).toMatch(/Stripe/);
  });

  it("l'oggetto dice a che cosa si riferisce", async () => {
    const m = await inviata();
    expect(m.subject).toContain(D.piano);
  });

  it("un apostrofo o una e commerciale nel piano non rompono l'HTML", async () => {
    const m = await inviata({ ...D, piano: 'Studio "Rossi" & soci' });
    expect(m.html).not.toContain('Studio "Rossi" & soci');
    expect(m.html).toMatch(/&quot;|&amp;/);
  });
});
