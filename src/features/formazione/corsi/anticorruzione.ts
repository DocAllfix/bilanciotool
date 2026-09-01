import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

/** Prevenzione della corruzione (UNI ISO 37001). Metodo dal corso del committente. */
export const ANTICORRUZIONE: Sezione[] = [
  {
    id: "anagrafica-37001",
    titolo: "Anagrafica e assetto di governance",
    minuti: 5,
    sommario: "Due scelte che vanno dichiarate invece che presunte.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Gruppo", "Che cosa muove"],
        righe: [
          ["Identificazione", "Paesi di operatività: concorrono al rischio di contesto"],
          [
            "Governance",
            "Alta direzione; esistenza e composizione di un organo di governo distinto; funzione per la prevenzione della corruzione, con il grado di impegno e, se esternalizzata, il dirigente interno responsabile",
          ],
          ["Esposizione", "Natura e frequenza delle interazioni con pubblici ufficiali"],
          ["Canale di segnalazione", "Email, piattaforma, telefono, gestore terzo, lingue"],
          ["Campo di applicazione", "Sedi, attività, processi e società coperti, con le esclusioni motivate"],
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Due cose si dichiarano, non si presumono",
        testo:
          "Se non esiste un organo di governo distinto, la sorveglianza la svolge l'alta direzione, e la circostanza va scritta. Se la funzione di prevenzione è esternalizzata, la responsabilità generale e l'autorità sulla funzione restano interne: serve il dirigente responsabile, con nome e ruolo. Un sistema in cui non si capisce chi risponde è il primo rilievo di un audit.",
      },
    ],
  },

  {
    id: "soci-in-affari",
    titolo: "I soci in affari",
    minuti: 6,
    sommario: "Il censimento da cui discende tutto il resto, e perché non coincide con l'albo fornitori.",
    blocchi: [
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Soci in affari non vuol dire fornitori",
        testo:
          "La norma comprende anche clienti, joint venture, istituti finanziari, agenzie di somministrazione, distributori e soprattutto agenti e intermediari commerciali. Censire il solo ciclo passivo lascia fuori proprio i soggetti a rischio più alto: chi agisce per conto dell'organizzazione verso terzi è la figura attorno a cui questa norma è stata scritta.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Gruppo di dati", "Perché conta"],
        righe: [
          [
            "Identificazione",
            "Categoria, paese, oggetto del rapporto, titolari effettivi. L'impossibilità di ricostruire la titolarità effettiva è essa stessa un fattore di rischio",
          ],
          [
            "Rapporto economico",
            "Valore annuo, modalità di remunerazione, se è una società controllata. La provvigione e il compenso a successo attivano la verifica di proporzionalità",
          ],
          [
            "Adempimenti",
            "Data ed esito della due diligence, politica comunicata, impegni acquisiti, clausole, controlli del socio, formazione, verifica di proporzionalità, stato del rapporto",
          ],
        ],
      },
      {
        tipo: "prosa",
        testo:
          "«Cessato» esclude il socio dai calcoli, «sospeso» lo mantiene. È la stessa distinzione della filiera, ed è la stessa trappola: chiudere un rapporto solo sospeso fa sparire dalle statistiche il socio su cui si sta intervenendo.",
      },
    ],
  },

  {
    id: "rischio-e-obblighi",
    titolo: "Rischio, soglia e obblighi derivati",
    minuti: 8,
    sommario: "Il cuore della norma: dal livello di rischio discende che cosa è dovuto.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il livello si valuta su **${NUMERI.dimensioni37001} dimensioni**: il paese in cui il socio opera per conto dell'organizzazione, l'interazione con pubblici ufficiali, la natura del rapporto — dalla fornitura di beni standard all'agire per conto verso terzi — e la rilevanza economica insieme alla discrezionalità della prestazione.`,
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: `I ${NUMERI.fattori37001} fattori aggravanti, e basta uno`,
        testo:
          "Remunerazione a provvigione o a successo; socio nominato o imposto dal cliente o da un pubblico ufficiale; titolarità effettiva non ricostruibile o giurisdizione opaca; indagini, condanne o sanzioni per corruzione; legami con pubblici ufficiali o candidati; richiesta di pagamenti a soggetti diversi dal contraente. Uno solo porta il livello almeno ad alto; i precedenti per corruzione lo portano al massimo. Sono i fattori che nella pratica si dimenticano di compilare, e un agente a provvigione classificato basso è un sistema che non ha capito il proprio scopo.",
      },
      {
        tipo: "formula",
        testo: "sopra la soglia = livello diverso dal più basso",
      },
      {
        tipo: "prosa",
        testo:
          "È la regola su cui poggia l'intera norma: i controlli rafforzati sono dovuti per i soci con rischio superiore al basso. La due diligence ha un livello di approfondimento crescente col rischio e una validità che si accorcia al crescere del rischio: dai dodici mesi del livello critico ai trentasei del basso.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Obbligo", "Quando è dovuto"],
        righe: [
          ["Due diligence svolta e valida", "Per i soci sopra la soglia"],
          ["Politica comunicata direttamente", "Per i soci sopra la soglia"],
          ["Impegni anticorruzione acquisiti", "Per i soci sopra la soglia"],
          ["Clausole contrattuali inserite", "Per i soci sopra la soglia"],
          ["Controlli del socio verificati", "Per i soci sopra la soglia"],
          ["Formazione agli addetti del socio", "Se il socio agisce per conto dell'organizzazione"],
          ["Verifica di proporzionalità del corrispettivo", "Se la remunerazione è a provvigione o a successo"],
          ["Adeguamento della società controllata", "Se il socio è una controllata"],
        ],
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "La non fattibilità si registra, non si presume",
        testo:
          "La norma ammette che un impegno o una verifica non siano ottenibili, ma a due condizioni: che sia documentato e che sia valutato nel rischio. Chiudere l'obbligo dichiarando «non fattibile» senza scrivere il perché è la scorciatoia che l'auditor cerca per prima, ed è anche la più facile da chiudere davvero: la motivazione ha un campo suo.",
      },
    ],
  },

  {
    id: "registri-37001",
    titolo: "I registri",
    minuti: 7,
    sommario: `I ${NUMERI.registri37001} registri che alimentano cruscotto, indicatori e relazione.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Sono **${NUMERI.registri37001}**: valutazione del rischio di corruzione, deleghe e poteri decisionali, obiettivi, dichiarazioni di conformità, conflitti di interessi, formazione, controlli finanziari e non finanziari, regali e ospitalità, segnalazioni, indagini e casi, audit interni, non conformità e azioni correttive.`,
      },
      {
        tipo: "prosa",
        testo:
          "Gli scenari di corruzione si valutano per processo, distinguendo la corruzione in uscita da quella in entrata, con probabilità e conseguenza, i controlli esistenti e la loro idoneità. Uno scenario con controlli non idonei e nessuna azione aperta è una posizione da trattare, e il cruscotto la mostra: ogni scenario dovrebbe avere almeno un controllo nel registro dei controlli.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "L'autorizzazione preventiva sui benefici è preventiva",
        testo:
          "Un regalo o un'ospitalità registrati dopo, con l'autorizzazione che non è stata chiesta, restano nel registro come autorizzazione dovuta e mancata. È l'indicatore che si ripete più spesso, e la causa è sempre la stessa: le soglie e la procedura sono scritte ma si applicano a valle invece che a monte.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Sono le date a fare gli indicatori",
        testo:
          "Ricezione e presa in carico per le segnalazioni, termine e chiusura per le non conformità, esecuzione per gli audit, ultima verifica ed esito per i controlli. Una registrazione senza data esiste nell'elenco e non muove niente — e ha ragione a non muovere niente.",
      },
    ],
  },

  {
    id: "conformita-37001",
    titolo: "La mappa di conformità",
    minuti: 5,
    sommario: `I ${NUMERI.requisiti37001} controlli sui ${NUMERI.capi37001} capitoli, formulati come li porrebbe un auditor.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `**${NUMERI.requisiti37001} domande** distribuite su **${NUMERI.capi37001} capitoli**, ciascuna riferita al punto della norma e collegata alla procedura che risponde. Le domande sono scritte come le porrebbe chi certifica, e l'evidenza annotata è il riferimento che si esibirà: è l'autovalutazione che precede l'audit interno e quello di certificazione.`,
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Un requisito applicabile e non valutato pesa ZERO",
        testo:
          "Non viene ignorato. Mediare sui soli valutati farebbe salire la conformità man mano che si saltano i punti difficili: dieci requisiti conformi su novanta darebbero lo stesso numero di novanta su novanta. Su un documento che va a un ente di certificazione, sono tre situazioni opposte con un numero solo.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "«Non applicabile» con parsimonia",
        testo:
          "È corretto per requisiti oggettivamente estranei, per esempio le società controllate quando non ce ne sono. Usato per evitare una non conformità svuota la mappa: la percentuale sale, e in audit non regge nemmeno la prima domanda.",
      },
      {
        tipo: "prosa",
        testo:
          "Le domande non conformi e parzialmente conformi sono l'elenco delle azioni da chiudere prima della certificazione. Molte del capitolo operativo trovano risposta nei registri: annotare il registro come evidenza è verificabile, e vale più di un rimando a una procedura che descrive l'intenzione.",
      },
    ],
  },

  {
    id: "indicatori-37001",
    titolo: "Gli indicatori, e come si leggono",
    minuti: 4,
    sommario: "Che cosa è stato fatto, e se sta producendo effetti.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Di processo: soci sopra la soglia con due diligence valida, obblighi assolti sul totale degli applicabili, impegni acquisiti, clausole inserite, scenari valutati, controlli verificati, audit eseguiti sul programma, formazione erogata. Di esito: segnalazioni pervenute e prese in carico nei termini, casi accertati e casi che hanno portato a un riesame delle procedure, ritorsioni, azioni correttive chiuse con l'efficacia verificata, benefici autorizzati preventivamente.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Un sistema senza segnalazioni e senza casi va guardato con attenzione",
        testo:
          "Non con soddisfazione. Una funzione che riferisce all'organo di governo «nessuna segnalazione, nessun caso» senza aver mai misurato l'accessibilità e la credibilità del canale non sta dimostrando efficacia: sta dimostrando di non aver guardato.",
      },
    ],
  },

  {
    id: "corpus-37001",
    titolo: "Procedure, modulistica e relazione",
    minuti: 5,
    sommario: `Le ${NUMERI.procedure37001} procedure e i ${NUMERI.moduli37001} moduli, e l'ordine in cui si approvano.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il corpus base porta **${NUMERI.procedure37001} procedure** e **${NUMERI.moduli37001} moduli**, dal contesto e valutazione del rischio fino a monitoraggio, audit e miglioramento. È comune e versionato, si personalizza blocco per blocco, e le personalizzazioni valgono solo per l'azienda in cui si fanno.`,
      },
      {
        tipo: "prosa",
        testo:
          "L'ordine che funziona: prima rischio e politica, poi funzione e deleghe, poi due diligence e soci, poi controlli e benefici, poi segnalazioni, e per ultime pianificazione, competenze, formazione e riesame. Approvare le procedure operative prima di aver valutato il rischio significa scrivere controlli per scenari che non si sono ancora descritti.",
      },
      {
        tipo: "prosa",
        testo:
          "La relazione della funzione all'organo di governo è la Relazione all'organo di governo che il percorso produce: governance, soci e obblighi, segnalazioni e indagini, audit, criticità. Accanto c'è la Matrice di conformità, che è il documento che si porta in audit.",
      },
    ],
  },

  {
    id: "errori-37001",
    titolo: "La sequenza di impianto, e gli errori più frequenti",
    minuti: 4,
    sommario: "Come si costruisce il sistema, e che cosa lo rende inefficace.",
    blocchi: [
      {
        tipo: "elenco",
        voci: [
          "Anagrafica con la governance dichiarata, la funzione e il canale di segnalazione.",
          "Registro dei rischi: scenari per processo con controlli e idoneità, e registro dei controlli allineato.",
          "Soci in affari: censimento completo, non solo fornitori; livello di rischio con i fattori aggravanti; poi gli adempimenti partendo dai livelli più alti.",
          "Deleghe, conflitti, dichiarazioni, formazione; approvazione delle procedure collegate.",
          "Mappa di conformità valutata per intero con le evidenze; audit interno; relazione all'organo di governo.",
        ],
      },
      {
        tipo: "tabella",
        intestazioni: ["Errore", "Conseguenza", "Come si evita"],
        righe: [
          [
            "Soci in affari uguale albo fornitori",
            "Agenti, intermediari e clienti fuori dal sistema",
            "Censire tutte le categorie, con priorità a chi agisce per conto",
          ],
          [
            "Fattori aggravanti non compilati",
            "Un agente a provvigione classificato basso, e nessun obbligo dovuto",
            "Rivederli su ogni socio: sono la parte che il livello medio non cattura",
          ],
          ["Due diligence senza data", "Obbligo mai assolto e quota a zero", "Data ed esito su ogni socio sopra la soglia"],
          [
            "«Non fattibile» senza motivazione",
            "Obbligo chiuso senza evidenza: peggio che lasciarlo aperto",
            "Motivazione nel campo dedicato, e valutazione nel rischio",
          ],
          [
            "Scenari con controlli non idonei lasciati aperti",
            "Rischio dichiarato e non governato",
            "Azione, stato e controllo collegato per ogni scenario",
          ],
          [
            "Benefici registrati senza autorizzazione preventiva",
            "L'indicatore dell'autorizzazione dovuta si ripete a ogni periodo",
            "Soglie e autorizzazione applicate prima, non dopo",
          ],
          [
            "Non applicabile usato per evitare una non conformità",
            "Mappa che non regge in audit",
            "Non applicabile solo per requisiti oggettivamente estranei",
          ],
        ],
      },
    ],
  },
];
