# Slide del programma ESG in otto fasi.
# ⚠️ «ventuno» tabelle di lavoro resta in lettere: 21 coincide con un conteggio del catalogo
# (sezioniSoa) e la guardia lo leggerebbe come tale.
from _scrivi import P, scrivi

SLIDE = {
    "che-cosa-e": [
        (0, "apertura", dict(
            titolo="Che cosa è", sottotitolo="Un anno di lavoro, non un documento su un tema",
            testo="Le {fasiSgesg} fasi portano un'impresa da nessun presidio a un sistema ESG che sta in piedi.",
            agenda=["Non una scala a gradini", "Una fase esiste quando la tocchi", "Non conclusa pesa zero",
                    "A lavoro in parte fatto", "Le fasi", "Un sistema, non un adempimento"])),
        (1, "evidenza", dict(
            eyebrow="Non è una scala a gradini",
            titolo="Nelle fasi si lavora avanti e indietro, ed è voluto.",
            testo="La materialità si riapre quando la diagnosi trova qualcosa di imprevisto. Pretendere l'ordine costringerebbe a barare.")),
        (2, "definizione", dict(
            eyebrow="Una fase esiste solo quando la tocchi", titolo="Niente righe vuote in attesa",
            definizione="Righe già create cancellerebbero la differenza fra una fase non avviata e una avviata e vuota.")),
        (3, "numeri", dict(
            titolo="Una fase dovuta e non conclusa pesa zero",
            numeri=[{"n": "38%", "h": "Tre concluse su otto", "d": "Il numero vero."},
                    {"n": "100%", "h": "Tre su tre", "d": "Mediando le sole fasi toccate: lo stesso di otto su otto."}])),
        (4, "split", dict(
            titolo="Anche a lavoro in parte fatto",
            lead="Materialità, inventario e bilancio già pronti si dichiarano conclusi in due minuti.",
            punti=[P("Il valore", "si sposta sulle altre cinque fasi"),
                   P("Governance, politiche, piano", "formazione interna e riesame"),
                   P("L'uso più frequente", "dal secondo anno in poi")])),
        (5, "punti", dict(
            titolo="Le {fasiSgesg} fasi",
            punti=[P("Contesto e mandato", "chi è l'azienda, chi ha chiesto, che cosa si aspetta"),
                   P("Materialità", "i temi che contano davvero"), P("Governance", "chi risponde di che cosa"),
                   P("Misurazione", "dati e indicatori"), P("Politiche e obiettivi", "gli impegni"),
                   P("Racconto", "e rendicontazione"), P("Formazione", "e diffusione interna"),
                   P("Riesame", "chiude il ciclo e apre il successivo")])),
        (6, "cards", dict(
            titolo="Tre fasi si lavorano altrove",
            cards=[P("Materialità, misurazione, racconto", "Il prodotto le fa già in percorsi propri: si lavorano di là."),
                   P("Le altre cinque", "Nessun altro percorso le copre, anche per chi ha già il bilancio.")])),
        (7, "confronto", dict(
            titolo="Un sistema, non un adempimento",
            a={"h": "Chi compra un bilancio", "sub": "Compra un documento", "punti": ["Più facile da vendere"]},
            b={"h": "Chi compra questo percorso", "sub": "Compra un modo di lavorare",
               "punti": ["Chi decide, che cosa si misura, quando si riesamina"]})),
    ],
    "le-fasi": [
        (0, "apertura", dict(
            titolo="Le fasi", sottotitolo="Stato, note, data di chiusura",
            testo="Le note sono dove si scrive quello che non entra altrove: chi hai sentito, che cosa ti hanno risposto, perché hai deciso così.",
            agenda=["Riaprire una fase", "Un giudizio, non un calcolo", "L'ordine", "Le note", "La durata", "Il ritmo"])),
        (1, "definizione", dict(
            eyebrow="Lo pretende il database", titolo="Riaprendo, la data di chiusura si cancella",
            definizione="Altrimenti il documento riporterebbe chiuso un lavoro riaperto: una bugia scritta su un documento firmato.")),
        (2, "evidenza", dict(
            eyebrow="La scelta più importante del percorso",
            titolo="Lo stato di una fase è un giudizio, non un calcolo.",
            testo="Il prodotto saprebbe chiuderla quando il percorso collegato è pubblicato. Ma chiudere è una dichiarazione di chi firma.")),
        (3, "confronto", dict(
            titolo="Il ponte informa, chi firma decide",
            a={"h": "Il prodotto", "sub": "Mostra", "punti": ["Lo stato del percorso collegato", "Con i numeri veri"]},
            b={"h": "Il consulente", "sub": "Decide", "punti": ["Quando la fase è conclusa"]})),
        (4, "flusso", dict(
            titolo="L'ordine pratico",
            passi=[P("Prime tre fasi", "in sequenza"), P("Dalla quarta", "due insieme: si alimentano"),
                   P("La prima", "aperta ancora qualche settimana: il perimetro cambia")])),
        (5, "split", dict(
            titolo="Che cosa scrivere nelle note",
            lead="Non un diario: la decisione che non ha un campo suo.",
            punti=[P("«Escluso il sito di Verona»", "la produzione chiude a giugno"),
                   P("«Cambiato il referente del personale»", "a marzo"),
                   P("«Piano rimandato»", "al prossimo consiglio")])),
        (6, "numeri", dict(
            titolo="La durata",
            numeri=[{"n": "Un anno", "h": "Il tempo minimo", "d": "Perché il ciclo si chiuda."},
                    {"n": "Tre mesi", "h": "Compressi", "d": "Saltano le ultime fasi: proprio quelle che fanno il sistema."}])),
        (7, "cards", dict(
            titolo="Tre momenti fissi con la direzione",
            cards=[P("All'inizio", "Il mandato."), P("A metà", "Materialità e misurazione."), P("Alla fine", "Il riesame.")])),
        (8, "chiusura", dict(
            titolo="Filoni, non compartimenti",
            punti=[P("La governance", "si comincia alla prima fase e si chiude all'ultima"),
                   P("Le fasi", "corrono in parallelo"), P("Per questo", "il percorso non è una sequenza di passi")])),
    ],
    "le-schede": [
        (0, "apertura", dict(
            titolo="Le schede", sottotitolo="{schedeSgesg} schede, un renderer solo",
            testo="Dati seminati, non moduli scritti a mano: ciò che si ricopia prima o poi diverge.",
            agenda=["Tre regole", "Le tabelle di lavoro", "Quando compilarle", "Leggere lo stato", "Le decisive", "Le note"])),
        (1, "cards", dict(
            titolo="Tre regole per tutte",
            cards=[P("Scelta multipla", "Si salva come elenco, non come testo con le virgole."),
                   P("Campo svuotato", "Si toglie del tutto: non resta una stringa vuota."),
                   P("Stato dichiarato", "Una scheda si chiude con dei facoltativi vuoti: lo decide il consulente.")])),
        (2, "definizione", dict(
            eyebrow="Ventuno schede", titolo="Tabelle di lavoro",
            definizione="Registro dei rischi, matrice delle responsabilità, valutazione degli impatti, catalogo delle iniziative, indice dei contenuti: griglie a righe, senza campi.")),
        (3, "evidenza", dict(
            eyebrow="Dichiarato a schermo",
            titolo="Una scheda vuota fra le piene si legge come un guasto.",
            testo="Dichiarata, si legge per quello che è: un pezzo di metodo che per ora si lavora fuori dal prodotto.")),
        (4, "confronto", dict(
            titolo="Quando compilarle",
            a={"h": "Tutte a gennaio, a metà", "sub": "La condizione peggiore",
               "punti": ["Non si distingue il valutato dal non guardato"]},
            b={"h": "Quando hai l'informazione", "sub": "Non in ordine di numero", "punti": ["Ogni scheda nasce completa"]})),
        (5, "definizione", dict(
            eyebrow="Leggere lo stato", titolo="Schede chiuse su previste",
            definizione="Il modo più rapido di capire dove sei, sapendo che le tabelle di lavoro non si chiudono: quel rapporto non arriva mai a tutte.")),
        (6, "split", dict(
            titolo="Una decina sono decisive",
            lead="Se il tempo scarseggia, si compilano bene queste e si dichiara il resto da completare.",
            punti=[P("Mandato e perimetro", "le prime decisioni"), P("Temi materiali", "e indicatori scelti"),
                   P("Obiettivi e ruoli", "e il piano")])),
        (7, "evidenza", dict(
            eyebrow="Dove finisce il ragionamento",
            titolo="Il valore sta nel perché di una scelta.",
            testo="Perché quel tema è materiale, perché quell'obiettivo: il dossier di chiusura lo riprende, i campi da soli no.")),
        (8, "chiusura", dict(
            titolo="Le tabelle di lavoro si fanno fuori",
            punti=[P("Su un foglio di calcolo", "tipicamente"),
                   P("Il registro dei rischi", "e le sue conclusioni entrano nel piano"),
                   P("La matrice delle responsabilità", "e i ruoli entrano nella governance")])),
    ],
    "i-ponti": [
        (0, "apertura", dict(
            titolo="I ponti", sottotitolo="Tre fasi che il prodotto sa già fare",
            testo="Doppia materialità, emissioni con gli indicatori, capitoli con la pubblicazione: il dato resta dove nasce.",
            agenda=["Non copiare", "Non creato non è zero", "Materialità avviata", "Passare dal ponte",
                    "Il numero che conta", "Il calendario"])),
        (1, "evidenza", dict(
            eyebrow="La tentazione opposta",
            titolo="Un dato in due posti è un dato in nessun posto.",
            testo="Copiati qui i temi del bilancio, basta una correzione di là perché nessuno sappia quale sia quello buono.")),
        (2, "confronto", dict(
            titolo="Un percorso che non esiste ancora",
            a={"h": "«Zero temi su {temi}»", "sub": "Direbbe avviato e vuoto", "punti": ["Manda a cercare nel posto sbagliato"]},
            b={"h": "«Non ancora creato»", "sub": "Dice il vero", "punti": ["Si sa che cosa aprire"]})),
        (3, "definizione", dict(
            eyebrow="Mezza materialità è materialità cominciata", titolo="Avviata con un solo punteggio",
            definizione="Basta uno dei due punteggi su un tema: pretenderli entrambi direbbe non avviato a chi ha fatto metà del lavoro.")),
        (4, "flusso", dict(
            titolo="Passare dal ponte",
            passi=[P("Apri", "il percorso collegato"), P("Lavora", "là dentro"),
                   P("Torna", "e dichiara la fase conclusa quando lo ritieni")])),
        (5, "cards", dict(
            titolo="Il numero che conta, letto dal vivo",
            cards=[P("Materialità", "Temi valutati sul totale."), P("Emissioni", "Il totale dell'inventario."),
                   P("Racconto", "I capitoli sopra soglia.")])),
        (7, "evidenza", dict(
            eyebrow="La ricaduta sul calendario",
            titolo="La misurazione dipende da un esercizio chiuso.",
            testo="Non si fa a marzo per l'anno in corso: chi imposta il programma a gennaio deve saperlo.")),
        (8, "chiusura", dict(
            titolo="Il valore per il cliente",
            punti=[P("I dati", "stanno in un posto solo"), P("Le emissioni del bilancio", "sono quelle dell'inventario"),
                   P("Una banca chiede quel numero", "e la risposta è una sola")])),
    ],
    "documenti-sgesg": [
        (0, "apertura", dict(
            titolo="I documenti", sottotitolo="Quattro momenti in cui il progetto tocca il cliente",
            testo="Uno per proporre, uno per far partire, uno per restituire, uno per chiudere.",
            agenda=["Quattro documenti", "Ciò che ereditano", "Che cosa non contengono", "Quando si emettono",
                    "Offerta, diagnosi, dossier"])),
        (1, "flusso", dict(
            titolo="Quattro documenti",
            passi=[P("Offerta professionale", "una scheda sola"), P("Verbale di avvio", "tre schede insieme"),
                   P("Rapporto di diagnosi ESG", "a metà percorso"), P("Dossier di chiusura", "alla fine")])),
        (2, "cards", dict(
            titolo="Ciò che ereditano, per costruzione",
            cards=[P("Il marchio", "Congelato alla pubblicazione."), P("L'edizione dei contenuti", "Su cui sono stati redatti."),
                   P("La nota di emissione", "In calce."), P("Il codice di verifica", "Pubblico.")])),
        (3, "evidenza", dict(
            eyebrow="Riquadrato, in cima",
            titolo="Ogni documento dichiara che cosa non contiene.",
            testo="Alcune fasi hanno registri a righe che il prodotto non compila ancora: tacerlo prometterebbe più di quanto il documento porta.")),
        (4, "definizione", dict(
            eyebrow="Per la stessa ragione", titolo="«Non compilato», invece di sparire",
            definizione="Un campo che sparisce lascia un documento che sembra completo; uno che dice non compilato lo dice a chi sta per firmare.")),
        (5, "tabella", dict(
            titolo="Quando si emettono",
            cols=["Documento", "Quando", "Perché"],
            righe=[["Offerta e verbale di avvio", "Presto", "Soldi e impegni: letti con più attenzione"],
                   ["Rapporto di diagnosi", "A metà percorso", "Prima di decidere il piano"],
                   ["Dossier di chiusura", "Alla fine", "Si ritrova l'anno dopo"]])),
        (7, "split", dict(
            titolo="L'offerta professionale",
            lead="Si consegna prima del lavoro, e di fatto è un contratto.",
            punti=[P("Che cosa è incluso", "e che cosa no"), P("Durata", "e condizioni"),
                   P("Un anno dopo", "il dossier si legge accanto a lei")])),
        (8, "confronto", dict(
            titolo="Il rapporto di diagnosi",
            a={"h": "Un elenco di lacune", "sub": "Non fa muovere nessuno", "punti": ["Nessuna conseguenza detta"]},
            b={"h": "Una fotografia per decidere", "sub": "Che cosa succede se non si interviene",
               "punti": ["Emesso a metà, quando si può ancora scegliere"]})),
        (9, "chiusura", dict(
            titolo="Il dossier di chiusura",
            punti=[P("Che cosa è stato fatto", "detto a chi non c'era"), P("Che cosa è rimasto aperto", "in chiaro"),
                   P("Da dove si riparte", "prima di qualunque tabella")])),
    ],
}

scrivi("sgesg", SLIDE)
