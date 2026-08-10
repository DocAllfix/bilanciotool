import { describe, it, expect } from "vitest";
import { indiceDaHtml, SOGLIA_INDICE } from "@/features/blog/indice";

// L'indice dei contenuti di un articolo.
//
// Il punto delicato non è estrarre i titoli: è che le ancore FUNZIONINO. Un indice che
// rimanda a `#qualcosa` che nel testo non esiste è peggio di nessun indice — sembra
// funzionare, e non porta da nessuna parte. Per questo la funzione restituisce insieme
// le voci e l'HTML: sono lo stesso lavoro, e separarli è il modo di farli divergere.

describe("indice dei contenuti", () => {
  const art = `
    <p>Introduzione.</p>
    <h2 class="wp-block-heading">Cos&#8217;è la rendicontazione</h2>
    <p>testo</p>
    <h2 class="wp-block-heading">Chi è obbligato</h2>
    <h3 class="wp-block-heading">E le PMI?</h3>
    <h2 class="wp-block-heading">Da dove iniziare</h2>
  `;

  it("raccoglie H2 e H3 conservando la gerarchia", () => {
    const { voci } = indiceDaHtml(art);
    expect(voci.map((v) => v.livello)).toEqual([2, 2, 3, 2]);
    // `&#8217;` e' l'apostrofo tipografico, non quello dritto: e' quello che WordPress
    // produce ed e' quello giusto da mostrare.
    expect(voci[0].testo).toBe("Cos’è la rendicontazione");
  });

  it("ogni voce punta a un'ancora che nel testo ESISTE davvero", () => {
    const { html, voci } = indiceDaHtml(art);
    expect(voci.length).toBeGreaterThan(0);
    for (const v of voci) {
      expect(html, `l'ancora #${v.id} non esiste nel testo`).toContain(`id="${v.id}"`);
    }
  });

  it("decodifica le entità: nell'indice non deve comparire &#8217;", () => {
    const { voci } = indiceDaHtml(art);
    expect(voci.some((v) => /&#|&amp;|&nbsp;/.test(v.testo))).toBe(false);
  });

  it("gli identificativi sono leggibili e senza accenti", () => {
    const { voci } = indiceDaHtml(art);
    expect(voci[0].id).toBe("cose-la-rendicontazione");
    for (const v of voci) expect(v.id).toMatch(/^[a-z0-9-]+$/);
  });

  it("due titoli uguali non producono due ancore uguali", () => {
    // Con l'ancora doppia il browser salta sempre alla prima, e la seconda voce
    // dell'indice porta nel posto sbagliato senza dare nessun segnale.
    const { html, voci } = indiceDaHtml("<h2>Conclusioni</h2><p>a</p><h2>Conclusioni</h2>");
    expect(voci[0].id).not.toBe(voci[1].id);
    expect(html).toContain(`id="${voci[0].id}"`);
    expect(html).toContain(`id="${voci[1].id}"`);
  });

  it("rispetta un id già scritto dal redattore", () => {
    const { voci } = indiceDaHtml('<h2 id="mio-punto">Un titolo</h2>');
    expect(voci[0].id).toBe("mio-punto");
  });

  it("ignora H1 e H4: l'indice è una mappa, non un sommario di tutto", () => {
    const { voci } = indiceDaHtml("<h1>Titolo</h1><h2>Uno</h2><h4>Dettaglio</h4>");
    expect(voci).toHaveLength(1);
    expect(voci[0].testo).toBe("Uno");
  });

  it("toglie il markup dal testo della voce", () => {
    const { voci } = indiceDaHtml('<h2>Un <strong>titolo</strong> con <em>enfasi</em></h2>');
    expect(voci[0].testo).toBe("Un titolo con enfasi");
  });

  it("un articolo senza titoli non produce indice, e l'HTML resta intatto", () => {
    const html = "<p>Solo testo.</p>";
    const r = indiceDaHtml(html);
    expect(r.voci).toEqual([]);
    expect(r.html).toBe(html);
  });

  it("la soglia esiste: sotto, un indice è rumore", () => {
    // Due voci non sono una mappa: sono due righe in più fra il lettore e l'articolo.
    expect(SOGLIA_INDICE).toBeGreaterThanOrEqual(3);
  });
});
