# Slide della responsabilità sociale SA8000.
from _scrivi import P, scrivi

SLIDE = {
    "anagrafica-sa8000": [
        (0, "apertura", dict(
            titolo="Anagrafica", sottotitolo="Due gruppi decidono la visita",
            testo="Più di qualunque procedura scritta dopo.",
            agenda=["Rappresentanze sindacali", "Il gruppo per la prestazione sociale", "I canali di reclamo",
                    "Il contratto collettivo", "L'elezione dei rappresentanti"])),
        (1, "definizione", dict(
            eyebrow="Rappresentanze sindacali", titolo="«Nessuna», non un campo vuoto",
            definizione="È il presupposto dei criteri sulla libertà di associazione e sugli orari: vuoto, lascia due gruppi di criteri senza fondamento.")),
        (3, "confronto", dict(
            titolo="Il gruppo per la prestazione sociale",
            a={"h": "Soli dirigenti", "sub": "Il rilievo più tipico",
               "punti": ["Quasi sempre perché nessuno ha pensato all'elezione"]},
            b={"h": "Rappresentanza equilibrata", "sub": "Lavoratori e management",
               "punti": ["Rappresentanti eletti, non designati"]})),
        (4, "evidenza", dict(
            eyebrow="Non si corregge con una riga",
            titolo="La composizione si riscontra nel registro delle riunioni.",
            testo="Con l'atto di elezione e la prima seduta verbalizzata: senza, il rilievo è scritto prima di aprire un'altra pagina.")),
        (6, "split", dict(
            titolo="I canali di reclamo di esempio",
            lead="Le procedure arrivano con indirizzi e numeri di esempio: se restano, il canale consegnato ai lavoratori non esiste.",
            punti=[P("Chi prova a usarlo", "non riceve risposta"),
                   P("La procedura di reclamo", "funziona sulla carta, non nei fatti")])),
        (7, "flusso", dict(
            titolo="Canali reali, subito",
            passi=[P("In anagrafica", "casella e telefono reali"),
                   P("Ovunque servano", "procedure e moduli, senza ricopiarli"),
                   P("Attivati prima", "per avere uno storico in visita")])),
        (8, "definizione", dict(
            eyebrow="Il contratto collettivo applicato", titolo="Il metro di orari e retribuzioni",
            definizione="Condizioni almeno pari a legge e accordi applicabili. Dichiararne uno diverso da quello vero si scopre confrontando due buste paga.")),
        (9, "chiusura", dict(
            titolo="L'elezione dei rappresentanti",
            punti=[P("Non un adempimento", "e non va presentata così"),
                   P("Spiegare a che cosa serve il gruppo", "portare i problemi prima dei reclami"),
                   P("Senza indicazioni", "altrimenti il gruppo nasce svuotato")])),
    ],
    "criteri-sa8000": [
        (0, "apertura", dict(
            titolo="I criteri", sottotitolo="{criteriSa8000} criteri in {gruppiSa8000} gruppi",
            testo="Su {sezioniSa8000} sezioni: per ognuno lo stato di presidio, le procedure che lo governano, l'evidenza.",
            agenda=["Tre sezioni", "Parziale pesa zero", "Il non applicabile", "Criteri e procedure",
                    "Da dove cominciare", "I fondazionali"])),
        (1, "cards", dict(
            titolo="Tre sezioni, tre nature",
            cards=[P("Fondazionali", "I divieti assoluti: nessuna gradualità."),
                   P("Sistema di gestione", "La struttura che fa funzionare il resto."),
                   P("Prestazione", "Orari, retribuzioni, salute e sicurezza, non discriminazione.")])),
        (2, "definizione", dict(
            eyebrow="La formula", titolo="Conformità",
            definizione="Criteri presidiati ÷ (totale − non applicabili).",
            punti=[P("Il parziale", "pesa zero, non metà")])),
        (3, "confronto", dict(
            titolo="Il parziale",
            a={"h": "Negli altri percorsi", "sub": "Vale metà", "punti": ["Un mezzo risultato"]},
            b={"h": "Qui", "sub": "Pesa zero", "punti": ["In audit è una non conformità", "La percentuale che ritroverai in visita"]})),
        (5, "evidenza", dict(
            eyebrow="Il non applicabile",
            titolo="Nessun giovane lavoratore non rende inapplicabile il criterio.",
            testo="Il criterio non chiede se ce ne sono: chiede se un sistema, la verifica dell'età, impedisce che ce ne siano di non conformi.")),
        (7, "cards", dict(
            titolo="Collegare criteri e procedure",
            cards=[P("In testata", "Ogni procedura dice i criteri che governa: sai che cosa scopri se non la approvi."),
                   P("In visita", "Alla domanda su quale documento risponde, la risposta è immediata.")])),
        (8, "tabella", dict(
            titolo="In ordine inverso alla difficoltà percepita",
            cols=["Sezione", "Com'è davvero"],
            righe=[["Fondazionali", "Sembrano i più impegnativi, sono i più rapidi"],
                   ["Sistema di gestione", "Il più lento: richiede più documenti"],
                   ["Prestazione", "Richiede dati, con chi tiene presenze e paghe"]])),
        (9, "split", dict(
            titolo="L'evidenza migliore non è un documento",
            lead="È un registro con dentro dei casi, o un dato di sistema come le ore lavorate.",
            punti=[P("Libertà di associazione, citando la procedura", "debole"),
                   P("Citando verbali e reclami", "tutta un'altra cosa")])),
        (10, "chiusura", dict(
            titolo="I criteri fondazionali",
            punti=[P("Nessun piano graduale", "su lavoro minorile e forzato"),
                   P("Se emerge un problema", "la certificazione si ferma e si rimedia subito"),
                   P("Da dire all'inizio", "non in visita")])),
    ],
    "registri-sa8000": [
        (0, "apertura", dict(
            titolo="I registri", sottotitolo="{registriSa8000} registri",
            testo="Muovono l'avanzamento, lo scadenzario e gli indicatori.",
            agenda=["Quali sono", "Le riunioni del gruppo", "I giovani lavoratori", "Stati e date", "Tenerli vivi",
                    "Stakeholder e mancati incidenti"])),
        (1, "confronto", dict(
            titolo="Quali sono",
            a={"h": "Rischi e gestione", "sub": "Cinque registri",
               "punti": ["Impatti e rischi", "Obiettivi e piano d'azione", "Stakeholder e coinvolgimento", "Audit interni",
                         "Riunioni del gruppo"]},
            b={"h": "Casi e persone", "sub": "Cinque registri",
               "punti": ["Reclami interni", "Reclami esterni", "Azioni correttive e rimedi", "Giovani lavoratori",
                         "Incidenti e mancati incidenti"]})),
        (2, "evidenza", dict(
            eyebrow="Le riunioni del gruppo",
            titolo="Zero riunioni in un anno: il gruppo non esiste.",
            testo="Non basta la composizione perfetta: deve riunirsi, e le sedute devono essere verbalizzate.")),
        (3, "definizione", dict(
            eyebrow="Il registro che sorprende", titolo="Giovani lavoratori, anche quando non ce ne sono",
            definizione="Serve a dichiarare l'assenza, con il riferimento alla procedura di verifica dell'età.",
            punti=[P("Vuoto e senza dichiarazione", "si legge come un'area non presidiata")])),
        (4, "tabella", dict(
            titolo="Stati e date fanno i calcoli",
            cols=["Che cosa", "Da dove"],
            righe=[["Situazioni aperte", "Gli stati diversi da chiuso"],
                   ["Scadenzario", "Le scadenze delle registrazioni non chiuse"],
                   ["Indicatori", "Ricezione, conferma e chiusura dei reclami"]])),
        (6, "numeri", dict(
            titolo="Tenerli vivi",
            numeri=[{"n": "Quattro", "h": "Di continuo", "d": "Reclami interni, azioni correttive, incidenti, riunioni."},
                    {"n": "Sei", "h": "A eventi o periodici", "d": "Passati in rassegna alla riunione del gruppo."},
                    {"n": "Trimestrale", "h": "Una cadenza scritta", "d": "La riunione trascina gli altri registri."}])),
        (7, "split", dict(
            titolo="Stakeholder, non un elenco di enti",
            lead="Tre voci generiche un auditor le confronta con la realtà dell'azienda in trenta secondi.",
            punti=[P("Lavoratori", "e loro rappresentanze"), P("Agenzie", "che forniscono personale"),
                   P("Fornitori", "con lavoratori sui propri siti"), P("Comunità", "dove l'attività ha un impatto")])),
        (8, "chiusura", dict(
            titolo="I mancati incidenti",
            punti=[P("Senza danno", "nessuno ha interesse a nasconderli"), P("Dicono", "dove il danno sarebbe accaduto"),
                   P("Una condizione sola", "nessuno rimproverato per averne segnalato uno")])),
    ],
    "rischi-reclami-rimedio": [
        (0, "apertura", dict(
            titolo="Rischi, reclami, rimedio", sottotitolo="Tre regole che distinguono questo sistema",
            testo="Da un sistema di gestione qualunque.",
            agenda=["L'ambito del rischio", "La relazione con l'impatto", "I reclami interni", "Il riscontro",
                    "Le tre parti di un'azione", "Il rimedio"])),
        (1, "definizione", dict(
            eyebrow="Prima regola: il rischio", titolo="L'ambito",
            definizione="Gravità × probabilità, ma conta di più l'ambito: operazioni proprie, partner diretto, partner indiretto.",
            punti=[P("Così", "la catena di fornitura entra nel registro dei rischi")])),
        (2, "evidenza", dict(
            eyebrow="Senza quella colonna",
            titolo="I problemi stanno quasi sempre due livelli più in là.",
            testo="Il registro parlerebbe solo di ciò che succede dentro i cancelli, la parte che meno preoccupa questo standard.")),
        (3, "tabella", dict(
            titolo="La relazione con l'impatto",
            cols=["Relazione", "Risposta attesa"],
            righe=[["Causato", "Cessare la condotta e rimediare"], ["Contribuito", "Cessare la condotta e rimediare"],
                   ["Direttamente collegato", "Usare la leva sul partner"]])),
        (4, "flusso", dict(
            titolo="Seconda regola: i reclami interni",
            passi=[P("Conferma", "di ricezione entro pochi giorni"), P("Chiusura", "più stretta per le gravità alte"),
                   P("Riscontro", "a chi ha segnalato")])),
        (5, "evidenza", dict(
            eyebrow="Il passaggio che salta",
            titolo="Senza riscontro ha funzionato per l'azienda, non per la persona.",
            testo="Il lavoratore non sa che il problema è risolto, e la volta dopo non segnalerà.")),
        (6, "cards", dict(
            titolo="Terza regola: tre parti di un'azione correttiva",
            cards=[P("Correzione", "Immediata."), P("Azione sulle cause", "Perché non si ripeta."),
                   P("Rimedio", "A chi ha subito l'impatto.")])),
        (7, "numeri", dict(
            titolo="Il rimedio è una parte separata",
            numeri=[{"n": "30 ore", "h": "Di straordinario non retribuito", "d": "Correggere la rilevazione presenze non le restituisce."},
                    {"n": "Il rimedio", "h": "Restituirle", "d": "La parte che riguarda la persona."}])),
        (8, "split", dict(
            titolo="Chiudere un'azione",
            lead="Con la verifica di efficacia, non con la dichiarazione di aver fatto.",
            punti=[P("Reclamo fondato o incidente", "genera un'azione correttiva"),
                   P("Il riferimento", "si scrive nel registro di origine"),
                   P("Mesi dopo", "si segue la catena dal fatto al rimedio")])),
        (9, "confronto", dict(
            titolo="Reclami interni ed esterni",
            a={"h": "Interni", "sub": "Da chi lavora nell'organizzazione", "punti": ["Quanto il canale funziona dentro"]},
            b={"h": "Esterni", "sub": "Fornitori, comunità, sindacati, ONG",
               "punti": ["Tempi e controllo diversi", "Quanto il canale è conosciuto fuori"]})),
        (10, "chiusura", dict(
            titolo="Come si scrive un rimedio",
            punti=[P("Proporzionato", "al danno, e accettato da chi l'ha subito"),
                   P("Economico o organizzativo", "denaro, oppure un cambiamento verificabile"),
                   P("Una discriminazione", "si rimuovono gli effetti: non basta una scusa"),
                   P("Si registra", "che cosa è offerto, che cosa è accettato, e quando")])),
    ],
    "manuale-sa8000": [
        (0, "apertura", dict(
            titolo="Il corpus e il Manuale", sottotitolo="{procedureSa8000} procedure e {moduliSa8000} moduli",
            testo="Ogni procedura riporta in testata i criteri che governa: un criterio scoperto indica il documento da approvare.",
            agenda=["L'ordine di approvazione", "Il Manuale", "Da compilare, non nascosto", "Gli indicatori", "Il riesame",
                    "Piano e audit interno"])),
        (1, "flusso", dict(
            titolo="L'ordine di approvazione",
            passi=[P("Politica e gruppo", "l'organo che fa vivere il sistema"), P("Rischi", "e obiettivi"),
                   P("Reclami e rimedio", "il meccanismo più fidato"), P("Prestazione", "dai criteri a rischio più alto"),
                   P("Audit e riesame", "per ultimi")])),
        (2, "evidenza", dict(
            eyebrow="L'inversione che costa doppio",
            titolo="Prestazione prima dei rischi: presidi per problemi mai descritti.",
            testo="È la stessa inversione che fa rifare il lavoro in tutti gli altri percorsi.")),
        (3, "definizione", dict(
            eyebrow="Il fascicolo per la visita", titolo="Il Manuale si compone da solo",
            definizione="Da anagrafica e stato del corpus: organizzazione, campo con i siti, ruoli, struttura documentale, piano di implementazione.")),
        (4, "evidenza", dict(
            eyebrow="Una scelta da sfruttare",
            titolo="I dati mancanti compaiono come da compilare.",
            testo="Aprilo presto: dice che cosa manca meglio di un contatore, nel contesto in cui il dato servirà.")),
        (5, "cards", dict(
            titolo="Che cosa dicono gli indicatori al riesame",
            cards=[P("Reclami e tempi", "Se il meccanismo è accessibile e creduto."),
                   P("Azioni e rimedi", "Se il sistema corregge, o registra soltanto."),
                   P("Rischi e obiettivi", "Se il piano è ancorato alla realtà.")])),
        (6, "confronto", dict(
            titolo="Il riesame",
            a={"h": "Solo numeri in crescita", "sub": "Non serve a niente", "punti": ["Si riconosce subito"]},
            b={"h": "La traccia di una discussione", "sub": "Quello che l'auditor cerca",
               "punti": ["Che cosa non ha funzionato", "Che cosa si cambia, chi, entro quando"]})),
        (7, "definizione", dict(
            eyebrow="Il piano di implementazione", titolo="Scoperti e pianificati è una posizione",
            definizione="Con date e responsabili permette una prima visita con criteri ancora scoperti. Senza date, nessuno ha deciso di farlo.")),
        (8, "chiusura", dict(
            titolo="L'audit interno",
            punti=[P("Non chi è responsabile", "dell'area auditata"), P("In un'azienda piccola", "un vincolo reale"),
                   P("Da risolvere prima", "formazione incrociata o supporto esterno")])),
    ],
    "errori-sa8000": [
        (0, "apertura", dict(
            titolo="L'ordine, e gli errori", sottotitolo="Verso la visita di certificazione",
            testo="Cinque errori fanno andare male la visita, e i primi due sono di gran lunga i più frequenti.",
            agenda=["L'ordine", "Gruppo e canali", "Gli altri tre", "Persone, non documenti", "I tempi"])),
        (1, "flusso", dict(
            titolo="L'ordine",
            passi=[P("Anagrafica", "gruppo e canali reali"), P("Elezione e politica", "prima riunione registrata"),
                   P("Rischi", "per criterio e ambito, stakeholder censiti"),
                   P("Procedure e mappa", "reclamo, rimedio, prestazione"), P("Audit e riesame", "poi il Manuale")])),
        (3, "confronto", dict(
            titolo="I due più frequenti",
            a={"h": "Gruppo di soli dirigenti", "sub": "O senza riunioni registrate",
               "punti": ["Si evita con l'elezione", "E con le sedute verbalizzate"]},
            b={"h": "Canali di esempio", "sub": "Lasciati nelle procedure", "punti": ["La procedura più importante, inapplicabile"]})),
        (5, "tabella", dict(
            titolo="Gli altri tre",
            cols=["Errore", "Effetto"],
            righe=[["Non applicabile per evitare uno scoperto", "Mappa svuotata"],
                   ["Registrazioni senza stato o date", "Nessun avanzamento, scadenzario o indicatore"],
                   ["Azione chiusa senza rimedio", "Il punto su cui lo standard non transige"]])),
        (6, "evidenza", dict(
            eyebrow="Una riflessione",
            titolo="Qui il sistema riguarda le condizioni di lavoro delle persone.",
            testo="Le evidenze migliori sono i reclami, i verbali con i rappresentanti eletti, i rimedi erogati.")),
        (7, "confronto", dict(
            titolo="Due modi di arrivare alla visita",
            a={"h": "Prima i documenti", "sub": "Procedure impeccabili", "punti": ["E quattro registri vuoti", "Non passa"]},
            b={"h": "Prima gruppo e canali", "sub": "Sei mesi di funzionamento", "punti": ["Meno carta, più sostanza"]})),
        (8, "numeri", dict(
            titolo="I tempi",
            numeri=[{"n": "6 mesi", "h": "Di funzionamento vero", "d": "Fra l'avvio e la visita."},
                    {"n": "3 settimane", "h": "Per le procedure", "d": "In qualunque momento."}])),
        (10, "chiusura", dict(
            titolo="Una dichiarazione sulle condizioni di lavoro",
            punti=[P("Verificata", "anche parlando con i lavoratori, senza la direzione"),
                   P("Sistema descritto e vissuto", "l'auditor vede se coincidono"),
                   P("Nessun documento", "copre quella distanza")])),
    ],
}

scrivi("sa8000", SLIDE)
