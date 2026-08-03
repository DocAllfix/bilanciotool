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
  {
    pageId: "energetico",
    pathPattern: /^\/aziende\/[^/]+\/energetico\/\d+/,
    steps: [
      {
        element: '[data-tour="ene-passo-2"]',
        title: "Dai consumi al bilancio",
        description: "Si parte dalle fatture: quantità e spesa per ciascun vettore. Il costo non è un dettaglio contabile, senza non si calcolano né il costo medio dell'energia né il ritorno degli interventi.",
      },
      {
        element: '[data-tour="ene-passo-3"]',
        title: "Dove va l'energia",
        description: "È il passaggio che trasforma una raccolta di bollette in una diagnosi: ogni vettore si attribuisce alle utenze che lo consumano, nell'unità del vettore. La quadratura ti dice subito se qualcosa non torna.",
      },
      {
        element: '[data-tour="ene-passo-4"]',
        title: "Indicatori di prestazione",
        description: "Un consumo assoluto dice quanto hai prodotto, non se lavori bene. Inserisci le variabili di riferimento e il confronto con l'anno precedente compare da solo.",
      },
      {
        element: '[data-tour="ene-passo-5"]',
        title: "Interventi e ritorno",
        description: "Indichi il risparmio atteso e la spesa: il valore economico e il tempo di ritorno li calcola il sistema, dal costo dell'energia che hai già inserito. Non possono essere ottimistici per distrazione.",
      },
      {
        element: '[data-tour="ene-passo-8"]',
        title: "La diagnosi",
        description: "Il documento in 13 sezioni conforme alla UNI CEI EN 16247, con il diagramma dei flussi e il Pareto delle utenze. Ogni revisione resta congelata.",
      },
    ],
  },
  {
    pageId: "fornitore",
    pathPattern: /^\/aziende\/[^/]+\/fornitore/,
    steps: [
      {
        element: '[data-tour="sup-vista-quadro"]',
        title: "Sopra o sotto la soglia",
        description: "La sola domanda che interessa a chi ha chiesto l'autovalutazione. La barra mostra l'indice e la tacca la soglia richiesta: la distanza fra i due è il verdetto.",
      },
      {
        element: '[data-tour="sup-vista-questionario"]',
        title: "37 domande su 5 aree",
        description: "Rispondi solo dove hai un'evidenza documentale da esibire. «Non applicabile» è una risposta legittima e non abbassa il punteggio, ma va motivata nella nota.",
      },
      {
        element: '[data-tour="sup-vista-piano"]',
        title: "Cosa conviene fare per primo",
        description: "Le lacune dichiarate, ordinate per punti guadagnati per giornata di lavoro. Una domanda leggera che si chiude in tre giorni può valere più di una pesante che ne chiede dieci.",
      },
      {
        element: '[data-tour="sup-vista-documenti"]',
        title: "Le evidenze",
        description: "La lista dei documenti che ogni domanda presuppone. Segnare cosa esiste evita di dichiarare una conformità che poi non si riesce a documentare.",
      },
      {
        element: '[data-tour="sup-vista-attestato"]',
        title: "L'attestato",
        description: "Il documento da consegnare al committente, con punteggio, fascia e codice di verifica. Dichiara in chiaro di essere un'autovalutazione e non una certificazione.",
      },
    ],
  },
  {
    pageId: "soa",
    pathPattern: /^\/aziende\/[^/]+\/soa/,
    steps: [
      {
        element: '[data-tour="soa-vista-contesto"]',
        title: "Che cosa copre la Dichiarazione",
        description: "I 93 controlli dell'Allegato A sono sempre in ambito. I moduli estesi — cloud, dati personali in cloud, privacy — si attivano in base ai ruoli che dichiari qui.",
      },
      {
        element: '[data-tour="soa-vista-controlli"]',
        title: "Il registro dei controlli",
        description: "Per ciascuno: se è applicabile e perché, a che punto è, quale documento lo sostiene, chi lo presidia. La norma chiede di motivare le esclusioni, non le inclusioni.",
      },
      {
        element: '[data-tour="soa-vista-verifiche"]',
        title: "Quello che un auditor guarda per primo",
        description: "Esclusioni senza giustificazione, controlli attuati senza documento, presidi senza responsabile. Sono i rilievi più frequenti, elencati con i controlli coinvolti.",
      },
      {
        element: '[data-tour="soa-vista-piano"]',
        title: "Priorità di attuazione",
        description: "In testa i controlli cardine, quelli senza stato e quelli non attuati: un cardine scoperto è un rilievo quasi certo, a prescindere da quanti punti valga.",
      },
      {
        element: '[data-tour="soa-vista-documento"]',
        title: "La Dichiarazione",
        description: "La tabella per sezione che l'organismo di certificazione si aspetta, con la nota di conformità al punto 6.1.3 lettera d) della norma.",
      },
    ],
  },
];

export const findTourForPath = (path: string): TourDef | null =>
  TOURS.find((t) => t.pathPattern.test(path)) ?? null;
