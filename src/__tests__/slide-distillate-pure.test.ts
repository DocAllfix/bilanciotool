import { describe, it, expect } from "vitest";
import {
  LAYOUT_SLIDE,
  momentiDistillati,
  sostituisciNumeri,
  validaSlide,
  type VoceSlide,
} from "@/features/formazione/slide-distillate";

// LE SLIDE DISTILLATE, dalla parte che non ha bisogno di un browser.
//
// ⚠️ Il contratto con l'altra sessione, concordato il 14 settembre 2026: un file per corso,
// `audio-formazione/<corso>/slide.json`, con voci `{ sezione, p, inizia, layout, ...campi }`.
// `p` è il paragrafo del copione da cui la slide PARTE; la slide dura fino al `p` della voce
// successiva della stessa sezione.
//
// ⚠️ Il pericolo che questo file esiste per chiudere è l'ACCOPPIAMENTO PER POSIZIONE. `p` è
// un indice in un elenco di paragrafi senza identificatori: inserendo un paragrafo a metà
// copione, ogni slide successiva comincerebbe sulla frase sbagliata e niente protesterebbe.
// `inizia` — le prime parole del paragrafo — è l'ancora che lo fa protestare.

const COPIONI = {
  "nis2/chi-rientra": [
    "Prima di chiedersi quanto un'azienda sia conforme, c'è una domanda.",
    "Il decreto si applica a chi opera in certi settori.",
    "La classificazione decide le sanzioni.",
  ].join("\n\n"),
};
const NUMERI = { requisitiNis2Autovalutazione: 124, capiNis2: 12 };
const CTX = { corso: "nis2", copioni: COPIONI, numeri: NUMERI };

const base = (extra: Partial<VoceSlide> & Record<string, unknown> = {}): VoceSlide =>
  ({
    sezione: "chi-rientra",
    p: 0,
    inizia: "Prima di chiedersi quanto",
    layout: "evidenza",
    titolo: "Rientra, e a quale titolo?",
    ...extra,
  }) as VoceSlide;

