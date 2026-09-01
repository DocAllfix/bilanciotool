import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

/**
 * Avviare e far crescere l'attività di consulenza.
 *
 * ⚠️ NON È IL CORSO DI UN PERCORSO, ed è per questo che non sta in `PROPRIE`. Gli altri
 * dodici insegnano a condurre un lavoro; questo insegna a farne un'attività: dove sono i
 * clienti, come si diagnostica un bisogno, come si costruisce e si prezza una proposta,
 * come si conduce un progetto fino alla certificazione, come si organizza uno studio.
 *
 * Il metodo commerciale è del committente e regge tutto. Ciò che è stato riscritto è il
 * prodotto: nel suo testo la piattaforma aveva la «modalità solo browser», l'archivio da
 * esportare in JSON a ogni traguardo, e l'export come prova del lavoro fatto. Qui la prova
 * del lavoro è un'altra e migliore — il documento pubblicato è immutabile, porta un codice
 * che chiunque può verificare, e il registro di audit dice chi ha fatto che cosa.
 */
export const AVVIARE_ATTIVITA: Sezione[] = [
  {
    id: "perche-adesso",
    titolo: "Perché adesso: le pressioni che il cliente già sente",
    minuti: 6,
    sommario: "I motivi per cui un'impresa cerca questi servizi, e quale percorso risponde a ciascuno.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Un consulente vende soluzioni a pressioni che il cliente sta già subendo. Conoscere le pressioni è metà della vendita, e sono sei.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Pressione", "Che cosa produce nelle imprese", "Percorsi"],
        righe: [
          [
            "Rendicontazione di sostenibilità",
            "Le grandi imprese chiedono dati ai fornitori; le piccole ricevono questionari e devono rispondere con numeri, non con dichiarazioni",
            "Bilancio di sostenibilità · Inventario GHG · Autovalutazione ESG",
          ],
          [
            "Due diligence di filiera",
            "Clausole contrattuali, codici di condotta, richieste di mappatura e di canale di reclamo verso i fornitori",
            "Due diligence di filiera · SA8000",
          ],
          [
            "Banche e finanza",
            "Richieste di dati energetici, emissioni e politiche; premialità o penalizzazione nel merito creditizio",
            "Inventario GHG · Bilancio energetico · Bilancio di sostenibilità",
          ],
          [
            "Appalti pubblici e privati",
            "Modelli organizzativi e certificazioni come requisito di ammissione o come punteggio",
            "Modello 231 · Prevenzione della corruzione · SA8000 · SGI QAS",
          ],
          [
            "Obblighi di legge diretti",
            "Sanzioni, responsabilità degli amministratori, richieste delle autorità",
            "Segnalazioni · Modello 231 · Bilancio energetico · SGI QAS",
          ],
          [
            "Sicurezza delle informazioni",
            "Richieste di certificazione o di dichiarazione ai fornitori di servizi, gare informatiche, coperture assicurative",
            "Dichiarazione di Applicabilità",
          ],
        ],
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "La regola dell'a cascata",
        testo:
          "Quasi tutti questi obblighi nascono in capo alle grandi imprese e scendono lungo la filiera come richieste contrattuali. Il cliente tipico non è l'obbligato: è **il fornitore dell'obbligato**, che riceve un questionario o una clausola e non sa come rispondere. È l'unico caso in cui la pressione commerciale è più forte di quella sanzionatoria, e va sfruttata.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Non vendere paura",
        testo:
          "Le sanzioni chiudono le conversazioni, le opportunità le aprono. «Con questo documento risponde al capofila in due settimane invece di perdere la commessa» funziona più di qualunque riferimento normativo. Le norme servono a te per scegliere gli strumenti, al cliente per fidarsi.",
      },
    ],
  },

  {
    id: "posizionamento",
    titolo: "Il tuo posizionamento",
    minuti: 5,
    sommario: "Una porta d'ingresso sola, e le credenziali che contano davvero.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `I percorsi sono **${NUMERI.moduli}**, raggruppati in **${NUMERI.gruppi} aree**. Per il cliente sono ${NUMERI.moduli} servizi; per te è un metodo solo. Ma un consulente che «fa tutto» non è riconoscibile: si sceglie una porta d'ingresso e si lascia che il resto arrivi dai clienti.`,
      },
      {
        tipo: "tabella",
        intestazioni: ["Profilo", "Porta d'ingresso", "Secondo passo naturale"],
        righe: [
          [
            "Consulente ESG",
            "Autovalutazione ESG, poi Bilancio di sostenibilità",
            "Inventario GHG, Bilancio energetico, Due diligence di filiera",
          ],
          [
            "Consulente di conformità",
            "Segnalazioni, poi Modello 231",
            "Prevenzione della corruzione, Due diligence, SA8000",
          ],
          [
            "Consulente di sistema",
            "SGI QAS, poi SA8000 o Prevenzione della corruzione",
            "Bilancio energetico, Dichiarazione di Applicabilità, Inventario GHG",
          ],
        ],
      },
      {
        tipo: "elenco",
        voci: [
          "Competenza verificabile: una qualifica di auditor, esperienza nel settore, iscrizione a un ordine dove pertinente.",
          "Un primo caso, anche non retribuito, purché produca un documento completo da mostrare con i dati resi anonimi.",
          "Un metodo dichiarato: saperlo spiegare in tre minuti è già una credenziale.",
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Territorio o settore, non entrambi vaghi",
        testo:
          "«Consulente ESG per le aziende agroalimentari della provincia» genera passaparola; «consulente per la sostenibilità e la conformità» no. Il posizionamento stretto all'inizio si allarga con i clienti, non con le parole.",
      },
    ],
  },

  {
    id: "dove-sono-i-clienti",
    titolo: "Dove sono i clienti",
    minuti: 7,
    sommario: "I segnali di bisogno, e i due ragionamenti che moltiplicano i contatti.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Segmento", "Segnale di bisogno", "Percorso di ingresso"],
        righe: [
          [
            "Fornitori di grandi gruppi",
            "Hanno ricevuto un questionario, un codice di condotta o una clausola di due diligence",
            "Autovalutazione ESG, Due diligence di filiera",
          ],
          [
            "Imprese sopra la soglia di legge",
            "Obbligo sul canale di segnalazione, spesso senza gestore nominato",
            "Segnalazioni, poi Modello 231",
          ],
          [
            "Chi partecipa a gare",
            "Bandi con modelli organizzativi e certificazioni come requisito o punteggio",
            "Modello 231, SA8000, SGI QAS, Prevenzione della corruzione",
          ],
          [
            "Già certificate",
            "Sistema in mantenimento con documentazione stanca, audit di rinnovo in arrivo",
            "SGI QAS, poi Bilancio energetico e SA8000",
          ],
          [
            "Manifattura e imprese energivore",
            "Costi energetici, incentivi, diagnosi richieste dalle banche",
            "Bilancio energetico, poi Inventario GHG",
          ],
          [
            "Informatica e servizi",
            "Clienti che chiedono la certificazione, gare informatiche, coperture cyber",
            "Dichiarazione di Applicabilità, poi Segnalazioni",
          ],
          [
            "Cooperative, terzo settore, partecipate",
            "Bilancio sociale, appalti pubblici di servizi, anticorruzione",
            "SA8000, Bilancio di sostenibilità, Prevenzione della corruzione",
          ],
        ],
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Il ragionamento a filiera, e quello a evento",
        testo:
          "Un capofila con cento fornitori genera cento clienti potenziali con lo stesso identico bisogno: stesso questionario, stesso codice di condotta, stessa proposta replicata. E ogni scadenza normativa, ogni bando nuovo, ogni notizia di sanzione nel settore è il momento in cui il bisogno diventa urgente: si tiene un calendario e si contattano una o due settimane prima.",
      },
    ],
  },

  {
    id: "canali",
    titolo: "Come arrivano i clienti",
    minuti: 7,
    sommario: "La rete degli intermediari, che vale più di qualunque pubblicità.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Nella consulenza alle piccole imprese il cliente arriva quasi sempre da chi già lo serve. La domanda giusta non è «come mi faccio conoscere», è «chi è già dentro quell'azienda e non vuole fare questo lavoro».",
      },
      {
        tipo: "tabella",
        intestazioni: ["Intermediario", "Perché ti manda clienti", "Che cosa gli offri"],
        righe: [
          [
            "Commercialisti e consulenti del lavoro",
            "Vedono per primi le soglie, le richieste delle banche, i questionari, e non vogliono farne il lavoro",
            "Un servizio che completa il loro senza sovrapporsi, e visibilità congiunta",
          ],
          [
            "Associazioni di categoria e distretti",
            "Cercano contenuti e servizi per gli associati",
            "Seminari, controlli collettivi con l'autovalutazione, convenzioni",
          ],
          [
            "Organismi di certificazione",
            "Non possono fare consulenza a chi certificano, e hanno bisogno di consulenti affidabili da indicare",
            "Progetti che arrivano all'audit ordinati, e rispetto rigoroso dell'indipendenza",
          ],
          [
            "Banche del territorio",
            "Devono raccogliere dati dai clienti affidati",
            "Un percorso dedicato ai clienti della banca",
          ],
          [
            "Tecnici, installatori, società di software",
            "Entrano in azienda per altro e incontrano il bisogno",
            "Partnership reciproca",
          ],
          [
            "Broker assicurativi e legali d'impresa",
            "Coperture informatiche e responsabilità degli amministratori",
            "Il modello, il canale e la dichiarazione come riduzione del rischio assicurato",
          ],
        ],
      },
      {
        tipo: "elenco",
        voci: [
          "Un tema, un pubblico, una cadenza: un contenuto al mese sul tuo posizionamento, con un caso concreto reso anonimo.",
          "Seminari brevi presso associazioni e ordini: il prodotto proiettato dal vivo convince più di qualunque presentazione.",
          "Il contatto diretto sempre per nome e per motivo, con una proposta di mezz'ora e un solo servizio dentro.",
          "Tre contatti a distanza di settimane, poi si passa oltre: l'insistenza costa reputazione.",
        ],
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Misura da dove arrivano",
        testo:
          "Origine del contatto, data, esito, valore. Dopo sei mesi sai dove investire il tempo, e nei primi anni la risposta è quasi sempre la stessa: dagli intermediari e dai clienti soddisfatti.",
      },
    ],
  },

  {
    id: "primo-incontro",
    titolo: "Il primo incontro e la diagnosi",
    minuti: 6,
    sommario: "Non serve a vendere: serve a capire e a far vedere.",
    blocchi: [
      {
        tipo: "elenco",
        voci: [
          "Ascolto: da dove nasce il bisogno, chi ha chiesto che cosa ed entro quando, che cosa hanno già, chi se ne occuperà internamente.",
          "Diagnosi dal vivo: si apre il percorso pertinente e si compila insieme la parte di autovalutazione. Il cliente vede il metodo e il proprio stato nello stesso momento.",
          "Lettura: il quadro mostra il divario e le priorità, e tu traduci in tempi e in conseguenze.",
          "Prossimo passo: proposta scritta entro una settimana. Non si chiude al primo incontro, perché chi decide di solito non è nella stanza.",
        ],
      },
      {
        tipo: "prosa",
        testo:
          "Le cinque domande che qualificano: chi ve lo chiede e cosa succede se non rispondete; entro quando e chi avrà tempo per lavorarci; quali documenti e dati avete già; qual è il risultato che vi farebbe dire che ne è valsa la pena; chi decide e con quale budget.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Per la diagnosi si usa un'azienda dedicata, e per due percorsi nemmeno quella",
        testo:
          "Si crea un'azienda apposta nel portafoglio e, se il cliente non procede, si archivia. E per il percorso sulle segnalazioni e per il modello 231 **non si registrano mai fatti reali in una diagnosi**: solo l'assetto. Un fascicolo aperto per mostrare come funziona lo strumento è un fascicolo vero, con dentro dati veri, in un'azienda che potrebbe non diventare mai cliente.",
      },
    ],
  },

  {
    id: "proposta",
    titolo: "Costruire la proposta",
    minuti: 7,
    sommario: "Corta, a pacchetti, con i documenti che il prodotto produce davvero.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Pacchetto", "Contenuto", "Che cosa consegni", "Durata tipica"],
        righe: [
          [
            "Avvio",
            "Diagnosi, anagrafica, mappatura o autovalutazione, piano",
            "Mappa di conformità o attestato, piano con priorità",
            "Poche settimane",
          ],
          [
            "Implementazione",
            "Corpus personalizzato e approvato, registri avviati, formazione, audit interno, riesame",
            "Corpus, registri, relazione o rapporto finale, fascicolo per l'audit",
            "Alcuni mesi",
          ],
          [
            "Mantenimento",
            "Registri, scadenze, aggiornamenti normativi, audit interno annuale, assistenza in sorveglianza",
            "Relazione annuale, verbale di riesame, quadro aggiornato",
            "Canone annuale",
          ],
        ],
      },
      {
        tipo: "elenco",
        voci: [
          "Il bisogno con le parole del cliente, poi il risultato: che cosa avrà in mano e che cosa potrà farci.",
          "Il metodo in fasi con le date, e che cosa serve dal cliente: referente, ore, documenti.",
          "I documenti elencati uno per uno **col loro nome**: il cliente compra cose che può nominare, mostrare e firmare.",
          "Prezzo per pacchetto, e che cosa NON è incluso: l'organismo di certificazione, la verifica di parte terza, il canale di ricezione delle segnalazioni.",
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Le ore del cliente vanno scritte",
        testo:
          "Senza il referente interno il progetto non si chiude, e la colpa cade su di te. Metterle in proposta non è burocrazia: è l'unico modo di renderle un impegno invece che una speranza.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Un solo percorso nella prima proposta",
        testo:
          "Gli altri stanno nel paragrafo delle evoluzioni possibili. E il mantenimento si propone subito, già prezzato: chi compra il progetto compra quasi sempre anche il canone, se lo vede allora.",
      },
    ],
  },

  {
    id: "prezzo",
    titolo: "Il prezzo",
    minuti: 6,
    sommario: "Nasce da tempo e valore, si presenta a corpo, si difende col metodo.",
    blocchi: [
      {
        tipo: "formula",
        testo: "prezzo del pacchetto = giornate stimate × tariffa giornaliera + costi vivi ± correzione di valore",
      },
      {
        tipo: "prosa",
        testo:
          "La tariffa giornaliera la fissi tu, sul riferimento dei professionisti comparabili della tua zona, e non scendi sotto per prendere il primo cliente. Le giornate si imparano: si registrano le ore reali delle prime tre implementazioni di ogni percorso, e quello diventa il tuo listino interno.",
      },
      {
        tipo: "elenco",
        voci: [
          "In alto quando il risultato sblocca una commessa, una gara o un finanziamento: quel valore è misurabile e si cita.",
          "In basso sui progetti replicati fra i fornitori dello stesso capofila, dove il corpus è già personalizzato e le ore calano davvero.",
          "Mai in basso perché «sono all'inizio»: il cliente non lo sa e non gli interessa.",
        ],
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Tre cose da non fare",
        testo:
          "Non prezzare a ore aperte: il cliente compra un risultato, non il tuo tempo. Non includere l'organismo di certificazione o la verifica di parte terza nel tuo prezzo: sono costi suoi, e la separazione è anche una garanzia di indipendenza. Non regalare il mantenimento del primo anno per chiudere il progetto — è il ricavo che rende stabile lo studio, e regalarlo una volta lo rende difficile da vendere per sempre.",
      },
    ],
  },

  {
    id: "obiezioni",
    titolo: "Le cinque obiezioni",
    minuti: 5,
    sommario: "Sono sempre le stesse: preparate, la chiusura è una conseguenza.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Obiezione", "Che cosa c'è dietro", "Risposta"],
        righe: [
          [
            "«Ce l'ha già fatto un consulente anni fa»",
            "Documenti non applicati, registri vuoti",
            "«Verifichiamolo in un'ora con la mappa di conformità: se è tutto a posto lo vedete voi.» Di norma emergono aree scoperte, e il progetto diventa una riattivazione",
          ],
          [
            "«Costa troppo»",
            "Non è chiaro il valore",
            "Si torna al bisogno: quanto vale la commessa, la gara, la sanzione evitata. E si offre di partire dal solo avvio",
          ],
          [
            "«Non abbiamo tempo»",
            "Paura del carico interno",
            "Le ore del referente sono scritte in proposta, e il mantenimento coi registri tenuti da te toglie il resto",
          ],
          [
            "«Lo facciamo internamente»",
            "Sottostima del giudizio professionale",
            "«Il prodotto calcola, ma chi decide quali reati sono applicabili o quale rischio è accettabile risponde in audit.» Si offre la supervisione: compilano loro, validi tu",
          ],
          [
            "«Ci pensiamo»",
            "Manca il decisore o l'urgenza",
            "Si chiede chi decide e quando, e si fissa un ricontatto legato all'evento. Non si insiste oltre il terzo contatto",
          ],
        ],
      },
      {
        tipo: "prosa",
        testo:
          "Il contratto ripete la proposta, senza sorprese: oggetto e documenti, fasi con date, obblighi del cliente, prezzo e traguardi di pagamento, proprietà dei documenti al cliente, riservatezza, esclusione della certificazione e della verifica di parte terza dal servizio.",
      },
    ],
  },

  {
    id: "metodo-progetto",
    titolo: "Il metodo di progetto in cinque fasi",
    minuti: 7,
    sommario: "Uguale per tutti i percorsi: impararlo una volta vale per dodici servizi.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Fase", "Che cosa fai", "Che cosa produci"],
        righe: [
          [
            "Avvio e anagrafica",
            "Azienda nuova nel portafoglio, anagrafica completa, segnaposto risolti",
            "Scheda dell'azienda, piano delle fasi con le date",
          ],
          [
            "Mappatura e valutazione",
            "Catalogo, sorgenti, partner, processi, rischi, materialità, applicabilità",
            "Matrice, registro dei rischi, elenco delle esclusioni motivate",
          ],
          [
            "Corpus e presidi",
            "Personalizzazione blocco per blocco delle procedure pertinenti, approvazione con revisione e data",
            "Corpus approvato, manuale o dichiarazione, elenco documenti",
          ],
          [
            "Registri e formazione",
            "Avvio dei registri con le prime registrazioni vere, sessioni formative, nomine",
            "Registri alimentati, attestati, nomine",
          ],
          [
            "Audit interno e riesame",
            "Mappa valutata con le evidenze, verifiche di coerenza, audit registrato, riesame",
            "Rapporto di audit, verbale o relazione, documento pubblicato",
          ],
        ],
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "La prova del lavoro fatto è il documento pubblicato",
        testo:
          "Ogni pubblicazione congela dati e derivati in una versione che non cambia più, porta un codice che chiunque può verificare da una pagina pubblica, e resta nell'archivio dei documenti. Non serve conservare copie datate per dimostrare a che punto si era: la versione **è** la data.",
      },
      {
        tipo: "elenco",
        voci: [
          "Un traguardo ogni tre o quattro settimane: i progetti che si allungano muoiono.",
          "Il quadro in ogni riunione: la percentuale che sale è il miglior rapporto di avanzamento che si possa portare.",
          "Verifiche di coerenza e situazioni aperte a zero prima di dichiarare chiusa una fase.",
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Il referente interno è il vero risultato",
        testo:
          "Un sistema che sa usare solo il consulente muore all'audit successivo. Dalla quarta fase in poi il referente compila con te e poi da solo, e tu supervisioni. È anche ciò che rende credibile il mantenimento, invece di farlo sembrare una rendita.",
      },
    ],
  },

  {
    id: "verso-la-verifica",
    titolo: "Verso la certificazione e la verifica",
    minuti: 6,
    sommario: "Per metà dei percorsi il lavoro finisce davanti a un terzo.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Percorso", "Chi verifica", "A che cosa fare attenzione"],
        righe: [
          [
            "SGI QAS, SA8000, Prevenzione della corruzione",
            "Organismo di certificazione accreditato",
            "Indipendenza: chi ha fatto la consulenza non può auditare. E almeno un ciclo completo di audit interno e riesame prima della visita in campo",
          ],
          [
            "Inventario GHG",
            "Verificatore accreditato",
            "Evidenze reperibili per ogni voce, esclusioni motivate, ricalcolo dell'anno base quando la regola scatta",
          ],
          [
            "Bilancio di sostenibilità",
            "Facoltativo: revisore, asseveratore, capofila di filiera",
            "Coerenza fra temi materiali, politiche e indicatori: è la prima cosa che si legge",
          ],
          [
            "Modello 231, Segnalazioni",
            "Organismo di vigilanza, autorità in caso di reato, autorità di settore per il canale",
            "Data certa dell'adozione; efficace attuazione provata dai registri; riservatezza del canale assicurata da misure tecniche",
          ],
          [
            "Bilancio energetico",
            "Ente competente per le diagnosi obbligatorie, organismo per la certificazione",
            "Metodo dichiarato per ogni uso finale, e misura vera sull'utenza dominante",
          ],
          [
            "Due diligence, Dichiarazione di Applicabilità, Autovalutazione ESG",
            "Cliente capofila, organismo, committente",
            "Natura del documento dichiarata, evidenze pronte alla richiesta",
          ],
        ],
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Il rapporto con gli organismi è una fonte di clienti",
        testo:
          "Si scelgono due o tre organismi accreditati, si conoscono i loro auditor, si chiedono i preventivi per il cliente e si lascia che sia lui a scegliere. Presentarsi come chi consegna progetti ordinati è il modo in cui gli organismi cominciano a segnalarti.",
      },
      {
        tipo: "prosa",
        testo:
          "Nel pacchetto di implementazione conviene includere la presenza all'audit: il cliente si sente protetto, tu impari che cosa guardano gli auditor, e i rilievi si chiudono col prodotto davanti a loro.",
      },
    ],
  },

  {
    id: "mantenimento",
    titolo: "Il mantenimento e il valore ricorrente",
    minuti: 6,
    sommario: "Lo studio che vive di soli progetti ricomincia da zero ogni anno.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Percorsi", "Attività ricorrenti", "Che cosa fa il prodotto"],
        righe: [
          [
            "Segnalazioni",
            "Gestione o supervisione dei fascicoli, relazione periodica, riesame, formazione, verifiche sul canale",
            "Scadenzario dei termini, monitoraggi dovuti, fascicoli da cancellare",
          ],
          [
            "Modello 231, Prevenzione della corruzione",
            "Flussi verso l'organismo, verifiche, aggiornamento del catalogo, formazione, relazione annuale",
            "Registri, mappa di idoneità, indicatori, relazione generata dai dati",
          ],
          [
            "SGI QAS, SA8000",
            "Rilevazioni degli indicatori, audit interno, riesame, sorveglianza, scadenze autorizzative",
            "Quadro, scadenzario, riesame precompilato",
          ],
          [
            "GHG, energetico, sostenibilità",
            "Nuovo esercizio, aggiornamento dei fattori, confronto con l'anno base, nuovo documento",
            "Copia dall'esercizio precedente, storico, delta calcolati",
          ],
          [
            "Due diligence, Dichiarazione di Applicabilità",
            "Rinnovo delle valutazioni a scadenza, partner nuovi, revisione annuale",
            "Frequenze minime calcolate, verifiche di coerenza",
          ],
          [
            "Autovalutazione ESG",
            "Rivalutazione annuale, attestato nuovo, risposta ai questionari successivi",
            "Piano aggiornato, attestato con la propria versione",
          ],
        ],
      },
      {
        tipo: "elenco",
        voci: [
          "Si vende già nella proposta iniziale, come opzione prezzata.",
          "Con un calendario scritto delle attività dell'anno: il cliente compra date, non una disponibilità generica.",
          "Col quadro condiviso, che il cliente può guardare quando vuole.",
          "Coi ruoli continuativi dove sono ammessi: il canone diventa un incarico.",
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Ogni modifica normativa è un motivo per chiamare tutti i clienti dello stesso percorso",
        testo:
          "Nello stesso giorno. Un reato presupposto nuovo, fattori di emissione aggiornati, la revisione di una norma: è lavoro dentro il canone, e insieme l'occasione di ricordare a dieci clienti che il canone serve a questo.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Il numero che dice se il modello funziona",
        testo:
          "Uno studio maturo copre i costi fissi coi canoni e usa i progetti per crescere. Se dopo due anni i canoni non sono almeno un terzo dei ricavi, il mantenimento non è stato proposto oppure è stato regalato.",
      },
    ],
  },

  {
    id: "organizzare-lo-studio",
    titolo: "Organizzare lo studio",
    minuti: 6,
    sommario: "Tempi standard, portafoglio ordinato, delega, riservatezza.",
    blocchi: [
      {
        tipo: "elenco",
        voci: [
          "Le ore reali delle prime tre implementazioni di ogni percorso: sono il tuo listino interno, e nessun altro te lo può dare.",
          "In agenda: giorni in azienda, giorni a studio, e mezza giornata a settimana per lo sviluppo commerciale — che è la prima cosa a saltare e l'ultima che si dovrebbe togliere.",
          "Non più di tre progetti nelle fasi centrali contemporaneamente, per persona.",
          "Nomi coerenti fra i percorsi dello stesso cliente: il fascicolo dell'azienda li raccoglie tutti, e un nome diverso li separa per sempre.",
        ],
      },
      {
        tipo: "prosa",
        testo:
          "Un collaboratore alle prime armi può fare anagrafiche, raccolta dati, prime registrazioni e personalizzazione del corpus seguendo i corsi dei percorsi. Chi ha esperienza decide: applicabilità, rischi accettabili, esclusioni, approvazioni, riunioni con la direzione. Le verifiche di coerenza e le mappe sono il controllo di qualità del lavoro delegato.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Segnalazioni e Modello 231 trattano i dati il cui uso improprio fa il danno più grave",
        testo:
          "Accessi limitati a chi deve, nessun dato identificativo dentro i fascicoli, e mai un'esportazione su canali ordinari. Il contratto porta la riservatezza e la proprietà dei documenti al cliente, e una polizza di responsabilità professionale adeguata ai servizi svolti. E mai consulenza e audit di parte terza sullo stesso cliente.",
      },
    ],
  },

  {
    id: "crescere",
    titolo: "Crescere: il secondo servizio",
    minuti: 6,
    sommario: "Costa un decimo del primo a un cliente nuovo, e i percorsi sono costruiti per questo.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "I collegamenti più forti sono quelli in cui il secondo percorso riusa il lavoro del primo: dalle segnalazioni al modello 231 e alla prevenzione della corruzione, che condividono il canale e i registri; dal modello 231 alla due diligence, che condividono la mappatura dei processi; dal bilancio di sostenibilità all'inventario GHG e al bilancio energetico, che ne alimentano i numeri; dall'autovalutazione ESG a tutto il resto, perché il piano che produce dice esattamente che cosa manca.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Il momento in cui si propone",
        testo:
          "Al riesame o alla chiusura del progetto, quando il quadro è verde e la fiducia è al massimo. Non a metà, quando il cliente sta ancora misurando se il primo servizio valeva la spesa.",
      },
      {
        tipo: "prosa",
        testo:
          "E il piano dei primi novanta giorni è sempre lo stesso: scegliere una porta d'ingresso, costruire il primo caso completo anche gratis, presentarsi a cinque intermediari con qualcosa da mostrare, fare dieci diagnosi dal vivo. Le prime proposte nascono da lì, e nessuna nasce da una presentazione.",
      },
    ],
  },
];
