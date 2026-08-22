import { describe, it, expect } from "vitest";
import {
  sostituisci,
  conta,
  contaTutti,
  valore,
  testoDelBlocco,
  type Segnaposto,
  type Contesto,
} from "../segnaposto";

// Il motore dei segnaposto. La parte da guardare e' il CONTATORE: nei prototipi conta
// tutto cio' che resta fra parentesi, e su SA8000/2026 lo tiene a 415 per sempre, perche'
// quel modulo usa le parentesi anche per le caselle da riempire a mano. Un contatore che
// non puo' arrivare a zero smette di essere letto.

const S = {
  studio: { forma: "[Resp. Due Diligence]", genere: "token", fonte: "studio", campo: null },
  ragione: { forma: "[Nome Organizzazione]", genere: "token", fonte: "azienda", campo: "ragione" },
  direzione: { forma: "[Alta Direzione]", genere: "token", fonte: "azienda", campo: "direzione" },
  rev: { forma: "[Rev.]", genere: "token", fonte: "revisione", campo: null },
  data: { forma: "[Data]", genere: "token", fonte: "data", campo: null },
  casella: { forma: "[GG/MM/AAAA]", genere: "campo", fonte: null, campo: null },
  scelta: { forma: "[Resp. SA / HR]", genere: "campo", fonte: null, campo: null },
} satisfies Record<string, Segnaposto>;

const TUTTI = Object.values(S);

const ctx = (over: Partial<Contesto> = {}): Contesto => ({
  studio: "Studio Rossi",
  azienda: { ragione: "Meccanica Adriatica S.r.l.", direzione: "Ing. Bianchi" },
  revisione: "03",
  data: "12/05/2026",
  ...over,
});

describe("valore di un token", () => {
  it("pesca dallo studio, dall'azienda, dalla revisione e dalla data", () => {
    expect(valore(S.studio, ctx())).toBe("Studio Rossi");
    expect(valore(S.ragione, ctx())).toBe("Meccanica Adriatica S.r.l.");
    expect(valore(S.rev, ctx())).toBe("03");
    expect(valore(S.data, ctx())).toBe("12/05/2026");
  });

  it("un campo vuoto o di soli spazi vale come assente", () => {
    expect(valore(S.ragione, ctx({ azienda: { ragione: "" } }))).toBeNull();
    expect(valore(S.ragione, ctx({ azienda: { ragione: "   " } }))).toBeNull();
    expect(valore(S.ragione, ctx({ azienda: {} }))).toBeNull();
    expect(valore(S.studio, ctx({ studio: null }))).toBeNull();
  });

  it("una casella da riempire non ha mai un valore, per definizione", () => {
    expect(valore(S.casella, ctx())).toBeNull();
    expect(valore(S.scelta, ctx())).toBeNull();
  });

  it("ritaglia gli spazi attorno al valore", () => {
    expect(valore(S.ragione, ctx({ azienda: { ragione: "  Alfa S.p.A.  " } }))).toBe("Alfa S.p.A.");
  });
});

describe("sostituzione", () => {
  it("sostituisce ogni occorrenza, non solo la prima", () => {
    const t = "[Nome Organizzazione] adotta il modello. [Nome Organizzazione] lo aggiorna.";
    expect(sostituisci(t, TUTTI, ctx())).toBe(
      "Meccanica Adriatica S.r.l. adotta il modello. Meccanica Adriatica S.r.l. lo aggiorna.",
    );
  });

  it("un token senza valore NON si cancella: resta visibile", () => {
    const t = "Redatto da: [Resp. Due Diligence]";
    expect(sostituisci(t, TUTTI, ctx({ studio: null }))).toBe("Redatto da: [Resp. Due Diligence]");
  });

  it("le caselle da riempire restano intatte", () => {
    const t = "Data: [GG/MM/AAAA] — Responsabile: [Resp. SA / HR]";
    expect(sostituisci(t, TUTTI, ctx())).toBe(t);
  });

  // Le forme contengono `[`, `]`, `.` e `/`: tutti caratteri speciali in un'espressione
  // regolare. Senza schermatura `[Rev.]` diventerebbe una classe di caratteri e
  // sostituirebbe qualunque lettera fra R, e, v e un punto qualsiasi.
  it("le forme con caratteri speciali si sostituiscono per intero e non a pezzi", () => {
    expect(sostituisci("rev [Rev.] fine", TUTTI, ctx())).toBe("rev 03 fine");
    expect(sostituisci("[Data]", TUTTI, ctx())).toBe("12/05/2026");
  });

  it("un testo senza segnaposto torna identico", () => {
    const t = "Il modello è adottato con delibera dell'organo amministrativo.";
    expect(sostituisci(t, TUTTI, ctx())).toBe(t);
  });
});

