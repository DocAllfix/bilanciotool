import { describe, it, expect, vi, afterEach } from "vitest";
import { z } from "zod";
import { daErrore } from "@/features/esito";
import { EntitlementError } from "@/features/entitlement";
import { AuthError, ForbiddenError } from "@/features/auth/guards";

// Che cosa il browser ha il diritto di leggere quando una server action fallisce.
//
// L'ultima riga di `daErrore` era `e instanceof Error ? e.message : ...`: il messaggio
// di QUALUNQUE eccezione tornava al client. Per un errore Postgres quel messaggio porta
// frammenti di query e nomi di colonna; per un errore dell'archivio portava il corpo
// della risposta di Supabase.
//
// Il rimedio ovvio — un messaggio fisso per tutto — sarebbe stato peggio: nel prodotto
// ci sono 101 `throw new Error` di dominio, e sono frasi scritte per il consulente.
// Renderle tutte «Operazione non riuscita» avrebbe reso il prodotto muto proprio quando
// deve spiegare. Quindi si distingue CHI ha lanciato, non che cosa c'e' scritto.

class ErroreFintoDiPostgres extends Error {
  severity = "ERROR";
  code = "42703";
  constructor() {
    super('column "organization_id" does not exist');
    this.name = "PostgresError";
  }
}

afterEach(() => vi.restoreAllMocks());

describe("daErrore: che cosa esce e che cosa resta nei log", () => {
  it("lascia passare i messaggi di dominio, che servono al consulente", () => {
    const casi = [
      "Immagine oltre 5 MB: ridimensionala",
      "Motivazione d'esclusione obbligatoria",
      "Dichiarazione inesistente o di un altro tenant",
    ];
    for (const messaggio of casi) {
      expect(daErrore(new Error(messaggio))).toEqual({ ok: false, errore: messaggio });
    }
  });

  it("NON lascia passare il messaggio di un errore Postgres", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const esito = daErrore(new ErroreFintoDiPostgres());
    expect(esito.ok).toBe(false);
    if (esito.ok) throw new Error("irraggiungibile");
    expect(esito.errore).toBe("Operazione non riuscita. Riprova fra poco.");
    expect(esito.errore).not.toContain("organization_id");
    expect(esito.errore).not.toContain("column");
    // Il dettaglio non si perde: cambia solo destinatario.
    expect(log).toHaveBeenCalled();
  });

  it("non lascia passare nemmeno un TypeError, che nessuno ha scritto per l'utente", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const esito = daErrore(new TypeError("fetch failed: ECONNREFUSED 10.0.0.4:5432"));
    if (esito.ok) throw new Error("irraggiungibile");
    expect(esito.errore).not.toContain("10.0.0.4");
    expect(esito.errore).toBe("Operazione non riuscita. Riprova fra poco.");
  });

  it("il paywall conserva il proprio codice, che l'interfaccia usa per decidere", () => {
    const esito = daErrore(new EntitlementError("paywall", "Attiva il servizio per continuare"));
    expect(esito).toEqual({ ok: false, errore: "Attiva il servizio per continuare", codice: "paywall" });
  });

  it("una validazione riporta il primo messaggio, non l'oggetto intero di zod", () => {
    const schema = z.object({ nome: z.string().min(2, "Indica la denominazione") });
    try {
      schema.parse({ nome: "" });
    } catch (e) {
      expect(daErrore(e)).toEqual({ ok: false, errore: "Indica la denominazione" });
    }
  });

  it("sessione scaduta e divieto restano distinguibili dal codice", () => {
    expect(daErrore(new AuthError())).toEqual({
      ok: false, errore: "Non autenticato", codice: "non_autenticato",
    });
    expect(daErrore(new ForbiddenError())).toEqual({
      ok: false, errore: "Operazione non consentita", codice: "non_consentito",
    });
  });

  it("regge quello che non e' nemmeno un errore", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const strano of ["stringa nuda", 42, null, undefined, { messaggio: "oggetto" }]) {
      const esito = daErrore(strano);
      expect(esito).toEqual({ ok: false, errore: "Operazione non riuscita. Riprova fra poco." });
    }
  });
});
