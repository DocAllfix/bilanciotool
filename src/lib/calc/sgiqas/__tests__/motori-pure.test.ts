import { describe, it, expect } from "vitest";
import golden from "./golden.json";
import { livelloRischio, punteggioAspetto, significativoAspetto, statoIndicatore } from "../motori";

// I tre motori del Sistema di gestione integrato QAS, contro il golden ESTRATTO
// eseguendo il prototipo (`scripts/golden-sgiqas.mjs`).
//
// Il golden registra anche i difetti: qui si dichiara, uno per uno, quali si conservano
// e quali no — con la ragione. Un motore riscritto «ragionevolmente» diverge proprio su
// questi, e nessuno se ne accorgerebbe.

const cerca = <T extends { nome: string }>(a: readonly T[], n: string): T => {
  const t = a.find((x) => x.nome === n);
  if (!t) throw new Error(`caso «${n}» assente dal golden: rigenera con node scripts/golden-sgiqas.mjs`);
  return t;
};

const asp = (p: Partial<Parameters<typeof significativoAspetto>[0]>) =>
  ({ gravita: null, frequenza: null, sensibilita: null, prescrizioneLegale: false, espostoPopolazione: false, superamentoLimiti: false, condizione: "Normale", ...p }) as Parameters<typeof significativoAspetto>[0];

describe("il golden viene dal prototipo, non dalla memoria", () => {
  it("porta i casi che servono", () => {
    expect(golden.sogliaAspetti).toBe(24);
    expect(golden.rischi.length).toBe(25);
    expect(golden.aspetti.length).toBeGreaterThan(6);
    expect(golden.indicatori.length).toBeGreaterThan(6);
  });
});

describe("aspetti ambientali: il punteggio e la soglia si conservano", () => {
  it("gravità × frequenza × sensibilità, soglia 24", () => {
    expect(punteggioAspetto(asp({ gravita: 2, frequenza: 2, sensibilita: 2 }))).toBe(8);
    expect(punteggioAspetto(asp({ gravita: 4, frequenza: 3, sensibilita: 3 }))).toBe(36);
    expect(significativoAspetto(asp({ gravita: 2, frequenza: 2, sensibilita: 2 }))).toBe("Non significativo");
    expect(significativoAspetto(asp({ gravita: 4, frequenza: 3, sensibilita: 3 }))).toBe("Significativo");
    // Gli stessi due casi, come li dà il prototipo.
    expect(cerca(golden.aspetti, "gfs pieni sotto soglia").esito).toBe("Non significativo");
    expect(cerca(golden.aspetti, "gfs pieni sopra soglia").esito).toBe("Significativo");
  });

  it("le tre condizioni che rendono significativo a prescindere dal punteggio", () => {
    expect(significativoAspetto(asp({ gravita: 1, frequenza: 1, sensibilita: 1, prescrizioneLegale: true }))).toBe("Significativo");
    expect(significativoAspetto(asp({ gravita: 1, frequenza: 1, sensibilita: 1, espostoPopolazione: true }))).toBe("Significativo");
    expect(significativoAspetto(asp({ gravita: 1, frequenza: 1, sensibilita: 1, superamentoLimiti: true }))).toBe("Significativo");
    expect(cerca(golden.aspetti, "prescrizione legale, gfs pieni").esito).toBe("Significativo");
  });

  it("emergenza con gravità almeno alta è significativo", () => {
    expect(significativoAspetto(asp({ condizione: "Emergenza", gravita: 3, frequenza: 1, sensibilita: 1 }))).toBe("Significativo");
    expect(significativoAspetto(asp({ condizione: "Emergenza", gravita: 2, frequenza: 1, sensibilita: 1 }))).toBe("Non significativo");
    expect(cerca(golden.aspetti, "emergenza con gravita alta e gfs pieni").esito).toBe("Significativo");
  });

  it("⚠️ SCOSTAMENTO: la prescrizione legale vale anche senza punteggio", () => {
    // Nel prototipo `aspSign` esce PRIMA di guardare le tre condizioni: con G/F/S non
    // ancora compilati il punteggio è zero e la funzione restituisce «». Misurato:
    expect(cerca(golden.aspetti, "prescrizione legale con gfs VUOTI").punteggio).toBe(0);
    expect(cerca(golden.aspetti, "prescrizione legale con gfs VUOTI").esito).toBe("");
    expect(cerca(golden.aspetti, "esposto della popolazione, gfs vuoti").esito).toBe("");
    //
    // Conseguenza: un aspetto con una prescrizione legale NON presidiata non risulta
    // significativo, non entra nel conteggio e non accende l'allerta «aspetti
    // significativi senza controllo operativo» — proprio finché nessuno ha finito di
    // valutarlo, che è quando servirebbe di più. Le tre condizioni sono FATTI dichiarati,
    // non gradini di una scala: non dipendono dal fatto che la scala sia stata compilata.
    expect(significativoAspetto(asp({ prescrizioneLegale: true }))).toBe("Significativo");
    expect(significativoAspetto(asp({ espostoPopolazione: true }))).toBe("Significativo");
    expect(significativoAspetto(asp({ superamentoLimiti: true }))).toBe("Significativo");
  });

  it("senza punteggio e senza condizioni l'esito è `null`, non «non significativo»", () => {
    // `null` è un terzo stato: «non ancora valutato». Dire «non significativo» di un
    // aspetto che nessuno ha guardato è una dichiarazione, e in un'analisi ambientale
    // firmata è la dichiarazione sbagliata.
    expect(significativoAspetto(asp({}))).toBeNull();
    expect(cerca(golden.aspetti, "tutto vuoto").esito).toBe("");
  });
});

