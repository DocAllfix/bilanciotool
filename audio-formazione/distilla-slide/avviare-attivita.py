# Slide del corso sull'avvio dell'attività di consulenza.
# ⚠️ Nessun conteggio di percorsi: la voce non li dice più (corretta il 14/09), e le slide
# non li reintroducono. Le aree sono il segnaposto {gruppi}.
from _scrivi import P, scrivi

SLIDE = {
    "perche-adesso": [
        (0, "apertura", dict(
            titolo="Perché adesso", sottotitolo="Si vendono soluzioni a pressioni reali",
            testo="Pressioni che il cliente sta già subendo: conoscerle è metà della vendita.",
            agenda=["Sei pressioni", "Dove sono i clienti", "Commessa, non sanzione", "Il tono", "Le norme servono a te"])),
        (1, "tabella", dict(
            titolo="Sei pressioni",
            cols=["Pressione", "In pratica"],
            righe=[["Rendicontazione di sostenibilità", "Bilancio, inventario delle emissioni, autovalutazione"],
                   ["Due diligence di filiera", "Due diligence, certificazione sociale"],
                   ["Banche e finanza", "Inventario, bilancio energetico e di sostenibilità"],
                   ["Appalti pubblici e privati", "Modelli organizzativi e certificazioni"],
                   ["Obblighi di legge diretti", "Sanzioni e responsabilità degli amministratori"],
                   ["Sicurezza delle informazioni", "Certificazione, gare, coperture assicurative"]])),
        (5, "evidenza", dict(
            eyebrow="Dove sono i clienti",
            titolo="Il cliente tipico non è l'obbligato: è il suo fornitore.",
            testo="Gli obblighi nascono nelle grandi imprese e scendono lungo la filiera come questionari e clausole.")),
        (6, "confronto", dict(
            titolo="La pressione commerciale vince",
            a={"h": "Una sanzione fra due anni", "sub": "Si rimanda", "punti": ["Nessuna urgenza"]},
            b={"h": "Una commessa fra sei settimane", "sub": "Si chiama", "punti": ["La pressione più forte"]})),
        (7, "definizione", dict(
            eyebrow="Il tono", titolo="Non vendere paura",
            definizione="Le sanzioni chiudono le conversazioni, le opportunità le aprono.",
            punti=[P("Funziona", "«risponde al capofila in due settimane invece di perdere la commessa»")])),
        (8, "chiusura", dict(
            titolo="Le norme servono a te",
            punti=[P("A te", "per scegliere gli strumenti giusti"), P("Al cliente", "per fidarsi che sai di che cosa parli"),
                   P("Per quello", "basta nominarle una volta")])),
    ],
    "posizionamento": [
        (0, "apertura", dict(
            titolo="Il posizionamento", sottotitolo="Tanti servizi per il cliente, un metodo per te",
            testo="I percorsi stanno in {gruppi} aree: impari una volta e vendi molte volte.",
            agenda=["Una porta d'ingresso", "Tre profili", "Le credenziali", "Il primo caso", "Territorio o settore"])),
        (1, "evidenza", dict(
            eyebrow="Chi fa tutto",
            titolo="Non è riconoscibile da nessuno.",
            testo="Si sceglie una porta d'ingresso e il resto arriva dai clienti: chi ha chiesto l'autovalutazione, l'anno dopo chiede il bilancio.")),
        (2, "tabella", dict(
            titolo="Tre profili che funzionano",
            cols=["Profilo", "Entra da", "Prosegue con"],
            righe=[["Consulente ESG", "Autovalutazione e bilancio di sostenibilità", "Emissioni, energetico, filiera"],
                   ["Consulente di conformità", "Segnalazioni e modello organizzativo", "Anticorruzione, due diligence, certificazione sociale"],
                   ["Consulente di sistema", "Sistema di gestione integrato", "Energetico, dichiarazione di applicabilità, emissioni"]])),
        (3, "cards", dict(
            titolo="Tre credenziali, nessuna richiede anni",
            cards=[P("Una competenza verificabile", "Qualifica di auditor, esperienza nel settore, un ordine dove pertinente."),
                   P("Un primo caso", "Anche non retribuito, con un documento completo reso anonimo."),
                   P("Un metodo dichiarato", "Saperlo spiegare in tre minuti: pochi concorrenti ci riescono.")])),
        (4, "definizione", dict(
            eyebrow="Il primo caso non retribuito", titolo="Un investimento, non un regalo",
            definizione="Il ritorno è un documento vero da mostrare al secondo cliente.",
            punti=[P("Sceglilo", "in un settore in cui vuoi lavorare"), P("Chiedi in cambio", "il permesso di usarlo come riferimento")])),
        (5, "confronto", dict(
            titolo="Territorio o settore, non entrambi vaghi",
            a={"h": "«Consulente ESG per l'agroalimentare della provincia»", "sub": "Genera passaparola",
               "punti": ["Chi lo sente sa a chi ridirlo"]},
            b={"h": "«Consulente per sostenibilità e conformità»", "sub": "Non genera niente",
               "punti": ["Non si può ripetere a nessuno"]})),
        (6, "chiusura", dict(
            titolo="Stretto all'inizio",
            punti=[P("Si allarga", "con i clienti, non con le parole"), P("Chi comincia largo", "perde tutte le occasioni"),
                   P("Perché", "nessuno se lo ricorda")])),
    ],
    "dove-sono-i-clienti": [
        (0, "apertura", dict(
            titolo="Dove sono i clienti", sottotitolo="Un segnale, non un settore",
            testo="Ogni segmento ha un segnale che dice che il bisogno c'è già: è la differenza fra un contatto freddo e uno caldo.",
            agenda=["I segnali", "Il ragionamento a filiera", "Il ragionamento a evento"])),
        (1, "tabella", dict(
            titolo="Segnali, e da dove si entra",
            cols=["Chi", "Il segnale", "Si entra da"],
            righe=[["Chi riceve questionari", "Qualcuno ha chiesto, non sanno rispondere", "Autovalutazione"],
                   ["Obbligati al canale", "Nessun gestore nominato", "Segnalazioni, poi modello organizzativo"],
                   ["Chi partecipa a gare", "Requisito o punteggio", "Modello o certificazione"],
                   ["Già certificati", "Audit di rinnovo in arrivo", "Il sistema in mantenimento"],
                   ["Manifattura ed energivori", "Costi, incentivi, diagnosi chieste dalle banche", "Bilancio energetico"],
                   ["Informatica e servizi", "Clienti e assicurazioni", "Dichiarazione di applicabilità"]])),
        (6, "evidenza", dict(
            eyebrow="Il ragionamento a filiera",
            titolo="Un capofila con cento fornitori: cento clienti con lo stesso bisogno.",
            testo="Capisci il bisogno una volta e lo rivendi cento. È anche l'unico caso in cui il prezzo scende onestamente.")),
        (7, "flusso", dict(
            titolo="Il ragionamento a evento",
            passi=[P("Un calendario", "scadenze, bandi, notizie di sanzioni"),
                   P("Una o due settimane prima", "si contattano le aziende"),
                   P("La domanda", "è già nella testa del destinatario")])),
        (8, "confronto", dict(
            titolo="Dieci minuti al mese",
            a={"h": "La mail al momento giusto", "sub": "Arriva con la domanda", "punti": ["Riceve risposta"]},
            b={"h": "La stessa mail due mesi dopo", "sub": "Qualcun altro ha già risposto", "punti": ["Nessuna risposta"]})),
    ],
    "canali": [
        (0, "apertura", dict(
            titolo="I canali", sottotitolo="Chi è già dentro l'azienda",
            testo="La domanda giusta non è come farsi conoscere: è chi serve già quel cliente e non vuole fare questo lavoro.",
            agenda=["Commercialisti e consulenti del lavoro", "Associazioni", "Organismi di certificazione",
                    "Banche, tecnici, broker", "Il lavoro diretto", "Misurare"])),
        (1, "evidenza", dict(
            eyebrow="Il canale più produttivo nei primi due anni",
            titolo="Commercialisti e consulenti del lavoro.",
            testo="Vedono per primi soglie, richieste delle banche e questionari, e non vogliono farne il lavoro: si offre un servizio che completa il loro.")),
        (2, "definizione", dict(
            eyebrow="Associazioni e distretti", titolo="Un seminario in associazione",
            definizione="Venti aziende dello stesso settore nella stessa stanza: la cosa più vicina a una fiera, a costo zero.",
            punti=[P("Si offrono", "seminari, controlli collettivi, convenzioni")])),
        (3, "split", dict(
            titolo="Gli organismi di certificazione",
            lead="Non possono fare consulenza a chi certificano, e cercano consulenti affidabili da indicare.",
            punti=[P("Si offre", "un progetto che arriva all'audit ordinato"),
                   P("E l'indipendenza", "rigorosa: confusa una volta, il canale si chiude")])),
        (4, "cards", dict(
            titolo="Altri tre intermediari",
            cards=[P("Banche del territorio", "Devono raccogliere dati dai clienti affidati."),
                   P("Tecnici e software house", "Entrano per altro e incontrano il bisogno."),
                   P("Broker e legali d'impresa", "Per loro modello, canale e dichiarazione riducono il rischio assicurato.")])),
        (5, "punti", dict(
            titolo="Il lavoro diretto: quattro regole",
            punti=[P("Un tema, un pubblico, una cadenza", "un contenuto al mese con un caso reale"),
                   P("Seminari brevi", "il prodotto dal vivo convince più di una presentazione"),
                   P("Contatto per nome e per motivo", "mezz'ora, un solo servizio"),
                   P("Tre contatti", "poi si passa oltre")])),
        (6, "numeri", dict(
            titolo="Misurare da dove arrivano",
            numeri=[{"n": "4", "h": "Colonne", "d": "Origine, data, esito, valore."},
                    {"n": "6 mesi", "h": "Dopo", "d": "Sai dove investire il tempo."},
                    {"n": "Intermediari", "h": "La risposta, quasi sempre", "d": "E clienti soddisfatti, non la promozione."}])),
    ],
    "primo-incontro": [
        (0, "apertura", dict(
            titolo="Il primo incontro", sottotitolo="Capire e far vedere, non vendere",
            testo="Condotto per vendere mette il cliente sulla difensiva; condotto per capire lo fa parlare.",
            agenda=["Quattro momenti", "Cinque domande", "L'azienda di prova", "Mai fatti reali"])),
        (1, "flusso", dict(
            titolo="Quattro momenti",
            passi=[P("Ascolto", "da dove nasce il bisogno, chi ha chiesto, entro quando"),
                   P("Diagnosi dal vivo", "si compila insieme l'autovalutazione"),
                   P("Lettura", "il divario tradotto in tempi e conseguenze"),
                   P("Prossimo passo", "proposta scritta entro una settimana")])),
        (2, "evidenza", dict(
            eyebrow="Non si chiude al primo incontro",
            titolo="Chi decide, di solito, non è nella stanza.",
            testo="Non è una strategia: è il motivo per cui la proposta arriva scritta, entro una settimana.")),
        (3, "punti", dict(
            titolo="Cinque domande che qualificano un cliente",
            punti=[P("Chi ve lo chiede", "e che cosa succede se non rispondete"), P("Entro quando", "e chi avrà tempo"),
                   P("Che cosa avete già", "documenti e dati"), P("Quale risultato", "vi farebbe dire che ne è valsa la pena"),
                   P("Chi decide", "con quale budget")])),
        (4, "confronto", dict(
            titolo="Le due domande che contano",
            a={"h": "La quarta", "sub": "Si dimentica", "punti": ["Dice che cosa scrivere nella proposta"]},
            b={"h": "La quinta", "sub": "Fa paura", "punti": ["Senza, scopri tardi di parlare con la persona sbagliata"]})),
        (5, "definizione", dict(
            eyebrow="Una regola del prodotto", titolo="Un'azienda apposta per la diagnosi",
            definizione="Se il cliente non procede, la si archivia: le prove non sporcano il portafoglio vero.")),
        (6, "chiusura", dict(
            titolo="Segnalazioni e modello: mai fatti reali",
            punti=[P("In una diagnosi", "solo l'assetto"), P("Un fascicolo di prova", "è un fascicolo vero, con dati veri"),
                   P("Per mostrare il metodo", "basta la struttura vuota")])),
    ],
    "proposta": [
        (0, "apertura", dict(
            titolo="La proposta", sottotitolo="A pacchetti",
            testo="Tre pacchetti, due pagine, un solo percorso.",
            agenda=["Tre pacchetti", "Quattro parti", "I documenti col loro nome", "Le ore del cliente",
                    "Un solo percorso", "Il mantenimento subito"])),
        (1, "tabella", dict(
            titolo="Tre pacchetti",
            cols=["Pacchetto", "Consegna", "Durata"],
            righe=[["Avvio", "Mappa o attestato, e un piano con le priorità", "Poche settimane"],
                   ["Implementazione", "Corpus, registri, relazione, fascicolo per l'audit", "Alcuni mesi"],
                   ["Mantenimento", "Registri, scadenze, aggiornamenti, audit, sorveglianza", "Canone annuale"]])),
        (2, "cards", dict(
            titolo="Quattro parti, due pagine",
            cards=[P("Bisogno e risultato", "Con le parole del cliente: che cosa avrà in mano."),
                   P("Metodo", "Fasi con date, e che cosa serve dal cliente."),
                   P("Documenti", "Elencati uno per uno col loro nome."),
                   P("Prezzo", "Per pacchetto, con che cosa non è incluso.")])),
        (3, "confronto", dict(
            titolo="Una proposta, non un preventivo",
            a={"h": "«Supporto in materia ambientale»", "sub": "Non è niente", "punti": ["A parità di prezzo perde sempre"]},
            b={"h": "«Rapporto di inventario delle emissioni»", "sub": "Una cosa", "punti": ["Si nomina, si mostra, si firma"]})),
        (5, "evidenza", dict(
            eyebrow="Prima regola",
            titolo="Le ore del cliente si scrivono.",
            testo="Senza referente il progetto non si chiude, e la colpa cade su di te. Scritte, diventano un impegno invece di una speranza.")),
        (6, "definizione", dict(
            eyebrow="Seconda regola", titolo="Un solo percorso nella prima proposta",
            definizione="Gli altri fra le evoluzioni possibili: una proposta con tre percorsi non si valuta tre volte, si rimanda una volta.")),
        (7, "chiusura", dict(
            titolo="Il mantenimento, subito e già prezzato",
            punti=[P("Chi compra il progetto", "compra quasi sempre anche il canone"), P("Se lo vede", "in quel momento"),
                   P("Un anno dopo", "è una vendita nuova, e molto più difficile")])),
    ],
    "prezzo": [
        (0, "apertura", dict(
            titolo="Il prezzo", sottotitolo="Un conto semplice, tre grandezze difficili",
            testo="Giornate stimate × tariffa giornaliera + costi vivi ± correzione di valore.",
            agenda=["La tariffa", "Le giornate", "La correzione di valore", "Tre cose da non fare"])),
        (1, "evidenza", dict(
            eyebrow="La decisione più importante dell'avvio",
            titolo="Una tariffa bassa non è un prezzo di lancio: è il tuo prezzo.",
            testo="Si fissa guardando i professionisti comparabili della zona. I clienti che porta si scandalizzeranno quando la alzerai.")),
        (2, "flusso", dict(
            titolo="Le giornate si imparano",
            passi=[P("Prime tre implementazioni", "di ogni percorso"), P("Ore reali", "non quelle previste"),
                   P("Il tuo listino interno", "le prime due valgono il doppio della stima")])),
        (3, "confronto", dict(
            titolo="La correzione di valore",
            a={"h": "Sale", "sub": "Quando il risultato sblocca qualcosa", "punti": ["Una commessa, una gara, un finanziamento"]},
            b={"h": "Scende", "sub": "Sui progetti replicati", "punti": ["Stesso capofila, corpus già pronto", "L'unico sconto onesto"]})),
        (6, "cards", dict(
            titolo="Tre cose da non fare",
            cards=[P("Prezzare a ore aperte", "Trasferisce sul cliente il rischio della tua inesperienza."),
                   P("Includere l'organismo", "Sono costi suoi, e separarli è indipendenza."),
                   P("Regalare il primo anno di mantenimento", "Il cliente impara che vale zero.")])),
        (7, "evidenza", dict(
            eyebrow="L'organismo di certificazione",
            titolo="Fuori dal tuo prezzo, sempre.",
            testo="Il giorno in cui un organismo scopre che fatturavi anche il suo audit, quel rapporto è finito.")),
        (8, "chiusura", dict(
            titolo="Il mantenimento non si regala",
            punti=[P("È il ricavo", "che rende stabile lo studio"), P("Cresce da solo", "mentre lavori ad altro"),
                   P("Regalato una volta", "è difficile da vendere per sempre")])),
    ],
    "obiezioni": [
        (0, "apertura", dict(
            titolo="Le obiezioni", sottotitolo="Sempre le stesse cinque",
            testo="Preparate, la chiusura diventa una conseguenza; improvvisate, ogni trattativa sembra difficile.",
            agenda=["«Ce l'ha già fatto qualcuno»", "«Costa troppo»", "«Non abbiamo tempo»", "«Lo facciamo internamente»",
                    "«Ci pensiamo»", "Il contratto"])),
        (1, "split", dict(
            titolo="«Ce l'ha già fatto un consulente»",
            lead="Nasconde quasi sempre documenti mai applicati e registri vuoti.",
            punti=[P("Si risponde", "verifichiamolo in un'ora con la mappa di conformità"),
                   P("Il progetto", "diventa una riattivazione, non una critica al collega")])),
        (2, "definizione", dict(
            eyebrow="«Costa troppo»", titolo="Un valore non chiaro",
            definizione="Si torna al bisogno: quanto vale la commessa, la gara, la sanzione evitata.",
            punti=[P("Si offre", "il solo pacchetto di avvio")])),
        (3, "evidenza", dict(
            eyebrow="«Non abbiamo tempo»",
            titolo="L'obiezione più sincera.",
            testo="La risposta è già nella proposta, se le ore del referente sono scritte; si completa col mantenimento.")),
        (4, "confronto", dict(
            titolo="«Lo facciamo internamente»",
            a={"h": "Il prodotto", "sub": "Calcola", "punti": ["Nessuno lo nega"]},
            b={"h": "Il giudizio", "sub": "È di chi risponde in audit", "punti": ["Si offre la supervisione: compilano loro, validi tu"]})),
        (5, "flusso", dict(
            titolo="«Ci pensiamo»",
            passi=[P("Manca", "il decisore o l'urgenza"), P("Si chiede", "chi decide e quando"),
                   P("Si ricontatta", "su un evento reale, non su una data generica")])),
        (6, "chiusura", dict(
            titolo="Il contratto ripete la proposta",
            punti=[P("Oggetto e documenti", "fasi con date, obblighi del cliente"),
                   P("Prezzo e traguardi", "documenti al cliente, riservatezza"),
                   P("Certificazione", "esclusa esplicitamente"),
                   P("Condizioni nuove", "riaprono una trattativa chiusa")])),
    ],
    "metodo-progetto": [
        (0, "apertura", dict(
            titolo="Il metodo di progetto", sottotitolo="Lo stesso per tutti i percorsi",
            testo="Lo impari una volta e vale per ogni servizio.",
            agenda=["Cinque fasi", "Il documento pubblicato", "Tre regole di conduzione", "Il referente interno"])),
        (1, "tabella", dict(
            titolo="Cinque fasi, e che cosa consegnano",
            cols=["Fase", "Consegna"],
            righe=[["Avvio e anagrafica", "Scheda dell'azienda e piano delle fasi"],
                   ["Mappatura e valutazione", "Matrice, registro dei rischi, esclusioni motivate"],
                   ["Corpus e presidi", "Corpus approvato, manuale o dichiarazione"],
                   ["Registri e formazione", "Registri alimentati, attestati, nomine"],
                   ["Audit interno e riesame", "Rapporto, verbale o relazione, documento pubblicato"]])),
        (4, "evidenza", dict(
            eyebrow="La prova del lavoro fatto",
            titolo="Il documento pubblicato.",
            testo="Congela dati e calcoli in una versione che non cambia, con un codice che chiunque può verificare.")),
        (5, "definizione", dict(
            eyebrow="Una garanzia anche per il cliente", titolo="La versione è la data",
            definizione="Non servono copie datate per dimostrare a che punto si era.")),
        (6, "cards", dict(
            titolo="Tre regole di conduzione",
            cards=[P("Un traguardo ogni tre o quattro settimane", "I progetti lunghi muoiono di stanchezza."),
                   P("Il quadro di avanzamento", "In ogni riunione: una percentuale che sale."),
                   P("Situazioni aperte a zero", "Prima di chiudere una fase.")])),
        (7, "evidenza", dict(
            eyebrow="La cosa più importante",
            titolo="Il referente interno è il vero risultato.",
            testo="Un sistema che sa usare solo il consulente muore all'audit successivo.")),
        (8, "flusso", dict(
            titolo="Dalla quarta fase in poi",
            passi=[P("Il referente compila", "con te"), P("Poi da solo", "e tu supervisioni"),
                   P("Il canone", "paga il tuo controllo, non una dipendenza")])),
    ],
    "verso-la-verifica": [
        (0, "apertura", dict(
            titolo="Verso la verifica", sottotitolo="Chi guarda, e che cosa guarda per primo",
            testo="Per metà dei percorsi il lavoro finisce davanti a un terzo.",
            agenda=["Chi verifica che cosa", "Gli organismi come fonte di clienti", "La presenza all'audit"])),
        (1, "tabella", dict(
            titolo="Chi verifica, e che cosa guarda",
            cols=["Percorsi", "Davanti a", "Guarda per primo"],
            righe=[["Sistema integrato, certificazione sociale, anticorruzione", "Organismo accreditato", "Indipendenza, un ciclo di audit interno"],
                   ["Inventario delle emissioni", "Verificatore accreditato", "Evidenze, esclusioni, ricalcolo dell'anno base"],
                   ["Bilancio di sostenibilità", "Revisore, asseveratore o capofila", "Coerenza di temi, politiche e indicatori"],
                   ["Modello organizzativo e segnalazioni", "Organismo di vigilanza, autorità", "Data certa, registri, riservatezza tecnica"],
                   ["Bilancio energetico", "Ente competente o organismo", "Metodo per uso finale, misura sull'utenza dominante"],
                   ["Filiera, dichiarazione, autovalutazione", "Capofila o committente", "Natura del documento, evidenze pronte"]])),
        (5, "evidenza", dict(
            eyebrow="La parte commerciale",
            titolo="Gli organismi sono una fonte di clienti.",
            testo="Due o tre organismi accreditati, i loro auditor conosciuti, preventivi chiesti per il cliente: sceglie lui.")),
        (6, "definizione", dict(
            eyebrow="Come ti ricordano", titolo="Chi consegna progetti ordinati",
            definizione="Un auditor che trova un fascicolo completo ricorda chi l'ha preparato: il suo lavoro è passato da due giorni a uno.")),
        (7, "chiusura", dict(
            titolo="La presenza all'audit, nel pacchetto",
            punti=[P("Il cliente", "si sente protetto"), P("Tu impari", "che cosa guardano davvero gli auditor"),
                   P("I rilievi", "si chiudono col prodotto aperto, non con settimane di mail")])),
    ],
    "mantenimento": [
        (0, "apertura", dict(
            titolo="Il mantenimento", sottotitolo="Solo progetti: da zero ogni anno",
            testo="È la differenza fra chi resiste e chi si stanca dopo tre anni.",
            agenda=["Il mantenimento di ogni percorso", "I percorsi annuali", "Come si vende", "La modifica normativa",
                    "Il numero che conta"])),
        (1, "tabella", dict(
            titolo="Il mantenimento naturale",
            cols=["Percorsi", "Mantenimento"],
            righe=[["Segnalazioni", "Fascicoli, relazione, riesame, verifiche sul canale"],
                   ["Modello e anticorruzione", "Flussi, verifiche, catalogo, formazione, relazione"],
                   ["Sistemi di gestione, certificazione sociale", "Indicatori, audit, riesame, sorveglianza, scadenze"],
                   ["Emissioni, energetico, sostenibilità", "Un nuovo esercizio ogni anno"],
                   ["Filiera e dichiarazione", "Rinnovo delle valutazioni, partner nuovi"],
                   ["Autovalutazione", "Rivalutazione annuale, nuovi questionari"]])),
        (2, "evidenza", dict(
            eyebrow="I percorsi annuali",
            titolo="Il secondo anno costa metà, e vale quasi uguale.",
            testo="Il prodotto copia l'esercizio precedente: fattori aggiornati, confronto con l'anno base, un documento nuovo.")),
        (4, "punti", dict(
            titolo="Come si vende",
            intro="La prima regola decide tutto.",
            punti=[P("Nella proposta iniziale", "come opzione già prezzata"), P("Con un calendario scritto", "il cliente compra date"),
                   P("Col quadro condiviso", "che può guardare quando vuole"),
                   P("Coi ruoli continuativi", "dove ammessi: il canone diventa un incarico")])),
        (5, "definizione", dict(
            eyebrow="L'occasione che nessuno sfrutta", titolo="Ogni modifica normativa è una telefonata",
            definizione="A tutti i clienti dello stesso percorso, nello stesso giorno: sta dentro il canone, e ricorda a che cosa serve.")),
        (6, "confronto", dict(
            titolo="La modifica normativa",
            a={"h": "Riceve la telefonata", "sub": "Rinnova", "punti": ["Senza discutere"]},
            b={"h": "La scopre da solo", "sub": "Si chiede perché pagarti", "punti": ["E tu non l'hai chiamato"]})),
        (7, "numeri", dict(
            titolo="Il numero che conta",
            numeri=[{"n": "Un terzo", "h": "Dei ricavi dai canoni", "d": "Almeno, dopo due anni."},
                    {"n": "Costi fissi", "h": "Coperti dai canoni", "d": "In uno studio maturo: i progetti servono a crescere."}])),
    ],
    "organizzare-lo-studio": [
        (0, "apertura", dict(
            titolo="Organizzare lo studio", sottotitolo="Quattro cose da mettere in piedi subito",
            testo="Costano poco all'inizio e moltissimo dopo.",
            agenda=["I tempi standard", "L'agenda", "Il tetto dei lavori", "I nomi", "La delega", "La riservatezza"])),
        (1, "definizione", dict(
            eyebrow="La prima", titolo="I tempi standard",
            definizione="Le ore reali delle prime tre implementazioni di ogni percorso: il tuo listino, che nessun altro ti può dare.",
            punti=[P("Due minuti", "a fine giornata")])),
        (2, "evidenza", dict(
            eyebrow="La seconda: l'agenda",
            titolo="Mezza giornata a settimana per lo sviluppo commerciale.",
            testo="È la prima cosa che salta, e l'ultima da togliere: te ne accorgi quando il progetto finisce e il successivo non c'è.")),
        (3, "numeri", dict(
            titolo="La terza: il tetto",
            numeri=[{"n": "3", "h": "Progetti nelle fasi centrali", "d": "Per persona, contemporaneamente."},
                    {"n": "Oltre", "h": "Le date scivolano", "d": "Tre clienti in attesa sono già il massimo."}])),
        (4, "definizione", dict(
            eyebrow="La quarta", titolo="I nomi",
            definizione="Coerenti fra i percorsi dello stesso cliente: due schede della stessa azienda scritte diversamente non si uniranno mai.")),
        (5, "confronto", dict(
            titolo="La delega",
            a={"h": "Collaboratore alle prime armi", "sub": "Fa",
               "punti": ["Anagrafiche e raccolta dati", "Prime registrazioni", "Personalizzazione del corpus"]},
            b={"h": "Chi ha esperienza", "sub": "Decide",
               "punti": ["Applicabilità ed esclusioni", "Rischi accettabili", "Approvazioni e direzione"]})),
        (6, "evidenza", dict(
            eyebrow="Senza attenuazioni",
            titolo="Segnalazioni e modello trattano i dati più delicati del prodotto.",
            testo="Accessi limitati, nessun dato identificativo nei fascicoli, mai esportazioni su mail o chiavette.")),
        (7, "chiusura", dict(
            titolo="Contratto, polizza, indipendenza",
            punti=[P("Il contratto", "riservatezza e documenti al cliente"), P("Una polizza", "di responsabilità professionale adeguata"),
                   P("Mai consulenza e audit", "sullo stesso cliente")])),
    ],
    "crescere": [
        (0, "apertura", dict(
            titolo="Crescere", sottotitolo="Il secondo servizio al cliente che hai",
            testo="Costa circa un decimo di un cliente nuovo, e i percorsi si alimentano a vicenda.",
            agenda=["I collegamenti", "L'autovalutazione come porta", "Quando proporre", "I primi novanta giorni"])),
        (1, "tabella", dict(
            titolo="I collegamenti più forti",
            cols=["Dal percorso", "Al percorso", "Che cosa riusa"],
            righe=[["Segnalazioni", "Modello e anticorruzione", "Il canale e diversi registri"],
                   ["Modello organizzativo", "Due diligence di filiera", "La mappatura dei processi"],
                   ["Bilancio di sostenibilità", "Inventario ed energetico", "I numeri: il bilancio legge l'inventario"],
                   ["Autovalutazione", "Tutto il resto", "Il piano, con le priorità già ordinate"]])),
        (3, "evidenza", dict(
            eyebrow="Il collegamento più efficace",
            titolo="L'autovalutazione contiene l'elenco dei lavori che verranno dopo.",
            testo="Scritto non da te, ma dal metodo.")),
        (4, "confronto", dict(
            titolo="Quando proporre il secondo servizio",
            a={"h": "A metà progetto", "sub": "Sembra allungare la fattura", "punti": ["Danneggia il progetto in corso"]},
            b={"h": "Al riesame o alla chiusura", "sub": "Quadro verde, fiducia al massimo", "punti": ["Il momento giusto"]})),
        (5, "definizione", dict(
            eyebrow="Come prepararla", titolo="Annotare durante il progetto",
            definizione="Ogni bisogno di un altro percorso, con l'occasione in cui è emerso: alla chiusura riporti cose viste insieme.")),
        (6, "flusso", dict(
            titolo="I primi novanta giorni",
            passi=[P("Una porta d'ingresso", "scelta"), P("Il primo caso completo", "fino al documento pubblicato"),
                   P("Cinque intermediari", "con qualcosa da mostrare"), P("Dieci diagnosi", "dal vivo")])),
        (7, "chiusura", dict(
            titolo="Le diagnosi producono i clienti",
            punti=[P("Le prime proposte", "nascono da lì"), P("Si rimandano", "perché sembrano premature"),
                   P("Ogni diagnosi", "un'ora in cui una persona vede il problema, e chi lo risolve")])),
    ],
}

scrivi("avviare-attivita", SLIDE)
