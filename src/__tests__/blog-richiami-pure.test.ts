import { describe, it, expect } from "vitest";
import { dividiPerRichiami, CLASSE_RICHIAMO } from "@/features/blog/richiami";
import { sanificaHtml } from "@/features/blog/sanitize";

// Il segnaposto che il consulente SEO incolla in WordPress.
//
// ⚠️ Questi controlli guardano il caso vero: l'HTML **dopo la sanificazione**, perché è
// quello che arriva al renderer. Provare il segnaposto su una stringa scritta a mano
// direbbe che funziona anche se la lista bianca lo buttasse via per strada.

const RICHIAMO = `<div class="${CLASSE_RICHIAMO}" id="bilancio-energetico"></div>`;

describe("il segnaposto del richiamo", () => {
  it("⚠️ sopravvive alla sanificazione degli articoli", () => {
    // Se un giorno la lista bianca smettesse di accettare `class` o `id` su un `div`, il
    // segnaposto sparirebbe dagli articoli senza che nessuno se ne accorga: resterebbe un
    // riquadro mancante in fondo a nove articoli, e nessun errore da nessuna parte.
    const pulito = sanificaHtml(`<p>Testo.</p>${RICHIAMO}`);
    expect(pulito).toContain(CLASSE_RICHIAMO);
    expect(pulito).toContain("bilancio-energetico");
  });

  it("divide il testo in tre pezzi: prima, richiamo, dopo", () => {
    const pezzi = dividiPerRichiami(`<p>Prima.</p>${RICHIAMO}<p>Dopo.</p>`);
    expect(pezzi.map((p) => p.tipo)).toEqual(["html", "richiamo", "html"]);
    expect(pezzi[1]).toEqual({ tipo: "richiamo", slug: "bilancio-energetico" });
  });

  it("regge le forme che escono da un editor: ordine degli attributi, apici, classi in più", () => {
    const varianti = [
      `<div id="soa" class="${CLASSE_RICHIAMO}"></div>`,
      `<div class='wp-block-html ${CLASSE_RICHIAMO}' id='soa'></div>`,
      `<div   class="${CLASSE_RICHIAMO}"   id="soa" >  </div>`,
    ];
    for (const v of varianti) {
      const pezzi = dividiPerRichiami(`<p>x</p>${v}`);
      expect(pezzi.some((p) => p.tipo === "richiamo" && p.slug === "soa"), v).toBe(true);
    }
  });

  it("toglie il paragrafo che l'editor avvolge attorno al blocco", () => {
    // WordPress può incartare l'HTML in un `<p>`: senza questa pulizia resterebbe uno
    // spazio fantasma là dove prima c'era il riquadro.
    const pezzi = dividiPerRichiami(`<p>Testo.</p><p>${RICHIAMO}</p><p>Altro.</p>`);
    expect(pezzi.map((p) => p.tipo)).toEqual(["html", "richiamo", "html"]);
    expect(pezzi[0].tipo === "html" && pezzi[0].html.endsWith("<p>")).toBe(false);
    expect(pezzi[2].tipo === "html" && pezzi[2].html.startsWith("</p>")).toBe(false);
  });

  it("ne riconosce più d'uno nello stesso articolo", () => {
    const pezzi = dividiPerRichiami(`<p>a</p>${RICHIAMO}<p>b</p><div class="${CLASSE_RICHIAMO}" id="soa"></div>`);
    expect(pezzi.filter((p) => p.tipo === "richiamo").map((p) => (p as { slug: string }).slug))
      .toEqual(["bilancio-energetico", "soa"]);
  });

  it("un articolo senza segnaposto resta un pezzo solo, intatto", () => {
    const html = "<p>Nessun richiamo qui.</p><div class='wp-block-group'><p>x</p></div>";
    const pezzi = dividiPerRichiami(html);
    expect(pezzi).toEqual([{ tipo: "html", html }]);
  });

  it("⚠️ un div vuoto che NON è il segnaposto non viene toccato", () => {
    // Gli editor ne lasciano in giro: se li mangiassimo, l'articolo perderebbe pezzi.
    const html = `<p>a</p><div class="wp-block-spacer"></div><p>b</p>`;
    expect(dividiPerRichiami(html)).toEqual([{ tipo: "html", html }]);
  });

  it("senza id non è un richiamo: meglio niente che un rimando a caso", () => {
    const html = `<p>a</p><div class="${CLASSE_RICHIAMO}"></div>`;
    expect(dividiPerRichiami(html).every((p) => p.tipo === "html")).toBe(true);
  });
});
