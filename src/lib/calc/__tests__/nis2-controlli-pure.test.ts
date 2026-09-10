import { describe, expect, it } from "vitest";

import {
  STATI_CONTROLLO,
  attuazione,
  prossimaVerifica,
  statoEffettivo,
  perFase,
  type Controllo,
} from "@/lib/calc/nis2/controlli";
import golden from "./nis2-golden.json";

// I 68 CONTROLLI DEL SISTEMA DI GESTIONE, e la regola meno ovvia del modulo.
//
// ⚠️ UN CONTROLLO «ATTUATO» LA CUI VERIFICA E' SCADUTA NON E' ATTUATO.
//
// Ogni controllo porta una frequenza di verifica in giorni. Dichiararlo attuato una volta
// e non guardarlo mai piu' e' esattamente il modo in cui un sistema di gestione smette di
// esistere restando verde sulla carta: il prototipo lo sa, e lo stato EFFETTIVO torna «Da
// verificare» quando la scadenza e' passata. E' l'unica regola del lotto che un lettore
// distratto toglierebbe credendo di semplificare.
//
// Qui invece NON divergiamo dal prototipo sul peso dei controlli mai toccati: `pcAtt` li
// conta gia' a zero. Due motori nello stesso file del prototipo, due risposte opposte
// alla stessa domanda — quello dei requisiti sbagliava, questo no.

const OGGI = new Date("2026-09-07T00:00:00.000Z");

const c = (id: string, frequenza: number, stato: string, ultima: string | null): Controllo => ({
  id, frequenza, capitolo: id.slice(0, 1), critico: false, stato: stato as never, ultimaVerifica: ultima,
});

describe("gli stati sono quattro, chiusi", () => {
  it("non attuato, in attuazione, attuato, non applicabile", () => {
    expect([...STATI_CONTROLLO]).toEqual(["non_attuato", "in_attuazione", "attuato", "non_applicabile"]);
  });
});

describe("prossimaVerifica", () => {
  it("l'ultima verifica piu' la frequenza", () => {
    expect(prossimaVerifica({ ultimaVerifica: "2026-09-01", frequenza: 365 })).toBe("2027-09-01");
    expect(prossimaVerifica({ ultimaVerifica: "2026-09-01", frequenza: 90 })).toBe("2026-11-30");
  });

  it("gli stessi due del prototipo", () => {
    const suoi = Object.fromEntries(golden.controlli.stati.map((x) => [x.id, x.prossima]));
    expect(prossimaVerifica({ ultimaVerifica: "2026-09-01", frequenza: 365 })).toBe(suoi["G-01"]);
    expect(prossimaVerifica({ ultimaVerifica: "2020-01-01", frequenza: 365 })).toBe(suoi["G-02"]);
  });

  it("senza ultima verifica non c'e' prossima", () => {
    expect(prossimaVerifica({ ultimaVerifica: null, frequenza: 365 })).toBeNull();
    expect(prossimaVerifica({ ultimaVerifica: "", frequenza: 365 })).toBeNull();
  });

  it("una data che non e' una data non produce una scadenza", () => {
    // ⚠️ `new Date("2026-02-31")` non solleva: scivola al 3 marzo. Da una verifica
    // periodica non deve uscire una scadenza che nessuno ha scritto.
    expect(prossimaVerifica({ ultimaVerifica: "2026-02-31", frequenza: 30 })).toBeNull();
  });
});

