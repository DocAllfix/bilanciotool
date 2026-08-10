// I controlli del blog, provati per sabotaggio.
//
// Un controllo automatico che non è mai diventato rosso non è un controllo: è una riga che
// stampa «ok». Qui ogni prova parte da una pagina SANA, rompe **una cosa sola**, e pretende
// che il controllo se ne accorga — e che si accorga di quella, non di un'altra.
//
// Per questo il giudizio è separato dallo scaricamento: `verificaBlog` va in rete, ma decide
// con queste funzioni pure. Se il giudizio vivesse dentro la funzione che scarica, provarlo
// richiederebbe di simulare `fetch`, e si finirebbe per provare il simulacro.

import { describe, it, expect } from "vitest";
import { eRimosso } from "@/features/blog/rimossi";
import {
  urlArticoliDaSitemap,
  urlArticoliDaIndice,
  slugCopertiDaRimossi,
  difettiDellaPagina,
  giudizioInterruttore,
  canonicalDi,
  quantiSchemiArticolo,
  immaginiDellaPagina,
  autoriCitati,
  riepilogo,
  esitoPagine,
  identitaMancante,
} from "@/features/blog/verifica";

const SITO = "https://evalisdeck.it";
const CMS = "cms.evalisdeck.it";

/** Una pagina articolo senza difetti. Ogni prova ne rompe un pezzo solo. */
function paginaSana(): string {
  return `<!doctype html><html lang="it"><head>
<title>Come si costruisce un inventario di gas serra</title>
<meta name="description" content="Una guida pratica alla ISO 14064-1 per le piccole e medie imprese italiane.">
<link rel="canonical" href="${SITO}/blog/inventario-gas-serra">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"Come si costruisce un inventario","datePublished":"2026-08-04T09:00:00+02:00","author":{"@type":"Person","name":"Redazione EvalisDeck"}}</script>
</head><body>
<article><p>Testo dell'articolo.</p>
<img src="/wp-content/uploads/2026/08/schema.webp" alt="Schema dei confini organizzativi">
<a href="/blog/autore/redazione">Redazione EvalisDeck</a>
</article></body></html>`;
}

const URL_ARTICOLO = `${SITO}/blog/inventario-gas-serra`;
const opzioni = { sito: SITO, hostCms: CMS };

describe("difettiDellaPagina — la pagina sana non ha difetti", () => {
  it("non segnala nulla su una pagina completa", () => {
    expect(difettiDellaPagina(URL_ARTICOLO, paginaSana(), opzioni)).toEqual([]);
  });
});

describe("difettiDellaPagina — sabotaggi, uno per volta", () => {
  const sabotaggi: ReadonlyArray<[string, (h: string) => string, RegExp]> = [
    [
      "canonical rimosso",
      (h) => h.replace(/<link rel="canonical"[^>]*>/, ""),
      /canonical assente/,
    ],
    [
      "canonical che punta al CMS",
      (h) => h.replace(SITO + "/blog/inventario", "https://" + CMS + "/blog/inventario"),
      /canonical su un altro dominio/,
    ],
    [
      "un link al CMS lasciato nel testo",
      (h) => h.replace("<p>Testo", `<p><a href="https://${CMS}/wp-admin">bozza</a> Testo`),
      new RegExp(`riferimento a ${CMS}`),
    ],
    [
      "title svuotato",
      (h) => h.replace(/<title>[^<]*<\/title>/, "<title></title>"),
      /title mancante/,
    ],
    [
      "meta description rimossa",
      (h) => h.replace(/<meta name="description"[^>]*>/, ""),
      /meta description mancante/,
    ],
    [
      "data di pubblicazione sparita dallo schema",
      (h) => h.replace(/"datePublished":"[^"]*",/, ""),
      /data di pubblicazione assente/,
    ],
    [
      "schema Article duplicato (Yoast piu' il nostro)",
      (h) =>
        h.replace(
          "</head>",
          `<script type="application/ld+json">{"@type":"Article","headline":"doppione","datePublished":"2026-08-04"}</script></head>`,
        ),
      /2 schemi Article/,
    ],
    [
      "autore dichiarato senza nome",
      (h) => h.replace('"name":"Redazione EvalisDeck"', '"name":""'),
      /autore senza nome/,
    ],
  ];

  for (const [nome, rompi, atteso] of sabotaggi) {
    it(`si accorge di: ${nome}`, () => {
      const difetti = difettiDellaPagina(URL_ARTICOLO, rompi(paginaSana()), opzioni);
      expect(difetti, `nessun difetto rilevato dopo aver rotto: ${nome}`).not.toEqual([]);
      expect(difetti.join(" | ")).toMatch(atteso);
      // Rompere una cosa sola deve produrre un rilievo solo: un controllo che ne segnala
      // tre non dice quale sia il guasto.
      expect(difetti).toHaveLength(1);
    });
  }
});

