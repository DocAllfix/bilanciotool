// Registro dei tour guidati: pathPattern → passi. Primo match vince.
// I target sono attributi data-tour già presenti nei componenti; i passi con
// elemento assente vengono filtrati a runtime (pagine in stati diversi).

export type TourStep = {
  element?: string; // selettore; assente = popover centrato
  title: string;
  description: string;
};

export type TourDef = {
  pageId: string;
  pathPattern: RegExp;
  steps: TourStep[];
};

export const TOURS: TourDef[] = [
  {
    pageId: "portfolio",
    pathPattern: /^\/dashboard/,
    steps: [
      {
        title: "Benvenuto in EvalisDeck",
        description: "Questo è il portafoglio: una card per ogni azienda che segui. Ti abbiamo preparato un'azienda dimostrativa già compilata per esplorare tutto senza partire da zero.",
      },
      {
        element: '[data-tour="azienda-demo"]',
        title: "L'azienda dimostrativa",
        description: "Meccanica Adriatica è un esempio realistico: due esercizi di dati, inventario GHG e bilancio già avviati. Modificala liberamente, è fatta per questo.",
      },
      {
        element: '[data-tour="azienda-demo"] a[href*="/ghg"]',
        title: "Inventario GHG",
        description: "Il percorso ISO 14064-1 in 8 passi: dai confini al rapporto conforme al §9.3.1.",
      },
      {
        element: '[data-tour="nuova-azienda"]',
        title: "Le tue aziende",
        description: "Qui creerai le aziende vere del tuo studio. In demo il pulsante è bloccato: si sblocca con l'abbonamento, e tutto quello che vedi resta identico.",
      },
    ],
  },
  {
    pageId: "ghg",
    pathPattern: /^\/aziende\/[^/]+\/ghg\/\d+/,
    steps: [
      {
        element: '[data-tour="ghg-passo-1"]',
        title: "Il percorso in 8 passi",
        description: "Ogni passo ha il suo indicatore di completamento. Puoi muoverti liberamente: l'ordine consigliato è quello della norma.",
      },
      {
        element: '[data-tour="ghg-passo-2"]',
        title: "Registro delle sorgenti",
        description: "Le 25 sorgenti si valutano una per una. Per escluderne una serve la motivazione scritta: è il rilievo più frequente in verifica, e qui non passa.",
      },
      {
        element: '[data-tour="ghg-passo-3"]',
        title: "Dati di attività",
        description: "Una riga per sorgente e sito: quantità × fattore, con anteprima immediata del calcolo. I fattori arrivano dalla libreria con fonte documentata.",
      },
      {
        element: '[data-tour="ghg-passo-5"]',
        title: "Risultati",
        description: "Totali per categoria, doppia rendicontazione Scope 2, incertezza e qualità del dato. Tutto calcolato dal server, sempre coerente.",
      },
      {
        element: '[data-tour="ghg-passo-8"]',
        title: "Il rapporto",
        description: "Alla fine pubblichi il documento conforme al §9.3.1: ogni versione è congelata e resta identica per sempre.",
      },
    ],
  },
  {
    pageId: "bilancio",
    pathPattern: /^\/aziende\/[^/]+\/bilancio\/\d+/,
    steps: [
      {
        element: '[data-tour="bil-passo-2"]',
        title: "Doppia materialità",
        description: "18 temi con guida alla valutazione: cosa guardare, quando alzare il punteggio, dove trovare le evidenze. La matrice si aggiorna in tempo reale.",
      },
      {
        element: '[data-tour="proposta-ateco"]',
        title: "Proposta dal settore",
        description: "Dal codice ATECO arriva una proposta di punteggi di partenza, curata per settore. Mai applicata in automatico: decidi tu, tema per tema.",
      },
      {
        element: '[data-tour="bil-passo-3"]',
        title: "Indicatori su due anni",
        description: "49 indicatori con confronto sull'esercizio precedente; 30 derivati si calcolano da soli. Gli avvisi di coerenza controllano l'allineamento con l'inventario GHG.",
      },
      {
        element: '[data-tour="bil-passo-5"]',
        title: "Il racconto",
        description: "Capitoli con editor, bozze compilate dai tuoi dati e diagrammi generati automaticamente. Le fotografie le aggiungi tu.",
      },
      {
        element: '[data-tour="bil-passo-7"]',
        title: "Il documento",
        description: "Copertina, matrice, indice GRI/ESRS: il bilancio impaginato pronto per banche e capofiliera, in PDF vettoriale.",
      },
    ],
  },
];

export const findTourForPath = (path: string): TourDef | null =>
  TOURS.find((t) => t.pathPattern.test(path)) ?? null;
