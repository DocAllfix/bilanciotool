import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RendeCorpus } from "../rende-corpus";
import type { Blocco } from "@/lib/calc/corpus/blocchi";
import type { Segnaposto, Contesto } from "@/lib/calc/corpus/segnaposto";

// La resa del corpus in markup. Le decisioni di struttura sono gia' provate in
// `blocchi-pure`: qui si verifica che il markup le rispetti, e le tre cose che solo il
// markup puo' sbagliare — il segnaposto evidenziato, le righe vuote stampate, la tabella
// ricomposta che resta UNA tabella.
//
// Il file e' `.ts` e non `.tsx` di proposito: la configurazione dei test include solo
// `.ts`, e non vale la pena cambiarla per un file. `createElement` fa lo stesso lavoro.

const p = (id: string, t: string): Blocco => ({ blockId: id, tipo: "p", contenuto: { t } });
const tab = (id: string, r: string[][], b?: number): Blocco => ({
  blockId: id,
  tipo: "t",
  contenuto: b === undefined ? { r } : { r, b },
});

const SEGNAPOSTI: Segnaposto[] = [
  { forma: "[Nome Organizzazione]", genere: "token", fonte: "azienda", campo: "ragione" },
  { forma: "[Alta Direzione]", genere: "token", fonte: "azienda", campo: "direzione" },
  { forma: "[GG/MM/AAAA]", genere: "campo", fonte: null, campo: null },
];

const CTX: Contesto = {
  studio: "Studio Rossi",
  azienda: { ragione: "Meccanica Adriatica S.r.l." },
  revisione: "01",
  data: null,
};

const rendi = (blocchi: Blocco[], override: Record<string, string> = {}) =>
  renderToStaticMarkup(
    createElement(RendeCorpus, { blocchi, override, segnaposti: SEGNAPOSTI, contesto: CTX }),
  );

describe("resa dei paragrafi", () => {
  it("un titolo di primo livello diventa h3, uno di secondo h4", () => {
    const html = rendi([p("a", "1. SCOPO"), p("b", "1.2 Riferimenti"), p("c", "Testo normale.")]);
    expect(html).toContain("<h3");
    expect(html).toContain("1. SCOPO");
    expect(html).toContain("<h4");
    expect(html).toContain("<p");
    expect(html).toContain("Testo normale.");
  });

  it("ogni unita' porta la chiave del blocco, per il tour e per l'editing", () => {
    expect(rendi([p("chiave123", "Testo.")])).toContain('data-blocco="chiave123"');
  });

  it("gli a capo dentro un paragrafo diventano interruzioni di riga", () => {
    expect(rendi([p("a", "prima\nseconda")])).toContain("<br/>");
  });
});

describe("i segnaposto", () => {
  it("un token con valore sparisce, sostituito", () => {
    const html = rendi([p("a", "[Nome Organizzazione] adotta il modello.")]);
    expect(html).toContain("Meccanica Adriatica S.r.l. adotta il modello.");
    expect(html).not.toContain("[Nome Organizzazione]");
  });

  // Un buco dichiarato e' meglio di una frase monca: il segnaposto resta e si vede.
  it("un token SENZA valore resta, ed e' marcato come mancante", () => {
    const html = rendi([p("a", "Approvato da: [Alta Direzione]")]);
    expect(html).toContain("[Alta Direzione]");
    expect(html).toContain("data-mancante");
    expect(html).toContain("corpus-mancante");
  });

  it("una casella da riempire resta, marcata come le altre", () => {
    const html = rendi([p("a", "Data: [GG/MM/AAAA]")]);
    expect(html).toContain("[GG/MM/AAAA]");
  });

  it("il testo su misura del cliente sostituisce il paragrafo, e i token dentro si risolvono", () => {
    const html = rendi([p("a", "originale")], { a: "[Nome Organizzazione] su misura" });
    expect(html).toContain("Meccanica Adriatica S.r.l. su misura");
    expect(html).not.toContain("originale");
  });
});

describe("le tabelle", () => {
  it("con intestazione produce thead, senza no", () => {
    const conTesta = rendi([tab("a", [["Cod", "Nome"], ["1", "Alfa"]])]);
    expect(conTesta).toContain("<thead>");
    expect(conTesta).toContain("<th>Cod</th>");

    const senza = rendi([tab("b", [["MODULO X", "", ""], ["Codice:", "X", "Rev."]])]);
    expect(senza).not.toContain("<thead>");
  });

  // ⚠️ La correzione che vale piu' di tutte: nel prototipo della filiera intestazione e
  // righe sono blocchi separati, e resi uno per uno diventerebbero tabelline staccate.
  it("una tabella spezzata in blocchi torna UNA tabella sola", () => {
    const html = rendi([
      tab("h1", [["#", "Requisito", "Natura"]]),
      tab("r1", [["A1", "Lavoro minorile", "Inderogabile"]]),
      tab("r2", [["A2", "Lavoro forzato", "Inderogabile"]]),
    ]);
    expect(html.match(/<table/g) ?? []).toHaveLength(1);
    expect(html).toContain("<th>#</th>");
    expect(html.match(/<tr>/g) ?? []).toHaveLength(3); // intestazione + due righe
    // La chiave riporta tutti i blocchi che sono confluiti.
    expect(html).toContain('data-blocco="h1 r1 r2"');
  });

  it("stampa esattamente le righe vuote che il corpus chiede, anche venti", () => {
    const html = rendi([tab("a", [["A", "B"], ["1", "2"]], 20)]);
    expect(html.match(/corpus-riga-vuota/g) ?? []).toHaveLength(20);
  });

  it("le righe irregolari si pareggiano invece di rompere la tabella", () => {
    const html = rendi([tab("a", [["A", "B", "C"], ["1"], ["2", "3"]])]);
    // Due righe di corpo, tre celle ciascuna.
    expect(html.match(/<td>/g) ?? []).toHaveLength(6);
  });
});

describe("le firme", () => {
  it("il blocco firma produce due caselle", () => {
    const html = renderToStaticMarkup(
      createElement(RendeCorpus, {
        blocchi: [{ blockId: "s", tipo: "sig", contenuto: {} }],
        segnaposti: SEGNAPOSTI,
        contesto: CTX,
      }),
    );
    expect(html.match(/corpus-firma"/g) ?? []).toHaveLength(2);
  });
});

describe("robustezza", () => {
  it("un documento vuoto non rompe niente", () => {
    expect(rendi([])).toBe("");
  });

  it("una tabella senza righe non rompe niente", () => {
    const html = rendi([{ blockId: "a", tipo: "t", contenuto: {} }]);
    expect(html).toContain("<table");
    expect(html).not.toContain("<td>");
  });
});
