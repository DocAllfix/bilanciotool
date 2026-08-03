// Maturità della Dichiarazione di Applicabilità.
//
// LA LETTURA PIÙ FRAINTENDIBILE DEL MODELLO, e va detta per intero: l'indice è
// la media dei valori di stato su TUTTI i controlli applicabili, non solo su
// quelli a cui è stato assegnato uno stato. Un controllo applicabile ancora
// senza stato pesa ZERO.
//
// È voluto e corretto: la SoA dichiara che quel presidio serve. Finché non se
// ne dichiara l'attuazione, per un organismo di certificazione vale come non
// attuato. Mediare sui soli valutati farebbe salire l'indice man mano che si
// ignorano i controlli difficili, che è esattamente il contrario del vero.

export type StatoAttuazione = "nd" | "pl" | "pa" | "at" | "av";

/** Valore di maturità di ciascuno stato, dal prototipo. */
export const VALORE_STATO: Record<StatoAttuazione, number> = {
  nd: 0,   // non attuato
  pl: 20,  // pianificato
  pa: 55,  // parzialmente attuato
  at: 90,  // attuato
  av: 100, // attuato e verificato
};

export const STATI_ORDINE: StatoAttuazione[] = ["nd", "pl", "pa", "at", "av"];

export type Controllo = {
  frameworkKey: string;
  sectionKey: string;
  controlloId: string;
  cardine: boolean;
};

export type Decisione = {
  applicabile: boolean;
  stato: StatoAttuazione | null;
  giustificazione?: string | null;
  motivazioni?: string[];
  riferimentoDoc?: string | null;
  responsabile?: string | null;
};

export type Fascia = { key: string; nome: string; min: number };

export const FASCE: Fascia[] = [
  { key: "pronto", nome: "Pronto per la certificazione", min: 90 },
  { key: "maturo", nome: "Maturo", min: 75 },
  { key: "consolidamento", nome: "In consolidamento", min: 55 },
  { key: "avvio", nome: "In avvio", min: 30 },
  { key: "non_presidiato", nome: "Non presidiato", min: 0 },
];

export function fasciaDi(indice: number): Fascia {
  return FASCE.find((f) => indice >= f.min) ?? FASCE[FASCE.length - 1];
}

/** Chiave di una decisione. La coppia (quadro, controllo) è la chiave vera:
 *  questa forma incollata serve solo come identificativo in memoria. */
export const chiaveControllo = (frameworkKey: string, controlloId: string) => `${frameworkKey}|${controlloId}`;

export type Aggregato = {
  totale: number;
  applicabili: number;
  esclusi: number;
  punteggio: number;
};

export type EsitoSoa = {
  /** I controlli effettivamente in ambito: la 27001 sempre, gli altri quadri
   *  solo se il modulo è attivo. */
  inAmbito: Controllo[];
  totale: number;
  applicabili: number;
  esclusi: number;
  conStato: number;
  attuati: number;
  indice: number;
  pctCompletamento: number;
  perFramework: Record<string, Aggregato>;
  perSezione: Record<string, Aggregato>;
  fascia: Fascia;
};

/** Controlli in ambito: la 27001 sempre, gli altri quadri solo se attivati. */
export function inAmbito(
  controlli: Controllo[],
  moduliAttivi: Record<string, boolean>,
  sempreInAmbito: Set<string>,
): Controllo[] {
  return controlli.filter((c) => sempreInAmbito.has(c.frameworkKey) || moduliAttivi[c.frameworkKey] === true);
}

export function computeSoa(
  controlli: Controllo[],
  decisioni: Record<string, Decisione | undefined>,
  moduliAttivi: Record<string, boolean>,
  sempreInAmbito: Set<string>,
): EsitoSoa {
  const lista = inAmbito(controlli, moduliAttivi, sempreInAmbito);
  const dec = (c: Controllo) => decisioni[chiaveControllo(c.frameworkKey, c.controlloId)];
  // Un controllo è applicabile finché non lo si esclude: la norma chiede di
  // motivare le esclusioni, non le inclusioni.
  const applicabile = (c: Controllo) => dec(c)?.applicabile !== false;
  const statoDi = (c: Controllo) => dec(c)?.stato ?? null;

  const app = lista.filter(applicabile);
  let somma = 0;
  let conStato = 0;
  for (const c of app) {
    const s = statoDi(c);
    if (s) {
      conStato++;
      somma += VALORE_STATO[s];
    }
  }
  // Divisione su TUTTI gli applicabili, non sui soli valutati: vedi in testa.
  const indice = app.length ? Math.round(somma / app.length) : 0;

  const aggrega = (sottoinsieme: Controllo[]): Aggregato => {
    const a = sottoinsieme.filter(applicabile);
    let s = 0;
    for (const c of a) {
      const st = statoDi(c);
      if (st) s += VALORE_STATO[st];
    }
    return {
      totale: sottoinsieme.length,
      applicabili: a.length,
      esclusi: sottoinsieme.length - a.length,
      punteggio: a.length ? Math.round(s / a.length) : 0,
    };
  };

  const perFramework: Record<string, Aggregato> = {};
  for (const f of new Set(lista.map((c) => c.frameworkKey))) {
    perFramework[f] = aggrega(lista.filter((c) => c.frameworkKey === f));
  }
  const perSezione: Record<string, Aggregato> = {};
  for (const s of new Set(lista.map((c) => c.sectionKey))) {
    perSezione[s] = aggrega(lista.filter((c) => c.sectionKey === s));
  }

  const attuati = app.filter((c) => {
    const s = statoDi(c);
    return s === "at" || s === "av";
  }).length;

  return {
    inAmbito: lista,
    totale: lista.length,
    applicabili: app.length,
    esclusi: lista.length - app.length,
    conStato,
    attuati,
    indice,
    pctCompletamento: app.length ? Math.round((conStato / app.length) * 100) : 0,
    perFramework,
    perSezione,
    fascia: fasciaDi(indice),
  };
}
