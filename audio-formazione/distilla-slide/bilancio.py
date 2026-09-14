# Slide del bilancio di sostenibilità (doppia rilevanza, indicatori, politiche, racconto).
from _scrivi import P, scrivi

SLIDE = {
    "passo-1-organizzazione": [
        (0, "apertura", dict(
            titolo="L'organizzazione", sottotitolo="La carta d'identità dell'azienda",
            testo="Finisce in copertina e nella nota metodologica: un revisore la confronta con la visura in trenta secondi.",
            agenda=["I campi del profilo", "I siti operativi", "Perimetro largo, dati stretti", "L'ordine dei passi"])),
        (1, "definizione", dict(
            eyebrow="Non è anagrafica", titolo="I siti operativi",
            definizione="Definiscono il confine di tutti i dati del bilancio: ciò che è nel perimetro deve entrare nei consumi.",
            punti=[P("Un sito escluso", "va detto in nota metodologica, con il motivo")])),
        (2, "evidenza", dict(
            eyebrow="Il difetto che un revisore trova per primo",
            titolo="Perimetro dichiarato largo, compilato stretto.",
            testo="Tre siti dichiarati e le sole bollette della sede: basta guardare gli addetti accanto ai kWh. Nel perimetro va ciò di cui hai i dati.")),
        (3, "flusso", dict(
            titolo="L'ordine dei passi non si salta",
            passi=[P("Passo 2", "decide i temi materiali"), P("Passo 3", "raccoglie i dati"),
                   P("Passo 4", "mostra le schede dei soli temi materiali"), P("Passo 5", "costruisce i diagrammi sui dati")])),
    ],
    "passo-2-materialita": [
        (0, "apertura", dict(
            titolo="La doppia rilevanza", sottotitolo="Il cuore metodologico del percorso",
            testo="{temi} temi predefiniti sui tre pilastri, ciascuno con il suo riferimento ESRS e GRI.",
            agenda=["Rilevanza d'impatto", "Rilevanza finanziaria", "La regola: almeno una", "Tarare la soglia",
                    "Valutato o no", "Proposta ATECO ed evidenze"])),
        (1, "tabella", dict(
            titolo="Rilevanza d'impatto: dall'azienda verso fuori",
            cols=["Punteggio", "Livello", "Effetti su persone e ambiente"],
            righe=[["1", "Trascurabile", "Nessuna incidenza apprezzabile"],
                   ["2", "Lieve", "Limitati, reversibili, circoscritti"],
                   ["3", "Moderato", "Apprezzabili, gestibili con misure ordinarie"],
                   ["4", "Rilevante", "Estesi o difficilmente reversibili"],
                   ["5", "Molto rilevante", "Gravi, diffusi o irreversibili"]])),
        (2, "punti", dict(
            titolo="Rilevanza finanziaria: da fuori verso l'azienda",
            intro="Quanto il tema incide su ricavi, costi, investimenti, accesso a mercati e credito.",
            numerati=False,
            punti=[P("Uno", "nessun effetto apprezzabile"), P("Due", "marginale"),
                   P("Tre", "apprezzabile: costi, investimenti, mercati"),
                   P("Quattro", "rilevante: marginalità o requisiti dei clienti"),
                   P("Cinque", "critico: continuità o mercati chiave")])),
        (3, "evidenza", dict(
            eyebrow="La regola da ricordare",
            titolo="Materiale se raggiunge la soglia su almeno una dimensione.",
            testo="Almeno una, non entrambe: un tema che non costa niente ma produce un danno grave resta materiale. Soglia predefinita {sogliaMaterialitaPredefinita}, regolabile per progetto.")),
        (4, "numeri", dict(
            titolo="Tarare la soglia",
            numeri=[{"n": "8-10", "h": "Temi materiali", "d": "Un equilibrio ragionevole per una PMI, con la soglia predefinita."},
                    {"n": "Quasi tutti", "h": "Valutazioni gonfiate", "d": "Il passo 4 diventa ingestibile."},
                    {"n": "Nessuno", "h": "Soglia alta o valutazioni prudenti", "d": "Si rivedono i punteggi, non la soglia."}])),
        (5, "confronto", dict(
            titolo="Non valutato non è non materiale",
            a={"h": "Non materiale", "sub": "Una posizione", "punti": ["Il tema ha almeno un punteggio", "Resta sotto soglia"]},
            b={"h": "Non valutato", "sub": "Una lacuna", "punti": ["Nessun punteggio", "Conta come tale nell'avanzamento"]})),
        (6, "definizione", dict(
            eyebrow="La proposta dal codice ATECO", titolo="Mai applicata da sola",
            definizione="Suggerisce i temi tipici del settore con il motivo accanto: la accetti o la scarti tema per tema.",
            punti=[P("Una valutazione comparsa da sola", "non la può spiegare nessuno in verifica")])),
        (7, "chiusura", dict(
            titolo="Le evidenze",
            punti=[P("Non entrano nei calcoli", "e per questo si saltano"),
                   P("Sei mesi dopo", "distinguono una valutazione da un'impressione"),
                   P("Due righe per tema", "quali fatti, dati, conversazioni")])),
    ],
    "passo-3-indicatori": [
        (0, "apertura", dict(
            titolo="Gli indicatori", sottotitolo="{indicatori} indicatori in {sezioniKpi} sezioni",
            testo="Tu inserisci i dati grezzi; i derivati li calcola il prodotto, e non si modificano.",
            agenda=["Dove si prendono i dati", "Quattro regole", "Le emissioni: un ponte", "Un derivato che non torna",
                    "Tre interlocutori", "Da dove cominciare"])),
        (1, "punti", dict(
            titolo="Dove si prendono i dati",
            numerati=False,
            punti=[P("Energia", "bollette, schede carburante, inverter, garanzie d'origine"),
                   P("Acqua", "acquedotto, contatore di pozzo, scarichi"),
                   P("Rifiuti e materiali", "registro di carico e scarico, formulari, MUD"),
                   P("Persone", "libro unico, organico al 31 dicembre, UniEmens"),
                   P("Salute e sicurezza", "registro infortuni, denunce INAIL"),
                   P("Formazione e retribuzioni", "attestati, cedolini, certificazione unica"),
                   P("Valore economico e fornitori", "bilancio d'esercizio, partitari, questionari"),
                   P("Governance ed etica", "visura, modello 231, registro segnalazioni")])),
        (2, "cards", dict(
            titolo="Quattro regole per tutta la griglia",
            cards=[P("Anno solare", "Fatture a cavallo d'anno: la competenza si ricostruisce, non si stima."),
                   P("Zero non è vuoto", "Il vuoto la verifica lo conta come non rilevato."),
                   P("Le unità del campo", "Mai convertite a mano: nessun controllo vedrebbe l'errore."),
                   P("L'anno precedente", "Sblocca confronti e variazioni nel documento.")])),
        (3, "evidenza", dict(
            eyebrow="La differenza più grossa col prototipo",
            titolo="Le emissioni non si inseriscono: si leggono dall'inventario GHG.",
            testo="Scope 1 e 2 sono un ponte, non una copia. Un dato in due posti è un dato in nessun posto.")),
        (4, "flusso", dict(
            titolo="Un derivato non torna? Si risale",
            passi=[P("Le unità", "dei dati grezzi: la causa più frequente"),
                   P("I doppi conteggi", "il gasolio della flotta anche nel riscaldamento"),
                   P("I fattori", "dentro l'inventario GHG")])),
        (5, "cards", dict(
            titolo="Tre richieste invece di otto",
            cards=[P("Commercialista", "Bilancio d'esercizio, partitari fornitori, certificazione unica."),
                   P("Consulente del lavoro", "Libro unico, organico, prospetto disabili, ore lavorate."),
                   P("Ufficio tecnico", "Bollette, formulari, MUD, letture dei contatori.")])),
        (6, "split", dict(
            titolo="Da quali sezioni cominciare",
            lead="Da quelle che alimentano i derivati su cui scriverai gli obiettivi al passo 4.",
            punti=[P("Energia", "per i kWh per ora lavorata"), P("Persone", "per le ore lavorate"),
                   P("Valore economico", "per le emissioni per milione di euro di ricavi")])),
    ],
    "passo-4-politiche": [
        (0, "apertura", dict(
            titolo="Politiche, azioni, obiettivi", sottotitolo="Il bilancio comincia a dire qualcosa",
            testo="Le schede compaiono solo per i temi materiali: una pagina vuota vuol dire che si interviene al passo 2.",
            agenda=["Tre campi, tre domande", "Un obiettivo che serve", "Il salvataggio per campo", "Quando la politica non c'è"])),
        (1, "tabella", dict(
            titolo="Tre campi, tre domande",
            cols=["Campo", "Domanda", "Esempio"],
            righe=[["Politica", "Quale impegno formale?", "Politica energetica approvata nel 2024, nel sistema ISO 50001"],
                   ["Azioni", "Che cosa avete fatto nell'anno?", "Illuminazione del reparto rifatta, diagnosi D.Lgs. 102/2014"],
                   ["Obiettivo", "Dove, ed entro quando?", "−15% di kWh per ora lavorata entro il 2027, rispetto al 2024"]])),
        (2, "confronto", dict(
            titolo="Passa la verifica, non passa il cliente",
            a={"h": "«Ridurre i consumi»", "sub": "Un'intenzione",
               "punti": ["Il campo è pieno, la spunta è verde", "Nessuna misura, nessuna scadenza"]},
            b={"h": "Un obiettivo", "sub": "Si può rendicontare", "punti": ["Quanto", "Rispetto a cosa", "Entro quando"]})),
        (3, "evidenza", dict(
            eyebrow="Mentre scrivi",
            titolo="Ogni campo si salva per conto suo.",
            testo="Era un difetto vero, in quattro punti diversi, corretto alla radice: la pagina non rimanda mai la riga intera.")),
        (4, "split", dict(
            titolo="Quando la politica formale non c'è",
            lead="Non si riempie con una frase generica: quasi sempre esiste già qualcosa da citare.",
            punti=[P("Una prassi consolidata", "mai messa per iscritto"),
                   P("Un altro documento", "sistema certificato, modello 231, codice etico"),
                   P("Un contratto", "con un cliente che imponeva requisiti"),
                   P("«In corso di adozione»", "meglio che inventarla o lasciare vuoto")])),
    ],
    "passo-5-racconto": [
        (0, "apertura", dict(
            titolo="Il racconto", sottotitolo="{capitoliReport} capitoli, la parte che si legge davvero",
            testo="Il coinvolgimento degli stakeholder regge la credibilità della materialità.",
            agenda=["Lettera agli stakeholder", "Identità e storia", "Modello di business", "Catena del valore",
                    "Coinvolgimento degli stakeholder", "Nota metodologica", "Impegni per il futuro"])),
        (1, "evidenza", dict(
            eyebrow="L'editor",
            titolo="Incolla da dove vuoi: arriva il testo.",
            testo="Le formattazioni ammesse le fa rispettare il server: da un altro documento non passa niente di eseguibile né di invisibile.")),
        (2, "confronto", dict(
            titolo="Bozze e diagrammi",
            a={"h": "Le bozze", "sub": "Un punto di partenza",
               "punti": ["Nascono dai dati inseriti", "La voce dell'azienda la metti tu"]},
            b={"h": "I diagrammi", "sub": "Calcolati",
               "punti": ["Dal passo 3 e dalla matrice", "Mai sostituiti con immagini fatte altrove"]})),
        (3, "definizione", dict(
            eyebrow="La soglia di completamento", titolo="Oltre {paroleMinimeCapitolo} parole",
            definizione="Distingue un capitolo scritto da un campo toccato per sbaglio. Non è un giudizio editoriale.",
            punti=[P("Una lettera di due righe", "il conteggio è giusto, il capitolo no")])),
        (4, "cards", dict(
            titolo="La voce, che il prodotto non dà",
            cards=[P("Lettera agli stakeholder", "È credibile quando nomina una cosa andata male."),
                   P("Modello di business", "Non che cosa vendete: come si genera valore, e chi lo riceve.")])),
        (5, "chiusura", dict(
            titolo="La nota metodologica",
            punti=[P("Perimetro, periodo, standard", "e criteri di calcolo"),
                   P("Le scelte", "fatte quando un dato mancava"),
                   P("Dati imperfetti e nota onesta", "reggono la verifica"),
                   P("Poco tempo?", "toglilo agli altri capitoli")])),
    ],
    "verifica-bilancio": [
        (0, "apertura", dict(
            titolo="La verifica del bilancio", sottotitolo="Cinque controlli, un elenco di destinazioni",
            testo="Ogni lacuna è un collegamento al punto da sistemare.",
            agenda=["Profilo del passo 1", "Indicatori senza valore dell'anno", "Indicatori senza anno precedente",
                    "Temi materiali senza politica o azioni", "Capitoli sotto soglia"])),
        (1, "evidenza", dict(
            eyebrow="Il più insidioso",
            titolo="Il controllo sull'anno precedente.",
            testo="La colonna del confronto sta a destra e si smette di guardarla. E quei dati vanno richiesti a chi ha già archiviato il file.")),
        (2, "tabella", dict(
            titolo="Completezza, non correttezza",
            cols=["Resta lavoro tuo", "Con che cosa"],
            righe=[["Valore economico", "Quadratura col bilancio d'esercizio"],
                   ["Rifiuti", "Quadratura col MUD"],
                   ["Variazioni", "Una voce che raddoppia vuole un motivo scritto"]])),
        (4, "cards", dict(
            titolo="Che cosa guarda chi riceve il bilancio",
            cards=[P("Addetti e dati collegati", "Ore lavorate, formazione, infortuni: devono tornare fra loro."),
                   P("Temi materiali completi", "Politica, azioni, e un indicatore che li misura."),
                   P("L'anno prima", "Tre o quattro voci a campione.")])),
    ],
    "errori-bilancio": [
        (0, "apertura", dict(
            titolo="Gli errori del bilancio", sottotitolo="I sei che costano più tempo",
            testo="Il primo, come ovunque: azienda o esercizio sbagliato. Te ne accorgi quando un totale non torna col bilancio d'esercizio.",
            agenda=["Emissioni riscritte", "Valutazioni gonfiate", "Temi non valutati", "Vuoto invece di zero", "Unità convertite a mano"])),
        (1, "evidenza", dict(
            eyebrow="Il secondo",
            titolo="Un inventario fatto in fretta per zittire l'avviso è peggio di nessuno.",
            testo="Un avviso visibile è un promemoria; un numero sbagliato è un dato.")),
        (2, "confronto", dict(
            titolo="Due errori opposti sulla materialità",
            a={"h": "Valutazioni gonfiate", "sub": "Quindici temi materiali",
               "punti": ["Quindici schede al passo 4", "Che nessuno compila davvero"]},
            b={"h": "Temi non valutati", "sub": "Sperando che non contino",
               "punti": ["In verifica: che cosa avete deciso?", "Nessuna risposta"]})),
        (3, "chiusura", dict(
            titolo="I più banali, e i più comuni",
            punti=[P("Vuoto invece di zero", "una lacuna al posto di un'informazione"),
                   P("Unità convertite a mano", "kWh scritti in MWh: mille volte, e passa ogni controllo")])),
    ],
}

scrivi("bilancio", SLIDE)
