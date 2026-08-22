import { describe, it, expect } from "vitest";
import { livelloTitolo, unita, conOverride, componi, type Blocco } from "../blocchi";

// La resa dei blocchi. Sembra tipografia, e invece decide la struttura di un documento
// normativo: una riga di dati promossa a intestazione trasforma un elenco di requisiti in
// una sequenza di titoli in grassetto.

const p = (id: string, t: string): Blocco => ({ blockId: id, tipo: "p", contenuto: { t } });
const h = (id: string, t: string): Blocco => ({ blockId: id, tipo: "h", contenuto: { t } });
const sig = (id: string): Blocco => ({ blockId: id, tipo: "sig", contenuto: {} });
const t = (id: string, r: string[][], b?: number): Blocco => ({
  blockId: id,
  tipo: "t",
  contenuto: b === undefined ? { r } : { r, b },
});

describe("il livello di un titolo si legge dal testo", () => {
  it("riconosce «1. SCOPO» e «1.2 Riferimenti»", () => {
    expect(livelloTitolo("1. SCOPO")).toBe(1);
    expect(livelloTitolo("12. AGGIORNAMENTO DEL MODELLO")).toBe(1);
    expect(livelloTitolo("1.2 Riferimenti")).toBe(2);
    expect(livelloTitolo("10.14 Qualcosa")).toBe(2);
  });

  it("un paragrafo normale non è un titolo", () => {
    expect(livelloTitolo("Il modello è adottato con delibera.")).toBeNull();
    expect(livelloTitolo("1. minuscolo dopo il numero")).toBeNull();
    expect(livelloTitolo("")).toBeNull();
    expect(livelloTitolo("Art. 6 del decreto")).toBeNull();
  });

  it("il livello 2 vince sul livello 1 quando entrambi combaciano", () => {
    // «1.2 Riferimenti» soddisferebbe anche il primo criterio se seguisse una maiuscola.
    expect(livelloTitolo("1.2 Riferimenti")).toBe(2);
  });
});

describe("le unità di resa", () => {
  it("paragrafi, sezioni e firme restano uno a uno", () => {
    const u = unita([p("a", "1. SCOPO"), p("b", "Testo."), h("c", "Sezione"), sig("d")]);
    expect(u.map((x) => x.tipo)).toEqual(["paragrafo", "paragrafo", "sezione", "firme"]);
    expect(u[0]).toMatchObject({ livello: 1 });
    expect(u[1]).toMatchObject({ livello: null });
  });

  it("una tabella con intestazione la riconosce", () => {
    const u = unita([
      t("a", [
        ["Indicatore", "Fonte", "Target"],
        ["Destinatari formati", "MOD-08.02", "100%"],
      ]),
    ]);
    expect(u[0]).toMatchObject({
      tipo: "tabella",
      intestazione: ["Indicatore", "Fonte", "Target"],
      colonne: 3,
    });
    expect((u[0] as { righe: string[][] }).righe).toHaveLength(1);
  });

  // ⚠️ La regola che corregge un difetto visibile dei prototipi.
  it("una riga sola NON diventa mai un'intestazione", () => {
    const u = unita([t("a", [["A1", "Assenza di lavoro minorile", "Inderogabile"]])]);
    expect(u[0]).toMatchObject({ intestazione: null });
    expect((u[0] as { righe: string[][] }).righe).toEqual([
      ["A1", "Assenza di lavoro minorile", "Inderogabile"],
    ]);
  });

  it("una prima riga con celle vuote non è un'intestazione", () => {
    const u = unita([
      t("a", [
        ["MODULO MOD-01.02", "", ""],
        ["Codice:", "MOD-01.02", "Rev. 01"],
      ]),
    ]);
    expect(u[0]).toMatchObject({ intestazione: null });
  });

  it("una prima riga con una frase lunga non è un'intestazione", () => {
    const lunga = "Contratto scritto in una lingua comprensibile per ogni lavoratore impiegato nel sito";
    const u = unita([t("a", [["A5", lunga], ["A6", "Altro"]])]);
    expect(u[0]).toMatchObject({ intestazione: null });
  });
});

