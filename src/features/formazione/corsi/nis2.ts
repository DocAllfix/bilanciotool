import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

// Autovalutazione della conformità NIS2 (D.Lgs. 138/2024).
//
// ⚠️ Il contenuto di PRODOTTO è riscritto per intero rispetto al corso del committente.
// Quel corso insegna il prototipo: «il salvataggio automatico», «dove finiscono i dati»,
// «archivio e sincronia: le tre modalità di persistenza», «esportazione e importazione».
// Qui non esiste nessuno di quei comandi — il lavoro sta su un server, in uno studio con
// più persone, e i dati non si esportano in JSON. Insegnare quei comandi a un cliente
// pagante è insegnargli il falso, ed è già successo una volta.
//
// Il contenuto di METODO invece è accurato e vale il grosso: l'ambito, la scala, i
// termini, la distinzione fra scostamento e istruttoria. Quello si tiene.

/** Quanti requisiti risultano valutati nella schermata d'esempio della sezione 3. */
const VALUTATI_ESEMPIO = 20;

export const NIS2: Sezione[] = [
  {
    id: "chi-rientra",
    titolo: "Chi rientra, e a quale titolo",
    minuti: 8,
    sommario:
      "La domanda che viene prima di «quanto siamo conformi»: settore, dimensione e otto criteri che prescindono da entrambi.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Il D.Lgs. 138/2024 recepisce la Direttiva (UE) 2022/2555. Non si applica a tutti: si applica a chi sta in certi settori, sopra certe soglie, oppure a chi ricorre in criteri che con la dimensione non c'entrano niente. La prima cosa da stabilire con un cliente non è quanto sia conforme — è **se rientra**, e a quale titolo.",
      },
      {
        tipo: "prosa",
        testo: `I settori sono **${NUMERI.settoriNis2}**, divisi in due allegati: **${NUMERI.settoriNis2Allegato1}** ad alta criticità nell'Allegato I e **${NUMERI.settoriNis2Allegato2}** altri settori critici nell'Allegato II. Il parametro dimensionale ha tre gradini: micro o piccola, media (da 50 addetti o 10 milioni), grande (da 250 addetti o 50 milioni di fatturato).`,
      },
      {
        tipo: "tabella",
        intestazioni: ["Dimensione", "Allegato I", "Allegato II"],
        righe: [
          ["Grande impresa", "Essenziale", "Importante"],
          ["Media impresa", "Importante", "Importante"],
          ["Micro o piccola", "Fuori ambito", "Fuori ambito"],
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Gli otto criteri scavalcano la tabella",
        testo: `I criteri specifici sono **${NUMERI.criteriNis2}**, e prescindono dalla dimensione: una microimpresa che gestisce un registro di dominio di primo livello, o che è l'unico fornitore nello Stato di un servizio essenziale, è un soggetto **essenziale** a prescindere dalle soglie. Sei portano a essenziale e due a importante. Se ne ricorrono due, prevale **il più grave** — non il primo che spunti.`,
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "«Non determinata» non è «fuori ambito»",
        testo:
          "Sono due cose diverse e il prodotto non le confonde. «Fuori ambito» è una **determinazione**: sei in un settore elencato e stai sotto le soglie, e si scrive in un documento firmato. «Non determinata» dice che da quegli elementi non discende ancora nessuna conclusione — perché manca la dimensione, o perché il settore negli allegati non compare. Far dichiarare a un'azienda di essere fuori dal decreto sulla base di una domanda a cui nessuno ha risposto è il modo peggiore di sbagliare in questo modulo.",
      },
      {
        tipo: "prosa",
        testo:
          "Dalla classificazione discende il tetto delle sanzioni dell'art. 38: fino a **10 milioni di euro o al 2%** del fatturato mondiale annuo per un soggetto essenziale, **7 milioni o l'1,4%** per uno importante. È il numero che rende la classificazione una cosa da difendere, non da indovinare.",
      },
      {
        tipo: "interfaccia",
        titolo: "La classificazione porta la sua ragione",
        nota: "Accanto all'esito c'è sempre da dove viene: senza, non lo difendi davanti a nessuno.",
        vista: {
          genere: "riga",
          intestazioni: ["Settore", "Dimensione", "Criteri"],
          celle: ["Energia · Allegato I", "Grande impresa", "nessuno"],
          risultato: { etichetta: "Classificazione", valore: "Essenziale · grande impresa in Allegato I" },
        },
      },
    ],
    verifica: {
      minime: 3,
      domande: [
        {
          testo:
            "Una microimpresa di quindici addetti gestisce servizi DNS. Nessun settore dei due allegati la riguarda. Come si classifica?",
          opzioni: [
            "Fuori ambito: è sotto le soglie dimensionali",
            "Soggetto essenziale: ricorre un criterio specifico",
            "Soggetto importante: i criteri specifici portano sempre lì",
            "Non determinata: manca il settore",
          ],
          corretta: 1,
          spiegazione:
            "I criteri specifici prescindono dalla dimensione, e quello sul DNS porta a «essenziale». È esattamente il caso che la tabella settore × dimensione non coglie.",
        },
        {
          testo:
            "Un'azienda ricorre sia nel criterio c7 (rilevanza sistemica → importante) sia nel c1 (reti pubbliche → essenziale). Che cosa risulta?",
          opzioni: [
            "Importante: vale il primo criterio spuntato",
            "Essenziale: prevale il più grave",
            "Entrambi: la classificazione è doppia",
            "Non determinata: i criteri sono in conflitto",
          ],
          corretta: 1,
          spiegazione:
            "Prevale il più grave. Scegliere per ordine di comparsa darebbe tre milioni in meno di tetto sanzionatorio e meno obblighi, e l'ordine in cui uno spunta delle caselle non è una fonte del diritto.",
        },
        {
          testo: "Il settore dichiarato non compare in nessuno dei due allegati. Che cosa mostra il prodotto?",
          opzioni: [
            "«Fuori ambito»",
            "«Soggetto importante», per prudenza",
            "«Non determinata», dicendo che il settore non è elencato",
            "Un errore di compilazione",
          ],
          corretta: 2,
          spiegazione:
            "Non determinata. «Fuori ambito» sarebbe una conclusione, e da un settore non elencato non discende una conclusione: discende che quella strada non porta da nessuna parte.",
        },
        {
          testo: "Qual è il massimo edittale per un soggetto essenziale?",
          opzioni: [
            "7 milioni o l'1,4% del fatturato mondiale",
            "10 milioni o il 2% del fatturato mondiale",
            "10 milioni, senza alternativa percentuale",
            "Il 4% del fatturato, come nel GDPR",
          ],
          corretta: 1,
          spiegazione:
            "Dieci milioni **o** il 2% del fatturato mondiale annuo, se superiore. Per un soggetto importante scende a sette milioni o l'1,4%.",
        },
      ],
    },
  },

  {
    id: "la-scala",
    titolo: "La scala 0÷4, e perché il 3 è caro",
    minuti: 9,
    sommario:
      "Come si valuta un requisito, che cosa distingue un livello dall'altro, e perché mettere 3 dappertutto non regge un'ispezione.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `I requisiti sono **${NUMERI.requisitiNis2Autovalutazione}** nell'autovalutazione, distribuiti su **${NUMERI.capiNis2}** capi che ricalcano l'art. 24 comma 2: governance, registrazione, analisi dei rischi, incidenti, continuità, catena di fornitura, vulnerabilità, efficacia, igiene e formazione, crittografia, accessi, autenticazione a più fattori.`,
      },
      {
        tipo: "tabella",
        intestazioni: ["Livello", "Nome", "Che cosa pretende"],
        righe: [
          ["0", "Assente", "Non attuata né pianificata"],
          ["1", "Pianificata", "Definita o pianificata, non ancora attuata"],
          ["2", "Attuata parzialmente", "Su una parte del perimetro, o non sistematica"],
          ["3", "Attuata", "Sull'intero perimetro, **con evidenza documentale**"],
          ["4", "Attuata e verificata", "In più: efficacia misurata e verificata periodicamente"],
        ],
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Il salto dal 2 al 3 è l'evidenza",
        testo:
          "È la riga che decide se una relazione regge. «Lo facciamo» vale 2; «lo facciamo su tutto e c'è un documento che lo prova» vale 3. Un consulente che mette 3 senza chiedere l'evidenza consegna al cliente un numero che la prima ispezione smonta, e il cliente scoprirà di essere meno conforme di quanto gli era stato detto. Per questo il prodotto tiene quella frase sotto gli occhi mentre scegli, invece di nasconderla in una tendina.",
      },
      {
        tipo: "prosa",
        testo:
          "Il **livello obiettivo** è quello che l'organizzazione si dà: di norma il 3. Serve a due cose — a decidere che cosa è uno scostamento, e a dare una scala al piano di adeguamento. Alzarlo a 4 su tutto significa impegnarsi a misurare l'efficacia di ogni misura, che per una PMI è una promessa che non si mantiene.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "«Non applicabile» è una valutazione, non un'omissione",
        testo:
          "Un requisito dichiarato non applicabile **esce dal denominatore**: chi ha dichiarato che venti requisiti non lo riguardano non deve risultare inadempiente su venti requisiti. Ma è una dichiarazione che qualcuno firma, non una scorciatoia per far salire la percentuale — e nel prodotto azzera il livello, perché un numero accanto a un «non applicabile» non lo usa nessuno.",
      },
      {
        tipo: "interfaccia",
        titolo: "I cinque livelli, con la loro definizione a vista",
        vista: {
          genere: "stati",
          voci: [
            { testo: "0 · Assente", stato: "no" },
            { testo: "1 · Pianificata", stato: "no" },
            { testo: "2 · Attuata parzialmente", stato: "parziale" },
            { testo: "3 · Attuata — con evidenza documentale", stato: "ok" },
            { testo: "4 · Attuata e verificata", stato: "ok" },
          ],
        },
      },
    ],
    verifica: {
      minime: 3,
      domande: [
        {
          testo:
            "Una misura è attuata su tutto il perimetro, ma non esiste nessuna evidenza documentale. Quale livello?",
          opzioni: ["3 · Attuata", "2 · Attuata parzialmente", "4 · Attuata e verificata", "1 · Pianificata"],
          corretta: 1,
          spiegazione:
            "Il livello 3 richiede l'evidenza documentale: senza, la valutazione corretta è 2. È il salto più costoso della scala, e quello che un'ispezione controlla per primo.",
        },
        {
          testo: "Che cosa succede alla percentuale di conformità quando marchi un requisito «non applicabile»?",
          opzioni: [
            "Conta come zero e abbassa la percentuale",
            "Esce dal denominatore: non abbassa né alza",
            "Conta come cento",
            "Non cambia niente finché non lo valuti",
          ],
          corretta: 1,
          spiegazione:
            "Esce dal denominatore. È una valutazione, non un'omissione: chi ha dichiarato che un requisito non lo riguarda non deve risultare inadempiente su quel requisito.",
        },
        {
          testo: "Che cosa aggiunge il livello 4 rispetto al 3?",
          opzioni: [
            "L'estensione all'intero perimetro",
            "Un documento che descrive la misura",
            "La misurazione e la verifica periodica dell'efficacia",
            "L'approvazione dell'organo di amministrazione",
          ],
          corretta: 2,
          spiegazione:
            "Il 3 dice che la misura c'è ed è documentata; il 4 che qualcuno controlla periodicamente se funziona. Sono due impegni diversi, e il secondo si mantiene solo dove serve davvero.",
        },
        {
          testo: "Il livello obiettivo predefinito è 3. A che cosa serve?",
          opzioni: [
            "A calcolare la percentuale di conformità",
            "A decidere che cosa è uno scostamento e a dare una scala al piano",
            "A stabilire la classe di appartenenza NIS2",
            "A fissare il termine per l'adeguamento",
          ],
          corretta: 1,
          spiegazione:
            "L'obiettivo non entra nella percentuale: definisce la soglia sotto la quale un requisito valutato diventa uno scostamento, e da lì nasce il piano.",
        },
      ],
    },
  },

  {
    id: "un-requisito-non-valutato",
    titolo: "Perché la percentuale è più bassa di quella che ti aspetti",
    minuti: 7,
    sommario:
      "La regola che distingue questo prodotto dal foglio di calcolo che il cliente aveva prima: un requisito applicabile e non valutato pesa zero.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "È la cosa che sorprende di più al primo uso, e va spiegata al cliente prima che la scopra da solo. Hai valutato tre requisiti su venti, tutti conformi, e la conformità dice **15%** — non 100.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Mediare sui soli valutati fa salire l'indice man mano che salti i difficili",
        testo:
          "Un foglio di calcolo che media solo ciò che hai guardato restituisce **100** per «tre conformi su venti», e **100** anche per «tutti e venti conformi», e **100** per «tre conformi e diciassette mai aperti». Tre situazioni opposte, un numero solo, su un documento che va a un'Autorità di vigilanza. Peggio: più salti i requisiti scomodi, più l'indice sale.",
      },
      {
        tipo: "formula",
        testo: "conformità = somma dei pesi dei requisiti APPLICABILI ÷ numero dei requisiti applicabili",
      },
      {
        tipo: "prosa",
        testo:
          "Un requisito non valutato pesa zero **e resta nel denominatore**. La percentuale misura quanto è stato dimostrato, non la media di ciò che si è guardato. Il quadro lo dice a schermo — «N da valutare, che pesano zero» — proprio perché chi vede un 8% al primo giorno non pensi a un difetto.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Uno scostamento non è una lacuna di istruttoria",
        testo:
          "Uno **scostamento** è un requisito che hai valutato e che sta sotto l'obiettivo: entra nel piano di adeguamento, con una priorità e un termine. Un requisito **non ancora valutato** non è uno scostamento — è lavoro di istruttoria da finire. Metterli insieme riempirebbe il piano di centinaia di azioni che nessuno ha deciso di dover fare, e un piano illeggibile non lo apre nessuno.",
      },
      {
        tipo: "interfaccia",
        titolo: "Il quadro dice sempre quanti ne mancano",
        vista: {
          genere: "verifica",
          voci: [
            // ⚠️ Anche i numeri di una riproduzione dell'interfaccia si DERIVANO. Il
            // giorno che il catalogo cambia, una schermata finta con «124» racconterebbe
            // un prodotto che non esiste più — e la finta è proprio la cosa che nessuno
            // ricontrolla. I venti valutati sono l'esempio; il resto discende.
            { testo: `Conformità 8% — su ${NUMERI.requisitiNis2Autovalutazione} requisiti applicabili`, esito: "ok" },
            { testo: `${VALUTATI_ESEMPIO} valutati`, esito: "ok" },
            {
              testo: `${NUMERI.requisitiNis2Autovalutazione - VALUTATI_ESEMPIO} da valutare, che pesano zero nella percentuale`,
              esito: "manca",
            },
          ],
        },
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo:
            "Venti requisiti applicabili. Tre valutati al massimo, diciassette mai aperti. Quanto vale la conformità?",
          opzioni: ["100%", "15%", "17%", "Non calcolabile"],
          corretta: 1,
          spiegazione:
            "Tre requisiti al 100% su venti applicabili: 300 ÷ 20 = 15. Mediando sui soli valutati verrebbe 100, che è lo stesso numero di «tutti e venti conformi».",
        },
        {
          testo: "Un requisito mai valutato compare fra gli scostamenti?",
          opzioni: [
            "Sì: tutto ciò che non è a target è uno scostamento",
            "No: è istruttoria da completare, non uno scostamento",
            "Solo se ha criticità alta",
            "Solo dopo la pubblicazione del documento",
          ],
          corretta: 1,
          spiegazione:
            "Gli scostamenti sono i requisiti VALUTATI sotto l'obiettivo. Mettere anche i non valutati riempirebbe il piano di azioni che nessuno ha deciso di dover fare.",
        },
      ],
    },
  },

  {
    id: "incidenti-e-termini",
    titolo: "I termini dell'art. 25: le sole ore che non si recuperano",
    minuti: 8,
    sommario:
      "Ventiquattro ore, settantadue, un mese. Da quale istante decorrono, e perché l'ora del giorno conta.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Tutto il resto di NIS2 si recupera: un controllo non attuato si attua, un requisito a livello 1 si porta a 3. Un termine di notifica mancato no — resta scritto, e l'Autorità lo guarda.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Adempimento", "Termine", "Decorre da"],
        righe: [
          ["Pre-notifica", "24 ore", "l'istante in cui l'ente ha avuto conoscenza dell'incidente"],
          ["Notifica", "72 ore", "lo stesso istante"],
          ["Relazione finale", "1 mese", "**la notifica**, non la conoscenza"],
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "L'ora del giorno è un dato, non un dettaglio",
        testo:
          "Il registro degli incidenti chiede data **e ora** della conoscenza. Con una data secca — mezzanotte — un termine di ventiquattro ore sbaglia di mezza giornata in un verso o nell'altro, e su un termine perentorio quella mezza giornata è la differenza fra l'adempimento e la violazione.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Senza notifica non c'è termine per la relazione",
        testo:
          "Il mese decorre dalla notifica. Farlo decorrere dalla conoscenza inventerebbe una scadenza che il decreto non pone, e la metterebbe nello scadenzario di un cliente come se fosse dovuta.",
      },
      {
        tipo: "prosa",
        testo:
          "Un adempimento fatto **in ritardo** resta segnato come fuori termine, e non diventa «nei termini» per il fatto di essere stato fatto. È ciò che l'Autorità guarda, e nascondere il ritardo su un documento che le si consegna sarebbe la cosa peggiore che il prodotto possa fare per il cliente.",
      },
      {
        tipo: "interfaccia",
        titolo: "I tre termini di un incidente",
        vista: {
          genere: "riga",
          intestazioni: ["Conoscenza", "Pre-notifica", "Notifica"],
          celle: ["06/09 · 08:00", "07/09 · 08:00", "09/09 · 08:00"],
          risultato: { etichetta: "Stato", valore: "pre-notifica in scadenza · notifica in corso" },
        },
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo: "Da quale istante decorre il termine di un mese per la relazione finale?",
          opzioni: [
            "Dalla conoscenza dell'incidente",
            "Dalla notifica",
            "Dalla pre-notifica",
            "Dalla chiusura dell'incidente",
          ],
          corretta: 1,
          spiegazione:
            "Dalla notifica. Senza notifica quel termine non esiste: farlo decorrere dalla conoscenza metterebbe nello scadenzario una scadenza che il decreto non pone.",
        },
        {
          testo:
            "La pre-notifica è stata inviata trenta ore dopo la conoscenza. Come compare nel registro?",
          opzioni: [
            "Nei termini: è stata fatta",
            "Fuori termine, e resta scritto",
            "In corso, finché non arriva la notifica",
            "Non applicabile",
          ],
          corretta: 1,
          spiegazione:
            "Fuori termine. Un adempimento tardivo è un fatto che il documento deve riportare: è esattamente ciò che l'Autorità guarda, e non diventa regolare per il fatto di essere stato compiuto.",
        },
      ],
    },
  },

  {
    id: "corpus-e-documento",
    titolo: "Le procedure, i registri e la relazione",
    minuti: 7,
    sommario: "Che cosa il prodotto ti dà già scritto, che cosa devi compilare, e che cosa esce alla fine.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il percorso porta **${NUMERI.procedureNis2} procedure** e **${NUMERI.moduliNis2} moduli** già redatti sui riferimenti del decreto, più **${NUMERI.registriNis2} registri** operativi: incidenti, rischi, vulnerabilità, inventario degli attivi, fornitori, backup, verifiche, formazione, simulazioni di phishing, riesame degli accessi, modifiche ai sistemi, comunicazioni con l'Autorità, certificati e piano di adeguamento.`,
      },
      {
        tipo: "prosa",
        testo:
          "Le procedure si **personalizzano**: portano segnaposto fra parentesi quadre che il sistema riempie con i dati dell'organizzazione, e blocchi di testo che puoi riscrivere quando la procedura standard non descrive come lavora quel cliente. Ogni documento ha uno stato — da personalizzare, in redazione, approvata, non applicabile — perché in un'ispezione conta quali sono state adottate, non quante ne esistono.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Il documento che esce è congelato",
        testo:
          "La **Relazione sul livello di conformità** si pubblica in versioni, e ciascuna è immutabile: la classificazione d'ambito, i livelli e gli scostamenti che riporta sono quelli del giorno della firma. Se domani correggi la dimensione o valuti altri dieci requisiti, la relazione già consegnata non cambia sotto le mani di chi l'ha ricevuta — e la successiva sarà la revisione 2.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Il documento dichiara che cosa non contiene",
        testo:
          "In apertura, riquadrato: che la classificazione è una valutazione preliminare e la qualificazione definitiva compete all'Autorità, e che i requisiti non valutati pesano zero invece di essere esclusi. Uno snapshot è immutabile, e ciò che si scrive oggi resta scritto: tanto vale scrivere il vero.",
      },
      {
        tipo: "prosa",
        testo:
          "Ogni versione pubblicata porta un **codice di verifica**: chi riceve il PDF può confermarne l'autenticità su una pagina pubblica, senza account e senza chiedere niente a nessuno.",
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo:
            "Dopo aver pubblicato la relazione correggi la dimensione dell'azienda da media a grande. Che cosa succede al documento consegnato?",
          opzioni: [
            "Si aggiorna: mostra sempre il dato corrente",
            "Resta com'era: lo snapshot è immutabile",
            "Va ripubblicato per forza, altrimenti è invalido",
            "Il codice di verifica smette di funzionare",
          ],
          corretta: 1,
          spiegazione:
            "Resta com'era. Un documento che cambiasse conclusione sotto le mani di chi l'ha ricevuto non varrebbe niente: la correzione produrrà una revisione successiva.",
        },
        {
          testo: "A che cosa serve lo stato di una procedura del corpus?",
          opzioni: [
            "A contare quante procedure esistono",
            "A distinguere quelle adottate da quelle ancora da personalizzare",
            "A decidere quali entrano nella relazione",
            "A stabilire l'ordine di stampa",
          ],
          corretta: 1,
          spiegazione:
            "In un'ispezione conta quali procedure l'organizzazione ha adottato, non quante ne esistono nel catalogo: lo stato è ciò che distingue le due cose.",
        },
      ],
    },
  },
];
