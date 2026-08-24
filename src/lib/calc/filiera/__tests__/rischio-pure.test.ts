import { describe, it, expect } from "vitest";
import golden from "./golden.json";
import {
  AREE_CRITICHE,
  MESI_VERIFICA,
  categoriaInerente,
  maturita,
  punteggioInerente,
  rischioResiduo,
} from "../rischio";

// Il motore della Due diligence di filiera, contro il golden ESTRATTO eseguendo il
// prototipo (`scripts/golden-filiera.mjs`).

const cerca = (n: string) => {
  const c = golden.casi.find((x) => x.nome === n);
  if (!c) throw new Error(`caso «${n}» assente: rigenera con node scripts/golden-filiera.mjs`);
  return c;
};

const partner = (dim: Partial<Record<"paese" | "settore" | "prodotto" | "modello", number>>, aree: Record<string, number>, flag = false) => ({
  paese: dim.paese ?? 0, settore: dim.settore ?? 0, prodotto: dim.prodotto ?? 0, modello: dim.modello ?? 0,
  aree, flag,
});

describe("il rischio inerente: media delle sole dimensioni compilate", () => {
  it("le soglie sono quelle del prototipo", () => {
    expect(golden.soglieInerente).toEqual([1.8, 2.6, 3.4]);
    expect(punteggioInerente(partner({ paese: 3, settore: 3 }, {}))).toBe(3);
    expect(categoriaInerente(partner({ paese: 3, settore: 3 }, {}))).toBe("Alta");
    expect(categoriaInerente(partner({ paese: 1, settore: 1 }, {}))).toBe("Bassa");
    expect(categoriaInerente(partner({ paese: 4, settore: 4, prodotto: 4, modello: 4 }, {}))).toBe("Critica");
  });

  it("compilare UNA sola dimensione non è come compilarle tutte a zero", () => {
    // La media è sulle dimensioni COMPILATE: una sola a 4 dà 4, non 1. È la scelta del
    // prototipo e si conserva — ma è anche il motivo per cui la categoria da sola non
    // basta, e serve la maturità a correggerla.
    expect(punteggioInerente(partner({ paese: 4 }, {}))).toBe(4);
  });

  it("i flag alzano ad «Alta» ciò che era Bassa o Media", () => {
    expect(cerca("inerente basso senza flag").categoria).toBe("Bassa");
    expect(cerca("inerente basso CON flag").categoria).toBe("Alta");
    expect(categoriaInerente(partner({ paese: 1, settore: 1 }, {}, true))).toBe("Alta");
  });

  it("senza nessuna dimensione la categoria non esiste", () => {
    expect(categoriaInerente(partner({}, {}))).toBeNull();
    expect(cerca("niente di niente").categoria).toBe("");
  });
});

describe("⚠️ la maturità: il difetto che premiava chi non risponde", () => {
  it("il prototipo dava a chi ha risposto a UNA domanda lo stesso esito di chi ha risposto a tutte", () => {
    // Misurato: `minCritica` vale 4 quando NESSUNA area critica è valutata, quindi il
    // tetto sparisce e la media di una sola area alta diventa la maturità.
    const solo = cerca("SOLO governance, nessuna area critica");
    const tutte = cerca("tutte le aree a 4");
    expect(solo.maturita).toBe(4);
    expect(solo.residuo).toBe(tutte.residuo);
    expect(solo.mesiVerifica).toBe(tutte.mesiVerifica);
    // Cioè: un fornitore che non ha detto nulla su lavoro minorile, lavoro forzato e
    // sicurezza veniva verificato con la stessa frequenza di uno valutato su tutto.
  });

  it("qui il tetto NON sparisce quando le aree critiche mancano", () => {
    // ⚠️ SCOSTAMENTO VOLUTO. Il tetto è `min(media, minCriticaValutata + 0,9)`. Se
    // nessuna area critica è stata valutata non c'è un minimo da cui partire, e il
    // prototipo sceglieva il valore PIÙ ALTO possibile. Qui si sceglie il più basso:
    // non aver detto niente su lavoro minorile non è una prova di maturità.
    const m = maturita(partner({ paese: 3, settore: 3 }, { gov: 4 }));
    expect(m).toBeLessThan(2);
    expect(rischioResiduo(partner({ paese: 3, settore: 3 }, { gov: 4 }))).toBe("Alto");
  });

  it("valutare le aree critiche fa la differenza, e in meglio", () => {
    // Chi le valuta davvero a 4 mantiene la maturità alta: la correzione colpisce
    // l'omissione, non la valutazione.
    const complete = { gov: 4, min: 4, forz: 4, ora: 4, foa: 4, hs: 4, amb: 4 };
    expect(maturita(partner({ paese: 3, settore: 3 }, complete))).toBe(4);
    expect(rischioResiduo(partner({ paese: 3, settore: 3 }, complete))).toBe("Medio");
    expect(cerca("tutte le aree a 4").residuo).toBe("Medio");
  });

  it("un'area critica bassa tiene giù la maturità, come nel prototipo", () => {
    expect(maturita(partner({ paese: 3, settore: 3 }, { gov: 4, min: 1 }))).toBeCloseTo(1.9, 5);
    expect(cerca("governance alta, una critica bassa").maturita).toBeCloseTo(1.9, 5);
  });

  it("nessuna area valutata: il residuo è il peggiore, come nel prototipo", () => {
    expect(cerca("nessuna area valutata").residuo).toBe("Critico");
    expect(rischioResiduo(partner({ paese: 3, settore: 3 }, {}))).toBe("Critico");
  });

  it("le tre aree critiche sono quelle della metodologia", () => {
    expect(AREE_CRITICHE).toEqual(golden.areeCritiche);
  });
});

describe("la frequenza di verifica discende dal residuo", () => {
  it("12 · 24 · 36 · 48 mesi", () => {
    expect(MESI_VERIFICA).toEqual(golden.frequenze);
  });

  it("senza residuo non c'è frequenza", () => {
    expect(rischioResiduo(partner({}, {}))).toBeNull();
  });
});