describe("il contatore", () => {
  it("conta solo i token SENZA valore", () => {
    const t = "[Nome Organizzazione] — [Alta Direzione] — [Rev.]";
    expect(conta(t, TUTTI, ctx()).aperti).toBe(0);
    const c = conta(t, TUTTI, ctx({ azienda: { ragione: "Alfa" } }));
    expect(c.aperti).toBe(1);
    expect(c.forme).toEqual(["[Alta Direzione]"]);
  });

  // ⚠️ Il difetto dei prototipi, in una riga.
  it("NON conta le caselle da riempire fra i segnaposto aperti", () => {
    const t = "Data: [GG/MM/AAAA] — [GG/MM/AAAA] — [Resp. SA / HR]";
    const c = conta(t, TUTTI, ctx());
    expect(c.aperti, "le caselle non sono un buco da colmare").toBe(0);
    expect(c.caselle, "ma si contano a parte: dicono quanto lavoro a mano resta").toBe(3);
    expect(c.forme).toEqual([]);
  });

  it("conta le occorrenze, non le forme", () => {
    const t = "[Alta Direzione] e ancora [Alta Direzione] e poi [Alta Direzione]";
    const c = conta(t, TUTTI, ctx({ azienda: {} }));
    expect(c.aperti).toBe(3);
    expect(c.forme).toEqual(["[Alta Direzione]"]);
  });

  it("un documento completo arriva a zero, ed è il punto", () => {
    const t = "[Nome Organizzazione] · [Alta Direzione] · rev. [Rev.] · [Resp. Due Diligence]";
    expect(conta(t, TUTTI, ctx()).aperti).toBe(0);
  });

  it("somma su più testi tenendo le forme distinte", () => {
    const c = contaTutti(
      ["[Alta Direzione]", "[Alta Direzione] e [Nome Organizzazione]", "[GG/MM/AAAA]"],
      TUTTI,
      ctx({ azienda: {} }),
    );
    expect(c.aperti).toBe(3);
    expect(c.forme).toEqual(["[Alta Direzione]", "[Nome Organizzazione]"]);
    expect(c.caselle).toBe(1);
  });

  it("su un testo vuoto non conta niente", () => {
    const c = conta("", TUTTI, ctx({ azienda: {} }));
    expect(c).toEqual({ aperti: 0, forme: [], caselle: 0 });
  });
});

describe("il testo di un blocco", () => {
  it("legge i paragrafi e le intestazioni", () => {
    expect(testoDelBlocco({ t: "1. SCOPO" })).toBe("1. SCOPO");
  });

  it("legge le tabelle riga per riga", () => {
    expect(testoDelBlocco({ r: [["Codice:", "PAC-01"], ["Revisione:", "[Rev.]"]] })).toBe(
      "Codice: PAC-01\nRevisione: [Rev.]",
    );
  });

  it("un blocco firma non ha testo, e non è un errore", () => {
    expect(testoDelBlocco({})).toBe("");
    expect(testoDelBlocco(null)).toBe("");
    expect(testoDelBlocco(undefined)).toBe("");
  });

  it("regge una tabella malformata senza rompersi", () => {
    expect(testoDelBlocco({ r: [null, ["a", 3, "b"]] })).toBe("\na b");
  });
});