describe("rischi SSL: probabilità × gravità, le soglie del prototipo", () => {
  it("tutte e venticinque le combinazioni coincidono col golden", () => {
    for (const r of golden.rischi) {
      const p = r.p ? Number(r.p[0]) : null;
      const g = r.g ? Number(r.g[0]) : null;
      const atteso = r.livello === "" ? null : r.livello;
      expect(livelloRischio(p, g), `p=${r.p || "—"} g=${r.g || "—"}`).toBe(atteso);
    }
  });

  it("le soglie sono 3, 7 e 11, come nel 231", () => {
    // ⚠️ Le soglie si leggono sul PRODOTTO, non sui fattori. Questa riga l'avevo scritta
    // «2 × 2 = Basso» ragionando sui due «2», e il golden l'ha corretta: 4 è Medio. È il
    // motivo per cui i valori attesi si estraggono eseguendo il prototipo invece di
    // dedurli — chi li deduce sbaglia proprio dove la scala non è lineare.
    // Il prodotto, e poi la fascia: 3 → Basso, 4÷7 → Medio, 8÷11 → Alto, oltre → Critico.
    expect(livelloRischio(1, 3)).toBe("Basso"); // 3
    expect(livelloRischio(2, 2)).toBe("Medio"); // 4
    expect(livelloRischio(2, 4)).toBe("Alto"); // 8
    expect(livelloRischio(3, 3)).toBe("Alto"); // 9
    expect(livelloRischio(3, 4)).toBe("Critico"); // 12
    expect(livelloRischio(4, 4)).toBe("Critico"); // 16
  });

  it("con un fattore mancante il livello non esiste", () => {
    expect(livelloRischio(null, 3)).toBeNull();
    expect(livelloRischio(3, null)).toBeNull();
    expect(livelloRischio(null, null)).toBeNull();
  });
});

describe("indicatori: il target vuoto NON è un target a zero", () => {
  const ind = (p: Partial<Parameters<typeof statoIndicatore>[0]>) =>
    ({ target: null, soglia: null, versoPositivo: true, ...p }) as Parameters<typeof statoIndicatore>[0];

  it("con il target definito i tre stati sono quelli del prototipo", () => {
    expect(statoIndicatore(ind({ target: 10 }), 12)).toBe("ok");
    expect(statoIndicatore(ind({ target: 10, soglia: 5 }), 7)).toBe("mid");
    expect(statoIndicatore(ind({ target: 10, soglia: 5 }), 3)).toBe("no");
    expect(statoIndicatore(ind({ target: 10, versoPositivo: false }), 8)).toBe("ok");
    expect(cerca(golden.indicatori, "sopra il target, verso positivo").stato).toBe("ok");
    expect(cerca(golden.indicatori, "sotto il target, sopra la soglia").stato).toBe("mid");
    expect(cerca(golden.indicatori, "sotto la soglia").stato).toBe("no");
  });

  it("senza rilevazione, o con un valore non numerico, lo stato non c'è", () => {
    expect(statoIndicatore(ind({ target: 10 }), null)).toBe("nd");
    expect(cerca(golden.indicatori, "nessuna rilevazione").stato).toBe("nd");
    expect(cerca(golden.indicatori, "valore non numerico").stato).toBe("nd");
  });

  it("⚠️ SCOSTAMENTO: senza target lo stato è «nd», e il prototipo diceva due cose opposte", () => {
    // `Number("")` è 0 e `isFinite(0)` è vero: il target vuoto veniva letto come target
    // ZERO. Misurato sul prototipo, lo STESSO dato mancante produce due verdetti opposti
    // a seconda del verso dell'indicatore —
    expect(cerca(golden.indicatori, "TARGET VUOTO, valore qualsiasi").stato).toBe("ok");
    expect(cerca(golden.indicatori, "target vuoto, verso negativo").stato).toBe("no");
    // — e nessuno dei due è un giudizio che qualcuno abbia espresso. Nello stesso
    // cruscotto, due righe più in là, quegli indicatori sono contati fra quelli «senza
    // target definito»: la schermata affermava due cose incompatibili.
    expect(statoIndicatore(ind({}), 42)).toBe("nd");
    expect(statoIndicatore(ind({ versoPositivo: false }), 42)).toBe("nd");
  });

  it("⚠️ e il ramo della sola soglia, nel prototipo, era IRRAGGIUNGIBILE", () => {
    // Per lo stesso motivo: con il target vuoto letto come zero, il controllo entrava
    // sempre nel ramo del target e non arrivava mai a quello della soglia. Misurato: un
    // indicatore con la sola soglia a 5 e valore 7 usciva «ok» dal ramo sbagliato.
    expect(cerca(golden.indicatori, "solo soglia, nessun target").stato).toBe("ok");
    // Qui il ramo esiste davvero e giudica sulla soglia.
    expect(statoIndicatore(ind({ soglia: 5 }), 7)).toBe("ok");
    expect(statoIndicatore(ind({ soglia: 5 }), 3)).toBe("no");
    expect(statoIndicatore(ind({ soglia: 5, versoPositivo: false }), 7)).toBe("no");
    expect(statoIndicatore(ind({ soglia: 5, versoPositivo: false }), 3)).toBe("ok");
  });
});
