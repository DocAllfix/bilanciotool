# Slide del sistema di gestione integrato qualità, ambiente, sicurezza.
from _scrivi import P, scrivi

SLIDE = {
    "anagrafica-qas": [
        (0, "apertura", dict(
            titolo="Anagrafica", sottotitolo="Due decisioni che pesano su tutto",
            testo="Quanti requisiti dovrai gestire, e se gli indici del cruscotto avranno un numero o resteranno vuoti.",
            agenda=["Le norme applicate", "I ruoli", "Esclusioni ammesse e no", "Le ore lavorate", "L'ordine",
                    "Il campo di applicazione"])),
        (1, "definizione", dict(
            eyebrow="Un elenco, non una scelta unica", titolo="Le norme applicate",
            definizione="Una, due o tutte e {normeQas}: dalla combinazione dipende quali dei {requisitiQas} requisiti entrano nella mappa.",
            punti=[P("Certificato solo sulla qualità", "non si vede contare addosso ambiente e sicurezza")])),
        (2, "split", dict(
            titolo="I ruoli, con nomi veri",
            lead="Sono le persone a cui il sistema attribuirà le azioni: un ruolo vuoto è un'azione senza destinatario.",
            punti=[P("Direzione", "dell'organizzazione"), P("Responsabile", "del sistema"),
                   P("Responsabile", "della prevenzione"), P("Medico", "competente")])),
        (3, "confronto", dict(
            titolo="Le esclusioni",
            a={"h": "Ammessa", "sub": "Un requisito di qualità che non si applica",
               "punti": ["La progettazione, per chi produce su specifica del cliente"]},
            b={"h": "Mai ammessa", "sub": "Ambiente e sicurezza",
               "punti": ["Attività con impatti ambientali significativi", "Luoghi di lavoro"]})),
        (4, "evidenza", dict(
            eyebrow="Il campo che vale più di tutti",
            titolo="Senza ore lavorate, gli indici di sicurezza restano vuoti.",
            testo="Frequenza e gravità non escono sbagliati: non escono. Vuoti nel cruscotto e nel riesame, dove qualcuno andrà a cercarli.")),
        (5, "definizione", dict(
            eyebrow="Un errore silenzioso", titolo="Ore lavorate aggiornate a ogni periodo",
            definizione="Compilate a gennaio e dimenticate, a dicembre gli indici si calcolano su un monte ore vecchio di un anno.")),
        (6, "flusso", dict(
            titolo="La sequenza che funziona",
            passi=[P("Le norme", "determinano il perimetro"),
                   P("Campo ed esclusioni", "da concordare con la direzione"),
                   P("Ruoli e ore lavorate", "raccolta, delegabile a chi ha i dati")])),
        (7, "chiusura", dict(
            titolo="Da portare via",
            punti=[P("Il campo di applicazione", "coincide con quello dei certificati"),
                   P("Le esclusioni", "mai su ambiente e sicurezza"), P("Le ore lavorate", "a ogni periodo")])),
    ],
    "indicatori-qas": [
        (0, "apertura", dict(
            titolo="Gli indicatori", sottotitolo="Quelli che i clienti guardano di più",
            testo="E che si costruiscono peggio: vale la pena capire perché prima di compilarne uno.",
            agenda=["Che cosa porta un indicatore", "Il verso del miglioramento", "I target vuoti",
                    "Reattivi e proattivi", "Cambiare la formula", "La frequenza"])),
        (1, "split", dict(
            titolo="Che cosa porta un indicatore",
            lead="Il set di partenza ne propone {indicatoriQas}, già con formula e riferimenti. I target no: un target ereditato non è un obiettivo.",
            punti=[P("Definizione", "e formula"), P("Fonte", "e frequenza di rilevazione"), P("Valore iniziale", "il punto di partenza"),
                   P("Target", "con il suo verso"), P("Soglia", "di attenzione")])),
        (2, "confronto", dict(
            titolo="Il verso del miglioramento",
            a={"h": "Deve calare", "sub": "Reclami, infortuni, consumi", "punti": ["Soglia di attenzione sopra il target"]},
            b={"h": "Deve salire", "sub": "Soddisfazione, formazione", "punti": ["Soglia di attenzione sotto il target"]})),
        (3, "evidenza", dict(
            eyebrow="Un altro modo in cui un cruscotto mente",
            titolo="Un indicatore senza target non è a target: è non rilevato.",
            testo="Nel prototipo un target vuoto valeva zero, e l'indicatore risultava conforme. Su ogni casella vuota: che si veda che manca.")),
        (4, "cards", dict(
            titolo="Reattivi e proattivi",
            cards=[P("Reattivi", "Infortuni, reclami, non conformità: ciò che è già accaduto."),
                   P("Proattivi", "Sopralluoghi, mancati infortuni, formazione: almeno uno per ambito.")])),
        (5, "definizione", dict(
            eyebrow="Con il cliente", titolo="Rendicontare o governare",
            definizione="I reattivi servono a rendicontare, i proattivi a governare: con i secondi si decide qualcosa lunedì mattina.")),
        (6, "evidenza", dict(
            eyebrow="Cambiare il criterio di calcolo",
            titolo="Si annota, e la serie si ricostruisce o si interrompe.",
            testo="Un grafico che prosegue attraverso un cambio di formula confronta due cose diverse, e non lo dice.")),
        (7, "chiusura", dict(
            titolo="La frequenza di rilevazione",
            punti=[P("Mensile compilato quando capita", "una serie con i buchi"),
                   P("Una serie con i buchi", "non mostra una tendenza"), P("Meglio trimestrale", "e rispettato")])),
    ],
    "registri-qas": [
        (0, "apertura", dict(
            titolo="I registri", sottotitolo="{registriQas} fonti di calcolo, non archivi",
            testo="Cruscotto, riesame e stampe prendono i numeri da qui: un registro incompleto è un calcolo che non si fa.",
            agenda=["Quattro gruppi", "Date e stati", "Da dove cominciare", "Le autorizzazioni",
                    "Che cosa chiede chi controlla", "La gestione delle modifiche"])),
        (1, "cards", dict(
            titolo="Quattro gruppi",
            cards=[P("Contesto e persone", "Processi, parti interessate, consultazione dei lavoratori."),
                   P("Ambiente e sicurezza", "Aspetti, pericoli, obblighi, autorizzazioni."),
                   P("Gestione", "Obiettivi, modifiche, formazione, fornitori, emergenze."),
                   P("Controllo", "Reclami, audit, non conformità, infortuni.")])),
        (2, "tabella", dict(
            titolo="Sono le date e gli stati a fare i calcoli",
            cols=["Registrazione", "Conta solo se"],
            righe=[["Audit eseguito", "Ha la data"],
                   ["Non conformità chiusa nei termini", "Ha termine e data di chiusura"],
                   ["Infortunio negli indici", "È classificato infortunio e ha i giorni di assenza"]])),
        (3, "evidenza", dict(
            eyebrow="Sembra una durezza del prodotto",
            titolo="È quello che succederebbe in audit.",
            testo="Un audit senza data non viene contato come eseguito: il sistema te lo dice prima del verificatore.")),
        (4, "split", dict(
            titolo="Non aprire tutti i registri insieme",
            lead="Comincia da quelli che alimentano gli indicatori scelti; gli altri quando succede la cosa.",
            punti=[P("Un indicatore sui reclami", "apri reclami e soddisfazione"),
                   P("Uno sulla formazione", "apri formazione"),
                   P("Tutti aperti a gennaio", "tutti a metà, e non servono")])),
        (5, "numeri", dict(
            titolo="Le autorizzazioni: l'anticipo va generoso",
            numeri=[{"n": "60 giorni", "h": "Su un rinnovo che ne chiede trenta", "d": "Non costano niente."},
                    {"n": "30 giorni", "h": "Su un rinnovo che ne chiede novanta", "d": "Costano una sospensione dell'attività."}])),
        (6, "cards", dict(
            titolo="Tre richieste di chi controlla",
            cards=[P("L'ultimo audit interno", "E il suo rapporto."),
                   P("Una non conformità dell'anno scorso", "E come è stata chiusa."),
                   P("Le autorizzazioni", "In scadenza nei prossimi sei mesi.")])),
        (7, "definizione", dict(
            eyebrow="Il registro più trascurato", titolo="La gestione delle modifiche",
            definizione="Nessun evento lo attiva da fuori: un macchinario cambiato lo scrive solo chi ha preso l'abitudine di farlo.")),
    ],
    "motori-qas": [
        (0, "apertura", dict(
            titolo="I due motori di valutazione", sottotitolo="Ambiente e sicurezza, due domande diverse",
            testo="Il cuore tecnico del sistema, e funzionano in modo diverso.",
            agenda=["La significatività", "I criteri assoluti", "Le condizioni operative", "Il livello di rischio",
                    "La gerarchia dei controlli", "Il rischio residuo"])),
        (1, "definizione", dict(
            eyebrow="Motore ambientale", titolo="La significatività",
            definizione="Gravità × frequenza × sensibilità del contesto: un prodotto, quindi un fattore basso abbassa tutto.")),
        (2, "punti", dict(
            titolo="I criteri assoluti",
            intro="Ciascuno rende l'aspetto significativo da solo, qualunque cosa dica il punteggio.",
            numerati=False,
            punti=[P("Prescrizione legale", "non pienamente presidiata"), P("Esposto o reclamo", "ricevuto"),
                   P("Limiti", "superati"), P("Emergenza", "in condizione grave")])),
        (3, "evidenza", dict(
            eyebrow="Normale, anomala, emergenza",
            titolo="I problemi ambientali non capitano nei giorni in cui tutto funziona.",
            testo="Lo scarico nei limiti a regime può uscirne durante un avviamento: se l'avviamento non è valutato, non compare da nessuna parte.")),
        (4, "definizione", dict(
            eyebrow="Motore della sicurezza", titolo="Il livello di rischio",
            definizione="Probabilità × gravità. La formula è semplice: il punto interessante viene dopo.")),
        (5, "flusso", dict(
            titolo="La gerarchia dei controlli",
            passi=[P("Eliminazione", "del pericolo"), P("Sostituzione", "con qualcosa di meno pericoloso"),
                   P("Controlli tecnici", "sull'impianto"), P("Controlli amministrativi", "procedure e organizzazione"),
                   P("Protezione individuale", "l'ultima difesa")])),
        (6, "confronto", dict(
            titolo="Il casco e il carico sospeso",
            a={"h": "Il casco", "sub": "Protegge chi lo indossa", "punti": ["Il problema spostato sulla persona"]},
            b={"h": "Togliere il carico sospeso", "sub": "Protegge chiunque passi", "punti": ["Anche chi ha dimenticato il casco"]})),
        (7, "evidenza", dict(
            eyebrow="Il rischio residuo",
            titolo="Si dichiara dopo le misure, non prima.",
            testo="Compilato prima è una previsione: descrive un'azienda che non esiste ancora.")),
        (8, "chiusura", dict(
            titolo="La rivalutazione",
            punti=[P("Una valutazione", "è vera quando è stata fatta"),
                   P("Una linea nuova, un reparto spostato", "la invecchiano"),
                   P("Senza un'occasione fissata", "resta agli atti come se fosse attuale")])),
    ],
    "conformita-qas": [
        (0, "apertura", dict(
            titolo="La mappa di conformità", sottotitolo="{requisitiQas} domande su {capiQas} capitoli",
            testo="Ogni domanda con il punto della norma, la marcatura delle norme che lo richiedono, la procedura, lo stato e l'evidenza.",
            agenda=["La marcatura", "Il filtro per norma", "Non valutato pesa zero", "Il non applicabile",
                    "Le evidenze", "Da dove cominciare"])),
        (1, "confronto", dict(
            titolo="La marcatura",
            a={"h": "Punti comuni", "sub": "Richiesti da tutte e tre",
               "punti": ["Contesto", "Parti interessate", "Competenza", "Audit interno"]},
            b={"h": "Punti propri", "sub": "Di una norma sola", "punti": ["Si vedono solo nel suo filtro"]})),
        (2, "evidenza", dict(
            eyebrow="Il filtro per norma",
            titolo="Ognuno vede il proprio perimetro.",
            testo="Chi applica solo la qualità non si trova la conformità abbassata da domande ambientali che non lo riguardano.")),
        (3, "definizione", dict(
            eyebrow="La regola comune", titolo="Non valutato pesa zero",
            definizione="Mediare sui soli valutati farebbe salire la conformità saltando i requisiti difficili.")),
        (4, "split", dict(
            titolo="Non applicabile, con parsimonia",
            lead="Corretto per le norme che l'azienda non applica e per le esclusioni dichiarate in anagrafica.",
            punti=[P("Per evitare una non conformità", "svuota la mappa"), P("La prima domanda dell'auditor", "è sempre perché")])),
        (6, "cards", dict(
            titolo="Quale evidenza",
            cards=[P("Una procedura", "Descrive l'intenzione: si legge in un minuto e non prova niente."),
                   P("Un registro", "Dimostra l'esecuzione: si apre e mostra le righe.")])),
        (7, "numeri", dict(
            titolo="Una norma alla volta",
            numeri=[{"n": "Tre al 70%", "h": "In ordine di capitolo", "d": "Il giorno della visita."},
                    {"n": "Una al 100%", "h": "Partendo dal suo filtro", "d": "La prima norma da certificare."}])),
    ],
    "documenti-qas": [
        (0, "apertura", dict(
            titolo="I documenti", sottotitolo="{procedureQas} procedure e {moduliQas} moduli",
            testo="Ogni procedura riporta i punti delle norme che copre: si sa sempre che cosa resta scoperto.",
            agenda=["Procedure di un solo ambito", "Tre documenti", "Il riesame", "La colonna delle valutazioni",
                    "Compilarlo in riunione"])),
        (1, "definizione", dict(
            eyebrow="Procedure di un solo ambito", titolo="Non applicabili, non personalizzate",
            definizione="Chi non applica quella norma le dichiara non applicabili: una procedura per un sistema che non esiste confonde chi la troverà.")),
        (3, "cards", dict(
            titolo="Tre documenti",
            cards=[P("Riesame di direzione", "Ingressi precompilati con i dati veri, valutazioni alla direzione."),
                   P("Analisi ambientale", "Aspetti, impatti, criteri, significatività."),
                   P("Valutazione dei rischi", "Pericoli, gerarchia dei controlli, rischio residuo.")])),
        (4, "evidenza", dict(
            eyebrow="Chiesti per primi da un auditor",
            titolo="Analisi ambientale e valutazione dei rischi.",
            testo="Prima ancora del manuale: da lì si capisce se il sistema è stato costruito su quell'azienda, o comprato.")),
        (6, "confronto", dict(
            titolo="Un riesame che elenca i dati non è un riesame",
            a={"h": "Una raccolta di indicatori", "sub": "Non soddisfa il punto", "punti": ["Un rilievo ogni volta"]},
            b={"h": "Valutazioni e decisioni", "sub": "Quello che la norma chiede",
               "punti": ["Le risorse", "Gli obiettivi confermati o cambiati", "Le modifiche al sistema"]})),
        (7, "definizione", dict(
            eyebrow="Una scelta del prodotto", titolo="La colonna delle valutazioni resta vuota",
            definizione="Invece di una frase di comodo: è una domanda posta alla direzione, e se resta vuota lo dice il documento.")),
        (8, "chiusura", dict(
            titolo="Compilare il riesame in riunione",
            punti=[P("Gli ingressi", "già compilati"), P("Le valutazioni", "scritte mentre si discute"),
                   P("Compilato insieme", "è una decisione, non un documento firmato")])),
    ],
    "errori-qas": [
        (0, "apertura", dict(
            titolo="L'ordine, e gli errori", sottotitolo="Sette errori, nessun avviso",
            testo="L'ordine conta perché i due motori dipendono da quello che c'è prima.",
            agenda=["L'ordine", "Nessun avviso", "Quattro errori sugli indicatori", "Motori e riesame",
                    "Il valore del sistema integrato"])),
        (1, "flusso", dict(
            titolo="L'ordine in cui si costruisce",
            passi=[P("Anagrafica", "ruoli, norme, campo, ore lavorate"),
                   P("Registri di contesto", "processi, parti, obblighi, autorizzazioni"),
                   P("I due motori", "con gli obiettivi collegati"),
                   P("Indicatori e procedure", "target rivisti, prime rilevazioni"),
                   P("Mappa, audit, riesame", "sulle norme applicate")])),
        (2, "evidenza", dict(
            eyebrow="Che cosa li accomuna",
            titolo="Nessuno dei sette produce un avviso.",
            testo="Il cruscotto continua a calcolare, e mente.")),
        (3, "tabella", dict(
            titolo="Quattro errori sugli indicatori",
            cols=["Errore", "Effetto"],
            righe=[["Ore lavorate non inserite", "Indici infortunistici vuoti"],
                   ["Verso di miglioramento sbagliato", "Verde mentre si peggiora"],
                   ["Solo indicatori reattivi", "Si registra quando è tardi"],
                   ["Formula cambiata senza annotarla", "Una serie che confronta cose diverse"]])),
        (7, "cards", dict(
            titolo="Gli ultimi tre",
            cards=[P("Aspetti senza criteri assoluti", "Prescrizioni violate classificate non significative."),
                   P("Gerarchia ferma ai dispositivi", "Senza motivazione: il rilievo tipico sulla sicurezza."),
                   P("Riesame senza valutazioni", "Non soddisfa il punto della norma.")])),
        (8, "chiusura", dict(
            titolo="Tre sistemi tenuti insieme",
            punti=[P("Tre manuali, tre audit, tre riesami", "costano il triplo del necessario"),
                   P("I punti comuni", "sono la maggioranza, e si compilano una volta"),
                   P("Mostrarlo al primo incontro", "vende il percorso")])),
    ],
}

scrivi("sgiqas", SLIDE)