describe("urlArticoliDaSitemap", () => {
  const xml = `<?xml version="1.0"?><urlset>
<url><loc>${SITO}/</loc></url>
<url><loc>${SITO}/blog</loc></url>
<url><loc>${SITO}/blog/primo</loc></url>
<url><loc>${SITO}/blog/secondo</loc></url>
<url><loc>${SITO}/blog/autore/redazione</loc></url>
<url><loc>${SITO}/privacy</loc></url>
</urlset>`;

  it("prende gli articoli e lascia fuori indice, autori e pagine di prodotto", () => {
    expect(urlArticoliDaSitemap(xml, SITO)).toEqual([`${SITO}/blog/primo`, `${SITO}/blog/secondo`]);
  });

  it("su una sitemap senza blog non trova nulla", () => {
    expect(urlArticoliDaSitemap(`<urlset><url><loc>${SITO}/</loc></url></urlset>`, SITO)).toEqual([]);
  });
});

describe("urlArticoliDaIndice — la fonte quando il blog e' ancora invisibile ai motori", () => {
  const indice = `<main>
<a href="/blog/primo">Primo</a>
<a href="/blog/secondo/">Secondo</a>
<a href="/blog/autore/redazione">Redazione</a>
<a href="/blog">Tutti</a>
<a href="/privacy">Privacy</a>
<a href="${SITO}/blog/terzo">Terzo, in forma assoluta</a>
</main>`;

  it("trova gli articoli linkati, non gli autori ne' l'indice stesso", () => {
    expect(urlArticoliDaIndice(indice, SITO)).toEqual([
      `${SITO}/blog/primo`,
      `${SITO}/blog/secondo`,
      `${SITO}/blog/terzo`,
    ]);
  });

  it("non duplica un articolo linkato due volte", () => {
    const doppio = `<a href="/blog/primo">titolo</a><a href="/blog/primo">continua</a>`;
    expect(urlArticoliDaIndice(doppio, SITO)).toEqual([`${SITO}/blog/primo`]);
  });
});

describe("slugCopertiDaRimossi — un articolo vivo non deve rispondere 410", () => {
  it("tace quando nessun articolo pubblicato e' in elenco", () => {
    expect(slugCopertiDaRimossi([`${SITO}/blog/vivo`], SITO, ["morto"])).toEqual([]);
  });

  it("segnala l'articolo pubblicato che un 410 sta coprendo", () => {
    expect(slugCopertiDaRimossi([`${SITO}/blog/vivo`], SITO, ["vivo"])).toEqual(["vivo"]);
  });

  it("riconosce lo slug anche con la barra finale", () => {
    expect(slugCopertiDaRimossi([`${SITO}/blog/vivo/`], SITO, ["vivo"])).toEqual(["vivo"]);
  });
});

