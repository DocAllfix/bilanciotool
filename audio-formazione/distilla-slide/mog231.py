# Slide del Modello 231.
# ⚠️ I nomi delle chiavi di NUMERI qui ingannano: `pilastri231` conta le FAMIGLIE di reati
# (mog231-fam.json), `capi231` conta i PILASTRI della mappa di idoneità (mog231-capi.json).
from _scrivi import P, scrivi

SLIDE = {
    "anagrafica-231": [
        (0, "apertura", dict(
            titolo="Anagrafica dell'ente", sottotitolo="Sei gruppi che alimentano tutti i documenti",
            testo="Organo amministrativo, legale rappresentante e organo di controllo diventano intestazioni e firme dei documenti.",
            agenda=["L'Organismo di Vigilanza", "Il budget", "Esposizione e canale", "Prima l'anagrafica",
                    "L'ambito di applicazione", "Configurazione e indipendenza"])),
        (1, "split", dict(
            titolo="L'Organismo di Vigilanza",
            lead="Alimenta la prima sezione della sua relazione, quella che l'organo di controllo legge per prima.",
            punti=[P("Composizione", "e componenti"), P("Nomina", "data e scadenza"), P("Budget annuo", "non facoltativo")])),
        (2, "evidenza", dict(
            eyebrow="Il campo su cui non si soprassiede",
            titolo="Senza budget autonomo, l'organismo non è indipendente.",
            testo="In giudizio è un indice di inidoneità del modello. Costa una riga di verbale, deliberata insieme alla nomina.")),
        (3, "cards", dict(
            titolo="Gli altri due gruppi",
            cards=[P("Esposizione", "Rapporti con la pubblica amministrazione e sistemi di gestione: orientano il catalogo dei reati."),
                   P("Canale e adozione", "Gestore delle segnalazioni, date di adozione e revisione, ambito ed esclusioni motivate.")])),
        (4, "flusso", dict(
            titolo="Prima l'anagrafica, poi i testi",
            passi=[P("Anagrafica", "compilata una volta"), P("Segnaposto", "risolti in tutti i documenti"),
                   P("Un cambio di nomina", "e i nomi cambiano ovunque insieme")])),
        (5, "definizione", dict(
            eyebrow="L'ambito di applicazione", titolo="Un perimetro taciuto vale per tutto",
            definizione="Se il modello copre solo alcune unità locali, va detto e motivato: altrimenti ti giudicano su un'estensione che non presidiavi.")),
        (6, "tabella", dict(
            titolo="Tre configurazioni dell'Organismo",
            cols=["Forma", "Quando"],
            righe=[["Monocratico", "Ente piccolo, con una persona davvero indipendente"],
                   ["Collegiale", "Processi a rischio diversi: competenze legali, contabili, tecniche"],
                   ["Organo esistente", "Dove la legge lo consente"]])),
        (7, "chiusura", dict(
            titolo="Indipendenza: chi nomina, chi revoca, chi paga",
            punti=[P("Tutti e tre in una persona", "nessuna indipendenza, anche con tre professionisti esterni"),
                   P("La delibera di nomina", "si costruisce su questi tre punti"),
                   P("Mezz'ora con chi la firma", "e ne vale la pena")])),
    ],
    "catalogo-reati": [
        (0, "apertura", dict(
            titolo="Il catalogo dei reati", sottotitolo="{reati231} fattispecie in {pilastri231} famiglie",
            testo="Per ognuna dichiari se si applica; se la escludi, la motivazione si riferisce all'attività svolta.",
            agenda=["Non applicabile non è improbabile", "Le sanzioni interdittive", "Due regole", "Da dove cominciare",
                    "I delitti informatici", "Prima il catalogo"])),
        (1, "confronto", dict(
            titolo="Non applicabile non vuol dire improbabile",
            a={"h": "Non applicabile", "sub": "Condotta estranea all'attività", "punti": ["Abusi di mercato per una non quotata"]},
            b={"h": "Improbabile", "sub": "Resta applicabile", "punti": ["La probabilità si valuta nello scenario"]})),
        (2, "evidenza", dict(
            eyebrow="Chi legge se ne accorge",
            titolo="Mezzo catalogo escluso e matrice tutta bassa: nessuno ha guardato.",
            testo="Escludere per improbabilità significa decidere il risultato prima della valutazione.")),
        (3, "definizione", dict(
            eyebrow="Segnalate nel catalogo", titolo="Sanzioni interdittive",
            definizione="Possono fermare l'attività: per queste fattispecie l'impatto di norma non scende sotto il livello grave.")),
        (4, "cards", dict(
            titolo="Due regole sul catalogo",
            cards=[P("Si chiude per intero", "Una fattispecie non esaminata è un buco: deciso, o non ci sei arrivato?"),
                   P("Solo le applicabili", "si associano ai processi: se un reato non si trova, la causa è qui.")])),
        (6, "split", dict(
            titolo="Chiudere il catalogo in una sessione",
            lead="Cominciare dalle famiglie che si applicano quasi sempre chiude metà del catalogo in un'ora.",
            punti=[P("Quasi sempre", "PA, societari, sicurezza sul lavoro, ambientali, tributari, riciclaggio"),
                   P("Dipende dall'attività", "informatici, proprietà industriale, contrabbando, personalità individuale")])),
        (7, "evidenza", dict(
            eyebrow="Esclusi troppo in fretta",
            titolo="I delitti informatici non riguardano solo chi fa informatica.",
            testo="Riguardano chi accede abusivamente a un sistema, danneggia dati, usa credenziali altrui: qualunque impresa con computer e fornitori.")),
        (8, "chiusura", dict(
            titolo="Prima il catalogo, poi i processi",
            punti=[P("Solo le applicabili", "si collegano ai processi"),
                   P("Tornare indietro", "porta a decidere guardando il processo, non l'attività"),
                   P("Il ragionamento", "risulta rovesciato")])),
    ],
    "processi-sensibili": [
        (0, "apertura", dict(
            titolo="I processi sensibili", sottotitolo="Il fondamento del modello",
            testo="La parte che un giudice guarda per capire se l'ente ha riflettuto sui propri rischi o ha comprato un documento.",
            agenda=["La discrezionalità", "Gli scenari", "Quanti processi", "Come descrivere il rischio",
                    "Le controparti", "La documentazione"])),
        (1, "definizione", dict(
            eyebrow="L'elemento che pesa di più", titolo="I margini di discrezionalità",
            definizione="Non è la dimensione del flusso a fare il rischio: è quanto margine ha chi decide, e quanto poco resta scritto.",
            punti=[P("Centomila euro con tre preventivi", "meno rischiosi di diecimila decisi da una persona sola")])),
        (2, "cards", dict(
            titolo="Lo scenario: un reato incrociato con un processo",
            cards=[P("Probabilità e impatto", "E lo stato dei presidi."),
                   P("Modalità di commissione", "Scritte in chiaro."),
                   P("Presidi esistenti", "Scritti in chiaro: rendono leggibile la matrice.")])),
        (3, "tabella", dict(
            titolo="I processi tipici di una piccola impresa",
            cols=["Ambito", "Processi"],
            righe=[["Mercato", "Gare e amministrazione, vendite e agenti"],
                   ["Acquisti e denaro", "Selezione dei fornitori, tesoreria, omaggi e liberalità"],
                   ["Persone e luoghi", "Risorse umane, salute e sicurezza, ambiente e rifiuti"],
                   ["Dati e conti", "Sistemi informativi, bilancio e adempimenti fiscali"]])),
        (4, "numeri", dict(
            titolo="Quanti processi",
            numeri=[{"n": "Venticinque", "h": "Troppi", "d": "Spezzati troppo: matrice illeggibile."},
                    {"n": "Quattro", "h": "Troppo pochi", "d": "Qualche reato applicabile resta scoperto."},
                    {"n": "Il giusto", "h": "Ogni reato coperto", "d": "Senza duplicazioni."}])),
        (5, "evidenza", dict(
            eyebrow="L'ordine del lavoro",
            titolo="Prima tutti i processi, poi i dettagli.",
            testo="Uno per volta fino in fondo si descrivono bene i primi tre e si liquidano gli ultimi, che spesso sono i più esposti.")),
        (6, "confronto", dict(
            titolo="Descrivere il punto in cui il processo si piega",
            a={"h": "Selezione dei fornitori", "sub": "Il rischio non è comprare",
               "punti": ["È scegliere per ragioni diverse dalla convenienza"]},
            b={"h": "Tesoreria", "sub": "Il rischio non è pagare",
               "punti": ["È pagare un soggetto diverso dal contraente, o con causali generiche"]})),
        (7, "split", dict(
            titolo="Le controparti",
            lead="Chi sta dall'altra parte regge metà della valutazione.",
            punti=[P("Pubbliche", "un profilo di rischio"), P("Private", "un altro"), P("Intermediari", "un altro ancora"),
                   P("Con la prevenzione della corruzione", "i due elenchi dovrebbero somigliarsi")])),
        (8, "chiusura", dict(
            titolo="La documentazione prodotta",
            punti=[P("Dice in anticipo", "dove un controllo potrà cercare"),
                   P("Un processo senza documenti", "non lascia verificare nessun presidio"),
                   P("È già una criticità", "a prescindere dal livello di rischio")])),
    ],
    "motore-rischio-231": [
        (0, "apertura", dict(
            titolo="Il motore del rischio", sottotitolo="Due stadi",
            testo="Inerente: probabilità per impatto. Residuo: l'inerente incrociato con lo stato dei presidi.",
            agenda=["L'impatto", "Presidi non valutati", "Il livello di un processo", "Presidi adeguati",
                    "La probabilità", "Presentare la matrice"])),
        (1, "definizione", dict(
            eyebrow="Non solo la sanzione pecuniaria", titolo="L'impatto",
            definizione="Conta anche la sanzione interdittiva, e il danno reputazionale.",
            punti=[P("Con sanzioni interdittive", "di norma non scende sotto grave")])),
        (2, "evidenza", dict(
            eyebrow="La regola che sorprende",
            titolo="I presidi non valutati contano come assenti.",
            testo="Una riga troppo rossa non chiede perché il calcolo esagera: chiede che cosa non hai ancora dichiarato.")),
        (3, "confronto", dict(
            titolo="Una matrice credibile",
            a={"h": "Tutta su livelli bassi", "sub": "Costruita per rassicurare", "punti": ["Per un ente esposto, poco credibile"]},
            b={"h": "Punti critici dichiarati", "sub": "Costruita per funzionare",
               "punti": ["Con i presidi che li governano", "Un rischio critico scende, non sparisce"]})),
        (4, "definizione", dict(
            eyebrow="Il livello di un processo", titolo="Il massimo, non la media",
            definizione="Un solo scenario critico rende critico il processo, anche con tutti gli altri bassi.")),
        (5, "cards", dict(
            titolo="Il piano di adeguamento",
            cards=[P("Azione", "sul residuo non accettabile"), P("Responsabile", "senza, non si fa"),
                   P("Termine", "entro quando"), P("Verifica", "senza, non si sa se è fatta")])),
        (6, "flusso", dict(
            titolo="Adeguato significa tre cose insieme",
            passi=[P("Previsto", "dal protocollo di parte speciale del processo"), P("Approvato", "insieme al protocollo"),
                   P("Applicato", "con evidenza")])),
        (7, "evidenza", dict(
            eyebrow="La probabilità",
            titolo="Non se qualcuno vuole delinquere: se il processo glielo consente.",
            testo="Un giudizio sul processo, non sulle persone: nessuno stima la disonestà dei collaboratori, tutti stimano quanto è controllato un pagamento.")),
        (8, "split", dict(
            titolo="Presentare la matrice a chi firma",
            lead="Le righe critiche si presentano insieme all'azione che le governa.",
            punti=[P("Righe rosse senza piano", "il consiglio chiede di abbassare i punteggi"),
                   P("Righe rosse con azioni e costi", "il consiglio approva")])),
        (9, "chiusura", dict(
            titolo="Quando rivedere gli scenari",
            punti=[P("Quando cambiano", "processi, controparti o presidi"),
                   P("Un mercato o una sede nuova", "sono cambiamenti"),
                   P("A calendario, senza cambiamenti", "insegna che l'esercizio è formale")])),
    ],
    "registri-231": [
        (0, "apertura", dict(
            titolo="I registri", sottotitolo="{registri231} registri: la prova dell'efficace attuazione",
            testo="Un modello adottato e mai applicato non protegge l'ente.",
            agenda=["Quali sono", "Le date", "Le segnalazioni", "Tenerli vivi", "I tre che contano di più", "Flussi e deroghe"])),
        (1, "confronto", dict(
            titolo="Quali sono",
            a={"h": "Modello e presidi", "sub": "Sei registri",
               "punti": ["Piano di adeguamento", "Deleghe e procure", "Deroghe ai protocolli", "Omaggi e liberalità",
                         "Terzi qualificati", "Aggiornamenti del modello"]},
            b={"h": "Organismo e persone", "sub": "Sei registri",
               "punti": ["Flussi informativi", "Segnalazioni", "Provvedimenti disciplinari", "Verifiche dell'organismo",
                         "Verbali dell'organismo", "Formazione"]})),
        (2, "tabella", dict(
            titolo="Contano le date, non le righe",
            cols=["Registrazione", "Conta solo con"],
            righe=[["Verifica", "La data di esecuzione"],
                   ["Segnalazione", "Avviso di ricevimento e riscontro"],
                   ["Azione di adeguamento", "La verifica, non la sola attuazione"]])),
        (3, "evidenza", dict(
            eyebrow="La conseguenza",
            titolo="Un registro pieno di righe, e un cruscotto che dice zero.",
            testo="Non è un difetto del calcolo: la data si compila nel momento in cui si crea la riga.")),
        (4, "definizione", dict(
            eyebrow="Con il percorso segnalazioni attivo", titolo="Il registro delle segnalazioni",
            definizione="Diventa di sola lettura e rimanda al fascicolo, dove i termini di legge si calcolano davvero.",
            punti=[P("Senza quel percorso", "resta l'unico posto dove annotarle")])),
        (5, "split", dict(
            titolo="Tenerli vivi",
            lead="Si alimentano quando succede la cosa, non a dicembre.",
            punti=[P("Ricostruito a fine anno", "date vicine, intervalli regolari"),
                   P("Un registro vero", "è irregolare, ed è credibile per questo")])),
        (6, "cards", dict(
            titolo="I tre chiesti per primi",
            cards=[P("Verbali dell'organismo", "Dimostrano che ha vigilato."),
                   P("Flussi informativi ricevuti", "Dimostrano che qualcuno gli ha parlato."),
                   P("Provvedimenti disciplinari", "Dimostrano che il modello ha morso.")])),
        (7, "punti", dict(
            titolo="Zero flussi è un problema di canale",
            intro="I flussi obbligatori si definiscono nella procedura: chi manda che cosa, e quando.",
            punti=[P("Ufficio acquisti", "le deroghe"), P("Amministrazione", "i rapporti con la pubblica amministrazione"),
                   P("Responsabile della sicurezza", "gli infortuni")])),
        (8, "chiusura", dict(
            titolo="Le deroghe ai protocolli",
            punti=[P("Registrate e motivate", "segno di un sistema vivo"),
                   P("Zero in un anno", "quasi sempre protocolli non applicati"),
                   P("In verifica", "una delle domande più difficili")])),
    ],
    "idoneita-231": [
        (0, "apertura", dict(
            titolo="La mappa di idoneità", sottotitolo="{presidi231} presidi su {capi231} pilastri",
            testo="Domande formulate come le porrebbe chi deve accertare l'idoneità: con delibera avente data certa e anteriore ai fatti.",
            agenda=["Non valutato pesa zero", "Tre tipi di indicatori", "Violazioni senza provvedimenti",
                    "Parlare con la direzione", "Dove si viene giudicati inidonei", "La formazione"])),
        (1, "numeri", dict(
            titolo="Un presidio non valutato pesa zero",
            numeri=[{"n": "Tre su venti", "h": "Media sui soli valutati", "d": "Darebbe lo stesso numero di venti su venti."},
                    {"n": "Venti su venti", "h": "Tutto conforme", "d": "La situazione opposta."},
                    {"n": "Lavorando", "h": "L'indice sale", "d": "Mai saltando."}])),
        (2, "tabella", dict(
            titolo="Tre tipi di indicatori",
            cols=["Tipo", "Domanda", "Che cosa misura"],
            righe=[["Copertura", "Hai guardato tutto?", "Catalogo esaminato, ogni reato coperto da un processo"],
                   ["Attuazione", "Il modello vive?", "Azioni verificate, verifiche, verbali, flussi, formazione, clausole"],
                   ["Esito", "Com'è andata?", "Termini rispettati, zero ritorsioni, provvedimenti sulle violazioni"]])),
        (3, "evidenza", dict(
            eyebrow="La cosa più scomoda del percorso",
            titolo="Violazioni accertate senza provvedimenti: il sistema disciplinare non è stato applicato.",
            testo="In giudizio pesa contro l'ente, ed è il più facile da evitare: prendere e registrare il provvedimento.")),
        (4, "confronto", dict(
            titolo="Con la direzione, separare i costi",
            a={"h": "Si chiude in un consiglio", "sub": "Una decisione", "punti": ["L'adozione con data certa"]},
            b={"h": "Richiede mesi", "sub": "Progetti e abitudini", "punti": ["La formazione", "I flussi informativi"]})),
        (6, "cards", dict(
            titolo="Dove i modelli vengono giudicati inidonei",
            cards=[P("L'organismo", "e la sua indipendenza"), P("Il sistema disciplinare", "effettivamente applicato"),
                   P("La formazione", "documentata")])),
        (7, "definizione", dict(
            eyebrow="Adempimento o difesa", titolo="Formazione dimostrabile",
            definizione="Chi ha partecipato, su che cosa, con quale verifica di apprendimento: il materiale conservato insieme alla firma.",
            punti=[P("Un elenco di presenze", "dimostra solo che erano in una stanza")])),
        (8, "chiusura", dict(
            titolo="Compilarla prima dei documenti",
            punti=[P("Prima", "diventa un piano di lavoro"), P("Le non conformità", "sono l'indice di ciò che va costruito"),
                   P("Alla fine", "misura quando non c'è più tempo")])),
    ],
    "corpus-231": [
        (0, "apertura", dict(
            titolo="Il corpus del modello", sottotitolo="{documenti231} documenti, {moduli231} moduli",
            testo="La parte generale, dal quadro normativo all'aggiornamento, e un protocollo di parte speciale per famiglia di reati.",
            agenda=["Blocco per blocco", "L'ordine di approvazione", "La sola parte generale",
                    "Personalizzare i protocolli", "Quando aggiornare"])),
        (1, "confronto", dict(
            titolo="Blocco per blocco",
            a={"h": "Ciò che non tocchi", "sub": "Resta comune", "punti": ["Riceve gli aggiornamenti"]},
            b={"h": "Ciò che modifichi", "sub": "Diventa tuo", "punti": ["E resta tuo"]})),
        (2, "flusso", dict(
            titolo="L'ordine di approvazione",
            passi=[P("Struttura", "e metodologia"), P("Organismo", "e flussi informativi"),
                   P("Segnalazioni", "e sistema disciplinare"), P("Parte speciale", "dopo la mappatura dei processi"),
                   P("Formazione", "e aggiornamento")])),
        (3, "evidenza", dict(
            eyebrow="L'errore che costa più tempo",
            titolo="Protocolli approvati prima di mappare i processi.",
            testo="Presidi per rischi non ancora descritti: arrivata la mappatura vanno rifatti, dopo essere già passati in consiglio.")),
        (4, "definizione", dict(
            eyebrow="Se il cliente chiede la sola parte generale", titolo="Una proprietà del dato",
            definizione="Le procedure dichiarano la loro fase; dove la distinzione non c'è, il comando non compare.")),
        (5, "cards", dict(
            titolo="Un protocollo generico si riconosce",
            cards=[P("Funzioni", "che nell'azienda non esistono"), P("Soglie", "che nessuno applica"),
                   P("Controlli", "che nessuno esegue")])),
        (6, "tabella", dict(
            titolo="Chi lo fa, qui, si chiama così?",
            cols=["Risposta", "Che cosa fare"],
            righe=[["Sì", "La riga resta"], ["No", "La riga va riscritta"],
                   ["Nessuno lo fa", "Si toglie, oppure si crea il presidio"]])),
        (7, "chiusura", dict(
            titolo="Quando aggiornare il modello",
            punti=[P("Cambia la legge", "prevedibile"), P("Cambia l'organizzazione", "prevedibile"),
                   P("Succede qualcosa", "il caso che conta: almeno una valutazione scritta")])),
    ],
    "errori-231": [
        (0, "apertura", dict(
            titolo="L'ordine, e gli errori", sottotitolo="Costruire un modello da zero",
            testo="Seguire l'ordine evita quasi tutti gli errori che vengono dopo.",
            agenda=["L'ordine", "Sette errori", "Sei silenziosi", "Dove va il tempo", "Da dire al cliente"])),
        (1, "flusso", dict(
            titolo="L'ordine in cui si costruisce",
            passi=[P("Anagrafica", "organismo, budget, canale"), P("Catalogo", "chiuso, con esclusioni motivate"),
                   P("Processi e scenari", "ogni reato applicabile coperto"),
                   P("Piano e adozione", "documenti approvati, delibera registrata"),
                   P("Idoneità e registri", "poi la relazione dell'organismo")])),
        (2, "tabella", dict(
            titolo="Errori che rendono il modello indifendibile",
            cols=["Errore", "Effetto"],
            righe=[["Reati esclusi perché improbabili", "Catalogo indifendibile, scenari mancanti"],
                   ["Reato applicabile senza processo", "Incoerenza nel cruscotto e a stampa"],
                   ["Presidi adeguati, protocolli generici", "Residuo ottimistico, contraddizione a stampa"],
                   ["Residui inaccettabili senza piano", "Rischio dichiarato e non governato"]])),
        (4, "cards", dict(
            titolo="Gli ultimi tre, il più pesante per ultimo",
            cards=[P("Organismo senza budget o verbali", "Inidoneità e mancata attuazione insieme."),
                   P("Segnalazioni senza date", "Obblighi di legge non dimostrabili."),
                   P("Violazioni senza provvedimenti", "Il modello non è mai stato applicato.")])),
        (5, "evidenza", dict(
            eyebrow="Sei errori su sette",
            titolo="Nessun avviso: i campi sono validi, il documento esce.",
            testo="Il prodotto segnala le incoerenze formali, non se una motivazione regge. Quello lo sa chi conosce l'azienda.")),
        (6, "numeri", dict(
            titolo="Dove va il tempo",
            numeri=[{"n": "Metà", "h": "Processi e scenari", "d": "Non si comprime: si parla con le persone, va prenotata per prima."},
                    {"n": "Un quarto", "h": "Personalizzazione", "d": "Si può parallelizzare."},
                    {"n": "Il resto", "h": "Decisioni", "d": "Si prendono in una riunione."}])),
        (7, "chiusura", dict(
            titolo="Da dire prima di firmare l'incarico",
            punti=[P("Il modello non protegge", "per il fatto di esistere"),
                   P("Protegge", "se è costruito su quell'azienda, e applicato"),
                   P("Senza registri, verifiche e formazione", "c'è un documento, non una difesa")])),
    ],
}

scrivi("mog231", SLIDE)
