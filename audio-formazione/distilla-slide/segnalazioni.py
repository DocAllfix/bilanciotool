# Slide della gestione delle segnalazioni (whistleblowing).
from _scrivi import P, scrivi

SLIDE = {
    "assetto-canale": [
        (0, "apertura", dict(
            titolo="L'assetto del canale", sottotitolo="Questo percorso non è il canale di ricezione",
            testo="È lo strumento con cui il gestore tratta le segnalazioni ricevute altrove.",
            agenda=["Ricezione e trattazione", "Il titolo dell'obbligo", "Le tre forme del canale",
                    "I campi chiesti per primi", "Gestore e sostituto", "La consultazione sindacale"])),
        (1, "split", dict(
            titolo="Ricezione altrove, trattazione qui",
            lead="La ricezione va su una piattaforma dedicata, con la riservatezza assicurata dalla crittografia.",
            punti=[P("Qui dentro", "nessun dato identificativo"),
                   P("Il legame fra codice e persona", "resta al gestore, fuori dall'applicazione")])),
        (2, "evidenza", dict(
            eyebrow="Non è una limitazione tecnica",
            titolo="È la natura giuridica dello strumento.",
            testo="Ricevere qui vorrebbe dire garantire la riservatezza con una regola organizzativa invece che con una misura tecnica: la legge non lo consente.")),
        (3, "definizione", dict(
            eyebrow="Il titolo dell'obbligo", titolo="Basta aver adottato il Modello 231",
            definizione="L'obbligo sorge anche solo per questo, indipendentemente dalla dimensione.",
            punti=[P("La condivisione del canale", "ammessa entro certe soglie, e formalizzata")])),
        (4, "punti", dict(
            titolo="Il soggetto gestore",
            punti=[P("Configurazione", "e gestore"), P("Sostituto", "e data di nomina"),
                   P("Organo di indirizzo", "e organo di controllo"), P("Responsabile", "della protezione dei dati")])),
        (5, "confronto", dict(
            titolo="Tre forme cumulative: scritta, orale, incontro",
            a={"h": "Nel prototipo", "sub": "Tre campi liberi", "punti": ["La sola casella di posta risultava a posto"]},
            b={"h": "Adesso", "sub": "Una riga per forma",
               "punti": ["Ciascuna con il suo stato", "Distingue non istituita da prevista e spenta"]})),
        (7, "cards", dict(
            titolo="I tre campi chiesti per primi",
            cards=[P("Consultazione sindacale", "Precede l'attivazione: l'omissione è contestabile."),
                   P("Crittografia del canale", "Riservatezza con misure tecniche, non con regole."),
                   P("Gestore e sostituto", "Senza sostituto il gestore non può astenersi.")])),
        (8, "tabella", dict(
            titolo="Chi fa il gestore",
            cols=["Opzione", "Punto di forza", "Limite"],
            righe=[["Persona o ufficio interno", "Conosce l'organizzazione", "Il segnalante se ne fida di meno"],
                   ["Soggetto esterno", "Più credibile", "Più lento, serve un referente interno"]])),
        (9, "evidenza", dict(
            eyebrow="Il sostituto",
            titolo="Senza sostituto, un fascicolo non si tratta, o lo tratta chi non dovrebbe.",
            testo="Serve quando la segnalazione riguarda il gestore, un suo superiore, un familiare, o un'area in cui ha un interesse.")),
        (10, "chiusura", dict(
            titolo="La consultazione sindacale",
            punti=[P("Precede", "l'attivazione del canale"), P("Si documenta", "verbale, data, soggetti coinvolti"),
                   P("Fatta dopo", "il canale resta valido ma contestabile, nel momento peggiore")])),
    ],
    "fascicolo": [
        (0, "apertura", dict(
            titolo="Il fascicolo", sottotitolo="Cinque schede, cinque momenti",
            testo="Ciascuna scheda corrisponde a un momento della trattazione.",
            agenda=["Le schede", "Mai nominativi", "Come si perde la riservatezza", "L'accesso tracciato",
                    "Il contatore", "Il codice del segnalante"])),
        (1, "flusso", dict(
            titolo="Le cinque schede",
            passi=[P("Ricezione", "chi, come, che cosa, termini"), P("Ammissibilità", "criteri, esito, motivazione"),
                   P("Istruttoria", "piano, audizioni, conclusioni"), P("Tutele", "rischio di ritorsione e misure"),
                   P("Conservazione", "termine, cancellazione, proroghe")])),
        (2, "evidenza", dict(
            eyebrow="Su tutte e cinque",
            titolo="Mai nominativi.",
            testo="Né del segnalante, né delle persone coinvolte, né dei testimoni. Codici e funzioni.")),
        (3, "definizione", dict(
            eyebrow="Come si perde la riservatezza", titolo="Dal modo in cui il fascicolo è scritto",
            definizione="Quasi mai per una rivelazione diretta: un oggetto riconoscibile identifica la persona a ogni autorizzato che apra l'elenco.",
            punti=[P("«Ufficio acquisti di Bergamo»", "dove lavorano in tre, è un nome")])),
        (5, "confronto", dict(
            titolo="Il registro degli accessi",
            a={"h": "Altrove", "sub": "Annota un lavoro già fatto", "punti": ["Non deve mai far fallire il lavoro"]},
            b={"h": "Qui", "sub": "È la garanzia", "punti": ["Senza traccia, il fascicolo non si apre"]})),
        (7, "evidenza", dict(
            eyebrow="Un dettaglio tecnico con una conseguenza",
            titolo="I numeri dei fascicoli vengono da un contatore.",
            testo="Con il massimo più uno, cancellando l'ultimo il numero verrebbe riusato, e il nuovo fascicolo erediterebbe i rimandi del vecchio.")),
        (8, "split", dict(
            titolo="Descrivere la condotta, non il contesto",
            lead="Il dettaglio va nella scheda di istruttoria, che ha un accesso più stretto dell'oggetto.",
            punti=[P("«Presunte irregolarità in un affidamento»", "neutro"),
                   P("«Nel servizio mensa della sede di Brescia»", "identifica tre persone")])),
        (9, "tabella", dict(
            titolo="Il codice del segnalante non porta informazione",
            cols=["Codice", "Va bene?"],
            righe=[["Un progressivo", "Sì"], ["Le iniziali", "No"], ["Data di ricezione e reparto", "No"]])),
        (10, "chiusura", dict(
            titolo="Anche le persone coinvolte",
            punti=[P("Hanno diritto", "alla riservatezza"), P("Fino alle conclusioni", "pende un'accusa non verificata"),
                   P("Nominarle", "sposta il danno, che non si ripara")])),
    ],
    "termini": [
        (0, "apertura", dict(
            titolo="I termini", sottotitolo="Tre, calcolati dal prodotto",
            testo="Avviso entro 7 giorni, riscontro entro 3 mesi, cancellazione entro 5 anni dall'esito finale.",
            agenda=["Come si calcolano", "Chi è contattabile", "L'integrazione non sospende", "L'ammissibilità",
                    "Non arrivare fuori termine", "Ammissibile non è fondata"])),
        (2, "confronto", dict(
            titolo="Tempo universale, mesi agganciati all'ultimo giorno",
            a={"h": "Nel prototipo", "sub": "Due difetti",
               "punti": ["Avviso del 25 marzo in scadenza il 31", "Dal 31 gennaio al 3 marzo"]},
            b={"h": "Adesso", "sub": "Corretti entrambi",
               "punti": ["Scadenza il primo aprile", "Dal 31 gennaio al 28 o 29 febbraio"]})),
        (3, "definizione", dict(
            eyebrow="Quando si applicano", titolo="Segnalante contattabile",
            definizione="Non anonimo con un recapito, oppure anonimo con un codice o un recapito.",
            punti=[P("Senza contatto", "i termini non si applicano, ma il fascicolo si tratta"),
                   P("L'anonimato", "non è mai un motivo di archiviazione")])),
        (4, "evidenza", dict(
            eyebrow="L'errore che porta fuori termine",
            titolo="La richiesta di integrazione non sospende i termini.",
            testo="I tre mesi passano lo stesso. Se l'istruttoria non è finita, va resa comunque la comunicazione di stato.")),
        (5, "punti", dict(
            titolo="Cinque criteri di ammissibilità",
            punti=[P("Ambito oggettivo", "la violazione vi rientra"), P("Soggetto legittimato", "il segnalante"),
                   P("Contesto lavorativo", "i fatti conosciuti lì"), P("Elementi di fatto", "precisi e concordanti"),
                   P("Non solo personale", "la contestazione del rapporto di lavoro")])),
        (6, "cards", dict(
            titolo="Inammissibilità e archiviazione",
            cards=[P("Motivazione obbligatoria", "Per entrambe."),
                   P("Canali alternativi", "Indicati a chi riceve un'inammissibilità: costa una riga.")])),
        (7, "split", dict(
            titolo="Un conflitto personale può portare alla luce un illecito",
            lead="Resta una segnalazione per la parte che riguarda l'illecito.",
            punti=[P("La contestazione personale", "esce dall'ambito"), P("L'illecito che emerge", "no"),
                   P("Trattarla come una lite", "è il modo più comune di perdere una segnalazione vera")])),
        (8, "numeri", dict(
            titolo="Non arrivare mai fuori termine",
            numeri=[{"n": "Stesso giorno", "h": "Avviso di ricevimento", "d": "Cinque righe standard, senza anticipare il merito."},
                    {"n": "7 giorni", "h": "Solo per i casi complicati", "d": "Non il tempo ordinario."},
                    {"n": "2 settimane", "h": "Di margine", "d": "Sulla data di conclusione fissata nel piano."}])),
        (10, "chiusura", dict(
            titolo="Ammissibile non vuol dire fondata",
            punti=[P("Ammissibile", "e poi infondata dopo l'istruttoria"), P("Due esiti", "in due schede diverse"),
                   P("L'inammissibilità per chiudere in fretta", "salta l'istruttoria e ogni traccia")])),
    ],
    "istruttoria-tutele": [
        (0, "apertura", dict(
            titolo="Istruttoria e tutele", sottotitolo="Si pianifica prima di cominciare",
            testo="Fatti da accertare, fonti di prova, rischi di riconoscibilità, date di avvio e conclusione.",
            agenda=["La riconoscibilità", "Il diritto di essere sentiti", "Manifesta infondatezza",
                    "Il rischio di ritorsione", "La conservazione", "Audizioni e monitoraggio"])),
        (1, "evidenza", dict(
            eyebrow="Il punto che distingue un'istruttoria",
            titolo="Ogni domanda restringe il campo di chi può aver segnalato.",
            testo="L'ordine delle verifiche si decide prima: le più rivelatrici per ultime, e possibilmente mai.")),
        (2, "definizione", dict(
            eyebrow="Condizione di validità", titolo="La persona coinvolta va sentita",
            definizione="Anche in forma scritta, prima delle conclusioni. Non è una cortesia.")),
        (3, "confronto", dict(
            titolo="Manifesta infondatezza",
            a={"h": "Non è motivazione", "sub": "La credibilità percepita", "punti": ["Del segnalante"]},
            b={"h": "È motivazione", "sub": "Elementi oggettivi", "punti": ["Scritti per esteso", "Letti per primi da un'autorità"]})),
        (4, "punti", dict(
            titolo="Il rischio di ritorsione: sei fattori",
            numerati=False,
            punti=[P("Identità", "conoscibile all'interno"), P("Persona coinvolta", "sovraordinata"),
                   P("Contesto", "ristretto"), P("Precedenti", "di ritorsione"),
                   P("Rapporto di lavoro", "precario"), P("Segnalante", "già esposto in passato")])),
        (5, "split", dict(
            titolo="Da livello medio in su, il monitoraggio è dovuto",
            lead="I soggetti tutelati, indicati per codice, non sono solo il segnalante.",
            punti=[P("Facilitatori", "e colleghi con rapporto abituale"), P("Parenti", "entro il grado previsto"),
                   P("Enti collegati", "al segnalante")])),
        (6, "cards", dict(
            titolo="La conservazione",
            cards=[P("Non oltre il termine", "Salvo obbligo di legge o contenzioso, con la motivazione registrata."),
                   P("La cancellazione", "Annotata nel registro: senza traccia non è dimostrabile.")])),
        (7, "flusso", dict(
            titolo="Le audizioni",
            passi=[P("Domande", "preparate prima"), P("Il fatto", "dentro una verifica più ampia"),
                   P("Mai per prima", "la circostanza esatta della segnalazione")])),
        (8, "definizione", dict(
            eyebrow="Monitorare le tutele", titolo="Guardare anche quando nessuno si lamenta",
            definizione="Trasferimenti, cambi di mansione, valutazioni peggiorate, esclusioni: la ritorsione tipica è uno spostamento ai margini.")),
        (9, "evidenza", dict(
            eyebrow="L'onere della prova è rovesciato",
            titolo="Tocca all'organizzazione dimostrare ragioni indipendenti.",
            testo="Ogni decisione su una persona tutelata si documenta quando si prende. Ricostruita sotto contestazione, sa di giustificazione.")),
    ],
    "registri-wb": [
        (0, "apertura", dict(
            titolo="I registri", sottotitolo="{registriWb} registri",
            testo="Documentano l'impianto del sistema, le tutele attivate e la protezione dei dati.",
            agenda=["Quali sono", "Gli accessi ai fascicoli", "La verifica preventiva", "Tenerli vivi",
                    "Le persone autorizzate", "Gli eventi di riservatezza"])),
        (1, "confronto", dict(
            titolo="Quali sono",
            a={"h": "Trattazione e tutele", "sub": "Sette registri",
               "punti": ["Ritorsioni contestate", "Eventi di riservatezza", "Accessi ai fascicoli", "Astensioni del gestore",
                         "Provvedimenti conseguenti", "Verifica preventiva sui provvedimenti", "Comunicazioni con le autorità"]},
            b={"h": "Dati e impianto", "sub": "Sei registri",
               "punti": ["Persone autorizzate", "Richieste degli interessati", "Cancellazioni", "Verifiche sul canale",
                         "Formazione", "Diffusione dell'informazione"]})),
        (2, "evidenza", dict(
            eyebrow="La prova della riservatezza",
            titolo="Ogni consultazione di un fascicolo va annotata.",
            testo="Senza, dopo un evento non si ricostruisce chi ha visto che cosa.")),
        (3, "definizione", dict(
            eyebrow="Come presentarlo al gestore", titolo="Un registro che lo protegge",
            definizione="Non una sorveglianza su di lui: la dimostrazione che l'accesso è stato limitato a chi doveva.")),
        (4, "confronto", dict(
            titolo="La verifica preventiva sui provvedimenti",
            a={"h": "Prima", "sub": "È la dimostrazione", "punti": ["Registrata prima di adottare il provvedimento"]},
            b={"h": "Dopo", "sub": "Vale molto meno", "punti": ["Ricostruita a contestazione arrivata"]})),
        (6, "split", dict(
            titolo="Da alimentare anche quando non succede niente",
            lead="Dimostrano che il sistema esiste nella pratica, non solo nella procedura.",
            punti=[P("Verifiche", "sul canale"), P("Diffusione", "dell'informazione"), P("Formazione", "erogata")])),
        (7, "numeri", dict(
            titolo="Le persone autorizzate",
            numeri=[{"n": "2-3", "h": "In un'organizzazione media", "d": "Ogni aggiunta va motivata."},
                    {"n": "Una in più", "h": "Autorizzata per comodità", "d": "Un modo in più in cui la riservatezza cede."}])),
        (8, "chiusura", dict(
            titolo="Gli eventi di riservatezza",
            punti=[P("Anche i minori", "uno schermo aperto, una mail sbagliata"),
                   P("Registrarli", "non è un'ammissione di colpa"),
                   P("Vuoto dopo tre anni", "vuol dire che nessuno stava guardando")])),
    ],
    "conformita-wb": [
        (0, "apertura", dict(
            titolo="La mappa di conformità", sottotitolo="{requisitiWb} domande su {ambitiWb} ambiti",
            testo="Ciascuna con l'articolo del decreto, la procedura che le risponde, lo stato e l'evidenza.",
            agenda=["Le lettere degli ambiti", "Non valutato pesa zero", "Intenzione e prova", "Quando compilarla",
                    "Con l'organo di indirizzo"])),
        (1, "definizione", dict(
            eyebrow="Sembra un errore", titolo="Le lettere che saltano",
            definizione="Gli ambiti tengono le lettere del decreto: rinumerarle renderebbe impossibile il confronto con il testo di legge.")),
        (2, "evidenza", dict(
            eyebrow="La regola comune",
            titolo="Un requisito applicabile e non valutato pesa zero.",
            testo="Un ambito senza valutazioni vale zero: la conformità sale solo compilando.")),
        (4, "confronto", dict(
            titolo="Intenzione e prova",
            a={"h": "La procedura", "sub": "Un'intenzione", "punti": ["«Gli accessi vengono tracciati»"]},
            b={"h": "Il registro degli accessi", "sub": "La prova", "punti": ["Con dentro le righe", "Verificabile in pochi secondi"]})),
        (5, "split", dict(
            titolo="Prima della prima segnalazione",
            lead="A sistema fermo si compila con calma, e mostra che cosa manca mentre c'è tempo.",
            punti=[P("Con un fascicolo aperto", "diventa un esercizio in mezzo a un'urgenza"),
                   P("E i buchi che trova", "sono già buchi reali")])),
        (6, "cards", dict(
            titolo="All'organo di indirizzo, in due gruppi",
            cards=[P("Espongono l'ente", "A una sanzione."),
                   P("Espongono una persona", "A un danno che non si ripara.")])),
    ],
    "relazione-wb": [
        (0, "apertura", dict(
            titolo="La relazione periodica", sottotitolo="{procedureWb} procedure, {moduliWb} moduli, un documento",
            testo="All'organo di indirizzo, con dati aggregati e anonimizzati: volumi, canali, ambiti, esiti, termini, tutele.",
            agenda=["Pochi casi identificano", "Zero non è un buon risultato", "Leggere lo zero", "Per chi decide", "Il riesame"])),
        (2, "evidenza", dict(
            eyebrow="Controintuitivo",
            titolo="Con pochi casi, anche il dato aggregato identifica.",
            testo="«Una segnalazione in area amministrativa, esito fondato» basta a riconoscere la persona. Con pochi casi il dettaglio si riduce.")),
        (4, "confronto", dict(
            titolo="Zero segnalazioni",
            a={"h": "Letto come un successo", "sub": "Si perde credibilità", "punti": ["Con chi deve sorvegliare il sistema"]},
            b={"h": "Letto per quello che è", "sub": "Quasi sempre un canale sconosciuto", "punti": ["O di cui nessuno si fida"]})),
        (6, "split", dict(
            titolo="Per interpretare lo zero",
            lead="Senza questi due registri, lo zero si legge nel modo peggiore.",
            punti=[P("Verifiche sul canale", "funziona"), P("Diffusione dell'informazione", "le persone sanno dove trovarlo")])),
        (7, "flusso", dict(
            titolo="In apertura, prima di qualunque numero",
            passi=[P("Ha funzionato?", "nel periodo"), P("Che cosa lo espone", "adesso"),
                   P("Che cosa serve", "per chiudere l'esposizione")])),
        (8, "tabella", dict(
            titolo="Tre domande scomode per il riesame",
            cols=["Domanda", "Risposta che serve"],
            righe=[["Le persone sanno che il canale esiste?", "Documentata"],
                   ["Chi l'ha usato ha avuto riscontro nei termini?", "Documentata"],
                   ["Chi ha segnalato ha subito conseguenze?", "Negativa, e documentata"]])),
    ],
    "errori-wb": [
        (0, "apertura", dict(
            titolo="L'ordine, e gli errori", sottotitolo="Qui un errore colpisce una persona",
            testo="L'ordine in cui si mette in piedi il sistema, e i sei errori che espongono l'ente.",
            agenda=["L'ordine", "Il difetto più grave", "Nominativi", "Gli altri quattro", "Prima di cominciare",
                    "Gli altri percorsi"])),
        (1, "flusso", dict(
            titolo="L'ordine",
            passi=[P("Assetto", "obbligo, gestore e sostituto, canali, consultazione"),
                   P("Registri di impianto", "autorizzati, verifiche, diffusione, formazione"),
                   P("Procedure e mappa", "approvate e valutata"),
                   P("Fascicoli", "termini, ammissibilità, ritorsione, accessi"),
                   P("Relazione", "riesame e cancellazioni")])),
        (3, "evidenza", dict(
            eyebrow="Il difetto più grave",
            titolo="Usare questo percorso come canale di ricezione.",
            testo="La riservatezza smette di essere garantita da misure tecniche. Il canale sta su una piattaforma dedicata.")),
        (4, "definizione", dict(
            eyebrow="Il secondo", titolo="Nominativi nel fascicolo",
            definizione="Rivelano l'identità a ogni autorizzato che lo apre. Codici e funzioni; il legame resta fuori.")),
        (5, "tabella", dict(
            titolo="Gli altri quattro",
            cols=["Errore", "Conseguenza"],
            righe=[["Avviso o riscontro senza data", "Termini non dimostrabili"],
                   ["Integrazione creduta sospensiva", "Riscontro fuori tempo"],
                   ["Anonima archiviata perché anonima", "L'anonimato non è mai un motivo"],
                   ["Verifica sui provvedimenti fatta dopo", "Non dimostra più niente"]])),
        (6, "evidenza", dict(
            eyebrow="Una riflessione finale",
            titolo="Un nome nel posto sbagliato può costare il lavoro a qualcuno.",
            testo="Qui la prudenza costa poco, e l'errore moltissimo.")),
        (7, "definizione", dict(
            eyebrow="Avviare l'incarico", titolo="Se non riceve segnalazioni, non è un successo",
            definizione="Detto all'inizio, cambia il modo in cui l'ente comunica il canale ai lavoratori.")),
        (8, "chiusura", dict(
            titolo="Con il Modello e l'anticorruzione",
            punti=[P("I loro registri delle segnalazioni", "diventano di sola lettura"),
                   P("E rimandano qui", "dove si calcolano i termini"),
                   P("Da spiegare al cliente", "altrimenti sembra un guasto")])),
    ],
}

scrivi("segnalazioni", SLIDE)
