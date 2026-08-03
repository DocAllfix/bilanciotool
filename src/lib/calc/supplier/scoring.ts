// Punteggio dell'autovalutazione fornitore.
//
// Due conteggi che vanno tenuti distinti, ed è il punto in cui una
// reimplementazione "ragionevole" diverge dal prototipo:
//   · VALUTATE — le domande su cui l'azienda si è espressa, "non applicabile"
//     compreso: misurano quanto il questionario è stato affrontato;
//   · RISPOSTE — quelle con una risposta di merito (sì / parziale / no), le
//     sole che entrano nel punteggio.
// Confonderli gonfia la percentuale di completamento oppure fa sparire dal
// conteggio le domande dichiarate non pertinenti.

export type Risposta = "si" | "parziale" | "no" | "na";

export type Domanda = {
  key: string;
  areaKey: string;
  peso: number;
  giorniStimati: number;
};

export type AreaKey = "base" | "env" | "soc" | "eth" | "proc";

/** Peso di ciascuna area sull'indice complessivo. Somma 100. */
export const AREE_PESI: Record<AreaKey, number> = {
  base: 10,
  env: 25,
  soc: 25,
  eth: 25,
  proc: 15,
};

export const AREE_KEYS = Object.keys(AREE_PESI) as AreaKey[];

/** Valore di merito di ciascuna risposta. */
const VALORE: Record<Exclude<Risposta, "na">, number> = { si: 100, parziale: 50, no: 0 };

export type Fascia = { key: string; nome: string; min: number };

/** Fasce di giudizio, dalla più alta: la prima soglia raggiunta vince. */
export const FASCE: Fascia[] = [
  { key: "avanzato", nome: "Avanzato", min: 90 },
  { key: "supplier_ready", nome: "Supplier Ready", min: 75 },
  { key: "adeguato", nome: "Adeguato", min: 60 },
  { key: "in_avvio", nome: "In avvio", min: 40 },
  { key: "non_pronto", nome: "Non pronto", min: 0 },
];

export function fasciaDi(indice: number): Fascia {
  return FASCE.find((f) => indice >= f.min) ?? FASCE[FASCE.length - 1];
}

export type PunteggioArea = {
  /** null quando l'area non ha ancora nessuna risposta di merito: dire "zero"
   *  significherebbe bocciare un'area che nessuno ha guardato. */
  punteggio: number | null;
  valutate: number;
  risposte: number;
  totale: number;
  /** Somma dei pesi delle domande che entrano nel punteggio, per il calcolo
   *  dei recuperi in plan.ts. */
  pesoMassimo: number;
};

export type EsitoSupplier = {
  perArea: Record<string, PunteggioArea>;
  indice: number;
  valutate: number;
  risposte: number;
  pctCompletamento: number;
  fascia: Fascia;
};

export function computeSupplier(
  domande: Domanda[],
  risposte: Record<string, Risposta | null | undefined>,
  /** Solo per i test della sola fascia: normalmente l'indice si calcola qui. */
  indiceForzato?: number,
): EsitoSupplier {
  const perArea: Record<string, PunteggioArea> = {};
  let sommaPesata = 0;
  let pesoAree = 0;

  for (const area of AREE_KEYS) {
    const qs = domande.filter((q) => q.areaKey === area);
    let ottenuto = 0;
    let massimo = 0;
    let valutate = 0;
    let conMerito = 0;

    for (const q of qs) {
      const a = risposte[q.key];
      if (a === "na") {
        valutate++;
        continue;
      }
      if (a === undefined || a === null) continue;
      valutate++;
      conMerito++;
      ottenuto += q.peso * VALORE[a];
      massimo += q.peso * 100;
    }

    const punteggio = massimo > 0 ? Math.round((ottenuto / massimo) * 100) : null;
    perArea[area] = { punteggio, valutate, risposte: conMerito, totale: qs.length, pesoMassimo: massimo };

    // L'indice si rinormalizza sulle SOLE aree con un punteggio: chi ha
    // compilato bene una sola area non deve risultare bocciato sulle altre
    // quattro che non ha ancora aperto.
    if (punteggio !== null) {
      sommaPesata += punteggio * AREE_PESI[area];
      pesoAree += AREE_PESI[area];
    }
  }

  const indice = indiceForzato ?? (pesoAree > 0 ? Math.round(sommaPesata / pesoAree) : 0);
  const valutate = AREE_KEYS.reduce((s, a) => s + perArea[a].valutate, 0);
  const conMerito = AREE_KEYS.reduce((s, a) => s + perArea[a].risposte, 0);

  return {
    perArea,
    indice,
    valutate,
    risposte: conMerito,
    pctCompletamento: domande.length > 0 ? Math.round((valutate / domande.length) * 100) : 0,
    fascia: fasciaDi(indice),
  };
}