describe("validaSlide", () => {
  it("una voce giusta non produce errori", () => {
    expect(validaSlide([base()], CTX)).toEqual([]);
  });

  it("⚠️ `inizia` deve essere l'inizio VERO del paragrafo `p`", () => {
    // È la difesa contro l'accoppiamento per posizione: un paragrafo inserito sposta tutto.
    const errori = validaSlide([base({ inizia: "Il decreto si applica" })], CTX);
    expect(errori.join()).toMatch(/inizia/);
  });

  it("`inizia` ignora maiuscole e spazi, non le parole", () => {
    expect(validaSlide([base({ inizia: "  prima di   CHIEDERSI quanto " })], CTX)).toEqual([]);
  });

  it("ogni sezione comincia dal paragrafo 0", () => {
    const errori = validaSlide([base({ p: 1, inizia: "Il decreto si applica" })], CTX);
    expect(errori.join()).toMatch(/paragrafo 0/);
  });

  it("i `p` crescono in modo stretto dentro la sezione", () => {
    const voci = [
      base(),
      base({ p: 2, inizia: "La classificazione decide" }),
      base({ p: 1, inizia: "Il decreto si applica" }),
    ];
    expect(validaSlide(voci, CTX).join()).toMatch(/crescere/);
  });

  it("un `p` oltre l'ultimo paragrafo è un errore, non una slide che non compare mai", () => {
    const voci = [base(), base({ p: 9, inizia: "qualunque cosa" })];
    expect(validaSlide(voci, CTX).join()).toMatch(/paragrafi/);
  });

  it("una sezione senza copione è un errore: la slide non avrebbe una voce da seguire", () => {
    expect(validaSlide([base({ sezione: "inventata" })], CTX).join()).toMatch(/copione/);
  });

  it("un layout sconosciuto è un errore", () => {
    expect(validaSlide([base({ layout: "carosello" as never })], CTX).join()).toMatch(/layout/);
  });

  it("i campi obbligatori di un layout si pretendono", () => {
    expect(validaSlide([base({ layout: "punti", titolo: "X" })], CTX).join()).toMatch(/punti/);
  });

  it("⚠️ i tetti che tengono la slide dentro la tela", () => {
    const punti = Array.from({ length: 9 }, (_, i) => ({ d: `voce ${i}` }));
    expect(validaSlide([base({ layout: "punti", punti })], CTX).join()).toMatch(/al massimo 8/);
    const cards = Array.from({ length: 7 }, (_, i) => ({ h: `c${i}` }));
    expect(validaSlide([base({ layout: "cards", cards })], CTX).join()).toMatch(/al massimo 6/);
  });

  it("⚠️ header e footer li costruisce il renderer: quei campi nel file sono vietati", () => {
    for (const campo of ["kicker", "ref", "footer", "label", "corsoLabel"]) {
      expect(validaSlide([base({ [campo]: "x" })], CTX).join(), campo).toMatch(new RegExp(campo));
    }
  });

  it("⚠️ un conteggio del catalogo scritto a mano è un errore, il segnaposto no", () => {
    // È la regola di `formazione-numeri-pure` portata sulle slide: «124 requisiti» scritto a
    // mano mente il giorno in cui il catalogo cambia.
    const aMano = validaSlide([base({ titolo: "124 requisiti da valutare" })], CTX);
    expect(aMano.join()).toMatch(/requisitiNis2Autovalutazione/);
    expect(validaSlide([base({ titolo: "{requisitiNis2Autovalutazione} requisiti" })], CTX)).toEqual([]);
  });

  it("i riferimenti normativi, le date e le grandezze restano scritti a mano", () => {
    // Sono le tre famiglie che la guardia dei corsi esclude per regola.
    for (const titolo of ["L'art. 12 del decreto", "Entro 12 mesi", "Il 12 marzo", "Quota del 12%"]) {
      expect(validaSlide([base({ titolo })], CTX), titolo).toEqual([]);
    }
  });

  it("un segnaposto inesistente è un errore, non un testo con le graffe", () => {
    expect(validaSlide([base({ titolo: "{requisitiInventati} requisiti" })], CTX).join()).toMatch(/requisitiInventati/);
  });

  it("il controllo guarda anche dentro gli elenchi annidati", () => {
    const voci = [base({ layout: "punti", titolo: "Tre cose", punti: [{ h: "Capi", d: "sono 12 in tutto" }] })];
    expect(validaSlide(voci, CTX).join()).toMatch(/capiNis2/);
  });
});

describe("sostituisciNumeri", () => {
  it("mette il numero del catalogo al posto del segnaposto", () => {
    expect(sostituisciNumeri("{requisitiNis2Autovalutazione} requisiti su {capiNis2} capi", NUMERI)).toBe(
      "124 requisiti su 12 capi",
    );
  });

  it("⚠️ un segnaposto sconosciuto SOLLEVA: a schermo non deve comparire «{qualcosa}»", () => {
    expect(() => sostituisciNumeri("{nessuno}", NUMERI)).toThrow(/nessuno/);
  });
});

describe("momentiDistillati", () => {
  const marche = [
    { p: 0, s: 0.05 },
    { p: 1, s: 21.4 },
    { p: 2, s: 40.2 },
  ];

  it("⚠️ il momento è ESATTO: quello del paragrafo da cui la slide parte", () => {
    // Col criterio proporzionale lo stacco poteva cadere un paragrafo prima o dopo.
    expect(momentiDistillati([0, 2], marche)).toEqual([0.05, 40.2]);
  });

  it("senza marche non inventa momenti", () => {
    expect(momentiDistillati([0, 1], [])).toBeNull();
  });
});

describe("il catalogo dei layout", () => {
  it("sono i dodici concordati, né uno di più né uno di meno", () => {
    expect([...LAYOUT_SLIDE].sort()).toEqual(
      ["apertura", "cards", "chiusura", "confronto", "definizione", "evidenza", "flusso", "numeri", "punti", "split", "tabella", "timeline"],
    );
  });
});
