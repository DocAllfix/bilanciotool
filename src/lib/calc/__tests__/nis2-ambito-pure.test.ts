import { describe, expect, it } from "vitest";

import {
  classifica,
  sanzione,
  type Criterio,
  type Dimensione,
} from "@/lib/calc/nis2/ambito";
import golden from "./nis2-golden.json";
import settori1 from "@/lib/db/seeds/data/nis2-settori-1.json";
import settori2 from "@/lib/db/seeds/data/nis2-settori-2.json";

// ⚠️ Gli allegati arrivano dal SEME, non da una copia scritta qui: e' la stessa sorgente
// che finisce nel database, quindi il test non puo' essere d'accordo con se' stesso
// mentre il prodotto usa un altro elenco.
const ALLEGATI = { primo: settori1, secondo: settori2 };

// La determinazione dell'ambito soggettivo del D.Lgs. 138/2024.
//
// ⚠️ L'ATTESO NON E' SCRITTO A MANO: viene da `scripts/golden-nis2.mjs`, che ritaglia
// `ambito()` dal prototipo e la esegue in un sandbox. Ricalcolare l'atteso con una
// formula gemella sarebbe scrivere due volte la stessa ipotesi, e se l'ipotesi e'
// sbagliata vanno d'accordo tutte e due.
//
// Questo e' il motore in cui un errore costa di piu': da qui discendono gli obblighi
// che si applicano e il tetto delle sanzioni (10 milioni o il 2% del fatturato mondiale
// per un soggetto essenziale). Dire «Importante» a un essenziale significa consegnare a
// un cliente un documento che sottostima i suoi obblighi.

/** Le chiavi del nostro dominio, e come si leggono nel vocabolario del prototipo. */
const DIMENSIONE: Record<string, Dimensione> = {
  "Grande impresa": "grande",
  "Media impresa": "media",
  "Microimpresa o piccola impresa": "micro",
};

describe("ambito · i nove incroci settore × dimensione", () => {
  const incroci = golden.ambito.filter((c) => c.criterio === null);

  it.each(incroci)("$settore / $dim", (caso) => {
    const esito = classifica({
      settore: caso.settore,
      dimensione: DIMENSIONE[caso.dim],
      criteri: [],
    }, ALLEGATI);
    // Il prototipo restituisce la stringa vuota dove non sa decidere; noi `null`.
    expect(esito.classe ?? "").toBe(
      caso.cls === "Essenziale" ? "essenziale"
        : caso.cls === "Importante" ? "importante"
        : caso.cls === "Fuori ambito" ? "fuori_ambito"
        : "",
    );
  });
});

describe("ambito · gli otto criteri specifici scavalcano la dimensione", () => {
  // Ogni criterio e' provato su una MICROIMPRESA in un settore che non sta in nessuno
  // dei due allegati: se non scavalcasse, l'esito sarebbe «non determinabile». E' il
  // solo caso in cui lo scavalcamento si vede isolato da tutto il resto.
  const casi = golden.ambito.filter((c) => c.criterio !== null);

  it("sono otto, come li elenca il decreto", () => {
    expect(casi).toHaveLength(8);
  });

  it.each(casi)("$criterio", (caso) => {
    const esito = classifica({
      settore: "Commercio al dettaglio",
      dimensione: "micro",
      criteri: [caso.criterio as Criterio],
    }, ALLEGATI);
    expect(esito.classe).toBe(caso.cls === "Essenziale" ? "essenziale" : "importante");
    expect(esito.via).toBe("criterio_specifico");
  });

  it("sei portano a essenziale e due a importante", () => {
    const essenziali = casi.filter((c) => c.cls === "Essenziale");
    expect(essenziali).toHaveLength(6);
    expect(casi.filter((c) => c.cls === "Importante")).toHaveLength(2);
  });
});

describe("ambito · le regole che il golden da solo non copre", () => {
  it("un criterio da «essenziale» vince su uno da «importante», non il contrario", () => {
    // ⚠️ Se prevalesse l'ordine di elenco invece della gravita', un soggetto che
    // spunta sia c7 (importante) sia c1 (essenziale) risulterebbe «Importante»: sette
    // milioni di tetto sanzionatorio invece di dieci, e meno obblighi.
    expect(classifica({ settore: "Energia", dimensione: "grande", criteri: ["c7", "c1"] }, ALLEGATI).classe)
      .toBe("essenziale");
    expect(classifica({ settore: "Energia", dimensione: "grande", criteri: ["c1", "c7"] }, ALLEGATI).classe)
      .toBe("essenziale");
  });

  it("un settore fuori dai due allegati NON e' «fuori ambito»: e' non determinabile", () => {
    // Sono due cose diverse e il prodotto non deve confonderle. «Fuori ambito» e' una
    // DETERMINAZIONE — sei in un settore elencato e stai sotto le soglie — e si scrive
    // in un documento. Un settore che negli allegati non compare non produce nessuna
    // determinazione: da qui non si conclude niente, e dirlo e' l'unica risposta onesta.
    const esito = classifica({ settore: "Commercio al dettaglio", dimensione: "grande", criteri: [] }, ALLEGATI);
    expect(esito.classe).toBeNull();
    expect(esito.via).toBe("settore_non_elencato");
  });

  it("senza dimensione dichiarata non si conclude", () => {
    const esito = classifica({ settore: "Energia", dimensione: null, criteri: [] }, ALLEGATI);
    expect(esito.classe).toBeNull();
    expect(esito.via).toBe("dimensione_non_dichiarata");
  });
});

describe("sanzione", () => {
  it("essenziale: 10 milioni o il 2%", () => {
    expect(sanzione("essenziale")).toEqual({ massimo: 10_000_000, percentuale: 2 });
  });

  it("importante: 7 milioni o l'1,4%", () => {
    expect(sanzione("importante")).toEqual({ massimo: 7_000_000, percentuale: 1.4 });
  });

  it("fuori ambito e non determinato: nessun tetto", () => {
    expect(sanzione("fuori_ambito")).toBeNull();
    expect(sanzione(null)).toBeNull();
  });

  it("⚠️ restituisce numeri, non una frase", () => {
    // Il prototipo restituisce «fino a 10 milioni di euro o al 2% del fatturato
    // mondiale annuo, se superiore». Una frase si stampa e basta: non si confronta col
    // fatturato dichiarato, non si traduce, e chi la rende deve fidarsi che sia gia'
    // formattata. I numeri li formatta chi li mostra, e restano confrontabili.
    const s = sanzione("essenziale")!;
    expect(typeof s.massimo).toBe("number");
    expect(typeof s.percentuale).toBe("number");
  });
});