// L'invariante NON e' «devono esserci articoli»: e' «tutto quello che e' pubblicato deve
// stare in sitemap». La differenza conta, perche' un blog acceso e ancora vuoto e' uno stato
// legittimo — e' quello dei primi giorni — mentre un blog con articoli fuori dalla sitemap e'
// un guasto in qualunque momento.
describe("giudizioInterruttore — lo stato dichiarato e quello reale devono coincidere", () => {
  it("spento: il blog e' noindex e fuori dalla sitemap, come deve", () => {
    expect(
      giudizioInterruttore({ visibile: false, indiceNoindex: true, articoliInIndice: 1, articoliInSitemap: 0 }).ok,
    ).toBe(true);
  });

  it("spento ma indicizzabile: e' il guasto che pubblica il blog per sbaglio", () => {
    const g = giudizioInterruttore({ visibile: false, indiceNoindex: false, articoliInIndice: 0, articoliInSitemap: 0 });
    expect(g.ok).toBe(false);
    expect(g.dettaglio).toMatch(/noindex/);
  });

  it("spento ma gia' in sitemap: la sitemap invita Google dove il noindex lo respinge", () => {
    const g = giudizioInterruttore({ visibile: false, indiceNoindex: true, articoliInIndice: 3, articoliInSitemap: 3 });
    expect(g.ok).toBe(false);
    expect(g.dettaglio).toMatch(/sitemap/);
  });

  it("acceso: indicizzabile, e in sitemap c'e' tutto il pubblicato", () => {
    expect(
      giudizioInterruttore({ visibile: true, indiceNoindex: false, articoliInIndice: 4, articoliInSitemap: 4 }).ok,
    ).toBe(true);
  });

  it("acceso e ancora vuoto: e' lo stato dei primi giorni, non un guasto", () => {
    expect(
      giudizioInterruttore({ visibile: true, indiceNoindex: false, articoliInIndice: 0, articoliInSitemap: 0 }).ok,
    ).toBe(true);
  });

  it("acceso ma rimasto noindex: il caso che si scopre dopo mesi di zero visite", () => {
    const g = giudizioInterruttore({ visibile: true, indiceNoindex: true, articoliInIndice: 4, articoliInSitemap: 4 });
    expect(g.ok).toBe(false);
    expect(g.dettaglio).toMatch(/noindex/);
  });

  it("acceso, articoli pubblicati, sitemap vuota: esistono e Google non lo sa", () => {
    const g = giudizioInterruttore({ visibile: true, indiceNoindex: false, articoliInIndice: 2, articoliInSitemap: 0 });
    expect(g.ok).toBe(false);
    expect(g.dettaglio).toMatch(/sitemap/);
  });

  it("acceso, ma la sitemap ne elenca meno di quanti ne sono pubblicati", () => {
    const g = giudizioInterruttore({ visibile: true, indiceNoindex: false, articoliInIndice: 5, articoliInSitemap: 3 });
    expect(g.ok).toBe(false);
    expect(g.dettaglio).toMatch(/sitemap/);
  });
});

describe("le funzioni di lettura usate dai controlli", () => {
  it("canonicalDi legge l'attributo anche con href prima di rel", () => {
    expect(canonicalDi(`<link href="${SITO}/x" rel="canonical">`)).toBe(`${SITO}/x`);
    expect(canonicalDi("<link rel='stylesheet' href='/a.css'>")).toBeUndefined();
  });

  it("quantiSchemiArticolo conta solo i tipi che valgono come articolo", () => {
    expect(quantiSchemiArticolo(paginaSana())).toBe(1);
    expect(
      quantiSchemiArticolo(
        `<script type="application/ld+json">{"@type":"BreadcrumbList"}</script>`,
      ),
    ).toBe(0);
  });

  it("immaginiDellaPagina rende assoluti gli indirizzi relativi e non duplica", () => {
    expect(immaginiDellaPagina(paginaSana(), SITO)).toEqual([
      `${SITO}/wp-content/uploads/2026/08/schema.webp`,
    ]);
  });

  it("immaginiDellaPagina ignora le immagini che non vengono dal CMS", () => {
    expect(immaginiDellaPagina(`<img src="/brand/logo.svg">`, SITO)).toEqual([]);
  });

  it("autoriCitati trova la pagina autore collegata dall'articolo", () => {
    expect(autoriCitati(paginaSana(), SITO)).toEqual([`${SITO}/blog/autore/redazione`]);
  });
});

