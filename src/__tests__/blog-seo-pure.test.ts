// La traduzione dei metadati di Yoast nei metadati della pagina.
//
// La regola che governa tutto lo strato: **WordPress fornisce i valori, il sito decide la
// presentazione e gli indirizzi.** Il canonical non e' mai quello del CMS, e il marchio in
// coda al titolo lo mette il sito una volta sola.

import { describe, it, expect } from "vitest";
import { seoDaYoast, senzaMarchioInCoda } from "@/features/blog/seo";

const CMS = "https://cms.evalisdeck.it";
const PUBBLICO = "https://evalisdeck.it";

describe("senzaMarchioInCoda", () => {
  it("toglie il nome del sito accodato con il trattino", () => {
    expect(senzaMarchioInCoda("Come si fa un inventario - EvalisDeck", "EvalisDeck")).toBe(
      "Come si fa un inventario",
    );
  });

  it("toglie anche le altre spaziature che Yoast puo' usare", () => {
    for (const sep of ["-", "–", "—", "|", "·", "»"]) {
      expect(senzaMarchioInCoda(`Titolo ${sep} EvalisDeck`, "EvalisDeck")).toBe("Titolo");
    }
  });

  it("non guarda le maiuscole", () => {
    expect(senzaMarchioInCoda("Titolo - evalisdeck", "EvalisDeck")).toBe("Titolo");
  });

  it("lascia stare il titolo che il marchio non ce l'ha", () => {
    expect(senzaMarchioInCoda("Un titolo qualunque", "EvalisDeck")).toBe("Un titolo qualunque");
  });

  it("non tocca il marchio quando compare nel mezzo", () => {
    expect(senzaMarchioInCoda("EvalisDeck spiegato ai consulenti", "EvalisDeck")).toBe(
      "EvalisDeck spiegato ai consulenti",
    );
  });

  it("non svuota un titolo che e' soltanto il marchio", () => {
    expect(senzaMarchioInCoda("EvalisDeck", "EvalisDeck")).toBe("EvalisDeck");
  });

  it("senza nome del sito non tocca niente", () => {
    expect(senzaMarchioInCoda("Titolo - EvalisDeck", undefined)).toBe("Titolo - EvalisDeck");
  });
});

describe("seoDaYoast", () => {
  it("consegna il titolo senza il marchio: lo accoda il layout, una volta sola", () => {
    const seo = seoDaYoast(
      {
        title: "Articolo di prova - EvalisDeck",
        og_title: "Articolo di prova - EvalisDeck",
        og_site_name: "EvalisDeck",
        description: "Una descrizione lunga abbastanza.",
      },
      { slug: "articolo-di-prova", cms: CMS, pubblico: PUBBLICO },
    );
    expect(seo.title).toBe("Articolo di prova");
    expect(seo.ogTitle).toBe("Articolo di prova");
  });

  it("il canonical e' sempre nostro, anche se Yoast ne dichiara un altro", () => {
    const seo = seoDaYoast(
      { canonical: `${CMS}/articolo-di-prova/` },
      { slug: "articolo-di-prova", cms: CMS, pubblico: PUBBLICO },
    );
    expect(seo.canonical).toBe(`${PUBBLICO}/blog/articolo-di-prova`);
  });

  it("riporta l'immagine di anteprima sul dominio pubblico", () => {
    const seo = seoDaYoast(
      { og_image: [{ url: `${CMS}/wp-content/uploads/2026/08/copertina.webp` }] },
      { slug: "x", cms: CMS, pubblico: PUBBLICO },
    );
    expect(seo.ogImage).toBe(`${PUBBLICO}/wp-content/uploads/2026/08/copertina.webp`);
  });

  it("senza Yoast non inventa niente", () => {
    const seo = seoDaYoast(undefined, { slug: "x", cms: CMS, pubblico: PUBBLICO });
    expect(seo.title).toBeUndefined();
    expect(seo.description).toBeUndefined();
    expect(seo.canonical).toBe(`${PUBBLICO}/blog/x`);
  });
});
