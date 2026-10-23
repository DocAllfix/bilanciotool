// Il codice partner e la sua riga nella mail di vendita, provati senza database.

import { describe, it, expect } from "vitest";
import { normalizzaCodicePartner, messaggioCodiceSconosciuto } from "@/features/partner/codice";
import { destinatariVendita, testoPartner } from "@/features/billing/notifica-vendita";

describe("normalizzaCodicePartner — come si legge ciò che è stato scritto", () => {
  it("vuoto non è un errore: il campo è facoltativo", () => {
    for (const v of [undefined, null, "", "   "]) expect(normalizzaCodicePartner(v)).toBeNull();
  });

  it("maiuscole e spazi attorno non sono una scelta di chi scrive", () => {
    expect(normalizzaCodicePartner(" ngr ")).toBe("NGR");
    expect(normalizzaCodicePartner("Ngr")).toBe("NGR");
  });

  it("un formato impossibile si rifiuta, non si corregge", () => {
    // Correggere «N-G-R» in «NGR» sembrerebbe gentile, finché non attribuisce una
    // provvigione al partner sbagliato.
    for (const v of ["N-G-R", "N G R", "X", "<script>", "A".repeat(21), 42]) {
      expect(normalizzaCodicePartner(v), String(v)).toBe("non-valido");
    }
  });

  it("il messaggio dice che si può proseguire senza", () => {
    expect(messaggioCodiceSconosciuto("nrg")).toMatch(/«nrg» non è riconosciuto.*lascia il campo vuoto/);
  });
});

describe("la riga «Partner» della mail di vendita", () => {
  const dal = new Date("2026-10-23T08:00:00Z");

  it("dice codice, come è arrivato e quando", () => {
    expect(testoPartner({ codice: "NGR", nome: "NGR", origine: "registrazione", dal })).toBe(
      "NGR (scritto all'iscrizione il 23/10/2026)",
    );
    expect(testoPartner({ codice: "NGR", nome: "Rossi consulenze", origine: "staff", dal })).toBe(
      "NGR — Rossi consulenze (attribuito dallo staff il 23/10/2026)",
    );
  });

  it("«nessuno» e «non verificato» non sono la stessa cosa", () => {
    // Scrivere «nessuno» quando la lettura è fallita farebbe perdere una provvigione in silenzio.
    expect(testoPartner("nessuno")).toBe("Nessuno");
    expect(testoPartner("non-verificato")).toMatch(/^Non verificato/);
  });

  it("il giorno è quello italiano, anche a ridosso della mezzanotte", () => {
    expect(testoPartner({ codice: "NGR", nome: "NGR", origine: "staff", dal: new Date("2026-10-22T22:30:00Z") })).toMatch(
      /il 23\/10\/2026/,
    );
  });
});

describe("i destinatari della mail di vendita", () => {
  it("un elenco separato da virgole, un indirizzo per voce", () => {
    expect(destinatariVendita(" a@esempio.it, b@esempio.it ,, ")).toEqual(["a@esempio.it", "b@esempio.it"]);
  });

  it("niente variabile, niente destinatari", () => {
    expect(destinatariVendita(undefined)).toEqual([]);
    expect(destinatariVendita("")).toEqual([]);
  });
});
