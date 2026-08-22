import { describe, it, expect } from "vitest";
import golden from "./golden.json";
import { conformitaCapitolo, conformitaSistema, PESI_STATO } from "../conformita";

// ⚠️ SCOSTAMENTO VOLUTO, e misurato invece che affermato.
//
// Il prototipo media i soli requisiti VALUTATI: un capitolo dove sono stati valutati i
// tre facili su venti legge **100%**, ed e' indistinguibile da «tutti e venti conformi»
// e da «tre conformi e diciassette non applicabili». Tre situazioni opposte, un numero
// solo — su un documento che si porta a un ente di certificazione.
//
// Qui vale la stessa regola gia' adottata per la SoA: **un requisito applicabile e non
// valutato pesa zero**, non viene ignorato. Mediare sui soli valutati fa salire l'indice
// man mano che si saltano i requisiti difficili, che e' il contrario del vero.
//
// «Non applicabile» invece resta FUORI dal denominatore, ed e' un'altra cosa: e' una
// valutazione, non un'omissione. Chi ha dichiarato che venti requisiti non lo riguardano
// non deve risultare inadempiente su venti requisiti.

const casi = golden.conformita as Record<string, { stati: string[]; prototipo: number }>;

/** Cio' che il nostro motore deve dire, caso per caso, e perche'. */
const NOSTRI: Record<string, { valore: number; perche: string }> = {
  "nessuno valutato su 20": { valore: 0, perche: "come il prototipo" },
  "3 conformi su 20, il resto intatto": { valore: 15, perche: "i 17 mai guardati pesano zero, non spariscono" },
  "3 conformi e 17 non applicabili": { valore: 100, perche: "i non applicabili escono dal denominatore" },
  "tutti e 20 conformi": { valore: 100, perche: "come il prototipo" },
  "10 conformi e 10 non conformi": { valore: 50, perche: "come il prototipo" },
  "20 parzialmente conformi": { valore: 50, perche: "come il prototipo" },
};

describe("conformita' di capitolo", () => {
  for (const [nome, caso] of Object.entries(casi)) {
    const atteso = NOSTRI[nome]!;
    it(`${nome} -> ${atteso.valore} (${atteso.perche})`, () => {
      expect(conformitaCapitolo(caso.stati)).toBe(atteso.valore);
    });
  }

  it("il solo caso che diverge e' quello in cui il prototipo mentiva", () => {
    // Se un giorno divergessero anche gli altri, questo test lo dice: e' la prova che
    // lo scostamento e' UNO e mirato, non una riscrittura dell'aritmetica.
    const diversi = Object.keys(casi).filter((k) => conformitaCapitolo(casi[k]!.stati) !== casi[k]!.prototipo);
    expect(diversi).toEqual(["3 conformi su 20, il resto intatto"]);
  });
});

describe("conformita' del sistema", () => {
  it("e' la media dei capitoli, ciascuno con lo stesso peso", () => {
    // Non pesata sul numero di requisiti: un capitolo con cinque requisiti conta quanto
    // uno con trenta. E' la scelta del prototipo e si conserva — la norma non dice che
    // il capitolo 8 valga sei volte il capitolo 10.
    expect(conformitaSistema([100, 0])).toBe(50);
    expect(conformitaSistema([100, 100, 100, 100, 100, 100, 100])).toBe(100);
    expect(conformitaSistema([100, 0, 0, 0, 0, 0, 0])).toBe(14);
  });

  it("senza capitoli non e' zero: non c'e' risposta", () => {
    // Zero vorrebbe dire «tutto non conforme». Un sistema senza catalogo non e' un
    // sistema inadempiente, e' un sistema di cui non si sa niente.
    expect(conformitaSistema([])).toBeNull();
  });
});

describe("i pesi", () => {
  it("sono quelli del prototipo", () => {
    expect(PESI_STATO["Conforme"]).toBe(100);
    expect(PESI_STATO["Parzialmente conforme"]).toBe(50);
    expect(PESI_STATO["Non conforme"]).toBe(0);
  });

  it("«parzialmente conforme» vale meta', non zero", () => {
    // In SA8000/2026 il «parziale» pesa zero: sono due prototipi dello stesso autore che
    // trattano la stessa idea in modo opposto. Qui si resta fedeli a QUESTO prototipo, e
    // la divergenza fra i due moduli e' registrata, non appianata.
    expect(conformitaCapitolo(["Parzialmente conforme"])).toBe(50);
  });
});
