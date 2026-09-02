import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

/** Dichiarazione di Applicabilità (ISO/IEC 27001). Metodo dal corso del committente. */
export const SOA: Sezione[] = [
  {
    id: "contesto-e-ambito",
    titolo: "Contesto, ambito e quadri normativi",
    minuti: 6,
    sommario: "Il campo di applicazione, i due ruoli dichiarati, e quali quadri entrano nella dichiarazione.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Il campo di applicazione del sistema — servizi, processi, sedi, tecnologie coperti — è la prima cosa che un auditor legge, e le esclusioni dal campo vanno motivate. Poi due dichiarazioni che decidono quali controlli entreranno: il ruolo nel trattamento dei dati personali e la posizione rispetto ai servizi cloud.",
      },
      {
        tipo: "prosa",
        testo: `I controlli della norma principale sono sempre in ambito. Gli altri quadri — in tutto sono **${NUMERI.quadriSoa}** — si attivano quando il contesto lo richiede, e i loro controlli entrano nella dichiarazione insieme agli altri. Il catalogo completo porta **${NUMERI.controlliSoa} controlli** su **${NUMERI.sezioniSoa} sezioni**.`,
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "I ruoli sono valori chiusi, non testo libero",
        testo:
          "«Nessun servizio cloud» è una risposta, e va distinta dall'assenza di risposta. Nel prototipo la coerenza si controllava cercando la parola «cloud» nel testo: l'avviso «hai dichiarato il cloud ma non hai attivato il quadro» compariva proprio a chi aveva dichiarato di **non** usarne, e non c'era modo di farlo sparire. Con valori chiusi il confronto è per valore, e l'esaustività la controlla il compilatore.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Attivare un quadro aggiunge lavoro, non solo righe",
        testo:
          "I controlli che arrivano entrano tutti come applicabili, e ciascuno vorrà uno stato, una motivazione, un riferimento documentale e un responsabile. Si attiva perché il contesto lo richiede, non per completezza.",
      },
    ],
  },

  {
    id: "i-controlli",
    titolo: "I controlli",
    minuti: 7,
    sommario: "Che cosa si dichiara per ognuno, e le quattro regole di compilazione.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Elemento", "Che cosa contiene"],
        righe: [
          [
            "Applicabile o escluso",
            "L'esclusione apre la giustificazione, che è obbligatoria: una dichiarazione che esclude un controllo senza dire perché è una non conformità già scritta",
          ],
          [
            "Stato di attuazione",
            "Dal non attuato all'attuato e verificato, passando per pianificato e parzialmente attuato",
          ],
          [
            "Motivazione della selezione",
            `Perché quel controllo è dentro: valutazione del rischio, obbligo legale, obbligo contrattuale, requisito di business, buona prassi. Sono **${NUMERI.motivazioniSoa}**, e se ne possono accendere più di una`,
          ],
          [
            "Riferimento documentale",
            "Il documento che dimostra il controllo. È quello che l'auditor chiederà di aprire",
          ],
          ["Responsabile", "Il presidio nominato, che diventa il responsabile predefinito nel piano"],
        ],
      },
      {
        tipo: "interfaccia",
        titolo: "Una sezione del registro dei controlli",
        vista: {
          genere: "stati",
          voci: [
            { testo: "5.1 · Politiche per la sicurezza delle informazioni", stato: "ok" },
            { testo: "5.7 · Threat intelligence", stato: "parziale" },
            { testo: "8.12 · Prevenzione della fuga di dati", stato: "no" },
            { testo: "7.4 · Sorveglianza della sicurezza fisica", stato: "na" },
          ],
        },
        nota: "L'ultimo è escluso, e un'esclusione senza giustificazione è una non conformità già scritta. Il terzo è applicabile e non attuato: pesa zero, non viene ignorato.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Le motivazioni sono un insieme, non una scelta",
        testo:
          "Accenderne o spegnerne una è un'operazione atomica sull'elenco di quel controllo, non una riscrittura della riga. È la stessa ragione per cui in tutto il prodotto non si rimanda mai la riga intera: due modifiche ravvicinate si cancellerebbero a vicenda.",
      },
      {
        tipo: "elenco",
        voci: [
          "«Attuato» solo con un'evidenza reperibile: è ciò che verrà chiesto di vedere.",
          "«Attuato e verificato» quando un audit interno o un test ne ha confermato l'efficacia. Non è un grado di soddisfazione: è un fatto avvenuto.",
          "Almeno una motivazione per ogni applicabile. La valutazione del rischio è quella attesa dalla norma; le altre la rafforzano, non la sostituiscono.",
          "Si esclude solo ciò che è oggettivamente estraneo, e mai per comodità: l'esclusione è la parte della dichiarazione che viene letta con più attenzione.",
        ],
      },
      {
        tipo: "prosa",
        testo: `L'ordine che funziona: prima applicabilità ed esclusioni su tutto l'ambito, sezione per sezione; poi stato e motivazioni partendo dai **${NUMERI.cardineSoa} controlli cardine**; infine riferimenti documentali e responsabili. Le verifiche di coerenza dicono che cosa resta.`,
      },
    ],
  },

  {
    id: "calcolo-soa",
    titolo: "Come si calcola l'indice",
    minuti: 6,
    sommario: "Stati pesati, media sugli applicabili, fasce, e dove conviene lavorare.",
    blocchi: [
      {
        tipo: "formula",
        testo: "indice = Σ valore dello stato ÷ numero dei controlli applicabili",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Un controllo applicabile senza stato pesa ZERO, non viene ignorato",
        testo:
          "È il punto che una reimplementazione «ragionevole» sbaglia sempre. Mediare sui soli controlli valutati farebbe salire l'indice man mano che si saltano quelli difficili: si arriverebbe al novanta per cento avendo dichiarato dieci controlli su centotrenta. È il contrario del vero, e su una dichiarazione che va a un organismo di certificazione è una bugia con un numero sopra.",
      },
      {
        tipo: "prosa",
        testo: `Gli esclusi non contano nel denominatore — sono fuori dal sistema per una ragione dichiarata — e le fasce di maturità sono **${NUMERI.fasceSoa}**, dal non presidiato al pronto per la certificazione. Lo stesso calcolo produce il punteggio per quadro e per sezione.`,
      },
      {
        tipo: "formula",
        testo: "impatto di un'azione = (valore massimo − valore attuale) ÷ numero degli applicabili",
      },
      {
        tipo: "prosa",
        testo:
          "Per salire in fretta contano i molti controlli fermi, non l'uno portato alla perfezione: un controllo non attuato vale molto più di uno già parziale. È l'ordine con cui il piano propone le azioni.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "L'indice non è un requisito della norma",
        testo:
          "È lo strumento con cui il consulente governa il percorso, e l'obiettivo lo fissa l'organizzazione. La norma non chiede una percentuale: chiede che ogni controllo abbia una decisione motivata e, se selezionato, un'attuazione dimostrabile.",
      },
    ],
  },

  {
    id: "verifiche-soa",
    titolo: "Le verifiche di coerenza",
    minuti: 5,
    sommario: "Gli stessi controlli formali che un auditor esegue in apertura.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Rilievo", "Perché conta"],
        righe: [
          [
            "Esclusioni prive di giustificazione",
            "La dichiarazione deve motivare ogni controllo escluso: senza, l'organismo rileva una non conformità",
          ],
          [
            "Applicabili senza motivazione di inclusione",
            "Manca il perché: rischio, obbligo legale, contratto, business o buona prassi",
          ],
          [
            "Dichiarati attuati senza riferimento documentale",
            "Uno stato di attuazione va sostenuto da un documento o da una registrazione reperibile",
          ],
          ["Applicabili senza stato", "Finché resta vuoto, il controllo pesa zero sull'indice"],
          ["Applicabili senza responsabile", "Un controllo selezionato ha bisogno di un presidio nominato"],
          [
            "Profilo e quadri incoerenti",
            "Un ruolo o una posizione dichiarati senza il quadro corrispondente attivo, o il contrario",
          ],
        ],
      },
      {
        tipo: "prosa",
        testo:
          "Ogni rilievo elenca i codici dei controlli interessati: non è un punteggio, è una lista di posti dove andare. È la stessa forma della verifica negli altri percorsi, e per lo stesso motivo.",
      },
    ],
  },

  {
    id: "documento-soa",
    titolo: "Il documento",
    minuti: 4,
    sommario: "Che cosa contiene la Dichiarazione, e la nota che non si toglie.",
    blocchi: [
      {
        tipo: "elenco",
        voci: [
          "Una tabella per sezione con riferimento, controllo, applicabilità, motivazioni in sigla, stato e riferimento documentale.",
          "La legenda delle sigle, perché una tabella di sigle senza legenda si legge male proprio a chi la deve verificare.",
          "Il piano, con responsabili e termini.",
          "Le firme di chi ha redatto e di chi ha approvato.",
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "La nota di conformità al punto sulla Dichiarazione di Applicabilità",
        testo:
          "Sta riquadrata nel documento, in chiaro. È ciò che collega questa tabella all'obbligo della norma, e la sua assenza è il tipo di mancanza che si scopre in audit invece che prima.",
      },
      {
        tipo: "prosa",
        testo:
          "Il documento pubblicato è congelato: porta il codice di verifica e l'edizione dei contenuti con cui è stato costruito. Una revisione successiva è una versione nuova, non una modifica di quella consegnata — ed è ciò che permette di dire con certezza, sei mesi dopo, che cosa era stato dichiarato in quel momento.",
      },
    ],
  },
];
