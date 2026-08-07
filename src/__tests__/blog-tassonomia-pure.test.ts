// Categorie, tag, archivi e briciole di pane.
//
// La regola che questi test difendono: **un archivio con pochi articoli non si indicizza.**
// Con un solo articolo dentro, la pagina di categoria è una copia sbiadita di quell'articolo
// e gli fa concorrenza sulle stesse parole. Con cinque diventa un punto di raccolta vero.
// La soglia rende la cosa automatica: nessuno deve ricordarsi di cambiare un'impostazione
// quando il blog cresce.

import { describe, it, expect } from "vitest";
import {
  archivioIndicizzabile,
  SOGLIA_ARCHIVIO,
  bricioleArticolo,
  bricioleArchivio,
} from "@/features/blog/tassonomia";
import { categoriaDaPost, tagDaPost } from "@/features/blog/mappa";
import type { PostWP } from "@/features/blog/tipi";

const SITO = "https://evalisdeck.it";

function postCon(termini: Array<{ taxonomy: string; name: string; slug: string }>): PostWP {
  return { id: 1, slug: "x", _embedded: { "wp:term": [termini] } };
}

describe("categoriaDaPost", () => {
  it("prende la categoria, non il tag", () => {
    const p = postCon([
      { taxonomy: "post_tag", name: "ISO 14064", slug: "iso-14064" },
      { taxonomy: "category", name: "Guide", slug: "guide" },
    ]);
    expect(categoriaDaPost(p)).toEqual({ nome: "Guide", slug: "guide" });
  });

  it("decodifica le entità nel nome", () => {
    expect(categoriaDaPost(postCon([{ taxonomy: "category", name: "Novit&agrave;", slug: "novita" }]))).toEqual({
      nome: "Novità",
      slug: "novita",
    });
  });

  it("senza categoria non inventa niente", () => {
    expect(categoriaDaPost(postCon([]))).toBeUndefined();
    expect(categoriaDaPost({ id: 1, slug: "x" })).toBeUndefined();
  });

  it("scarta «Uncategorized», che è l'assenza di scelta travestita da scelta", () => {
    expect(categoriaDaPost(postCon([{ taxonomy: "category", name: "Uncategorized", slug: "uncategorized" }]))).toBeUndefined();
    expect(categoriaDaPost(postCon([{ taxonomy: "category", name: "Senza categoria", slug: "senza-categoria" }]))).toBeUndefined();
  });
});

describe("tagDaPost", () => {
  it("prende tutti i tag e nessuna categoria", () => {
    const p = postCon([
      { taxonomy: "category", name: "Guide", slug: "guide" },
      { taxonomy: "post_tag", name: "ISO 14064", slug: "iso-14064" },
      { taxonomy: "post_tag", name: "PMI", slug: "pmi" },
    ]);
    expect(tagDaPost(p)).toEqual([
      { nome: "ISO 14064", slug: "iso-14064" },
      { nome: "PMI", slug: "pmi" },
    ]);
  });

  it("senza tag restituisce un elenco vuoto, non undefined", () => {
    expect(tagDaPost(postCon([]))).toEqual([]);
  });

  it("scarta i termini senza slug: non sarebbero raggiungibili", () => {
    const p = postCon([{ taxonomy: "post_tag", name: "Rotto", slug: "" }]);
    expect(tagDaPost(p)).toEqual([]);
  });
});

describe("archivioIndicizzabile", () => {
  it("un archivio quasi vuoto resta fuori dagli indici", () => {
    for (let n = 0; n < SOGLIA_ARCHIVIO; n++) {
      expect(archivioIndicizzabile(n), `${n} articoli`).toBe(false);
    }
  });

  it("dalla soglia in su diventa una pagina che vale la pena indicizzare", () => {
    expect(archivioIndicizzabile(SOGLIA_ARCHIVIO)).toBe(true);
    expect(archivioIndicizzabile(SOGLIA_ARCHIVIO + 40)).toBe(true);
  });

  it("la soglia è almeno 2: con un articolo solo l'archivio è quell'articolo", () => {
    expect(SOGLIA_ARCHIVIO).toBeGreaterThanOrEqual(2);
  });
});

describe("bricioleArticolo — il percorso che Google mostra al posto dell'URL", () => {
  it("parte dalla home, passa dal blog e finisce sul titolo", () => {
    const b = bricioleArticolo(SITO, { title: "Come si fa un inventario", slug: "inventario" });
    expect(b.map((x) => x.nome)).toEqual(["EvalisDeck", "Blog", "Come si fa un inventario"]);
    expect(b.map((x) => x.url)).toEqual([SITO, `${SITO}/blog`, `${SITO}/blog/inventario`]);
  });

  it("con la categoria la infila fra il blog e l'articolo", () => {
    const b = bricioleArticolo(SITO, {
      title: "Titolo",
      slug: "titolo",
      categoria: { nome: "Guide", slug: "guide" },
    });
    expect(b.map((x) => x.nome)).toEqual(["EvalisDeck", "Blog", "Guide", "Titolo"]);
    expect(b[2].url).toBe(`${SITO}/blog/categoria/guide`);
  });

  it("l'ultima briciola è sempre la pagina corrente", () => {
    const b = bricioleArticolo(SITO, { title: "T", slug: "t" });
    expect(b.at(-1)?.url).toBe(`${SITO}/blog/t`);
  });
});

describe("bricioleArchivio", () => {
  it("categoria: home, blog, nome della categoria", () => {
    const b = bricioleArchivio(SITO, "categoria", { nome: "Guide", slug: "guide" });
    expect(b.map((x) => x.nome)).toEqual(["EvalisDeck", "Blog", "Guide"]);
    expect(b.at(-1)?.url).toBe(`${SITO}/blog/categoria/guide`);
  });

  it("tag: stesso percorso, altra cartella", () => {
    const b = bricioleArchivio(SITO, "tag", { nome: "PMI", slug: "pmi" });
    expect(b.at(-1)?.url).toBe(`${SITO}/blog/tag/pmi`);
  });
});