describe("le tabelle spezzate in blocchi si ricompongono", () => {
  it("intestazione e righe separate tornano una tabella sola", () => {
    const u = unita([
      t("h1", [["#", "Requisito", "Natura"]]),
      t("r1", [["A1", "Lavoro minorile", "Inderogabile"]]),
      t("r2", [["A2", "Lavoro forzato", "Inderogabile"]]),
    ]);
    expect(u).toHaveLength(1);
    expect(u[0]).toMatchObject({
      tipo: "tabella",
      intestazione: ["#", "Requisito", "Natura"],
      blockIds: ["h1", "r1", "r2"],
    });
    expect((u[0] as { righe: string[][] }).righe).toHaveLength(2);
  });

  it("non unisce tabelle con un numero di colonne diverso", () => {
    const u = unita([t("a", [["x", "y"]]), t("b", [["p", "q", "r"]])]);
    expect(u).toHaveLength(2);
    expect(u[0]).toMatchObject({ blockIds: ["a"] });
    expect(u[1]).toMatchObject({ blockIds: ["b"] });
  });

  it("un paragrafo in mezzo interrompe la catena", () => {
    const u = unita([t("a", [["x", "y"]]), p("m", "Nota."), t("b", [["p", "q"]])]);
    expect(u.map((x) => x.tipo)).toEqual(["tabella", "paragrafo", "tabella"]);
  });

  it("una tabella a più righe non assorbe quella che segue", () => {
    const u = unita([
      t("a", [["Cod", "Nome"], ["1", "Alfa"]]),
      t("b", [["2", "Beta"]]),
    ]);
    expect(u).toHaveLength(2);
  });

  it("somma le righe vuote dei blocchi uniti", () => {
    const u = unita([t("a", [["x", "y"]], 4), t("b", [["p", "q"]], 6)]);
    expect(u).toHaveLength(1);
    expect(u[0]).toMatchObject({ vuote: 10 });
  });
});

describe("le righe vuote da stampare", () => {
  // I prototipi tagliano a 8 (a 6 in SA8000/2026), ma nel corpus ce ne sono da 10, 12, 14
  // e 20: un registro cartaceo con otto righe invece di venti finisce a meta' del mese.
  it("non si troncano", () => {
    const u = unita([t("a", [["A", "B"], ["1", "2"]], 20)]);
    expect(u[0]).toMatchObject({ vuote: 20 });
  });

  it("un valore assente, zero o negativo vale zero", () => {
    expect(unita([t("a", [["A", "B"], ["1", "2"]])])[0]).toMatchObject({ vuote: 0 });
    expect(unita([t("a", [["A", "B"], ["1", "2"]], 0)])[0]).toMatchObject({ vuote: 0 });
    expect(unita([t("a", [["A", "B"], ["1", "2"]], -3)])[0]).toMatchObject({ vuote: 0 });
  });
});

describe("righe irregolari", () => {
  it("le righe corte si pareggiano invece di rompere la tabella", () => {
    const u = unita([t("a", [["A", "B", "C"], ["1"], ["2", "3"]])]);
    expect(u[0]).toMatchObject({ colonne: 3 });
    expect((u[0] as { righe: string[][] }).righe).toEqual([
      ["1", "", ""],
      ["2", "3", ""],
    ]);
  });

  it("una tabella senza righe non rompe niente", () => {
    const u = unita([{ blockId: "a", tipo: "t", contenuto: {} }]);
    expect(u[0]).toMatchObject({ tipo: "tabella", intestazione: null, colonne: 0 });
  });
});

describe("il testo su misura del cliente", () => {
  it("sostituisce il testo di un paragrafo", () => {
    expect(conOverride(p("a", "originale"), "su misura")).toMatchObject({
      contenuto: { t: "su misura" },
    });
  });

  it("non tocca tabelle e firme: una tabella si modifica cella per cella", () => {
    const tab = t("a", [["x", "y"]]);
    expect(conOverride(tab, "prosa")).toBe(tab);
    const firme = sig("b");
    expect(conOverride(firme, "prosa")).toBe(firme);
  });

  it("senza override il blocco resta identico, non copiato", () => {
    const b = p("a", "testo");
    expect(conOverride(b, undefined)).toBe(b);
  });

  it("componi applica gli override per chiave e lascia gli altri", () => {
    const out = componi([p("a", "uno"), p("b", "due")], { b: "DUE" });
    expect(out[0]).toMatchObject({ contenuto: { t: "uno" } });
    expect(out[1]).toMatchObject({ contenuto: { t: "DUE" } });
  });
});
