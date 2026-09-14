# Slide della due diligence di filiera.
from _scrivi import P, scrivi

SLIDE = {
    "anagrafica-filiera": [
        (0, "apertura", dict(
            titolo="Anagrafica", sottotitolo="Cinque gruppi che risolvono il corpus",
            testo="Da qui si risolvono i segnaposto di tutti i documenti, e due campi pesano nei calcoli.",
            agenda=["Identificazione e spesa", "Governance del processo", "Il canale di reclamo",
                    "Comunicazione e campo di applicazione", "I segnaposto"])),
        (1, "evidenza", dict(
            eyebrow="La spesa di approvvigionamento complessiva",
            titolo="Chi ha mappato bene il 15% degli acquisti ha guardato il 15%.",
            testo="Confrontata con la spesa mappata, è la misura più onesta di quanto la due diligence copra davvero.")),
        (2, "definizione", dict(
            eyebrow="Governance del processo", titolo="Il responsabile della due diligence",
            definizione="Nominato con un atto, e con accesso ai dati di acquisto: il lavoro vive di partitari fornitori e contratti.",
            punti=[P("Accanto", "l'alta direzione ed eventualmente un comitato di filiera")])),
        (4, "confronto", dict(
            titolo="Il canale parla la lingua dei lavoratori",
            a={"h": "Solo in italiano", "sub": "Esiste sulla carta",
               "punti": ["Chi dovrebbe usarlo non può", "Un rilievo imbarazzante da ricevere"]},
            b={"h": "Nelle lingue dei siti", "sub": "Esiste nei fatti",
               "punti": ["È il presupposto dell'accessibilità", "Tradurre un modulo costa poco"]})),
        (5, "cards", dict(
            titolo="Gli ultimi due gruppi",
            cards=[P("Comunicazione", "Data e indirizzo dell'ultima dichiarazione pubblicata."),
                   P("Campo di applicazione", "Categorie merceologiche, livelli della filiera, aree geografiche.")])),
        (6, "split", dict(
            titolo="Due livelli dichiarati, e fatti bene",
            lead="«Tutta la filiera» quando si arriva ai fornitori diretti è una contraddizione che la dichiarazione annuale rende pubblica.",
            punti=[P("Due livelli", "una posizione difendibile e verificabile"),
                   P("L'intenzione di estendere", "scritta, non data per fatta")])),
        (7, "chiusura", dict(
            titolo="I segnaposto",
            punti=[P("Restano visibili", "fra parentesi quadre"), P("Ogni procedura", "dice quanti ne ha ancora aperti"),
                   P("Riscriverli a mano", "significa dimenticarne sempre uno")])),
    ],
    "filiera-e-partner": [
        (0, "apertura", dict(
            titolo="Filiera e partner", sottotitolo="La mappa è fatta di nodi",
            testo="Un nodo è un sito, non una ragione sociale: un partner con tre stabilimenti genera tre nodi.",
            agenda=["Perché il sito", "Quattro gruppi di dati", "La manodopera", "La leva",
                    "Lo stato del rapporto", "La prima mappa"])),
        (1, "confronto", dict(
            titolo="Per ragione sociale o per sito",
            a={"h": "Per ragione sociale", "sub": "Il rischio sparisce in una media",
               "punti": ["Lo stabilimento ad alto rischio non si vede"]},
            b={"h": "Per sito", "sub": "Mostra dove sta il problema",
               "punti": ["Il rischio paese diventa visibile", "Emergono i siti non dichiarati"]})),
        (2, "cards", dict(
            titolo="Quattro gruppi di dati per ogni nodo",
            cards=[P("Identificazione", "Livello, categoria, paese, sito, attività."),
                   P("Manodopera", "Addetti, stagionali, migranti, agenzie, subappalto."),
                   P("Rapporto commerciale", "Spesa, peso sul fatturato del partner, sostituibilità."),
                   P("Qualifica e contratto", "Codice di condotta, clausole, canale comunicato, stato.")])),
        (4, "evidenza", dict(
            eyebrow="Il gruppo che orienta il rischio",
            titolo="La manodopera non è anagrafica.",
            testo="Un sito con molti stagionali reclutati tramite agenzia ha un altro profilo, a parità di paese e di settore.")),
        (5, "definizione", dict(
            eyebrow="Il rapporto commerciale", titolo="La leva",
            definizione="Quanto l'organizzazione può ottenere chiedendo: il peso della sua spesa sul fatturato del partner, e la sostituibilità.",
            punti=[P("Da guardare", "prima di qualunque ipotesi di uscita")])),
        (7, "tabella", dict(
            titolo="Lo stato del rapporto",
            cols=["Stato", "Effetto nei calcoli"],
            righe=[["Cessato", "Esce da coperture e verifiche dovute"],
                   ["Sospeso", "Resta nei calcoli"],
                   ["In uscita graduale", "È un indicatore di esito: la leva è stata usata"]])),
        (8, "evidenza", dict(
            eyebrow="La trappola",
            titolo="Cessato al posto di sospeso: i numeri migliorano, la sostanza peggiora.",
            testo="Spariscono dalle statistiche proprio i nodi su cui si sta intervenendo, e nessun controllo automatico se ne accorge.")),
        (9, "flusso", dict(
            titolo="La prima mappa si fa dalla spesa",
            passi=[P("Ordina", "i fornitori per importo"), P("Prendi", "la quota che copre l'80% della spesa"),
                   P("Mappala per sito", "di solito 20-50 nodi, in due settimane")])),
    ],
    "motore-rischio-filiera": [
        (0, "apertura", dict(
            titolo="Il motore del rischio", sottotitolo="Tre passaggi",
            testo="Capirli distingue una mappa utile da una tabella colorata.",
            agenda=["Il rischio inerente", "I fattori aggravanti", "La maturità", "Le aree critiche", "Il residuo", "Da dove cominciare"])),
        (1, "definizione", dict(
            eyebrow="Primo passaggio", titolo="Il rischio inerente",
            definizione="La media delle {dimensioniFiliera} dimensioni valutate: paese, settore, prodotto o materia prima, modello di approvvigionamento.",
            punti=[P("Non giudica il partner", "descrive dove si trova")])),
        (2, "punti", dict(
            titolo="Cinque fattori aggravanti",
            intro="Ne basta uno: il nodo non scende sotto il livello alto.",
            numerati=False,
            punti=[P("Agenzie di reclutamento", "per lavoratori migranti"), P("Lavoro", "a domicilio"),
                   P("Sito non dichiarato", "emerso in verifica"), P("Segnalazione", "fondata"),
                   P("Provvedimento", "di un'autorità")])),
        (3, "evidenza", dict(
            eyebrow="La regola",
            titolo="Un aggravante non entra nella media: la scavalca.",
            testo="Altrimenti un sito non dichiarato emerso in verifica verrebbe annacquato da tre dimensioni basse.")),
        (4, "split", dict(
            titolo="Secondo passaggio: la maturità",
            lead="Misura che cosa fa il partner, su {areeFiliera} aree.",
            punti=[P("Governance", "e politiche"), P("Lavoro minorile", "area critica"),
                   P("Lavoro forzato", "e reclutamento, area critica"), P("Orario", "e retribuzioni"),
                   P("Libertà", "di associazione"), P("Salute e sicurezza", "area critica"),
                   P("Ambiente", "e legalità")])),
        (5, "definizione", dict(
            eyebrow="Il meccanismo più importante", titolo="Le aree critiche fanno da tetto",
            definizione="Un punteggio basso su una di esse limita la maturità complessiva, anche con tutte le altre ottime.",
            punti=[P("Una governance impeccabile", "non compensa una lacuna sul lavoro minorile")])),
        (6, "confronto", dict(
            titolo="Aree critiche mai valutate",
            a={"h": "Nel prototipo", "sub": "Tetto dal valore più alto",
               "punti": ["Una sola risposta di governance, maturità massima", "Il silenzio premiato come una buona risposta"]},
            b={"h": "Adesso", "sub": "Tetto dal valore più basso",
               "punti": ["Le verifiche vanno dove mancano informazioni"]})),
        (7, "numeri", dict(
            titolo="Terzo passaggio: il residuo",
            numeri=[{"n": "12 mesi", "h": "Residuo critico", "d": "Ogni quanto va verificato il partner."},
                    {"n": "48 mesi", "h": "Residuo basso", "d": "La cadenza più distesa."}])),
        (8, "cards", dict(
            titolo="Due conseguenze pratiche",
            cards=[P("Senza maturità", "Il nodo è trattato al livello più basso: residuo nel caso peggiore."),
                   P("Mai verificato", "Risulta sempre scaduto: senza verifiche non c'è un punto di partenza.")])),
        (9, "tabella", dict(
            titolo="Perché questa sequenza",
            cols=["Passaggio", "Che cosa fa"],
            righe=[["Inerente", "Descrive il contesto"], ["Maturità", "Descrive la risposta del partner"],
                   ["Residuo", "Li combina e decide le priorità"]])),
        (10, "flusso", dict(
            titolo="Il modo giusto di procedere",
            passi=[P("Inerente", "su tutti i nodi attivi: sono dati di contesto"),
                   P("Maturità", "dai nodi ad alto inerente, scendendo"),
                   P("Ogni maturità", "toglie un nodo dal caso peggiore")])),
    ],
    "registri-filiera": [
        (0, "apertura", dict(
            titolo="I registri", sottotitolo="{registriFiliera} registri, collegati a moduli e procedure",
            testo="Alimentano le percentuali del cruscotto.",
            agenda=["Impatti negativi", "Piani d'azione correttivi", "Verifiche e audit", "Segnalazioni e rimedi",
                    "Punti di opacità", "Richieste informative", "Obiettivi e azioni"])),
        (1, "definizione", dict(
            eyebrow="Il registro degli impatti", titolo="La gravità",
            definizione="Il massimo fra scala, portata e irrimediabilità. Il massimo, non la media.")),
        (2, "confronto", dict(
            titolo="Un danno irreversibile su poche persone",
            a={"h": "Mediato", "sub": "Diventa moderato", "punti": ["Finisce in fondo all'elenco"]},
            b={"h": "Col massimo", "sub": "Resta grave", "punti": ["Ed è quello che è"]})),
        (3, "evidenza", dict(
            eyebrow="La probabilità",
            titolo="Si compila solo per gli impatti potenziali.",
            testo="Un impatto già in atto non si attenua: in atto con probabilità bassa è una contraddizione.")),
        (4, "tabella", dict(
            titolo="La relazione con l'impatto decide che cosa fare",
            cols=["Relazione", "Risposta attesa"],
            righe=[["Causato", "Cessare la condotta e provvedere al rimedio"],
                   ["Contribuito", "Cessare la condotta e provvedere al rimedio"],
                   ["Direttamente collegato", "Usare la leva perché sia il partner a rimediare"]])),
        (5, "cards", dict(
            titolo="Confondere i casi: due errori opposti",
            cards=[P("Troppo", "Prendersi la responsabilità di rimedi che non spettano."),
                   P("Troppo poco", "Scrivere lettere quando si sarebbe dovuto intervenire.")])),
        (6, "definizione", dict(
            eyebrow="Il registro più originale", titolo="Punti di opacità",
            definizione="Tratti di filiera che non si riescono a ricostruire: un intermediario che non rivela i fornitori, una materia prima che si perde più su.",
            punti=[P("Registrarli", "dichiara i limiti della conoscenza"), P("Anno dopo anno", "si mostrano in riduzione")])),
        (7, "tabella", dict(
            titolo="Conta solo con la data",
            cols=["Registrazione", "Data che serve"],
            righe=[["Verifica eseguita", "Data di esecuzione"], ["Piano chiuso nei termini", "Scadenza e data di chiusura"],
                   ["Segnalazione", "Data di conferma"], ["Richiesta informativa", "Data di risposta"]])),
        (8, "evidenza", dict(
            eyebrow="In una verifica di seconda parte",
            titolo="La domanda non è se, è quando.",
            testo="Registrazioni senza date esistono nell'elenco e non muovono nulla: il cruscotto dice il vero.")),
    ],
    "indicatori-filiera": [
        (0, "apertura", dict(
            titolo="Gli indicatori", sottotitolo="Due famiglie",
            testo="La distinzione fra processo ed esito è la cosa più utile che il cruscotto insegna.",
            agenda=["Processo ed esito", "Quando il sistema è efficace", "Le segnalazioni", "Lo zero", "La copertura"])),
        (1, "confronto", dict(
            titolo="Processo ed esito",
            a={"h": "Processo", "sub": "Ciò che è stato fatto",
               "punti": ["Spesa coperta da partner qualificati", "Clausole a contratto", "Verifiche eseguite sul piano",
                         "Piani chiusi nei termini"]},
            b={"h": "Esito", "sub": "Ciò che è cambiato",
               "punti": ["Impatti gravi chiusi", "Rimedi erogati", "Canale comunicato ai lavoratori", "Opacità in riduzione"]})),
        (3, "evidenza", dict(
            eyebrow="Quando il sistema è efficace",
            titolo="Quando migliorano gli esiti.",
            testo="Processo al massimo ed esiti fermi: attività eseguite con precisione senza che cambi niente per nessuno. Da dentro somiglia al successo.")),
        (4, "definizione", dict(
            eyebrow="Da spiegare alla direzione prima", titolo="Più segnalazioni",
            definizione="Non è un peggioramento: si legge come un canale più accessibile e più creduto.")),
        (5, "split", dict(
            titolo="Zero segnalazioni, rischio inerente alto",
            lead="Non dice che non succede niente: dice che nessuno lo racconta.",
            punti=[P("Per leggere lo zero", "servono i dati che gli stanno accanto"),
                   P("Il canale", "comunicato a chi, in quali lingue, con quale verifica"),
                   P("Senza quei dati", "lo zero si legge nel modo peggiore")])),
        (7, "numeri", dict(
            titolo="La copertura si legge col denominatore",
            numeri=[{"n": "90%", "h": "Della spesa mappata", "d": "Coperta: suona benissimo."},
                    {"n": "20%", "h": "Spesa mappata sul totale", "d": "Il denominatore."},
                    {"n": "18%", "h": "La copertura vera", "d": "Per questo si dichiara la spesa complessiva."}])),
    ],
    "corpus-filiera": [
        (0, "apertura", dict(
            titolo="Il corpus documentale", sottotitolo="{procedureFiliera} procedure e {moduliFiliera} moduli",
            testo="Comune e versionato, personalizzabile blocco per blocco: l'aggiornamento arriva dove non hai scritto.",
            agenda=["Tre regole di personalizzazione", "Che cosa si dichiara", "Quello che si può sapere",
                    "Le criticità", "Che cosa non si divulga"])),
        (1, "cards", dict(
            titolo="Tre regole sulla personalizzazione",
            cards=[P("Solo ciò che differisce", "Soglie, funzioni, cadenze: un blocco riscritto identico si stacca dagli aggiornamenti."),
                   P("Segnaposto dall'anagrafica", "Il contatore dice quanti ne restano aperti."),
                   P("Congelato alla creazione", "Un documento approvato non cambia fra due approvazioni.")])),
        (5, "confronto", dict(
            titolo="La dichiarazione annuale",
            a={"h": "Non si dichiara", "sub": "Un fatto che non si può conoscere",
               "punti": ["«Nella filiera non c'è lavoro forzato»"]},
            b={"h": "Si dichiara", "sub": "Che cosa è stato verificato", "punti": ["Come, e con quali limiti"]})),
        (6, "numeri", dict(
            titolo="Quello che si può sapere",
            numeri=[{"n": "70%", "h": "Della spesa", "d": "Mappata."},
                    {"n": "40", "h": "Siti", "d": "Verificati."},
                    {"n": "3", "h": "Rilievi", "d": "Trovati, e come sono stati chiusi."}])),
        (7, "evidenza", dict(
            eyebrow="Le criticità si riportano",
            titolo="Tre rilievi trovati e chiusi valgono più di zero rilievi.",
            testo="Una dichiarazione senza rilievi non indica una filiera sana: indica una verifica inefficace.")),
        (8, "cards", dict(
            titolo="Due cose che non si divulgano mai",
            cards=[P("I nomi dei partner", "Salvo scelta deliberata di pubblicare la lista dei fornitori."),
                   P("Chi ha segnalato", "Nessun dato che possa esporlo: è un obbligo.")])),
    ],
    "errori-filiera": [
        (0, "apertura", dict(
            titolo="L'ordine, e gli errori", sottotitolo="Qui le fasi si condizionano",
            testo="L'ordine in cui si mette in piedi il sistema conta più che altrove.",
            agenda=["L'ordine", "Partner senza spesa", "Gli altri quattro errori", "Il senso del percorso"])),
        (1, "flusso", dict(
            titolo="L'ordine in cui si costruisce",
            passi=[P("Anagrafica", "governance, canale, perimetro"),
                   P("Prime procedure", "politica, codice di condotta, nomina"),
                   P("Mappa per sito", "con spesa e rischio inerente"),
                   P("Maturità", "dai nodi ad alto rischio, con impatti e piani"),
                   P("Verifiche e dichiarazione", "piano sul residuo, riesame, obiettivi")])),
        (3, "evidenza", dict(
            eyebrow="Il primo errore",
            titolo="Un nodo senza spesa annua non entra in nessuna percentuale.",
            testo="Il cruscotto sottostima sistematicamente. La spesa va messa su ogni nodo, anche stimata, dichiarando che è una stima.")),
        (4, "tabella", dict(
            titolo="Gli altri quattro",
            cols=["Errore", "Conseguenza"],
            righe=[["Nodo per ragione sociale", "Rischio paese e siti non dichiarati invisibili"],
                   ["Inerente senza maturità", "Verifiche annuali ovunque: un piano disatteso"],
                   ["Registrazioni senza date", "Lavoro non dimostrabile"],
                   ["Cessato al posto di sospeso", "Numeri migliori, nodi critici spariti"]])),
        (7, "chiusura", dict(
            titolo="Il senso del percorso",
            punti=[P("Non dimostra", "che la filiera è pulita"),
                   P("Dimostra", "che l'organizzazione la guarda, con metodo e limiti dichiarati"),
                   P("E che interviene", "quando trova qualcosa")])),
    ],
}

scrivi("filiera", SLIDE)
