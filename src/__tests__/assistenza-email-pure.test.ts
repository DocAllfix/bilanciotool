import { describe, it, expect, afterEach } from "vitest";
import { ANTEPRIMA_MAX, anteprimaMessaggio, destinatariAssistenza } from "@/lib/email";

// LE EMAIL DELL'ASSISTENZA, dalla parte che non ha bisogno né di rete né di database.
//
// ⚠️ Due difetti veri che questo file impedisce, e il secondo l'ha trovato l'altra
// sessione nel proprio codice prima che arrivasse qui:
//  1. il testo di chi scrive finisce dentro HTML che qualcun ALTRO apre — l'amministratore
//     — quindi va reso innocuo prima di tutto;
//  2. un solo destinatario configurato funziona sempre; il secondo no, e nessuno se ne
//     accorge. Qui i destinatari si leggono da una lista, e l'invio ne fa uno per ciascuno.

const CON = (v: string | undefined) => {
  if (v === undefined) delete process.env.ASSISTENZA_NOTIFICHE_A;
  else process.env.ASSISTENZA_NOTIFICHE_A = v;
};

afterEach(() => CON(undefined));

describe("l'anteprima del messaggio", () => {
  it("rende innocuo ciò che scrive chi apre la richiesta", () => {
    const reso = anteprimaMessaggio('<img src=x onerror="alert(1)"> e <script>rubare()</script>');
    expect(reso).not.toContain("<img");
    expect(reso).not.toContain("<script");
    expect(reso).toContain("&lt;img");
  });

  it("conserva gli a capo, che sono l'unica formattazione che una persona usa", () => {
    expect(anteprimaMessaggio("prima\nseconda")).toBe("prima<br>seconda");
    expect(anteprimaMessaggio("prima\r\nseconda")).toBe("prima<br>seconda");
  });

  it("tronca i messaggi lunghi: l'email è l'avviso, non il posto dove si legge", () => {
    const lungo = "a".repeat(ANTEPRIMA_MAX + 500);
    const reso = anteprimaMessaggio(lungo);
    expect(reso.endsWith("…")).toBe(true);
    expect(reso.length).toBeLessThan(lungo.length);
  });

  it("un messaggio corto non viene toccato", () => {
    expect(anteprimaMessaggio("Non trovo la fattura.")).toBe("Non trovo la fattura.");
  });

  it("⚠️ tronca PRIMA di rendere innocuo, non dopo", () => {
    // Troncando dopo l'escape si taglierebbe in mezzo a un'entità (`&a`, `&lt`), e
    // l'ultima parola arriverebbe spezzata in un modo che nessun browser sa leggere.
    const reso = anteprimaMessaggio("<".repeat(ANTEPRIMA_MAX + 10));
    expect(reso).not.toMatch(/&[a-z]*$/);
    expect(reso.endsWith("…")).toBe(true);
  });
});

describe("i destinatari dello staff", () => {
  it("nessuna configurazione, nessun destinatario", () => {
    CON(undefined);
    expect(destinatariAssistenza()).toEqual([]);
    CON("   ");
    expect(destinatariAssistenza()).toEqual([]);
  });

  it("⚠️ li legge TUTTI, non solo il primo", () => {
    CON("uno@example.com, due@example.com ,tre@example.com");
    expect(destinatariAssistenza()).toEqual(["uno@example.com", "due@example.com", "tre@example.com"]);
  });

  it("scarta ciò che non è un indirizzo, invece di provare a mandarglielo", () => {
    CON("buono@example.com, non-un-indirizzo, ancora@example.com");
    expect(destinatariAssistenza()).toEqual(["buono@example.com", "ancora@example.com"]);
  });

  it("il controllo sa diventare rosso", () => {
    // Se la lettura smettesse di funzionare, i controlli qui sopra passerebbero tutti
    // restituendo sempre un elenco vuoto.
    CON("solo@example.com");
    expect(destinatariAssistenza()).toHaveLength(1);
  });
});
