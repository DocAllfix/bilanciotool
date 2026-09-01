import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

/** Modello 231. Metodo dal corso del committente, prodotto riscritto. */
export const MOG231: Sezione[] = [
  {
    id: "anagrafica-231",
    titolo: "Anagrafica, organi e Organismo di Vigilanza",
    minuti: 5,
    sommario: "Che cosa alimenta i segnaposto dei documenti, e il campo che in giudizio pesa di più.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Gruppo", "Che cosa muove"],
        righe: [
          [
            "Identificazione dell'ente",
            "Denominazione e forma giuridica (anche cooperativa, consorzio, associazione, fondazione, ente del terzo settore), unità locali e cantieri, attività, addetti",
          ],
          ["Organi", "Organo amministrativo, legale rappresentante, organo di controllo: intestazioni e firme dei documenti"],
          [
            "Organismo di Vigilanza",
            "Composizione, componenti, data di nomina, scadenza, budget annuo. Alimenta la prima sezione della relazione dell'organismo",
          ],
          [
            "Esposizione",
            "Rapporti con la pubblica amministrazione e altri sistemi di gestione adottati: orientano il catalogo e richiamano i presidi già in essere",
          ],
          ["Canale di segnalazione", "Canale scritto, canale orale, soggetto gestore"],
          ["Adozione e revisione", "Ambito di applicazione, esclusioni motivate, data di adozione, revisione corrente"],
        ],
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Il budget dell'Organismo non è un campo facoltativo",
        testo:
          "L'assenza di un budget autonomo è, in giudizio, un indice di inidoneità del modello: un organismo che deve chiedere ogni spesa a chi dovrebbe vigilare non è indipendente. Va deliberato insieme alla nomina, e scritto qui.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Prima l'anagrafica, poi i testi",
        testo:
          "I segnaposto dei documenti si risolvono da qui. Riscriverli a mano dentro i testi significa rifare il lavoro a ogni cambio di organismo o di revisione, e dimenticarne uno.",
      },
    ],
  },

  {
    id: "catalogo-reati",
    titolo: "Il catalogo dei reati presupposto",
    minuti: 5,
    sommario: `Le ${NUMERI.reati231} fattispecie in ${NUMERI.pilastri231} famiglie, e che cosa significa escluderne una.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il catalogo porta **${NUMERI.reati231} fattispecie** raggruppate in **${NUMERI.pilastri231} famiglie**, ciascuna collegata al protocollo di parte speciale che la presidia. Per ognuna si dichiara l'applicabilità all'ente, e l'esclusione va motivata con riferimento all'attività concretamente svolta.`,
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "«Non applicabile» non vuol dire «improbabile»",
        testo:
          "Un reato si esclude quando la sua condotta è estranea all'attività: gli abusi di mercato per una società non quotata. Se è soltanto poco probabile resta applicabile, e la probabilità si valuta nello scenario. È la distinzione che rende un catalogo difendibile: escludere per improbabilità significa aver deciso il risultato prima della valutazione.",
      },
      {
        tipo: "prosa",
        testo:
          "Le fattispecie che comportano sanzioni interdittive sono segnalate: sono quelle il cui impatto, nella valutazione, di norma non scende sotto il livello grave. Il catalogo va chiuso per intero — le voci mai esaminate compaiono come tali, e una fattispecie non esaminata è un buco che si vede.",
      },
      {
        tipo: "prosa",
        testo: "Solo le fattispecie dichiarate applicabili possono essere associate ai processi.",
      },
    ],
  },

  {
    id: "processi-sensibili",
    titolo: "I processi sensibili",
    minuti: 6,
    sommario: "La mappatura, che è il fondamento del modello, e gli scenari reato-processo.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Un processo per ogni area in cui i reati applicabili possono essere commessi. Per ciascuno si descrivono le fasi, le attività a rischio, le controparti, i flussi finanziari, i margini di discrezionalità e la documentazione prodotta.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "La discrezionalità non presidiata è il fattore che pesa di più",
        testo:
          "Non è la dimensione del flusso finanziario a fare il rischio, è quanto margine ha chi decide e quanto poco resta scritto. Ed è la parte che va descritta con cura, perché è quella che rende leggibile la matrice a chi la esaminerà.",
      },
      {
        tipo: "prosa",
        testo:
          "Per ogni scenario reato-processo si compilano probabilità e impatto, si dichiara lo stato dei presidi, e si scrivono in chiaro le modalità di possibile commissione e i presidi esistenti. Sono quelle due colonne a rendere la matrice comprensibile a un lettore esterno: senza, restano quattro livelli senza racconto.",
      },
      {
        tipo: "prosa",
        testo:
          "I processi tipici di una piccola impresa sono una decina: gare e rapporti con l'amministrazione, acquisti e selezione fornitori, vendite e agenti, tesoreria, risorse umane, salute e sicurezza, ambiente e rifiuti, sistemi informativi, bilancio e adempimenti fiscali, omaggi e liberalità. Il numero giusto è quello che copre tutti i reati applicabili senza duplicazioni.",
      },
    ],
  },

  {
    id: "motore-rischio-231",
    titolo: "Il motore di rischio",
    minuti: 7,
    sommario: "Due valutazioni in ingresso, una scelta sui presidi, due livelli calcolati.",
    blocchi: [
      {
        tipo: "formula",
        testo: "rischio inerente = probabilità × impatto\nrischio residuo = inerente incrociato con lo stato dei presidi",
      },
      {
        tipo: "prosa",
        testo:
          "L'impatto tiene conto della sanzione — pecuniaria e interdittiva — e del danno reputazionale. Per le fattispecie che comportano sanzioni interdittive, di norma non scende sotto il livello grave.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Presidi non valutati contano come assenti",
        testo:
          "Il residuo coincide col caso peggiore finché non si dichiara che cosa esiste. È voluto: un presidio non dichiarato è un presidio che in verifica non si può mostrare, e trattarlo come esistente produrrebbe un modello che si giudica da solo assolvendosi.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Con presidi adeguati un rischio critico scende, non sparisce",
        testo:
          "Per le fattispecie più gravi il modello non azzera mai il rischio: lo governa. Una matrice interamente su livelli bassi, per un ente esposto, è meno credibile di una che dichiara i propri punti critici e mostra come li presidia.",
      },
      {
        tipo: "prosa",
        testo:
          "I residui non accettabili vanno nel piano di adeguamento con azione, responsabile, termine e verifica. Il livello di un processo è il massimo fra i suoi scenari, non la media: un processo con un solo scenario critico è un processo critico.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Presidi «adeguati» va detto solo se sono scritti e applicati",
        testo:
          "Adeguato significa: previsto dal protocollo di parte speciale collegato al processo, approvato, e applicato con evidenza. Residui tutti bassi accanto a protocolli ancora da personalizzare sono una contraddizione che si vede nella matrice stampata, ed è la prima cosa che un lettore esterno nota.",
      },
    ],
  },

  {
    id: "registri-231",
    titolo: "I registri",
    minuti: 6,
    sommario: `I ${NUMERI.registri231} registri che provano l'efficace attuazione.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Sono **${NUMERI.registri231}**, e ciascuno è collegato a un modulo, a un documento del corpus e a un pilastro della mappa di idoneità: piano di adeguamento, deleghe e procure, deroghe ai protocolli, flussi informativi verso l'organismo, segnalazioni, provvedimenti disciplinari, verifiche e verbali dell'organismo, formazione, omaggi e liberalità, terzi qualificati, aggiornamenti del modello.`,
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Sono le date a fare gli indicatori",
        testo:
          "Una verifica risulta eseguita solo con la data di esecuzione; una segnalazione conta solo con la data dell'avviso di ricevimento e quella del riscontro; un'azione di adeguamento è chiusa solo quando risulta verificata, non quando risulta attuata. Registrazioni senza date non muovono né gli indicatori né la relazione dell'organismo.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Il registro delle segnalazioni, quando esiste il modulo dedicato",
        testo:
          "Se per la stessa azienda è attivo il percorso sulle segnalazioni, il registro del 231 diventa di sola lettura e rimanda al fascicolo, dove i termini di legge si calcolano davvero. Non viene tolto: a un ente che quel percorso non l'ha aperto serve, ed è l'unico posto dove annotare una segnalazione ricevuta.",
      },
    ],
  },

  {
    id: "idoneita-231",
    titolo: "La mappa di idoneità e gli indicatori",
    minuti: 7,
    sommario: `I ${NUMERI.presidi231} presidi su ${NUMERI.capi231} pilastri, formulati come le domande di un giudice.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `La mappa porta **${NUMERI.presidi231} presidi** distribuiti su **${NUMERI.capi231} pilastri**, ciascuno con il riferimento all'articolo e al comma. Le domande sono formulate come le porrebbe chi deve accertare l'idoneità del modello: «è stato adottato con delibera avente data certa e anteriore ai fatti?». Per ognuna si dichiara lo stato e si scrive l'evidenza, cioè il documento o il fatto che si esibirà.`,
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Un presidio applicabile e non valutato pesa ZERO, non viene ignorato",
        testo:
          "Mediare sui soli valutati farebbe salire l'indice man mano che si saltano i requisiti difficili: tre presidi conformi su venti darebbero lo stesso numero di venti su venti. Sono situazioni opposte, e su un documento destinato all'organo di controllo devono avere due numeri diversi.",
      },
      {
        tipo: "elenco",
        voci: [
          "Copertura: catalogo esaminato per intero, e ogni reato applicabile coperto da almeno un processo.",
          "Attuazione: azioni di adeguamento verificate, verifiche dell'organismo eseguite sul programma, sedute verbalizzate, flussi pervenuti nei termini, formazione erogata, terzi con clausole.",
          "Esito: avvisi e riscontri nei termini di legge, ritorsioni contestate a zero, provvedimenti disciplinari a fronte di violazioni accertate.",
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Un modello mai applicato è un elemento a carico",
        testo:
          "Violazioni accertate senza alcun provvedimento disciplinare non dicono che il sistema disciplinare non serviva: dicono che non è stato applicato. In giudizio è uno degli elementi che pesano di più, ed è anche il più facile da evitare.",
      },
    ],
  },

  {
    id: "corpus-231",
    titolo: "I documenti del modello",
    minuti: 5,
    sommario: `Parte generale e parte speciale: ${NUMERI.documenti231} documenti e ${NUMERI.moduli231} moduli.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il corpus porta **${NUMERI.documenti231} documenti** — la parte generale, dal quadro normativo all'aggiornamento del modello, e i protocolli di parte speciale, uno per famiglia di reati — con **${NUMERI.moduli231} moduli** collegati. È comune e versionato, e si personalizza blocco per blocco: ciò che non si tocca resta agganciato alla versione condivisa.`,
      },
      {
        tipo: "prosa",
        testo:
          "L'ordine di approvazione che funziona: prima struttura e metodologia, poi organismo e flussi, poi segnalazioni e sistema disciplinare, poi i protocolli di parte speciale collegati ai processi mappati, infine formazione e aggiornamento. Approvare i protocolli prima di aver mappato i processi significa approvare presidi per rischi che non si sono ancora descritti.",
      },
      {
        tipo: "prosa",
        testo:
          "La consegna della sola parte generale non è un interruttore ma una proprietà del dato: le procedure dichiarano la propria fase, e da lì il prodotto ricava che cosa stampare. Dove la distinzione nei dati non c'è, il comando non compare.",
      },
    ],
  },

  {
    id: "errori-231",
    titolo: "La sequenza di impianto, e gli errori più frequenti",
    minuti: 5,
    sommario: "In che ordine si costruisce il modello, e che cosa lo rende indifendibile.",
    blocchi: [
      {
        tipo: "elenco",
        voci: [
          "Anagrafica completa, organismo con budget, canale di segnalazione.",
          "Catalogo chiuso per intero, con motivazione su ogni esclusione.",
          "Processi con attività a rischio e discrezionalità descritte; scenari con modalità di commissione e presidi; ogni reato applicabile coperto da almeno un processo.",
          "Piano di adeguamento per i residui non accettabili; approvazione dei documenti collegati; delibera di adozione registrata.",
          "Mappa di idoneità valutata su tutti i presidi, con le evidenze; registri alimentati nel tempo; relazione dell'organismo a fine periodo.",
        ],
      },
      {
        tipo: "tabella",
        intestazioni: ["Errore", "Conseguenza", "Come si evita"],
        righe: [
          [
            "Reati esclusi perché improbabili",
            "Catalogo indifendibile e scenari mancanti",
            "Si esclude solo per estraneità all'attività; la probabilità va nello scenario",
          ],
          ["Reato applicabile senza processo", "Incoerenza visibile nel cruscotto e nella matrice", "Ogni applicabile associato ad almeno un processo"],
          [
            "Presidi dichiarati adeguati con protocolli da personalizzare",
            "Residuo ottimistico, contraddizione a stampa",
            "Adeguati solo se scritti nel protocollo approvato e applicati",
          ],
          [
            "Residui non accettabili senza piano",
            "Rischio dichiarato e non governato: la peggiore delle due condizioni",
            "Una riga di piano per ogni scenario non accettabile",
          ],
          [
            "Organismo senza budget o senza verbali",
            "Indice di inidoneità e di mancata attuazione",
            "Budget in anagrafica, verbali e verifiche nei registri",
          ],
          ["Segnalazioni senza date", "Obblighi di legge non dimostrabili", "Date di avviso e di riscontro su ogni segnalazione"],
          [
            "Violazioni accertate senza provvedimenti",
            "Modello mai applicato: elemento a carico dell'ente",
            "Registro dei provvedimenti alimentato",
          ],
        ],
      },
    ],
  },
];
