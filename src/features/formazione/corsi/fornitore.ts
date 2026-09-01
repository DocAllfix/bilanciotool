import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

/** Autovalutazione ESG del fornitore. Metodo dal corso del committente, prodotto riscritto. */
export const FORNITORE: Sezione[] = [
  {
    id: "anagrafica-e-richiesta",
    titolo: "Anagrafica e richiesta del committente",
    minuti: 4,
    sommario: "Chi è l'azienda, che cosa le viene chiesto, e la soglia che governa tutto il resto.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Due riquadri: l'azienda valutata (ragione sociale, partita IVA, ATECO, sede operativa, dimensione) e la richiesta che arriva dal committente (cliente o capofila, punteggio minimo richiesto, termine di consegna, referente interno).",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "La soglia governa tutto",
        testo:
          "È la tacca sulla barra del quadro di sintesi, determina la frase «ti mancano N punti» e dà senso al piano, che ordina le azioni per recuperare il divario nel minor tempo. Se il committente non l'ha indicata, si sceglie quella della fascia che si vuole raggiungere e la si scrive: una soglia lasciata al valore predefinito fa sembrare raggiunto un obiettivo che nessuno ha posto.",
      },
    ],
  },

  {
    id: "questionario",
    titolo: "Il questionario",
    minuti: 7,
    sommario: `${NUMERI.domandeFornitore} domande in ${NUMERI.areeFornitore} aree, quattro risposte, e la regola dell'evidenza.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `**${NUMERI.domandeFornitore} domande** distribuite su **${NUMERI.areeFornitore} aree**. Ogni domanda porta il riferimento normativo, l'evidenza documentale attesa e un peso da uno a tre.`,
      },
      {
        tipo: "tabella",
        intestazioni: ["Risposta", "Vale", "Quando si usa"],
        righe: [
          [
            "Sì",
            "pieno",
            "Il requisito è soddisfatto e l'evidenza documentale indicata esiste ed è reperibile oggi",
          ],
          [
            "In parte",
            "metà",
            "Requisito presente ma incompleto, non aggiornato o non formalizzato: politica scritta ma non approvata, registro tenuto ma senza indici",
          ],
          ["No", "zero", "Requisito assente. Compare nel piano come azione da predisporre"],
          [
            "Non applicabile",
            "escluso",
            "Il requisito non si applica all'attività, per esempio i prelievi idrici per un ufficio. Esce dal denominatore dell'area invece di penalizzarla",
          ],
        ],
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "«Non risposta» e «non applicabile» sono due cose diverse",
        testo:
          "Non applicabile conta come valutata ed esce dal punteggio. Nessuna risposta esce anche dal conteggio delle valutate: è una lacuna, non una scelta. Confonderle è il difetto che rende un'autovalutazione indifendibile, perché permette di alzare l'indice semplicemente saltando le domande difficili.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "La regola dell'evidenza",
        testo:
          "Si risponde Sì solo se esiste un documento reperibile, e la domanda dice quale. Se il documento va cercato, ricostruito o firmato, la risposta è «in parte». È esattamente ciò che il committente chiederà di vedere: un Sì senza documento diventa un problema nel momento peggiore, cioè quando le evidenze vengono richieste.",
      },
      {
        tipo: "prosa",
        testo:
          "Ripremere la stessa risposta la annulla. Per ogni risposta diversa da Sì c'è una nota interna — stato attuale, chi se ne occupa, dove sta la bozza — che si ritrova nel piano sotto l'azione corrispondente: è il ponte fra la valutazione e il lavoro da fare.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "I salvataggi si accodano, e il punteggio aspetta la coda",
        testo:
          "Rispondendo in rapida successione le scritture vanno in fila e il ricalcolo parte quando la fila è vuota. Senza, si chiederebbe il punteggio mentre le ultime risposte sono ancora in volo, e si leggerebbe un numero che non esiste: i dati sarebbero giusti, sbagliata sarebbe la vista.",
      },
    ],
  },

  {
    id: "come-si-calcola",
    titolo: "Come si calcola l'indice",
    minuti: 7,
    sommario: "Punteggio d'area, media ponderata sulle sole aree valutate, fascia, impatto di un'azione.",
    blocchi: [
      {
        tipo: "formula",
        testo:
          "punteggio area = Σ(peso × valore risposta) ÷ Σ(peso × pieno) × 100\n(escluse le non applicabili e le non risposte)",
      },
      {
        tipo: "tabella",
        intestazioni: ["Area", "Peso"],
        righe: [
          ["Governo della sostenibilità", "10%"],
          ["Ambiente", "25%"],
          ["Lavoro e diritti umani", "25%"],
          ["Etica e conformità", "25%"],
          ["Catena di fornitura", "15%"],
        ],
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "L'indice si rinormalizza sulle sole aree valutate",
        testo:
          "Un'area senza risposte esce dalla ponderazione invece di entrarci come zero. Chi ha compilato una sola area non deve risultare bocciato sulle altre quattro: sarebbe un giudizio su un lavoro che non è stato ancora fatto. La conseguenza da tenere presente è che l'indice di un'autovalutazione parziale non è confrontabile con quello di una completa, ed è il motivo per cui l'attestato dichiara quante domande sono state valutate.",
      },
      {
        tipo: "prosa",
        testo: `Le fasce di prontezza sono **${NUMERI.fasceFornitore}**, dal non pronto all'avanzato, e compaiono sul quadro, sull'etichetta di ogni area e sull'attestato.`,
      },
      {
        tipo: "formula",
        testo:
          "impatto di un'azione = (punteggio dell'area con quella domanda a Sì − punteggio attuale) × peso dell'area ÷ Σ pesi delle aree valutate",
      },
      {
        tipo: "prosa",
        testo:
          "È il numero con cui il piano ordina le azioni: quanti punti dell'indice si guadagnano portando quella domanda a Sì. Le tre aree centrali pesano due volte e mezzo il governo, quindi dieci punti guadagnati lì valgono molto più di dieci punti guadagnati altrove. Per avvicinarsi alla soglia conviene lavorare sulle aree pesanti e sulle domande a peso alto.",
      },
    ],
  },

  {
    id: "piano-fornitore",
    titolo: "Il piano di adeguamento",
    minuti: 6,
    sommario: "Le azioni che nascono dalle risposte, ordinate per punti recuperati sulle giornate richieste.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Il piano si genera dalle risposte «no» e «in parte»: un'azione per scostamento, con l'impatto calcolato e una stima di giornate ricavata dal peso della domanda. Responsabile, scadenza e stato si compilano sulla riga della domanda, dove il contesto è già davanti.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Segnare un'azione «completata» non muove il punteggio",
        testo:
          "Il punteggio lo muove la risposta nel questionario. Quando l'azione è chiusa, la risposta va portata a Sì: l'azione esce dal piano e l'indice sale. È l'errore più comune, e produce piani pieni di righe verdi accanto a un indice fermo.",
      },
      {
        tipo: "elenco",
        voci: [
          "Le giornate sono un ordine di grandezza per pianificare, non un preventivo: il piano non stima costi.",
          "L'ordine è per efficienza, non per dipendenze logiche: la materialità va fatta prima degli obiettivi anche se il piano la mette dopo. Ricomporre la sequenza è lavoro del consulente.",
        ],
      },
    ],
  },

  {
    id: "evidenze-e-attestato",
    titolo: "Evidenze e attestato",
    minuti: 5,
    sommario: "Il fascicolo che il committente chiederà, e il documento che si consegna.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `La vista delle evidenze raccoglie i documenti attesi dalle ${NUMERI.domandeFornitore} domande, raggruppati per area, ciascuno col proprio stato: assente, in redazione, disponibile, non applicabile.`,
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Due liste, una verità sola",
        testo:
          "Risposte ed evidenze si salvano in modo indipendente, e il prodotto non le sincronizza. Un Sì con documento assente, o un documento disponibile con risposta No, sono incoerenze che il committente vede al primo sguardo. A fine sessione conviene scorrere le evidenze e allineare gli stati alle risposte appena date.",
      },
      {
        tipo: "prosa",
        testo:
          "L'attestato riporta l'esito, i punteggi per area con le barre, le risposte con le note, il piano, la scala delle fasce e i riferimenti. Porta il codice di verifica del documento, che chiunque può controllare sulla pagina pubblica di verifica: è ciò che permette al committente di distinguere il documento emesso da una copia modificata.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Il paragrafo sulla natura del documento non si toglie e non si riformula",
        testo:
          "L'attestato riporta l'esito di un'autovalutazione compilata sulla base delle proprie evidenze: non è una certificazione, non deriva da verifica ispettiva di parte terza, non è rilasciato sotto accreditamento. Sta in chiaro nel corpo del documento, riquadrato, non in fondo in corpo otto — è ciò che distingue lo strumento da un'attività di certificazione e tutela chi lo rilascia. Presentarlo come una certificazione è un rischio reputazionale e legale.",
      },
      {
        tipo: "elenco",
        voci: [
          "Prima di pubblicare: tutte le domande hanno una risposta, non applicabile compreso. Un attestato che dichiara metà delle domande valutate si legge come incompleto, ed è giusto che si legga così.",
          "Le evidenze delle risposte Sì sono disponibili e raccolte nel fascicolo.",
          "Anagrafica completa: committente e partita IVA compaiono solo se compilati.",
        ],
      },
    ],
  },

  {
    id: "errori-fornitore",
    titolo: "La sessione tipo, e gli errori più frequenti",
    minuti: 5,
    sommario: "Come si conduce mezza giornata con l'azienda, e che cosa va storto più spesso.",
    blocchi: [
      {
        tipo: "elenco",
        voci: [
          "Anagrafica con la richiesta del committente sotto gli occhi: soglia e termine esatti.",
          "Questionario col referente aziendale e l'accesso ai documenti, chiedendo di mostrare l'evidenza prima di segnare Sì. Nota interna su ogni «in parte» e su ogni «no».",
          "Evidenze: allineamento degli stati alle risposte appena date.",
          "Quadro letto insieme: distanza dalla soglia, prime priorità, impegno residuo.",
          "Piano con responsabili e scadenze; rivalutazione quando le azioni si chiudono; poi l'attestato.",
        ],
      },
      {
        tipo: "tabella",
        intestazioni: ["Errore", "Conseguenza", "Come si evita"],
        righe: [
          [
            "Sì di buona volontà senza documento",
            "Indice gonfiato, e figura pessima alla richiesta di evidenze",
            "La regola dell'evidenza: senza documento è «in parte»",
          ],
          [
            "Non applicabile usato per evitare un No",
            "Denominatore ridotto e punteggio indifendibile",
            "Non applicabile solo se il requisito è oggettivamente estraneo all'attività",
          ],
          [
            "Domande lasciate senza risposta",
            "Aree non valutate, attestato incompleto, indice non confrontabile",
            "Tutte le domande hanno una risposta, non applicabile compreso",
          ],
          [
            "Azione completata senza aggiornare la risposta",
            "L'indice non sale, e il piano sembra funzionare a vuoto",
            "Chiusa l'azione, si porta la risposta a Sì",
          ],
          ["Evidenze non allineate alle risposte", "Incoerenze visibili al committente", "Un passaggio sulle evidenze a fine sessione"],
          [
            "Lavoro concentrato sull'area più leggera",
            "Molto sforzo, pochi punti",
            "Priorità alle aree pesanti e alle domande a peso alto",
          ],
        ],
      },
    ],
  },
];
