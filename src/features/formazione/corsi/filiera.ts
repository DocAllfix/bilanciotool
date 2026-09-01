import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

/** Due diligence di filiera. Metodo dal corso del committente, prodotto riscritto. */
export const FILIERA: Sezione[] = [
  {
    id: "anagrafica-filiera",
    titolo: "Anagrafica e perimetro",
    minuti: 5,
    sommario: "I dati che alimentano i segnaposto del corpus e che pesano nelle fasi del ciclo.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Gruppo", "Che cosa muove"],
        righe: [
          [
            "Identificazione",
            "Segnaposto nei documenti; la spesa di approvvigionamento dichiarata serve a confrontare la spesa mappata con quella complessiva",
          ],
          ["Governance del processo", "Alta direzione, responsabile della due diligence, comitato di filiera"],
          ["Canale di reclamo", "Email, telefono, modulo, lingue disponibili: almeno un canale attivo pesa nella fase del rimedio"],
          ["Comunicazione", "Data e indirizzo dell'ultima dichiarazione pubblicata"],
          ["Campo di applicazione", "Categorie, livelli della filiera e aree geografiche coperti"],
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Le lingue del canale sono quelle dei lavoratori, non quelle dell'organizzazione",
        testo:
          "È il presupposto dell'accessibilità, ed è ciò che un audit verifica per primo. Un canale in italiano in una filiera dove si parlano altre lingue esiste sulla carta e non esiste nei fatti.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "I segnaposto si risolvono dall'anagrafica, non riscrivendoli nei testi",
        testo:
          "Nei documenti i segnaposto non risolti restano visibili fra parentesi quadre, e ogni procedura mostra quanti ne ha ancora aperti. Riscriverli a mano dentro il testo significa rifare il lavoro a ogni cambio di responsabile o di revisione.",
      },
    ],
  },

  {
    id: "filiera-e-partner",
    titolo: "La mappa della filiera",
    minuti: 6,
    sommario: "Un nodo per sito produttivo, non per ragione sociale.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "La mappa è fatta di nodi, e **un nodo è un sito**: un partner con più stabilimenti genera più nodi. È la differenza fra sapere che si compra da un fornitore e sapere dove quel fornitore produce — che è l'unica cosa su cui il rischio paese e i siti non dichiarati diventano visibili.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Gruppo di dati", "Perché conta"],
        righe: [
          [
            "Identificazione",
            "Livello della filiera, categoria, paese e sito, attività. Paese e sito compilati sono ciò che rende la spesa «mappata a livello di sito»",
          ],
          [
            "Manodopera",
            "Addetti, somministrati e stagionali, lavoratori migranti, agenzie di reclutamento, subappalto: sono i segnali che orientano il rischio del modello di approvvigionamento",
          ],
          [
            "Rapporto commerciale",
            "Spesa annua, peso sul fatturato del partner, sostituibilità. La spesa pesa su tutte le coperture; peso e sostituibilità misurano la leva, e vanno guardati prima di qualunque ipotesi di uscita",
          ],
          [
            "Qualifica e contratto",
            "Codice accettato, clausole inserite, ribaltamento a valle, canale comunicato ai lavoratori, stato del rapporto",
          ],
        ],
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Lo stato del rapporto non è un dettaglio anagrafico",
        testo:
          "«Cessato» toglie il nodo da coperture e verifiche dovute; «sospeso» lo mantiene nei calcoli; «in uscita graduale» è esso stesso un indicatore di esito. Usare «cessato» per un rapporto solo sospeso fa sparire dalle statistiche proprio i nodi su cui si sta intervenendo.",
      },
    ],
  },

  {
    id: "motore-rischio-filiera",
    titolo: "Il motore di rischio",
    minuti: 8,
    sommario: "Rischio inerente, maturità, residuo, e la frequenza delle verifiche che ne discende.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il rischio inerente si valuta su **${NUMERI.dimensioniFiliera} dimensioni**: rischio paese, rischio settore, rischio prodotto o materia prima, rischio del modello di approvvigionamento. È la media delle dimensioni valutate, e descrive il contesto in cui il partner opera **a prescindere da ciò che fa**.`,
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "I fattori aggravanti elevano, e basta uno solo",
        testo:
          "Agenzie di reclutamento per lavoratori migranti, lavoro a domicilio, un sito non dichiarato emerso in verifica, una segnalazione fondata, un provvedimento di un'autorità: con anche uno solo di questi il nodo non scende sotto «alta», qualunque sia la media. Un fattore aggravante non si compensa con un buon punteggio altrove.",
      },
      {
        tipo: "prosa",
        testo: `La maturità si valuta su **${NUMERI.areeFiliera} aree** e misura invece ciò che il partner fa: governance e politiche, lavoro minorile, lavoro forzato e reclutamento, orario e retribuzioni, libertà di associazione, salute e sicurezza, ambiente e legalità.`,
      },
      {
        tipo: "formula",
        testo: "maturità = min( media delle aree valutate ; minimo fra le tre aree critiche + 0,9 )",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Il silenzio sulle aree critiche LIMITA la maturità, non la premia",
        testo:
          "Le tre aree critiche — lavoro minorile, lavoro forzato, salute e sicurezza — fanno da tetto: un punteggio basso su una di esse limita la maturità complessiva anche quando tutte le altre sono ottime, perché una governance impeccabile non compensa una lacuna sul lavoro minorile. E quando quelle aree non sono state valutate affatto, il tetto parte dal valore più basso e non dal più alto. È uno scostamento voluto dal prototipo, dove un partner che aveva risposto a una sola domanda di governance otteneva la maturità massima e la stessa frequenza di verifica di chi era stato valutato su tutte le aree: non aver detto niente veniva premiato come averlo detto bene.",
      },
      {
        tipo: "prosa",
        testo:
          "Il residuo nasce dall'incrocio fra inerente e maturità, e da lì discende ogni quanto il partner va verificato: dai dodici mesi del residuo critico ai quarantotto del basso. Un nodo senza valutazione di maturità è trattato come se fosse al livello più basso, quindi il suo residuo coincide col caso peggiore — e un nodo mai verificato risulta sempre scaduto.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Perché la sequenza è questa",
        testo:
          "L'inerente descrive il contesto, la maturità descrive la risposta, il residuo li combina e decide le priorità. Valutare l'inerente senza fare la valutazione di maturità lascia tutti i nodi al residuo peggiore, cioè produce un piano di verifiche annuali su tutta la filiera: tecnicamente prudente, praticamente inapplicabile, e quindi disatteso.",
      },
    ],
  },

  {
    id: "registri-filiera",
    titolo: "I registri",
    minuti: 7,
    sommario: `I ${NUMERI.registriFiliera} registri che documentano l'attuazione, e le date che li fanno contare.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Sono **${NUMERI.registriFiliera}**: impatti negativi, piani d'azione correttivi, verifiche e audit, segnalazioni e rimedi, punti di opacità, richieste informative, obiettivi e azioni. Ciascuno è collegato a un modulo e a una procedura del corpus, e alimenta le percentuali del cruscotto.`,
      },
      {
        tipo: "formula",
        testo: "gravità di un impatto = MAX(scala, portata, irrimediabilità)",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "La gravità è il massimo, non la media",
        testo:
          "Un impatto irreversibile su poche persone resta grave. Mediare le tre componenti farebbe scendere proprio i casi che il sistema esiste per intercettare: un danno irreversibile su un gruppo circoscritto diventerebbe «moderato». La probabilità si compila solo per gli impatti potenziali; per quelli in atto non attenua niente.",
      },
      {
        tipo: "prosa",
        testo:
          "La relazione con l'impatto — causato, contribuito, direttamente collegato — determina la risposta attesa: cessazione e rimedio nei primi due casi, uso della leva nel terzo. Non è una sfumatura descrittiva: cambia che cosa l'organizzazione è tenuta a fare.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Sono le date a fare gli indicatori",
        testo:
          "Una verifica risulta eseguita solo con la data di esecuzione; un piano chiuso nei termini solo con scadenza e data di chiusura; una segnalazione conta solo con la data di conferma; una richiesta solo con la data di risposta. Registrazioni senza date esistono nell'elenco e non muovono nulla — e il cruscotto dice il vero: quel lavoro non è dimostrabile.",
      },
    ],
  },

  {
    id: "indicatori-filiera",
    titolo: "Indicatori di processo e di esito",
    minuti: 5,
    sommario: "Che cosa è stato svolto, e che cosa è effettivamente cambiato.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Gli indicatori di processo misurano ciò che è stato fatto: spesa coperta da partner qualificati e da valutazioni valide, copertura contrattuale delle clausole, verifiche eseguite sul piano, piani chiusi nei termini. Gli indicatori di esito misurano il cambiamento: impatti gravi chiusi, rimedi erogati, canale comunicato ai lavoratori, conferme e risposte nei termini, punti di opacità in riduzione.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Più segnalazioni non è un peggioramento",
        testo:
          "Un aumento delle segnalazioni si legge come un canale più accessibile e più creduto. Zero segnalazioni in una filiera ad alto rischio inerente è l'indicatore più preoccupante di tutti: non dice che non succede niente, dice che nessuno lo racconta.",
      },
      {
        tipo: "prosa",
        testo:
          "Il sistema è efficace quando migliorano i secondi. Un cruscotto con tutti gli indicatori di processo al massimo e gli esiti fermi descrive un'organizzazione che esegue le attività previste senza che cambi niente per nessuno.",
      },
    ],
  },

  {
    id: "corpus-filiera",
    titolo: "Procedure, modulistica e dichiarazione",
    minuti: 6,
    sommario: `Le ${NUMERI.procedureFiliera} procedure e i ${NUMERI.moduliFiliera} moduli, e come si personalizzano.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il corpus base è comune e versionato: **${NUMERI.procedureFiliera} procedure** e **${NUMERI.moduliFiliera} moduli**, personalizzabili blocco per blocco. Le personalizzazioni valgono solo per l'azienda in cui si fanno, e ciò che non si tocca resta agganciato alla versione comune — così un aggiornamento del corpus arriva dove non hai scritto niente e non tocca dove hai scritto.`,
      },
      {
        tipo: "elenco",
        voci: [
          "Si modifica solo ciò che differisce davvero: soglie, funzioni, cadenze. Riscrivere un blocco identico al comune lo stacca dagli aggiornamenti futuri senza guadagnarci niente.",
          "I segnaposto si chiudono dall'anagrafica; il contatore accanto a ogni procedura dice quanti ne restano aperti.",
          "Il corpus è congelato alla creazione: un'azienda avviata oggi lavora sulla revisione di oggi, e resterà su quella finché non si decide diversamente.",
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Come si scrive la dichiarazione annuale",
        testo:
          "Non si dichiara l'assenza di lavoro forzato nella filiera: si dichiara che cosa è stato verificato, come, e con quali limiti. Le criticità riscontrate si riportano, perché una dichiarazione senza rilievi è indice di verifica inefficace, non di filiera sana. E i nomi dei partner e i dati che esporrebbero i segnalanti non si divulgano.",
      },
    ],
  },

  {
    id: "errori-filiera",
    titolo: "La sequenza di impianto, e gli errori più frequenti",
    minuti: 5,
    sommario: "In che ordine si mette in piedi il sistema, e che cosa lo fa fallire.",
    blocchi: [
      {
        tipo: "elenco",
        voci: [
          "Anagrafica completa: governance, canale di reclamo, perimetro.",
          "Approvazione delle prime procedure — politica, codice di condotta, nomina del responsabile — perché sbloccano la prima fase e danno senso al resto.",
          "Mappatura della filiera per sito con la spesa annua, poi rischio inerente su tutti i nodi attivi.",
          "Valutazione di maturità a partire dai nodi ad alto rischio; registro impatti e piani dove emergono rilievi.",
          "Piano delle verifiche secondo il residuo; segnalazioni e richieste man mano che arrivano; riesame, obiettivi, dichiarazione.",
        ],
      },
      {
        tipo: "tabella",
        intestazioni: ["Errore", "Conseguenza", "Come si evita"],
        righe: [
          [
            "Partner senza spesa annua",
            "Tutte le coperture espresse in quota di spesa restano a zero",
            "Spesa annua su ogni nodo, anche stimata",
          ],
          [
            "Un nodo per ragione sociale invece che per sito",
            "Rischio paese e siti non dichiarati diventano invisibili",
            "Un nodo per stabilimento, con paese e sito compilati",
          ],
          [
            "Rischio inerente senza valutazione di maturità",
            "Tutti i nodi al residuo peggiore, e verifiche annuali ovunque",
            "Valutazione almeno sui nodi ad alto rischio, con la data",
          ],
          [
            "Registrazioni senza date",
            "Verifiche non eseguite, piani non chiusi, conferme non conteggiate",
            "Date di esecuzione, chiusura, conferma e risposta",
          ],
          [
            "Segnaposto riscritti a mano nei testi",
            "Personalizzazioni da rifare a ogni cambio di responsabile",
            "Risolverli dall'anagrafica",
          ],
          [
            "Uscita immediata da un partner a fronte di un impatto",
            "Pregiudizio maggiore per i lavoratori, e responsabilità che si sposta senza sparire",
            "Valutazione degli effetti, uso della leva, uscita graduale",
          ],
        ],
      },
    ],
  },
];