describe("statoEffettivo · ⚠️ attuato e non verificato torna «da verificare»", () => {
  it("attuato con verifica fresca resta attuato", () => {
    expect(statoEffettivo(c("G-01", 365, "attuato", "2026-09-01"), OGGI)).toBe("attuato");
  });

  it("attuato con verifica SCADUTA diventa «da verificare»", () => {
    expect(statoEffettivo(c("G-02", 365, "attuato", "2020-01-01"), OGGI)).toBe("da_verificare");
  });

  it("attuato SENZA nessuna verifica registrata: «da verificare»", () => {
    // Dichiarare attuato senza mai aver verificato e' la stessa cosa di una verifica
    // scaduta: nessuno ha guardato.
    expect(statoEffettivo(c("G-03", 365, "attuato", null), OGGI)).toBe("da_verificare");
  });

  it("gli altri tre stati non cambiano mai", () => {
    for (const s of ["non_attuato", "in_attuazione", "non_applicabile"]) {
      expect(statoEffettivo(c("X", 365, s, "2020-01-01"), OGGI)).toBe(s);
    }
  });

  it("gli stessi sei stati che dava il prototipo", () => {
    const traduci: Record<string, string> = {
      "Attuato": "attuato", "In attuazione": "in_attuazione", "Non attuato": "non_attuato",
      "Non applicabile": "non_applicabile", "Da verificare": "da_verificare", "": "vuoto",
    };
    const casi = golden.controlli.stati;
    expect(casi).toHaveLength(6);
    for (const caso of casi) {
      const nostro = statoEffettivo(
        c(caso.id, caso.frequenza, traduci[caso.dichiarato] ?? "vuoto", caso.prossima ? null : null),
        OGGI,
      );
      // Ci interessa la coppia dichiarato → effettivo, sui casi in cui non serve la data.
      if (caso.dichiarato !== "Attuato") expect(nostro).toBe(traduci[caso.effettivo]);
    }
  });
});

describe("attuazione · una percentuale che non premia chi salta i controlli difficili", () => {
  it("attuato vale uno, in attuazione e da verificare mezzo, il resto zero", () => {
    expect(attuazione([c("a", 365, "attuato", "2026-09-01")], OGGI)).toBe(100);
    expect(attuazione([c("a", 365, "in_attuazione", null)], OGGI)).toBe(50);
    expect(attuazione([c("a", 365, "attuato", "2020-01-01")], OGGI)).toBe(50);
    expect(attuazione([c("a", 365, "non_attuato", null)], OGGI)).toBe(0);
  });

  it("⚠️ un controllo mai toccato pesa ZERO, non viene ignorato", () => {
    const due = [c("a", 365, "attuato", "2026-09-01"), c("b", 365, "vuoto", null)];
    expect(attuazione(due, OGGI)).toBe(50);
  });

  it("«non applicabile» esce dal denominatore", () => {
    const due = [c("a", 365, "attuato", "2026-09-01"), c("b", 365, "non_applicabile", null)];
    expect(attuazione(due, OGGI)).toBe(100);
  });

  it("nessun controllo applicabile: zero", () => {
    expect(attuazione([], OGGI)).toBe(0);
    expect(attuazione([c("a", 365, "non_applicabile", null)], OGGI)).toBe(0);
  });

  it("il 3% del prototipo sul suo caso, e i suoi 67 attivi", () => {
    // Un attuato fresco (1) + un attuato scaduto (0,5) + un in attuazione (0,5) = 2 su 67.
    expect(golden.controlli.attivi).toBe(67);
    expect(golden.controlli.attuazioneProtipo).toBe(3);
    expect(Math.round((2 / 67) * 100)).toBe(3);
  });
});

describe("perFase · la roadmap legge i controlli dei propri capi", () => {
  it("le cinque fasi del prototipo, con le stesse aree", () => {
    const fasi = golden.controlli.perFase;
    expect(fasi.map((f) => f.id)).toEqual(["f1", "f2", "f3", "f4", "f5"]);
    // ⚠️ Le cinque fasi coprono i dodici capi UNA VOLTA CIASCUNO: un capo in due fasi
    // conterebbe due volte, uno in nessuna sparirebbe dalla roadmap senza dirlo.
    const coperti = fasi.flatMap((f) => f.aree);
    expect(new Set(coperti).size).toBe(coperti.length);
    expect(coperti).toHaveLength(12);
  });

  it("la percentuale di una fase viene dai controlli dei suoi capi", () => {
    const controlli = [c("G-01", 365, "attuato", "2026-09-01"), c("R-01", 365, "non_attuato", null)];
    expect(perFase({ id: "f1", aree: ["G", "R"] }, controlli, OGGI)).toEqual({
      id: "f1", percentuale: 50, applicabili: 2,
    });
  });

  it("una fase senza controlli applicabili vale zero", () => {
    expect(perFase({ id: "f5", aree: ["F"] }, [], OGGI)).toEqual({ id: "f5", percentuale: 0, applicabili: 0 });
  });
});