// `eRimosso` decide chi riceve un 410. Gira nel proxy, cioe' su OGNI richiesta del prodotto:
// un errore qui non colpisce il blog, colpisce il portafoglio e i percorsi.
describe("eRimosso — il predicato che decide il 410", () => {
  it("oggi non copre niente: nessun articolo e' ancora stato eliminato", () => {
    expect(eRimosso("/blog/qualunque-cosa")).toBe(false);
  });

  it("non tocca le pagine del prodotto, che pure attraversano il proxy", () => {
    for (const percorso of ["/", "/login", "/aziende/abc/ghg/2025", "/documento/xyz"]) {
      expect(eRimosso(percorso), percorso).toBe(false);
    }
  });

  it("non scambia una pagina autore per un articolo", () => {
    expect(eRimosso("/blog/autore/redazione")).toBe(false);
  });
});

describe("riepilogo", () => {
  it("e' verde solo se lo sono tutti", () => {
    expect(riepilogo([{ nome: "a", ok: true, dettaglio: "" }]).ok).toBe(true);
    expect(
      riepilogo([
        { nome: "a", ok: true, dettaglio: "" },
        { nome: "b", ok: false, dettaglio: "rotto" },
      ]).ok,
    ).toBe(false);
  });

  it("scrive una riga per controllo, leggibile in una mail", () => {
    const { righe } = riepilogo([{ nome: "sitemap", ok: false, dettaglio: "non risponde" }]);
    expect(righe).toEqual(["ROSSO sitemap: non risponde"]);
  });
});

describe("esitoPagine — bussare a ogni porta", () => {
  const base = { cosa: "pagine di articolo", seVuoto: "nessun articolo da provare" };

  it("e' rosso quando una pagina non si apre, e dice quale", () => {
    // E' il caso vero del 2026-08-10: l'articolo era nell'indice e nella sitemap, e
    // rispondeva 500 a chiunque lo aprisse. Tutti gli altri controlli erano verdi.
    const g = esitoPagine({
      ...base,
      rotte: ["https://evalisdeck.it/blog/rendicontazione-sostenibilita-pmi -> 500"],
      provate: 1,
      totale: 1,
    });
    expect(g.ok).toBe(false);
    expect(g.dettaglio).toContain("500");
    expect(g.dettaglio).toContain("rendicontazione-sostenibilita-pmi");
  });

  it("e' verde quando si aprono tutte", () => {
    const g = esitoPagine({ ...base, rotte: [], provate: 3, totale: 3 });
    expect(g.ok).toBe(true);
    expect(g.dettaglio).toBe("3 pagine di articolo si aprono");
  });

  it("dichiara quando ne ha provate solo una parte", () => {
    const g = esitoPagine({ ...base, rotte: [], provate: 25, totale: 80 });
    expect(g.dettaglio).toContain("le prime 25 di 80");
  });

  it("un blog ancora vuoto non e' un guasto", () => {
    // Stato legittimo dei primi giorni: un controllo che qui diventasse rosso
    // manderebbe un allarme ogni mattina, e si smetterebbe di leggerlo.
    const g = esitoPagine({ ...base, rotte: [], provate: 0, totale: 0 });
    expect(g.ok).toBe(true);
    expect(g.dettaglio).toBe("nessun articolo da provare");
  });
});

describe("identitaMancante — una firma deve portare a una persona", () => {
  const person = (extra: string) =>
    `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"Bruno Santini"${extra}}</script>`;

  it("segnala la biografia assente", () => {
    expect(identitaMancante(person(""))).toContain("la biografia");
  });

  it("non si accontenta di un segnaposto", () => {
    // Un controllo che si zittisce con «ok» non e' un controllo.
    expect(identitaMancante(person(',"description":"ok"'))).toContain("la biografia");
  });

  it("segnala l'assenza di un profilo esterno", () => {
    const html = person(',"description":"Consulente SEO con dieci anni di esperienza nel settore."');
    expect(identitaMancante(html)).toEqual(["un profilo pubblico esterno"]);
  });

  it("tace quando la persona e' descritta e verificabile altrove", () => {
    const html = person(
      ',"description":"Consulente SEO con dieci anni di esperienza nel settore.","sameAs":["https://www.linkedin.com/in/tizio"]',
    );
    expect(identitaMancante(html)).toEqual([]);
  });

  it("se lo schema Person non c'e', lo dice invece di fingere che vada bene", () => {
    expect(identitaMancante("<html><body>Bruno Santini</body></html>")).toEqual(["lo schema Person"]);
  });
});
