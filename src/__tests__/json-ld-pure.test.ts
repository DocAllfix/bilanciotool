import { describe, it, expect } from "vitest";
import { jsonLd } from "@/features/blog/seo";

// I dati strutturati nascono da testo che scrive una persona sul CMS.
//
// `JSON.stringify` non scappa `<`. Un titolo d'articolo che contenesse `</script>`
// chiuderebbe il tag `<script type="application/ld+json">` e il resto della stringa
// diventerebbe codice eseguibile nella pagina. Sul CMS c'e' un editor esterno, il
// consulente SEO: «gli autori sono fidati» qui vale una persona in meno, non zero.

const cattivo = '</script><script>alert(document.cookie)</script>';

describe("jsonLd: i dati del CMS non possono uscire dal tag", () => {
  it("un titolo che chiude il tag non lo chiude piu'", () => {
    const uscita = jsonLd({ "@type": "Article", headline: cattivo });
    expect(uscita).not.toContain("</script>");
    expect(uscita).not.toContain("<script>");
    expect(uscita).toContain("\\u003c");
  });

  it("il dato resta lo stesso: e' JSON legittimo, non testo mutilato", () => {
    // La prova che conta per il SEO: Google rilegge esattamente cio' che abbiamo scritto.
    const dato = { "@type": "Person", name: cattivo, description: "5 < 7 e 9 > 2" };
    expect(JSON.parse(jsonLd(dato))).toEqual(dato);
  });

  it("scappa anche `>`, che da solo non chiude niente ma completa la coppia", () => {
    expect(jsonLd({ a: "a > b" })).not.toContain(">");
  });

  it("scappa i separatori di riga U+2028 e U+2029", () => {
    // Non chiudono un tag: sono fine-riga per il parser JavaScript, e spezzano lo
    // script anche quando il JSON e' perfettamente valido.
    const uscita = jsonLd({ testo: "prima dopo fine" });
    expect(uscita).not.toContain(" ");
    expect(uscita).not.toContain(" ");
    expect(JSON.parse(uscita)).toEqual({ testo: "prima dopo fine" });
  });

  it("gli accenti italiani restano leggibili", () => {
    // Scappare troppo renderebbe illeggibile il 90% dei nostri titoli.
    expect(jsonLd({ t: "Sostenibilità è così" })).toContain("Sostenibilità è così");
  });
});
