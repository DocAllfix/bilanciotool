import { describe, it, expect } from "vitest";
import golden from "./golden.json";
import { accettabile, rischioInerente, rischioResiduo, livelloDelProcesso } from "../rischio";
import { idoneitaPilastro, idoneitaModello, PESI_PRESIDIO } from "../idoneita";

// Il golden è estratto ESEGUENDO il prototipo (`scripts/golden-mog231.mjs`): cento
// combinazioni di probabilità × impatto × adeguatezza, cioè ogni ramo del rischio a
// due stadi. Qui si prova che il nostro motore dica le stesse cose.

const scenari = golden.scenari as Record<string, { inerente: string; residuo: string; accettabile: boolean }>;

function scomponi(chiave: string) {
  const [primo, adeg] = chiave.split(" / ");
  const [prob, imp] = primo!.split(" × ");
  const v = (x: string) => (x === "(vuoto)" ? "" : x);
  return { prob: v(prob!), imp: v(imp!), adeg: v(adeg!) };
}

describe("rischio a due stadi: fedelta' al prototipo", () => {
  for (const [chiave, atteso] of Object.entries(scenari)) {
    it(chiave, () => {
      const s = scomponi(chiave);
      expect(rischioInerente(s.prob, s.imp)).toBe(atteso.inerente === "" ? null : atteso.inerente);
      expect(rischioResiduo(s.prob, s.imp, s.adeg)).toBe(atteso.residuo === "" ? null : atteso.residuo);
      expect(accettabile(s.prob, s.imp, s.adeg)).toBe(atteso.accettabile);
    });
  }
});

describe("le tre stranezze del prototipo, che sono giuste", () => {
  it("presidi non dichiarati valgono ASSENTI, non «non valutato»", () => {
    // In materia 231 l'onere e' dell'ente: presidi che nessuno ha dichiarato sono
    // presidi che non risultano. Trattarli come «da valutare» abbasserebbe il rischio
    // residuo di chi non ha compilato niente, che e' il contrario di cio' che serve.
    expect(rischioResiduo("4 · attesa", "4 · molto grave", "")).toBe("Critico");
    expect(rischioResiduo("4 · attesa", "4 · molto grave", "Assenti")).toBe("Critico");
  });

  it("uno scenario NON valutato non e' accettabile", () => {
    // Aggiungere un reato peggiora il cruscotto finche' non lo si valuta, ed e' voluto:
    // un rischio non misurato non e' un rischio assente.
    expect(rischioInerente("", "3 · grave")).toBeNull();
    expect(accettabile("", "3 · grave", "Adeguati")).toBe(false);
  });

  it("«Critico» e «Alto» hanno la STESSA riga nella matrice", () => {
    // Non e' una svista da «raffinare»: con presidi adeguati entrambi scendono a Medio,
    // con presidi parziali entrambi restano Alto. La distinzione la fa il primo stadio.
    for (const adeg of ["Assenti", "Parziali", "Adeguati"]) {
      expect(rischioResiduo("4 · attesa", "4 · molto grave", adeg)).toBe(
        rischioResiduo("3 · probabile", "4 · molto grave", adeg),
      );
    }
  });
});

describe("livello di un processo", () => {
  it("e' il PEGGIORE dei suoi scenari, non la media", () => {
    // Un processo con nove scenari bassi e uno critico e' un processo critico: mediare
    // nasconderebbe proprio quello che il modello deve far vedere.
    expect(livelloDelProcesso(["Basso", "Basso", "Critico", "Medio"])).toBe("Critico");
    expect(livelloDelProcesso(["Basso", "Medio"])).toBe("Medio");
  });

  it("senza scenari valutati non ha livello", () => {
    expect(livelloDelProcesso([])).toBeNull();
    expect(livelloDelProcesso([null, null])).toBeNull();
  });
});

// ⚠️ SCOSTAMENTO VOLUTO, lo stesso gia' applicato a ISO 37001 e per la stessa ragione.
const pilastri = golden.pilastri as Record<string, { stati: string[]; prototipo: number }>;
const NOSTRI: Record<string, number> = {
  "nessuno valutato su 12": 0,
  "2 efficaci su 12, il resto intatto": 17,
  "2 efficaci e 10 non applicabili": 100,
  "tutti e 12 efficaci": 100,
  "6 efficaci e 6 assenti": 50,
  "12 da rafforzare": 50,
};

describe("idoneita' dei pilastri", () => {
  for (const [nome, caso] of Object.entries(pilastri)) {
    it(`${nome} -> ${NOSTRI[nome]}`, () => {
      expect(idoneitaPilastro(caso.stati)).toBe(NOSTRI[nome]);
    });
  }

  it("il solo caso che diverge e' quello in cui il prototipo mentiva", () => {
    const diversi = Object.keys(pilastri).filter(
      (k) => idoneitaPilastro(pilastri[k]!.stati) !== pilastri[k]!.prototipo,
    );
    expect(diversi).toEqual(["2 efficaci su 12, il resto intatto"]);
  });

  it("i pesi sono quelli del prototipo", () => {
    expect(PESI_PRESIDIO["Presente ed efficace"]).toBe(100);
    expect(PESI_PRESIDIO["Presente ma da rafforzare"]).toBe(50);
    expect(PESI_PRESIDIO["Assente"]).toBe(0);
  });

  it("l'idoneita' del modello e' la media NON pesata dei dieci pilastri", () => {
    expect(idoneitaModello([100, 0])).toBe(50);
    expect(idoneitaModello(Array(10).fill(100))).toBe(100);
    expect(idoneitaModello([])).toBeNull();
  });
});
