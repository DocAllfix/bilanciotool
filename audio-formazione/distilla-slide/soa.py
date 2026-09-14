# Slide della Dichiarazione di Applicabilità (ISO 27001).
from _scrivi import P, scrivi

SLIDE = {
    "contesto-e-ambito": [
        (0, "apertura", dict(
            titolo="Contesto e ambito", sottotitolo="Il confine, prima di qualunque controllo",
            testo="Servizi, processi, sedi e tecnologie coperti. Quello che resta fuori è escluso, con una motivazione scritta.",
            agenda=["Due dichiarazioni che decidono", "Valori chiusi", "I quadri", "Attivare per completezza",
                    "Concordare il confine", "Lo stesso confine ovunque"])),
        (1, "cards", dict(
            titolo="Due dichiarazioni che decidono i controlli",
            cards=[P("Ruolo nel trattamento", "Titolare o responsabile: obblighi diversi, controlli diversi."),
                   P("Servizi cloud", "Li usi, li offri, oppure non ne hai.")])),
        (2, "confronto", dict(
            titolo="«Non uso servizi cloud» è una risposta",
            a={"h": "Nel prototipo", "sub": "Si cercava la parola nel testo",
               "punti": ["L'avviso compariva a chi dichiarava di non usarne"]},
            b={"h": "Adesso", "sub": "Valori chiusi",
               "punti": ["Il confronto avviene per valore", "Quell'avviso non può più nascere"]})),
        (3, "numeri", dict(
            titolo="I quadri",
            numeri=[{"n": "Sempre", "h": "La norma principale", "d": "I suoi controlli non si scelgono."},
                    {"n": "{quadriSoa}", "h": "Quadri aggiuntivi", "d": "Si attivano quando il contesto lo richiede."},
                    {"n": "{controlliSoa}", "h": "Controlli, tutto acceso", "d": "Su {sezioniSoa} sezioni."}])),
        (4, "evidenza", dict(
            eyebrow="L'errore in buona fede",
            titolo="Un quadro si attiva perché serve, non per completezza.",
            testo="Ogni controllo che porta vuole stato, motivazione, riferimento e responsabile: decine di righe da compilare e da difendere.")),
        (5, "definizione", dict(
            eyebrow="La prima domanda del verificatore", titolo="Il campo descrive davvero l'azienda?",
            definizione="Scritto bene, il resto del documento si legge come una conseguenza. Scritto male, ogni controllo diventa discutibile.")),
        (6, "split", dict(
            titolo="Il confine è una decisione di governo",
            lead="Va concordato con chi in azienda ha l'autorità di dire di no.",
            punti=[P("Scritto da soli", "una sede o un servizio fuori dalle intenzioni della direzione"),
                   P("Una firma accanto", "dieci minuti adesso, e molti risparmiati dopo")])),
        (7, "chiusura", dict(
            titolo="Lo stesso confine ovunque",
            punti=[P("Nel manuale", "e nel contratto di certificazione"), P("Spesso sul sito", "dell'azienda"),
                   P("Confronta le parole", "non il senso")])),
    ],
    "i-controlli": [
        (0, "apertura", dict(
            titolo="I controlli", sottotitolo="Cinque dichiarazioni: due decidono, tre dimostrano",
            testo="Per ogni controllo del catalogo.",
            agenda=["Applicabile o escluso", "Lo stato di attuazione", "Le motivazioni", "Il riferimento documentale",
                    "Tre passate", "Che cosa chiede chi verifica"])),
        (1, "evidenza", dict(
            eyebrow="Prima decisione",
            titolo="Si esclude solo ciò che è estraneo, mai ciò che è difficile.",
            testo="L'esclusione vuole una giustificazione: senza, è una non conformità già scritta, e chi verifica comincia da lì.")),
        (2, "tabella", dict(
            titolo="Lo stato di attuazione",
            cols=["Stato", "Quando si dichiara"],
            righe=[["Non attuato", "Il controllo non c'è"], ["Pianificato", "È deciso, non ancora fatto"],
                   ["Parzialmente attuato", "C'è, ma non del tutto"], ["Attuato", "Con un'evidenza reperibile subito"],
                   ["Attuato e verificato", "Un audit o un test ne ha confermato l'efficacia, con una data"]])),
        (3, "split", dict(
            titolo="Le {motivazioniSoa} motivazioni della selezione",
            lead="Almeno una per controllo applicabile. La valutazione del rischio è quella attesa; le altre la rafforzano, non la sostituiscono.",
            punti=[P("Valutazione del rischio", "quella attesa dalla norma"), P("Obbligo legale", "o contrattuale"),
                   P("Requisito di business", "o buona prassi")])),
        (4, "definizione", dict(
            eyebrow="Un insieme, non una scelta unica", titolo="Motivazioni voce per voce",
            definizione="Accendere o spegnere una voce agisce solo su quella: in due sullo stesso controllo, nessuno cancella l'altro.")),
        (5, "confronto", dict(
            titolo="Il riferimento documentale",
            a={"h": "«Gestione degli accessi»", "sub": "Una descrizione", "punti": ["Sei mesi dopo non fa ritrovare niente"]},
            b={"h": "«Procedura 03.2 rev. 4»", "sub": "Il nome vero", "punti": ["Quello che l'auditor chiederà di aprire"]})),
        (7, "flusso", dict(
            titolo="Tre passate, non riga per riga",
            passi=[P("Prima", "applicabilità ed esclusioni, sezione per sezione"),
                   P("Seconda", "stato e motivazioni, dai {cardineSoa} controlli cardine"),
                   P("Terza", "riferimenti e responsabili: raccolta, delegabile")])),
        (8, "cards", dict(
            titolo="Le tre domande di chi verifica",
            cards=[P("Un controllo escluso", "E perché: la motivazione regge?"),
                   P("Un attuato scelto a caso", "E la sua evidenza: non bastano tre pronte."),
                   P("Chi se ne occupa", "A voce: un nome e un ruolo, non l'ufficio.")])),
        (9, "definizione", dict(
            eyebrow="Con il cliente", titolo="Non si valuta l'azienda",
            definizione="Si scrive che cosa ha deciso di presidiare e perché: un non attuato diventa una riga del piano, non una bocciatura.")),
        (10, "chiusura", dict(
            titolo="Rileggere le motivazioni",
            punti=[P("Una settimana dopo", "metà risultano generiche"),
                   P("Una motivazione che vale per tutti", "non motiva nessuno"),
                   P("È lì", "che si capisce se il lavoro è stato fatto o compilato")])),
    ],
    "calcolo-soa": [
        (0, "apertura", dict(
            titolo="Il calcolo", sottotitolo="L'indice di maturità",
            testo="Somma dei valori degli stati, divisa per i controlli applicabili: gli esclusi non entrano nel denominatore.",
            agenda=["Non valutato pesa zero", "Fasce e sezioni", "L'ordine del piano", "Non è un requisito",
                    "Due misurazioni", "Il punteggio per sezione"])),
        (1, "numeri", dict(
            titolo="Un controllo senza stato pesa zero",
            numeri=[{"n": "90%", "h": "Mediando solo i valutati", "d": "Con dieci controlli dichiarati su centotrenta."},
                    {"n": "Il vero", "h": "Pesando zero i non valutati", "d": "L'indice sale lavorando, non saltando."}])),
        (3, "confronto", dict(
            titolo="{fasceSoa} fasce, e il punteggio per sezione",
            a={"h": "Solo il totale", "sub": "Un 60% complessivo", "punti": ["Non dice dove intervenire"]},
            b={"h": "Per sezione", "sub": "Una al 20%, le altre all'80%", "punti": ["Dice da dove cominciare"]})),
        (4, "definizione", dict(
            eyebrow="La formula che ordina il piano", titolo="L'impatto di un'azione",
            definizione="(valore massimo − valore attuale) ÷ numero degli applicabili.",
            punti=[P("Venti controlli da zero a parziale", "spostano più di tre portati a verificato")])),
        (5, "evidenza", dict(
            eyebrow="Da dire prima di qualunque percentuale",
            titolo="L'indice non è un requisito della norma.",
            testo="La norma chiede decisioni motivate e attuazione dimostrabile. Al 70% con tutto motivato si è certificabili; al 90% con metà giustificazioni mancanti, no.")),
        (6, "split", dict(
            titolo="Guardarlo due volte",
            lead="Il numero assoluto dice poco; la differenza fra due misurazioni misura il lavoro fatto.",
            punti=[P("Salva il punteggio", "quando chiudi una passata"), P("Il termine di paragone", "è tuo, non di un settore")])),
        (7, "chiusura", dict(
            titolo="Il punteggio per sezione",
            punti=[P("Le sezioni", "non pesano uguale per ogni azienda"),
                   P("Servizi o manifattura", "nella stessa posizione numerica stanno diversamente"),
                   P("Un solo numero", "toglie l'informazione per decidere il budget")])),
    ],
    "verifiche-soa": [
        (0, "apertura", dict(
            titolo="Le verifiche di coerenza", sottotitolo="La prima mezz'ora dell'auditor",
            testo="Arrivare all'appuntamento avendo già trovato da solo quello che troverebbe lui.",
            agenda=["Sei verifiche", "Esclusioni e motivazioni", "Attuati senza documento", "Stati e responsabili",
                    "Profilo e quadri", "Presto e spesso"])),
        (1, "punti", dict(
            titolo="Sei verifiche, nell'ordine in cui arrivano",
            punti=[P("Esclusioni", "senza giustificazione"), P("Applicabili", "senza motivazione di inclusione"),
                   P("Attuati", "senza riferimento documentale"), P("Applicabili", "senza stato"),
                   P("Applicabili", "senza responsabile"), P("Profilo e quadri", "incoerenti")])),
        (2, "evidenza", dict(
            eyebrow="La prima",
            titolo="Un'esclusione senza motivazione non si rimedia in verifica.",
            testo="O la motivazione è scritta, o manca.")),
        (3, "definizione", dict(
            eyebrow="La seconda", titolo="Il perché che si rimanda",
            definizione="Rischio, obbligo legale, contratto, business o buona prassi: è il rilievo che si accumula più in fretta.")),
        (4, "evidenza", dict(
            eyebrow="La terza",
            titolo="Attuato senza documento: la contraddizione più visibile.",
            testo="È la più facile da cercare, e chi verifica la cerca subito.")),
        (5, "cards", dict(
            titolo="Quarta e quinta",
            cards=[P("Senza stato", "Il controllo pesa zero: ti dice dove l'indice è più basso di quanto potrebbe."),
                   P("Senza responsabile", "In verifica si chiede a voce chi se ne occupa: serve un nome.")])),
        (7, "definizione", dict(
            eyebrow="La sesta", titolo="Profilo e quadri incoerenti",
            definizione="Un ruolo o una posizione senza il quadro attivo, o il contrario: nasce dalle scelte del primo passo.")),
        (8, "confronto", dict(
            titolo="Un elenco di codici, non un punteggio",
            a={"h": "Un numero", "sub": "Ti dice come stai", "punti": ["E ti lascia dove sei"]},
            b={"h": "Un elenco di codici", "sub": "Ti dice che cosa aprire", "punti": ["Chiuso, il rilievo sparisce da solo"]})),
        (9, "numeri", dict(
            titolo="Presto e spesso",
            numeri=[{"n": "Alla fine", "h": "Decine di righe", "d": "Tutte insieme, con la scadenza addosso."},
                    {"n": "A ogni passata", "h": "Cinque o sei", "d": "Chiuse mentre ricordi il perché."}])),
        (10, "chiusura", dict(
            titolo="Con il cliente",
            punti=[P("Non sono errori tuoi", "sono le domande di fra un mese"), P("Trovate adesso", "che c'è tempo"),
                   P("E ha il vantaggio", "di essere vero")])),
    ],
    "documento-soa": [
        (0, "apertura", dict(
            titolo="La Dichiarazione di Applicabilità", sottotitolo="Il documento che consegni",
            testo="Quattro parti, e una nota che non si toglie.",
            agenda=["Quattro parti", "La nota di conformità", "Congelato alla pubblicazione", "Quando pubblicare", "Legenda e firme"])),
        (1, "cards", dict(
            titolo="Quattro parti",
            cards=[P("Una tabella per sezione", "Riferimento, controllo, applicabilità, motivazioni, stato, documento."),
                   P("La legenda delle sigle", "Per chi deve verificare: l'unico lettore per cui è scritto."),
                   P("Il piano", "Con responsabili e termini."),
                   P("Le firme", "Di chi redige e di chi approva: due persone.")])),
        (2, "evidenza", dict(
            eyebrow="Riquadrata, in chiaro",
            titolo="La nota di conformità collega la tabella all'obbligo.",
            testo="Senza, il documento sembra completo ed è solo un elenco. In una dichiarazione fatta da altri, cercala per prima.")),
        (3, "definizione", dict(
            eyebrow="Quando pubblichi", titolo="Il documento si congela",
            definizione="Con il codice di verifica e l'edizione dei contenuti: una revisione crea una versione nuova accanto alla precedente.")),
        (4, "confronto", dict(
            titolo="Sei mesi dopo, davanti all'organismo",
            a={"h": "«Ci ricordiamo che»", "sub": "Una ricostruzione", "punti": ["A memoria"]},
            b={"h": "«Qui c'è scritto»", "sub": "La versione di marzo", "punti": ["Aperta e mostrata"]})),
        (5, "split", dict(
            titolo="Pubblicare quando è pronto",
            lead="Non quando è il momento di consegnare.",
            punti=[P("A metà lavoro", "resta nell'archivio per sempre"),
                   P("Tre versioni ravvicinate", "e il cliente si chiede che cosa non andasse")])),
        (6, "chiusura", dict(
            titolo="Legenda e firme",
            punti=[P("Non hanno contenuto tecnico", "e si trascurano"), P("Sono le prime due", "che un organismo guarda"),
                   P("Mancanti", "rendono sospetto anche un documento buono")])),
    ],
}

scrivi("soa", SLIDE)
