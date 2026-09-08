import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

// Implementazione del sistema di gestione NIS2 (D.Lgs. 138/2024).
//
// ⚠️ Come per l'autovalutazione, il contenuto di PRODOTTO è riscritto: il corso del
// committente insegna «profili e persistenza», «archivio e sincronia», «le quattro aree
// del menù» — comandi che qui non esistono. Il contenuto di METODO, che è il grosso, si
// tiene: la roadmap, i controlli con la loro frequenza, gli indicatori, la differenza fra
// attuazione ed efficacia.

export const SGNIS2: Sezione[] = [
  {
    id: "dal-check-up-al-sistema",
    titolo: "Dal check-up al sistema",
    minuti: 7,
    sommario:
      "Che cosa cambia rispetto all'autovalutazione, e perché le risposte non si danno due volte.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "L'autovalutazione risponde a una domanda: «a che punto siamo». Il sistema di gestione risponde a un'altra: «come ci arriviamo, e come restiamo lì». Sono due incarichi diversi, e spesso due mandati diversi con lo stesso cliente.",
      },
      {
        tipo: "prosa",
        testo: `Il sistema contiene per intero l'autovalutazione e ci aggiunge quattro cose: **${NUMERI.controlliNis2} controlli** con la loro frequenza di riverifica, una roadmap in **${NUMERI.fasiNis2} fasi**, lo scadenzario degli adempimenti e **${NUMERI.indicatoriNis2} indicatori**. I requisiti qui sono **${NUMERI.requisitiNis2}** invece di ${NUMERI.requisitiNis2Autovalutazione}: due riguardano solo chi il sistema lo sta costruendo.`,
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Le risposte sono le stesse, e non è una copia",
        testo:
          "Il requisito G.01 valutato nell'autovalutazione è già valutato nel sistema di gestione, e viceversa: è **la stessa riga**, non una copia sincronizzata. Con due copie la stessa azienda potrebbe avere due risposte diverse alla stessa domanda, e nessuno saprebbe quale vale. Entrambe le schermate lo dichiarano, perché un consulente che non lo sa rifà il lavoro.",
      },
      {
        tipo: "interfaccia",
        titolo: "Le viste del sistema di gestione",
        vista: {
          genere: "passi",
          passi: [
            { nome: "Quadro", stato: "fatto" },
            { nome: "Roadmap", stato: "corso" },
            { nome: "Controlli", stato: "corso" },
            { nome: "Indicatori", stato: "vuoto" },
            { nome: "Verifica", stato: "fatto" },
            { nome: "Documenti", stato: "vuoto" },
          ],
        },
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo:
            "Hai già compilato l'autovalutazione per un cliente. Apri il sistema di gestione: che cosa trovi nella vista Verifica?",
          opzioni: [
            "Tutto da rifare: sono due percorsi separati",
            "Le stesse risposte, più due requisiti in più",
            "Le risposte in sola lettura, da ricopiare",
            "Un'importazione da confermare",
          ],
          corretta: 1,
          spiegazione:
            `È la stessa riga nel database. Qui i requisiti sono ${NUMERI.requisitiNis2} perché due riguardano solo il sistema di gestione; gli altri ${NUMERI.requisitiNis2Autovalutazione} portano già le valutazioni fatte.`,
        },
        {
          testo: "Che cosa aggiunge il sistema di gestione rispetto all'autovalutazione?",
          opzioni: [
            "Solo la possibilità di pubblicare un documento",
            "Controlli con frequenza, roadmap, scadenzario e indicatori",
            "Una seconda scala di valutazione",
            "L'accesso al corpus documentale",
          ],
          corretta: 1,
          spiegazione:
            "Quattro motori che l'autovalutazione non ha. Il corpus e la verifica ci sono in entrambi: cambia il perimetro, non l'accesso.",
        },
      ],
    },
  },

  {
    id: "roadmap-e-termini",
    titolo: "La roadmap, e i termini che decorrono da una data sola",
    minuti: 8,
    sommario: "Nove mesi, diciotto mesi, e il 28 febbraio di ogni anno. Che cosa succede se la data manca.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "I due termini che contano decorrono dalla **comunicazione con cui l'ACN conferma l'inserimento nell'elenco dei soggetti** (art. 7 comma 3): nove mesi per gli obblighi di notifica dell'art. 25, diciotto per le misure di gestione del rischio dell'art. 24. Più la registrazione, che si rinnova entro il **28 febbraio** di ogni anno.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Senza la comunicazione i termini non sono scaduti: non sono cominciati",
        testo:
          "È una differenza che il prodotto dice a parole invece di mostrare uno zero. Un contatore fermo a zero si legge «sei fuori termine», che è l'opposto del vero, e manderebbe un consulente a scusarsi con un cliente che non ha nessun problema. La data si inserisce in **Ambito e assetto** dell'autovalutazione — che è condivisa fra i due percorsi.",
      },
      {
        tipo: "prosa",
        testo: `Le **${NUMERI.fasiNis2} fasi** raggruppano i ${NUMERI.capiNis2} capi in un ordine che funziona: governance (delibera, ruoli, registrazione), conoscenza (inventario, servizi, fornitori, rischi), presidi essenziali (notifica, backup, autenticazione a più fattori, vulnerabilità), consolidamento (catena di fornitura, crittografia, continuità), verifica (audit, indicatori, riesame). Ogni capo sta in una fase sola.`,
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "L'avanzamento si misura, lo stato si dichiara",
        testo:
          "La percentuale di una fase viene dai controlli dei suoi capi: non la scrivi tu, e non puoi farla salire dichiarando. Lo **stato** della fase — non avviata, in corso, completata — è invece un tuo giudizio, e resta tuo. Il prodotto non lo deduce dai numeri: chiudere una fase è una decisione di chi conduce il lavoro.",
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo:
            "La comunicazione dell'ACN non è stata registrata. Che cosa mostra il prodotto per il termine dei nove mesi?",
          opzioni: [
            "Zero giorni: sei fuori termine",
            "Che il termine non decorre, perché manca la comunicazione",
            "La data odierna più nove mesi",
            "Un errore",
          ],
          corretta: 1,
          spiegazione:
            "Non decorre. Uno zero si leggerebbe «fuori termine», che è l'opposto: i nove mesi non sono scaduti, non sono ancora cominciati.",
        },
        {
          testo: "L'avanzamento di una fase della roadmap da dove viene?",
          opzioni: [
            "Dallo stato che dichiari sulla fase",
            "Dai controlli dei capi che la fase copre",
            "Dai requisiti valutati in quei capi",
            "Dalla percentuale di conformità complessiva",
          ],
          corretta: 1,
          spiegazione:
            "Dai controlli, e si misura. Lo stato che dichiari è un'altra cosa: è il tuo giudizio su quel pezzo di lavoro, e il prodotto non lo deduce al posto tuo.",
        },
      ],
    },
  },

  {
    id: "attuato-non-e-verificato",
    titolo: "Attuato non vuol dire verificato",
    minuti: 9,
    sommario:
      "La regola meno ovvia del modulo, e la sola che un'ispezione trova in dieci minuti.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `I **${NUMERI.controlliNis2} controlli** hanno quattro stati che si dichiarano — non attuato, in attuazione, attuato, non applicabile — e ciascuno porta una **frequenza di riverifica** in giorni: 365 per una delibera annuale, 90 per un riesame trimestrale degli accessi, 30 per la scansione delle vulnerabilità.`,
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Un «attuato» mai più guardato torna «da verificare»",
        testo:
          "È il meccanismo che fa la differenza fra un sistema che esiste e uno che sta scritto. Dichiarare un controllo attuato una volta e non riverificarlo mai è esattamente il modo in cui un sistema di gestione smette di esistere restando verde sulla carta — e un'ispezione se ne accorge in dieci minuti, chiedendo l'ultima evidenza. Alla scadenza della frequenza lo stato **effettivo** torna «da verificare», da solo, senza che nessuno tocchi niente.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Dichiarato", "Ultima verifica", "Stato effettivo"],
        righe: [
          ["Attuato", "un mese fa, frequenza 365 gg", "Attuato"],
          ["Attuato", "tre anni fa, frequenza 365 gg", "**Da verificare**"],
          ["Attuato", "nessuna registrata", "**Da verificare**"],
          ["In attuazione", "—", "In attuazione"],
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Attuato senza nessuna verifica registrata vale come scaduto",
        testo:
          "E non è severità: trattarlo come attuato premierebbe chi non registra, che è l'opposto di quello che serve. Se la verifica c'è stata ma non è annotata, per un'ispezione non c'è stata.",
      },
      {
        tipo: "prosa",
        testo:
          "La percentuale di attuazione pesa: attuato vale uno, «in attuazione» e «da verificare» valgono mezzo, il resto zero. Un controllo **mai toccato pesa zero e resta nel denominatore** — stessa regola dei requisiti, per la stessa ragione. «Non applicabile» esce invece dal denominatore.",
      },
      {
        tipo: "interfaccia",
        titolo: "Lo stato dichiarato e quello effettivo, uno accanto all'altro",
        nota: "Nascondere che qualcuno l'aveva dichiarato attuato renderebbe incomprensibile perché chieda attenzione.",
        vista: {
          genere: "stati",
          voci: [
            { testo: "G-01 · dichiarato Attuato · verificato un mese fa → Attuato", stato: "ok" },
            { testo: "G-02 · dichiarato Attuato · nessuna verifica → Da verificare", stato: "parziale" },
            { testo: "G-03 · In attuazione", stato: "parziale" },
            { testo: "G-04 · Non attuato", stato: "no" },
            { testo: "G-05 · Non applicabile", stato: "na" },
          ],
        },
      },
    ],
    verifica: {
      minime: 3,
      domande: [
        {
          testo:
            "Un controllo con frequenza 365 giorni è dichiarato attuato, ultima verifica tre anni fa. Come compare nel documento?",
          opzioni: ["Attuato", "Da verificare", "Non attuato", "Non applicabile"],
          corretta: 1,
          spiegazione:
            "Da verificare. Lo stato dichiarato resta leggibile accanto, ma quello che vale — e che finisce nel documento — è l'effettivo.",
        },
        {
          testo: "Un controllo dichiarato attuato senza nessuna verifica registrata?",
          opzioni: [
            "Vale come attuato finché non scade la frequenza",
            "Vale come «da verificare»",
            "Non entra nel calcolo",
            "Genera un errore di compilazione",
          ],
          corretta: 1,
          spiegazione:
            "Vale come scaduto. Trattarlo come attuato premierebbe chi non registra, e per un'ispezione una verifica non annotata non è avvenuta.",
        },
        {
          testo: "Quanto pesa un controllo mai toccato nella percentuale di attuazione?",
          opzioni: [
            "Zero, e resta nel denominatore",
            "Zero, ed esce dal denominatore",
            "Mezzo",
            "Non pesa: si ignora",
          ],
          corretta: 0,
          spiegazione:
            "Zero e nel denominatore: è la stessa regola dei requisiti. Escluderlo farebbe salire l'attuazione man mano che si saltano i controlli difficili.",
        },
        {
          testo: "Quanto pesa un controllo «in attuazione»?",
          opzioni: ["Zero", "Mezzo", "Uno", "Esce dal denominatore"],
          corretta: 1,
          spiegazione:
            "Mezzo, come «da verificare». Sono due situazioni in cui qualcosa c'è ma non è compiuto, e contarle zero sarebbe ingiusto quanto contarle uno.",
        },
      ],
    },
  },

  {
    id: "indicatori",
    titolo: "Attuazione ed efficacia, e il verso che rovescia il giudizio",
    minuti: 8,
    sommario: "Che cosa misurano gli indicatori, e perché lo stesso numero può essere buono o pessimo.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `Gli indicatori proposti sono **${NUMERI.indicatoriNis2}**, su otto ambiti. Si dividono in due famiglie: quelli di **attuazione** misurano ciò che è stato fatto — la copertura dell'autenticazione a più fattori, i controlli attuati sul catalogo — e quelli di **efficacia** misurano se ha funzionato: le pre-notifiche entro le ventiquattro ore, il tempo medio di contenimento, il tasso di clic nelle simulazioni di phishing.`,
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Il verso di miglioramento è il cuore",
        testo:
          "Per il tasso di clic nel phishing **scendere è un risultato**; per la copertura MFA scendere è un disastro. Lo stesso numero, la stessa variazione, due giudizi opposti. Per questo ogni indicatore dichiara il proprio verso, e il prodotto lo scrive a parole invece di affidarlo a una freccia colorata: una freccia in giù verde, senza spiegazione, si legge come un difetto.",
      },
      {
        tipo: "prosa",
        testo:
          "Ogni indicatore ha un **target** e una **soglia di attenzione**. Sopra il target: a target. Fra soglia e target: in attenzione. Sotto la soglia: fuori target. Con la soglia ma senza target si giudica sulla soglia; senza nessuno dei due non si giudica affatto.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Un target assente non è un target a zero",
        testo:
          "È la differenza fra «il bersaglio è zero» e «un bersaglio non c'è». Confonderle — e succede quando un campo vuoto viene letto come numero — fa risultare «a target» qualunque indicatore che nessuno ha ancora tarato, e rende irraggiungibile il ramo della soglia.",
      },
      {
        tipo: "prosa",
        testo:
          "Gli indicatori di base si **copiano** nel sistema dell'azienda, non si riferiscono al catalogo: il target si tara su quel cliente, la formula si adatta al dato che ha davvero. Ricaricarli una seconda volta non riporta indietro ciò che hai tarato.",
      },
      {
        tipo: "interfaccia",
        titolo: "Due indicatori, versi opposti",
        vista: {
          genere: "riga",
          intestazioni: ["Indicatore", "Ultimo", "Target", "Verso"],
          celle: ["Copertura MFA · 97% · target 100 · crescente", "Clic nel phishing · 3% · target 5 · decrescente", "", ""],
          risultato: { etichetta: "Esiti", valore: "in attenzione · a target" },
        },
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo:
            "«Tasso di clic nelle simulazioni di phishing»: target 5%, valore rilevato 3%, verso decrescente. Che stato?",
          opzioni: ["Fuori target", "In attenzione", "A target", "Non rilevato"],
          corretta: 2,
          spiegazione:
            "A target: per un indicatore da far scendere, stare sotto al bersaglio è il risultato voluto. Con verso crescente lo stesso 3% su target 5 sarebbe fuori target.",
        },
        {
          testo: "Un indicatore ha soglia 80, nessun target, valore 90, verso crescente. Che stato?",
          opzioni: [
            "Non rilevato: manca il target",
            "A target: si giudica sulla soglia",
            "In attenzione",
            "Fuori target",
          ],
          corretta: 1,
          spiegazione:
            "Senza target decide la soglia. Trattare il target assente come zero direbbe «a target» a qualunque valore, e renderebbe la soglia inutile.",
        },
        {
          testo:
            `Hai tarato il target di un indicatore su 88. Ricarichi i ${NUMERI.indicatoriNis2} indicatori di base. Che cosa succede?`,
          opzioni: [
            "Il target torna a quello di catalogo",
            "Il target resta 88: gli esistenti non si sovrascrivono",
            "L'indicatore viene duplicato",
            "Il caricamento viene rifiutato",
          ],
          corretta: 1,
          spiegazione:
            "Resta 88. Gli indicatori si copiano una volta e poi sono tuoi: un secondo caricamento aggiunge solo quelli che mancano.",
        },
      ],
    },
  },

  {
    id: "relazione-e-organo",
    titolo: "La relazione, e chi la riceve",
    minuti: 7,
    sommario: "Perché il destinatario è l'organo di amministrazione, e che cosa il documento congela.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "L'art. 23 attribuisce all'organo di amministrazione l'approvazione delle modalità di attuazione delle misure e **la responsabilità per la loro violazione**. Non è un destinatario formale: è la persona che risponde, e la relazione è il documento con cui si mette in condizione di sapere.",
      },
      {
        tipo: "prosa",
        testo:
          "Il percorso produce due documenti. La **Relazione sul sistema di gestione** — ambito, termini in corso, roadmap, stato dei controlli, indicatori — è quella che va all'organo. Il **Catalogo dei controlli** è la tabella che un ispettore sfoglia: un controllo per riga, con stato effettivo, responsabile, ultima verifica e prossima.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Il documento congela lo stato EFFETTIVO",
        testo:
          "Non quello dichiarato. Il giorno dopo la pubblicazione un altro controllo può scadere, e la relazione consegnata continuerà a dire ciò che era vero quando è stata firmata. È la sola cosa che un documento datato possa onestamente fare.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Ogni relazione dice che cosa non contiene",
        testo:
          "In apertura, riquadrato: che lo stato è quello alla data di emissione, e che le evidenze documentali restano presso l'organizzazione. Uno snapshot è immutabile — ciò che si scrive oggi resta scritto per sempre — e un documento che promettesse più di quanto porta non si può correggere dopo.",
      },
      {
        tipo: "interfaccia",
        titolo: "Che cosa la relazione porta all'organo",
        vista: {
          genere: "verifica",
          voci: [
            { testo: "Classificazione d'ambito, con la sua ragione", esito: "ok" },
            { testo: "Termini in corso e giorni residui", esito: "ok" },
            { testo: `Stato effettivo dei ${NUMERI.controlliNis2} controlli`, esito: "ok" },
            { testo: "Evidenze documentali", esito: "manca" },
          ],
        },
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo: "Perché il destinatario della relazione è l'organo di amministrazione?",
          opzioni: [
            "Per prassi delle norme sui sistemi di gestione",
            "Perché l'art. 23 gli attribuisce l'approvazione delle misure e la responsabilità per la violazione",
            "Perché è l'unico che può firmare verso l'Autorità",
            "Perché lo chiede l'ACN nelle determinazioni",
          ],
          corretta: 1,
          spiegazione:
            "Risponde di persona. La relazione è il documento con cui lo si mette in condizione di sapere di che cosa risponde.",
        },
        {
          testo:
            "Un controllo scade il giorno dopo che hai pubblicato la relazione. Il documento consegnato cambia?",
          opzioni: [
            "Sì: mostra sempre lo stato corrente",
            "No: congela lo stato effettivo alla data di emissione",
            "Solo se lo ripubblichi",
            "Il codice di verifica lo segnala come superato",
          ],
          corretta: 1,
          spiegazione:
            "Congelato. Un documento datato può onestamente dire solo ciò che era vero quando è stato firmato; il resto è la revisione successiva.",
        },
      ],
    },
  },
];
