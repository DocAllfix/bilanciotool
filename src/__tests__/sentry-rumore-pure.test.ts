import { describe, it, expect } from "vitest";
import { configurazioneComune } from "@/lib/sentry-comune";

// SENTRY NON DEVE RICEVERE CIÒ CHE NON È UN GUASTO.
//
// ⚠️ Nasce da una schermata del cruscotto vero, il 27 agosto 2026: cinque righe in tutto,
// e tre erano `AuthError: Non autenticato` su `/dashboard` e `/impostazioni`, per **161
// eventi**. Una parte li generavano i nostri stessi collaudi, che aprono le pagine
// protette da anonimi per verificare che rimandino all'accesso.
//
// Il meccanismo: il layout del gruppo `(app)` fa `redirect("/login")` e la persona
// atterra dove deve — ma in Next il layout e la pagina rendono in PARALLELO, quindi la
// guardia della pagina lancia lo stesso e `captureRequestError` la manda a Sentry.
//
// ⚠️ Perché toglierli è giusto: vale la regola già scritta — **un allarme che arriva ogni
// mattina si smette di leggerlo**. Con una regola d'avviso attiva, il primo messaggio che
// arriva è questo: il canale nascerebbe già da spegnere. E se l'autenticazione si
// rompesse davvero, il segnale non sarebbe «un anonimo ha aperto una pagina protetta».

const passa = (evento: unknown) => configurazioneComune.beforeSend(evento);

describe("il filtro degli eventi", () => {
  it("scarta AuthError, che è controllo di flusso e non un guasto", () => {
    const e = { exception: { values: [{ type: "AuthError", value: "Non autenticato" }] } };
    expect(passa(e)).toBeNull();
  });

  it("⚠️ lascia passare tutto il resto: un errore vero non si tocca", () => {
    const e = { exception: { values: [{ type: "TypeError", value: "x is not a function" }] } };
    expect(passa(e)).not.toBeNull();
  });

  it("lascia passare anche un evento senza eccezione (messaggi, breadcrumb)", () => {
    expect(passa({ message: "qualcosa" })).not.toBeNull();
  });

  it("distingue per TIPO, non per messaggio", () => {
    // Il tipo lo scriviamo noi (`this.name`); il messaggio è una frase che qualcuno può
    // cambiare, e un filtro appeso alle parole si stacca alla prima riscrittura.
    const e = { exception: { values: [{ type: "Error", value: "Non autenticato" }] } };
    expect(passa(e)).not.toBeNull();
  });

  it("⚠️ e continua a mascherare i segreti: il filtro nuovo non scavalca il vecchio", () => {
    const e = {
      exception: { values: [{ type: "TypeError" }] },
      request: { headers: { authorization: "Bearer sk_live_qualcosa", accept: "*/*" }, cookies: "sessione" },
      extra: { stripe_secret: "sk_live_x", nota: "innocua" },
    };
    const fuori = passa(e) as typeof e;
    expect(fuori.request.headers.authorization).toBe("[rimosso]");
    expect(fuori.request.headers.accept).toBe("*/*");
    expect(fuori.request.cookies).toBe("[rimosso]");
    expect(fuori.extra.stripe_secret).toBe("[rimosso]");
    expect(fuori.extra.nota).toBe("innocua");
  });

  it("restituisce l'evento ORIGINALE, non una copia", () => {
    // Un filtro che ricostruisce l'evento lo rende irriconoscibile a chi lo spedisce: è
    // già successo, e il sintomo era un cruscotto vuoto mentre il server rispondeva 500.
    const e = { exception: { values: [{ type: "TypeError" }] }, extra: {} };
    expect(passa(e)).toBe(e);
  });
});
