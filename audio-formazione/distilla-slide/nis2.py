# Distillazione delle slide NIS2 (nis2 + sgnis2) per il renderer di EvalisDeck.
# `inizia` NON si scrive a mano: si ricava dal copione, così non può divergere.
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
RADICE = Path(r"C:/Users/user/workingnameBilanciotool/audio-formazione")


def P(h, d):
    return {"h": h, "d": d}


SLIDE = {
    # ═══════════════════════════════ AUTOVALUTAZIONE NIS2 ═══════════════════════════════
    "nis2": {
        "chi-rientra": [
            (0, "apertura", dict(
                titolo="Chi rientra", sottotitolo="E a quale titolo",
                testo="Prima di chiedersi quanto un'azienda sia conforme, bisogna stabilire se il decreto le si applica.",
                agenda=["I settori dei due allegati", "Le soglie dimensionali", "I criteri specifici",
                        "Fuori ambito e non determinata", "Il tetto delle sanzioni"])),
            (2, "confronto", dict(
                titolo="Due allegati, due pesi",
                a={"h": "Allegato I", "sub": "{settoriNis2Allegato1} settori ad alta criticità",
                   "punti": ["A parità di dimensione, classificazione più grave", "Una grande impresa qui è essenziale"]},
                b={"h": "Allegato II", "sub": "{settoriNis2Allegato2} altri settori critici",
                   "punti": ["A parità di dimensione, classificazione meno grave", "Una grande impresa qui è importante"]})),
            (3, "numeri", dict(
                titolo="Il parametro dimensionale",
                numeri=[{"n": "50 addetti", "h": "Media impresa", "d": "Oppure da 10 milioni di fatturato."},
                        {"n": "250 addetti", "h": "Grande impresa", "d": "Oppure da 50 milioni di fatturato."},
                        {"n": "Una soglia", "h": "Basta superarne una", "d": "Addetti e fatturato non si sommano e non si mediano."}])),
            (4, "cards", dict(
                titolo="Dall'incrocio, tre esiti",
                cards=[P("Essenziale", "Grande impresa in Allegato I."),
                       P("Importante", "Grande impresa in Allegato II, o media impresa in uno dei due allegati."),
                       P("Fuori ambito", "Micro o piccola impresa, in entrambi gli allegati.")])),
            (5, "evidenza", dict(
                eyebrow="La parte che si sbaglia",
                titolo="I {criteriNis2} criteri specifici scavalcano la dimensione.",
                testo="Una microimpresa che fornisce servizi DNS, o che è l'unico fornitore in Italia di un servizio essenziale, è soggetto essenziale.")),
            (6, "definizione", dict(
                eyebrow="Quando ne ricorrono due", titolo="Prevale il più grave",
                definizione="Non il primo che hai spuntato né quello più in alto nell'elenco: decide il criterio più grave, e con lui il tetto delle sanzioni.",
                punti=[P("Sei criteri", "portano a essenziale"), P("Due criteri", "portano a importante")])),
            (7, "confronto", dict(
                titolo="Fuori ambito non è non determinata",
                a={"h": "Fuori ambito", "sub": "È una determinazione",
                   "punti": ["Settore elencato e dimensione nota", "Il decreto non si applica", "Si scrive in un documento firmato"]},
                b={"h": "Non determinata", "sub": "Nessuna conclusione",
                   "punti": ["Manca la dimensione", "Oppure il settore non è negli allegati", "Non vale come fuori ambito"]})),
            (9, "numeri", dict(
                titolo="Il tetto delle sanzioni, articolo 38",
                numeri=[{"n": "10 milioni", "h": "Soggetto essenziale", "d": "Oppure il 2% del fatturato mondiale annuo, se superiore."},
                        {"n": "7 milioni", "h": "Soggetto importante", "d": "Oppure l'1,4% del fatturato mondiale annuo."}])),
            (10, "split", dict(
                titolo="L'esito porta la sua ragione",
                lead="Accanto alla classificazione c'è sempre la via da cui viene: senza, non la difendi davanti a chi verifica.",
                punti=[P("Grande impresa", "in Allegato I"), P("Criterio specifico", "con il suo numero"),
                       P("Settore non elencato", "quando la strada non porta a una conclusione")])),
            (11, "chiusura", dict(
                titolo="Da portare via",
                punti=[P("Prima l'ambito", "un errore qui si porta dietro tutto il resto"),
                       P("I criteri specifici", "prevalgono sulla dimensione"),
                       P("Fuori ambito", "è una determinazione, non un vuoto"),
                       P("Valutazione preliminare", "la qualificazione definitiva compete all'Autorità")],
                prossimo={"titolo": "La scala da zero a quattro", "testo": "Come si valuta ciascun requisito, e perché il tre è caro."})),
        ],
        "la-scala": [
            (0, "apertura", dict(
                titolo="La scala da zero a quattro", sottotitolo="E perché il tre è caro",
                testo="{requisitiNis2Autovalutazione} requisiti su {capiNis2} capi, ciascuno valutato su cinque gradini.",
                agenda=["I cinque livelli", "Il salto dal due al tre", "Il livello obiettivo",
                        "Non applicabile", "Come si conduce la verifica"])),
            (1, "tabella", dict(
                titolo="Cinque gradini, cinque definizioni",
                cols=["Livello", "Nome", "Che cosa pretende"],
                righe=[["0", "Assente", "Non attuata né pianificata"],
                       ["1", "Pianificata", "Definita o pianificata, non ancora attuata"],
                       ["2", "Attuata parzialmente", "Su una parte del perimetro, o non sistematica"],
                       ["3", "Attuata", "Sull'intero perimetro, con evidenza documentale"],
                       ["4", "Attuata e verificata", "In più, efficacia misurata e verificata periodicamente"]])),
            (2, "evidenza", dict(
                eyebrow="Il salto che decide",
                titolo="Dal due al tre c'è una parola: evidenza.",
                testo="«Lo facciamo» vale due. «Lo facciamo su tutto e c'è un documento che lo prova» vale tre.")),
            (4, "flusso", dict(
                titolo="Che cosa aggiunge ogni gradino",
                passi=[P("Due", "la misura c'è, su una parte"),
                       P("Tre", "su tutto il perimetro, con un documento"),
                       P("Quattro", "e qualcuno misura periodicamente se funziona")])),
            (5, "punti", dict(
                titolo="Il livello obiettivo", intro="Quello che l'organizzazione si dà: di norma tre.",
                punti=[P("Non entra", "nel calcolo della conformità"), P("Non cambia", "la classificazione"),
                       P("Decide", "che cosa è uno scostamento"), P("Dà una scala", "al piano di adeguamento")])),
            (6, "split", dict(
                titolo="Obiettivo quattro su tutto?",
                lead="Sembra ambizione, ed è una promessa che di solito non si mantiene.",
                punti=[P("Misurare l'efficacia", "di ogni singola misura"), P("Con una periodicità", "e registrandola"),
                       P("Per una piccola o media impresa", "un carico che nessuno sostiene")])),
            (7, "definizione", dict(
                eyebrow="Il requisito che non riguarda il cliente", titolo="Non applicabile",
                definizione="Esce dal denominatore: chi dichiara che un requisito non lo riguarda non risulta inadempiente su quel requisito.",
                punti=[P("È una valutazione", "che qualcuno firma e può dover motivare"), P("Azzera il livello", "nessun numero resta accanto")])),
            (9, "confronto", dict(
                titolo="Non applicabile e non valutato",
                a={"h": "Non applicabile", "sub": "L'hai deciso", "punti": ["È una determinazione", "Esce dal denominatore"]},
                b={"h": "Non valutato", "sub": "Non l'hai ancora guardato", "punti": ["È un vuoto", "Resta nel conteggio"]})),
            (10, "cards", dict(
                titolo="Due consigli sul lavoro",
                cards=[P("Comincia da dove c'è già qualcosa", "accessi, backup e autenticazione: le risposte arrivano in mezz'ora."),
                       P("L'evidenza si scrive mentre valuti", "nome, data e posizione del documento, con il cliente davanti.")])),
            (12, "chiusura", dict(
                titolo="Da portare via",
                punti=[P("Il tre", "vuole l'evidenza documentale"), P("Il quattro", "vuole la misura dell'efficacia"),
                       P("L'obiettivo", "decide gli scostamenti, non la percentuale"),
                       P("Non applicabile", "è una dichiarazione firmata"),
                       P("Niente è definitivo", "finché non pubblichi un documento")],
                prossimo={"titolo": "Più bassa del previsto", "testo": "Perché un requisito non valutato pesa zero."})),
        ],
        "un-requisito-non-valutato": [
            (0, "apertura", dict(
                titolo="Più bassa del previsto", sottotitolo="La percentuale e il requisito non valutato",
                testo="Tre requisiti su venti, tutti al massimo: la conformità dice 15%, non cento.",
                agenda=["La regola", "Perché non si media", "La formula", "Scostamento e istruttoria", "Come si presenta l'avanzamento"])),
            (1, "evidenza", dict(
                eyebrow="La regola",
                titolo="Un requisito applicabile e non valutato pesa zero.",
                testo="E resta nel denominatore. È la regola che distingue questo strumento dal foglio di calcolo.")),
            (2, "numeri", dict(
                titolo="Tre situazioni, un numero solo",
                numeri=[{"n": "100%", "h": "Tre conformi su venti", "d": "Il foglio media soltanto ciò che hai guardato."},
                        {"n": "100%", "h": "Tutti e venti conformi", "d": "Lo stesso numero."},
                        {"n": "100%", "h": "Tre conformi, diciassette mai aperti", "d": "Ancora lo stesso numero."}])),
            (4, "definizione", dict(
                eyebrow="La formula", titolo="Conformità",
                definizione="Somma dei pesi dei requisiti applicabili, divisa per il numero dei requisiti applicabili.",
                punti=[P("Non applicabili", "escono da entrambi i termini"), P("Non valutati", "zero sopra, uno sotto")])),
            (5, "split", dict(
                titolo="Che cosa misura la percentuale",
                lead="Non la media di ciò che hai guardato: quanto è stato dimostrato sul totale di ciò che va dimostrato.",
                punti=[P("A schermo", "quanti requisiti restano da valutare"), P("Accanto", "che pesano zero nella percentuale"),
                       P("Perché", "un 8% il primo giorno non sembri un guasto")])),
            (6, "confronto", dict(
                titolo="Scostamento o istruttoria",
                a={"h": "Scostamento", "sub": "Valutato, sotto l'obiettivo", "punti": ["Entra nel piano", "Con priorità e termine"]},
                b={"h": "Non valutato", "sub": "Lavoro da finire", "punti": ["Non entra nel piano", "È istruttoria, non un'azione"]})),
            (8, "evidenza", dict(
                eyebrow="Da dire al cliente il primo giorno",
                titolo="La percentuale bassa non dice che siete messi male.",
                testo="Dice che il lavoro non è ancora stato fatto, e salirà perché avrete dato le risposte.")),
            (9, "tabella", dict(
                titolo="A metà lavoro, due numeri insieme",
                cols=["Numero", "Valore", "Che cosa dice"],
                righe=[["Conformità", "30%", "quanto è dimostrato oggi"],
                       ["Valutati", "70 su {requisitiNis2Autovalutazione}", "a che punto è il mandato"],
                       ["Da valutare", "i restanti", "pesano zero solo perché non sono stati aperti"]])),
            (11, "chiusura", dict(
                titolo="Da portare via",
                punti=[P("Non valutato", "pesa zero e resta nel denominatore"),
                       P("Mediare i valutati", "premia chi salta i requisiti scomodi"),
                       P("Scostamento", "è valutato sotto l'obiettivo; il non valutato è istruttoria"),
                       P("Stessa regola", "anche per i controlli del sistema di gestione")],
                prossimo={"titolo": "Le ore che non si recuperano", "testo": "I termini di notifica dell'articolo 25."})),
        ],
        "incidenti-e-termini": [
            (0, "apertura", dict(
                titolo="Le ore che non si recuperano", sottotitolo="I termini dell'articolo 25",
                testo="Tutto il resto si recupera. Un termine di notifica mancato resta scritto, e l'Autorità lo guarda.",
                agenda=["Tre adempimenti, tre termini", "Da che cosa decorrono", "L'ora del giorno", "I cinque stati", "Chi notifica di notte"])),
            (1, "timeline", dict(
                titolo="Tre adempimenti, tre termini",
                tappe=[{"t": "24 ore", "h": "Pre notifica", "d": "Dalla conoscenza dell'incidente."},
                       {"t": "72 ore", "h": "Notifica", "d": "Dalla stessa conoscenza."},
                       {"t": "1 mese", "h": "Relazione finale", "d": "Dalla notifica, non dalla conoscenza."}])),
            (3, "confronto", dict(
                titolo="Da che cosa decorrono",
                a={"h": "Pre notifica e notifica", "sub": "Dalla conoscenza",
                   "punti": ["L'istante in cui l'ente lo sa", "Non quando è avvenuto", "Non quando è risolto"]},
                b={"h": "Relazione finale", "sub": "Dalla notifica",
                   "punti": ["Senza notifica non decorre", "Non è scaduta: non è cominciata"]})),
            (4, "numeri", dict(
                titolo="Perché serve anche l'ora",
                numeri=[{"n": "24 ore", "h": "Il termine della pre notifica", "d": "calcolato da una mezzanotte inventata"},
                        {"n": "12 ore", "h": "L'errore possibile", "d": "in un verso o nell'altro, su un termine perentorio"}])),
            (5, "definizione", dict(
                eyebrow="Il secondo motivo", titolo="Tempo coordinato universale",
                definizione="I calcoli non si fanno nell'ora locale: col cambio dell'ora legale, ventiquattro ore locali valgono ventitré o venticinque ore reali.",
                punti=[P("Succede", "due volte l'anno, e non si vede finché non capita")])),
            (6, "cards", dict(
                titolo="I cinque stati di un termine",
                cards=[P("Nei termini", "fatto in tempo"), P("In corso", "il termine non è vicino"),
                       P("In scadenza", "resta meno di un quarto del tempo"), P("Scaduto", "passato, e non fatto"),
                       P("Fuori termine", "fatto, ma dopo la scadenza")])),
            (7, "evidenza", dict(
                eyebrow="L'ultimo stato",
                titolo="Fatto in ritardo resta fuori termine.",
                testo="Non torna nei termini per il fatto di essere stato fatto: è proprio ciò che l'Autorità guarda.")),
            (8, "punti", dict(
                titolo="L'ora della conoscenza", intro="Va raccolta mentre l'incidente è in corso.",
                punti=[P("Ricostruita dopo", "è sempre più tarda del vero"),
                       P("Più tarda del vero", "fa sembrare rispettato un termine che non lo era")])),
            (9, "flusso", dict(
                titolo="Un incidente di venerdì sera",
                passi=[P("Venerdì sera", "l'incidente viene conosciuto"), P("Sabato sera", "scade la pre notifica"),
                       P("La domanda vera", "chi la esegue di notte, e chi lo sostituisce")])),
            (11, "split", dict(
                titolo="La pre notifica non è una notifica ridotta",
                lead="È un avviso iniziale che fa partire l'orologio dell'Autorità.",
                punti=[P("Si fa subito", "anche quando non si sa quasi niente"),
                       P("L'errore più comune", "aspettare il quadro completo e mancare il primo termine")])),
            (12, "chiusura", dict(
                titolo="Da portare via",
                punti=[P("Pre notifica e notifica", "decorrono dalla conoscenza"), P("Relazione finale", "decorre dalla notifica"),
                       P("Data e ora", "in tempo coordinato universale"), P("Fuori termine", "resta scritto"),
                       P("Il presidio", "funziona anche di notte e nei festivi")],
                prossimo={"titolo": "Procedure, registri e relazione", "testo": "Che cosa trovi già scritto e che cosa esce alla fine."})),
        ],
        "corpus-e-documento": [
            (0, "apertura", dict(
                titolo="Procedure, registri e relazione", sottotitolo="Che cosa trovi scritto e che cosa esce",
                testo="{procedureNis2} procedure, {moduliNis2} moduli e {registriNis2} registri già pronti sui riferimenti del decreto.",
                agenda=["Il corpus documentale", "Lo stato dei documenti", "La relazione immutabile",
                        "Che cosa dichiara in apertura", "Il codice di verifica"])),
            (1, "split", dict(
                titolo="Si personalizzano in due modi",
                lead="Il materiale non è pensato per essere adottato così com'è.",
                punti=[P("Segnaposto", "il sistema li riempie con i dati dell'organizzazione"),
                       P("Blocchi di testo", "da riscrivere quando la procedura non descrive il cliente")])),
            (2, "cards", dict(
                titolo="Lo stato di ogni documento",
                cards=[P("Da personalizzare", "com'è nel catalogo"), P("In redazione", "ci si sta lavorando"),
                       P("Approvata", "adottata dall'organizzazione"), P("Non applicabile", "una scelta, non una dimenticanza")])),
            (3, "evidenza", dict(
                eyebrow="La relazione sul livello di conformità",
                titolo="Ogni versione pubblicata è immutabile.",
                testo="Se domani correggi un dato, la relazione consegnata non cambia: la prossima sarà la revisione due.")),
            (5, "definizione", dict(
                eyebrow="In apertura, riquadrato", titolo="Che cosa il documento non contiene",
                definizione="La classificazione è una valutazione preliminare: la qualificazione definitiva compete all'Autorità.",
                punti=[P("I non valutati", "pesano zero, non sono esclusi dal calcolo")])),
            (7, "flusso", dict(
                titolo="Il codice di verifica",
                passi=[P("Riceve il documento", "cliente, ente o azienda a valle"),
                       P("Digita il codice", "su una pagina pubblica, senza account"),
                       P("Vede chi l'ha emesso", "per quale azienda, che documento, quale revisione")])),
            (8, "confronto", dict(
                titolo="Autentico e superato",
                a={"h": "Autentico", "sub": "Per sempre", "punti": ["Il documento è nostro", "Dice ciò che diceva quel giorno"]},
                b={"h": "Superato", "sub": "Col tempo", "punti": ["Il catalogo può cambiare", "La pagina di verifica lo dice"]})),
            (9, "punti", dict(
                titolo="Come si lavora con le procedure",
                intro="Aprirle tutte e riscriverle è il modo più veloce per non finirne nessuna.",
                punti=[P("Lasciale da personalizzare", "all'inizio"), P("Compila prima la verifica", "dei requisiti"),
                       P("Apri solo quelle necessarie", "le indica il piano di adeguamento")])),
            (10, "chiusura", dict(
                titolo="Da portare via",
                punti=[P("Le procedure", "si personalizzano e si adottano"), P("I registri", "non si scrivono: si tengono"),
                       P("La relazione", "è immutabile e dichiara i suoi limiti"), P("Il codice", "conferma l'autenticità a chiunque")])),
        ],
    },

    # ══════════════════════════════ SISTEMA DI GESTIONE NIS2 ══════════════════════════════
    "sgnis2": {
        "dal-check-up-al-sistema": [
            (0, "apertura", dict(
                titolo="Dal check up al sistema", sottotitolo="Che cosa cambia rispetto all'autovalutazione",
                testo="Il primo percorso dice a che punto siamo. Il secondo come ci arriviamo, e come restiamo lì.",
                agenda=["Quattro cose in più", "Le risposte non si danno due volte", "Le sei viste",
                        "Quando proporre il secondo mandato", "Che cosa condividono"])),
            (1, "numeri", dict(
                titolo="Quello che il sistema aggiunge",
                numeri=[{"n": "{controlliNis2}", "h": "Controlli", "d": "ciascuno con la sua frequenza di riverifica"},
                        {"n": "{fasiNis2}", "h": "Fasi della roadmap", "d": "in un ordine che funziona sul campo"},
                        {"n": "{indicatoriNis2}", "h": "Indicatori", "d": "di attuazione e di efficacia"},
                        {"n": "{requisitiNis2}", "h": "Requisiti", "d": "due in più dell'autovalutazione"}])),
            (2, "evidenza", dict(
                eyebrow="Le risposte non si danno due volte",
                titolo="È la stessa riga, non una copia.",
                testo="Il requisito valutato nell'autovalutazione è già valutato nel sistema di gestione, e viceversa.")),
            (3, "confronto", dict(
                titolo="Una riga sola, non due copie",
                a={"h": "Due copie", "sub": "L'alternativa", "punti": ["Due risposte alla stessa domanda", "Due documenti che si contraddicono"]},
                b={"h": "Una riga sola", "sub": "La scelta", "punti": ["Una risposta sola", "Un dato in un posto solo"]})),
            (5, "cards", dict(
                titolo="Le sei viste del sistema",
                cards=[P("Quadro", "conformità, avanzamento, scadenze"), P("Roadmap", "le fasi e il loro avanzamento"),
                       P("Controlli", "con il loro stato"), P("Indicatori", "attuazione ed efficacia"),
                       P("Verifica", "i requisiti, condivisa"), P("Documenti", "procedure e pubblicazione")])),
            (6, "split", dict(
                titolo="Non è uno stepper",
                lead="In un sistema di gestione si lavora avanti e indietro per mesi.",
                punti=[P("Gli indicatori", "si tarano dopo i primi dati"), P("La roadmap", "si aggiorna quando una fase si sblocca"),
                       P("I controlli", "si rivedono a ogni scadenza")])),
            (7, "definizione", dict(
                eyebrow="Quando proporlo", titolo="Il secondo mandato",
                definizione="Non dopo la relazione, quando il cliente pensa di aver finito: mentre la si costruisce, quando vede che la percentuale sale facendo, non compilando meglio.")),
            (8, "tabella", dict(
                titolo="Che cosa condividono i due percorsi",
                cols=["Elemento", "Autovalutazione", "Sistema di gestione"],
                righe=[["Profilo dell'azienda", "sì", "sì"], ["Classificazione d'ambito", "sì", "sì"],
                       ["Risposte ai requisiti", "sì", "sì"], ["Controlli e roadmap", "no", "sì"],
                       ["Indicatori e documenti del sistema", "no", "sì"]])),
            (10, "chiusura", dict(
                titolo="Da portare via",
                punti=[P("Il sistema", "contiene per intero l'autovalutazione"), P("Le risposte", "sono la stessa riga"),
                       P("Nessuna sequenza obbligata", "si lavora avanti e indietro"),
                       P("Il momento giusto", "per proporlo è durante l'autovalutazione")],
                prossimo={"titolo": "La roadmap e i termini", "testo": "Nove e diciotto mesi da una data sola."})),
        ],
        "roadmap-e-termini": [
            (0, "apertura", dict(
                titolo="La roadmap", sottotitolo="E i termini che decorrono da una data sola",
                testo="Dalla comunicazione di inserimento nell'elenco dei soggetti decorrono i due termini che contano.",
                agenda=["Nove e diciotto mesi", "La registrazione annuale", "Quando la data manca", "Le fasi", "Avanzamento e stato"])),
            (1, "timeline", dict(
                titolo="I termini dalla comunicazione",
                tappe=[{"t": "9 mesi", "h": "Obblighi di notifica", "d": "articolo 25"},
                       {"t": "18 mesi", "h": "Misure di gestione del rischio", "d": "articolo 24"},
                       {"t": "28 febbraio", "h": "Registrazione", "d": "da rinnovare ogni anno"}])),
            (2, "evidenza", dict(
                eyebrow="Se la data manca",
                titolo="I termini non sono scaduti: non sono cominciati.",
                testo="Il prodotto lo dice a parole invece di mostrare un contatore a zero, che si leggerebbe come fuori termine.")),
            (4, "definizione", dict(
                eyebrow="Dove si inserisce", titolo="Ambito e assetto",
                definizione="La vista condivisa con l'autovalutazione: la data si scrive una volta e vale per tutti e due i percorsi.")),
            (5, "flusso", dict(
                titolo="Le {fasiNis2} fasi della roadmap",
                passi=[P("Governance", "delibera, ruoli, registrazione"), P("Conoscenza", "attivi, servizi, fornitori, rischi"),
                       P("Presidi essenziali", "notifica, backup, autenticazione, vulnerabilità"),
                       P("Consolidamento", "fornitura, crittografia, continuità"), P("Verifica", "audit, indicatori, riesame")])),
            (7, "split", dict(
                titolo="Perché si comincia dalla governance",
                lead="Senza la delibera dell'organo e senza i ruoli, tutto il resto non ha chi lo decide.",
                punti=[P("La seconda fase", "è la più lunga e la più ingrata"), P("Senza inventario", "non si può proteggere niente")])),
            (8, "confronto", dict(
                titolo="Avanzamento e stato della fase",
                a={"h": "Avanzamento", "sub": "Si misura", "punti": ["Viene dai controlli dei capi", "Non si fa salire dichiarando"]},
                b={"h": "Stato", "sub": "Si dichiara", "punti": ["Non avviata, in corso, completata", "È un giudizio di chi conduce"]})),
            (10, "numeri", dict(
                titolo="Come raccontare i due termini",
                numeri=[{"n": "9 mesi", "h": "Sembrano tanti", "d": "ma la notifica è una catena da provare, anche di notte"},
                        {"n": "18 mesi", "h": "Sembrano pochi", "d": "e lo sono se l'inventario comincia tardi"}])),
            (11, "chiusura", dict(
                titolo="Da portare via",
                punti=[P("Una data sola", "la comunicazione di inserimento nell'elenco"),
                       P("Senza la data", "i termini non sono cominciati"),
                       P("Le fasi", "non si sovrappongono"), P("Lo stato", "è un tuo giudizio, l'avanzamento no"),
                       P("A ritroso", "dalla scadenza dei diciotto mesi")],
                prossimo={"titolo": "Attuato non vuol dire verificato", "testo": "La regola che un'ispezione trova in dieci minuti."})),
        ],
        "attuato-non-e-verificato": [
            (0, "apertura", dict(
                titolo="Attuato non vuol dire verificato", sottotitolo="La regola che un'ispezione trova in dieci minuti",
                testo="{controlliNis2} controlli, quattro stati dichiarati e una frequenza di riverifica.",
                agenda=["La frequenza di riverifica", "Da verificare", "Mai verificato vale scaduto",
                        "Come si pesa l'attuazione", "Frequenze e responsabili"])),
            (1, "numeri", dict(
                titolo="La frequenza di riverifica",
                numeri=[{"n": "365 giorni", "h": "Delibera annuale", "d": "una volta l'anno"},
                        {"n": "90 giorni", "h": "Riesame degli accessi", "d": "ogni trimestre"},
                        {"n": "30 giorni", "h": "Scansione delle vulnerabilità", "d": "ogni mese"}])),
            (2, "evidenza", dict(
                eyebrow="La regola meno ovvia",
                titolo="Un attuato mai più guardato torna da verificare.",
                testo="Quando l'ultima verifica è più vecchia della frequenza, lo stato effettivo cambia da solo.")),
            (4, "tabella", dict(
                titolo="Dichiarato ed effettivo",
                cols=["Dichiarato", "Ultima verifica", "Stato effettivo"],
                righe=[["Attuato", "un mese fa, frequenza 365 giorni", "Attuato"],
                       ["Attuato", "tre anni fa, frequenza 365 giorni", "Da verificare"],
                       ["Attuato", "nessuna registrata", "Da verificare"],
                       ["In attuazione", "—", "In attuazione"]])),
            (6, "definizione", dict(
                eyebrow="La conseguenza pratica", titolo="Un lavoro che si tiene",
                definizione="Il primo anno si dichiarano i controlli. Dal secondo il lavoro è tenerli verdi: riverificare e annotare.")),
            (7, "cards", dict(
                titolo="Come pesa l'attuazione",
                cards=[P("Attuato", "vale uno"), P("In attuazione", "vale mezzo"),
                       P("Da verificare", "vale mezzo: efficacia non dimostrata oggi"),
                       P("Non attuato", "vale zero, e un controllo mai toccato resta nel denominatore"),
                       P("Non applicabile", "esce dal denominatore")])),
            (9, "split", dict(
                titolo="Dichiarato accanto a effettivo",
                lead="Mostrare soltanto lo stato effettivo sarebbe più pulito, e incomprensibile.",
                punti=[P("Chi vede un controllo in rosso", "deve sapere che era stato dichiarato attuato"),
                       P("Altrimenti", "pensa che il prodotto abbia perso il dato")])),
            (10, "punti", dict(
                titolo="Rivedere le frequenze", intro="Sono la promessa di quanto spesso qualcuno farà una cosa.",
                punti=[P("Rivedile con il cliente", "almeno quelle a trenta e novanta giorni"),
                       P("Una frequenza disattesa", "tiene il sistema sempre in rosso"),
                       P("Meglio più lunga e vera", "che più breve e disattesa")])),
            (11, "evidenza", dict(
                eyebrow="Il riquadro in cima",
                titolo="Le righe si scorrono, le caselle si guardano.",
                testo="Una casella per controllo, colorata per stato effettivo: dove si concentrano i problemi si vede prima di leggere un nome.")),
            (12, "flusso", dict(
                titolo="Dal secondo anno si lavora così",
                passi=[P("Filtro sulle scadenze", "solo i controlli in scadenza"), P("Riverifica", "e registrazione dell'evidenza"),
                       P("Responsabile", "un nome accanto a ogni controllo")])),
            (14, "chiusura", dict(
                titolo="Da portare via",
                punti=[P("Frequenza scaduta", "l'attuato torna da verificare"), P("Mai verificato", "vale come scaduto"),
                       P("Il lavoro", "non si consegna: si tiene"), P("Il responsabile", "decide se le riverifiche si fanno"),
                       P("Conformità e attuazione", "rispondono a due domande diverse")],
                prossimo={"titolo": "Attuazione ed efficacia", "testo": "Perché lo stesso numero può essere buono o pessimo."})),
        ],
        "indicatori": [
            (0, "apertura", dict(
                titolo="Attuazione ed efficacia", sottotitolo="E il verso che rovescia il giudizio",
                testo="{indicatoriNis2} indicatori su otto ambiti, in due famiglie che rispondono a domande diverse.",
                agenda=["Due famiglie", "Il verso di miglioramento", "Target e soglia", "Un target assente", "Quali scegliere per primi"])),
            (1, "confronto", dict(
                titolo="Due famiglie di indicatori",
                a={"h": "Attuazione", "sub": "Quanto ne abbiamo fatto",
                   "punti": ["Copertura dell'autenticazione a più fattori", "Controlli attuati sul catalogo", "Fornitori critici valutati"]},
                b={"h": "Efficacia", "sub": "Ha funzionato?",
                   "punti": ["Pre notifiche entro le 24 ore", "Tempo medio di contenimento", "Clic nelle simulazioni di phishing"]})),
            (3, "punti", dict(
                titolo="Quanti indicatori il primo anno", intro="Non caricarne {indicatoriNis2}.",
                punti=[P("Tre o quattro", "di attuazione"), P("Due", "di efficacia"), P("Misurati davvero", "valgono più di tabelle vuote")])),
            (4, "cards", dict(
                titolo="Il verso di miglioramento",
                cards=[P("Clic nel phishing che scendono", "è un risultato"), P("Copertura MFA che scende", "è un disastro"),
                       P("Scritto a parole", "il verso non si affida a una freccia colorata")])),
            (6, "tabella", dict(
                titolo="Da target e soglia, lo stato",
                cols=["Condizione", "Stato"],
                righe=[["Oltre il target", "A target"], ["Fra soglia e target", "In attenzione"],
                       ["Oltre la soglia, nel verso peggiore", "Fuori target"], ["Soglia senza target", "Si giudica sulla soglia"],
                       ["Né target né soglia", "Non valutabile"]])),
            (7, "evidenza", dict(
                eyebrow="La trappola classica",
                titolo="Un target assente non è un target a zero.",
                testo="Letto come numero, un campo vuoto fa risultare a target ogni indicatore mai tarato.")),
            (8, "split", dict(
                titolo="Si copiano nel sistema",
                lead="Gli indicatori di base non si riferiscono al catalogo.",
                punti=[P("Il target", "si tara su quel cliente"), P("La formula", "si adatta al dato che c'è"),
                       P("Ricaricarli", "non riporta indietro le tarature")])),
            (10, "definizione", dict(
                eyebrow="Le rilevazioni", titolo="L'ultima è quella del periodo più recente",
                definizione="Non l'ultima inserita: un dato di marzo scritto a giugno non scavalca quello di aprile.")),
            (12, "confronto", dict(
                titolo="Scostamento zero e scostamento vuoto",
                a={"h": "Zero", "sub": "Esattamente sul bersaglio", "punti": ["Un'ottima notizia"]},
                b={"h": "Vuoto", "sub": "Nessun target", "punti": ["Non si scrive zero", "Sarebbe una notizia falsa"]})),
            (14, "chiusura", dict(
                titolo="Da portare via",
                punti=[P("Attuazione", "quanto ne abbiamo fatto"), P("Efficacia", "se ha funzionato"),
                       P("Il verso", "rovescia il giudizio sullo stesso numero"), P("Target assente", "non è un target a zero"),
                       P("Per primi", "indicatori con un dato che esiste già"), P("Almeno uno", "che possa peggiorare")],
                prossimo={"titolo": "La relazione, e chi la riceve", "testo": "Perché il destinatario è l'organo di amministrazione."})),
        ],
        "relazione-e-organo": [
            (0, "apertura", dict(
                titolo="La relazione, e chi la riceve", sottotitolo="L'organo di amministrazione",
                testo="L'articolo 23 gli attribuisce l'approvazione delle misure e la responsabilità per la loro violazione.",
                agenda=["Chi risponde", "Due documenti per due lettori", "Lo stato effettivo congelato",
                        "Che cosa non contiene", "Il ritmo delle relazioni"])),
            (1, "evidenza", dict(
                eyebrow="Non un destinatario formale",
                titolo="L'organo risponde, personalmente.",
                testo="Consegnare la relazione al responsabile informatico e non all'organo è un lavoro tecnico corretto che manca il punto giuridico.")),
            (2, "confronto", dict(
                titolo="Due documenti, due lettori",
                a={"h": "Relazione sul sistema", "sub": "Va all'organo",
                   "punti": ["Ambito e termini in corso", "Roadmap, controlli, indicatori", "Si legge in mezz'ora"]},
                b={"h": "Catalogo dei controlli", "sub": "Lo sfoglia l'ispettore",
                   "punti": ["Un controllo per riga", "Stato effettivo e responsabile", "Ultima e prossima verifica"]})),
            (4, "definizione", dict(
                eyebrow="Che cosa congela", titolo="Lo stato effettivo",
                definizione="Non quello dichiarato: se un controllo era attuato ma la verifica era scaduta, il documento lo dice.",
                punti=[P("Il giorno dopo", "un controllo può scadere, e la relazione non cambia")])),
            (6, "split", dict(
                titolo="In apertura, riquadrato",
                lead="Ogni relazione dichiara che cosa non contiene.",
                punti=[P("Lo stato", "è quello alla data di emissione"), P("Le evidenze", "restano presso l'organizzazione")])),
            (7, "cards", dict(
                titolo="Revisione e codice di verifica",
                cards=[P("Numero di revisione", "per confrontare due relazioni a distanza di un anno"),
                       P("Codice di verifica", "per confermarne l'autenticità, senza account")])),
            (8, "timeline", dict(
                titolo="Il ritmo delle relazioni",
                tappe=[{"t": "Avvio", "h": "La prima relazione", "d": "numeri bassi e roadmap davanti"},
                       {"t": "6 o 12 mesi", "h": "Le successive", "d": "dimostrano che le decisioni sono seguite"},
                       {"t": "Fine", "h": "Una sola non basta", "d": "dimostra il risultato, non chi lo seguiva"}])),
            (9, "punti", dict(
                titolo="Che cosa portare in riunione", intro="L'elenco è breve, e conviene rispettarlo.",
                punti=[P("La classificazione", "con la ragione da cui viene"), P("I termini in corso", "con i giorni che restano"),
                       P("Lo stato effettivo", "dei controlli"), P("Gli indicatori", "se ci sono già rilevazioni")])),
            (11, "chiusura", dict(
                titolo="Da portare via",
                punti=[P("Il destinatario", "è l'organo che risponde"), P("Due documenti", "per due lettori"),
                       P("Lo stato effettivo", "congelato alla data di emissione"),
                       P("Il catalogo", "si rigenera prima di ogni verifica")])),
        ],
    },
}


def main():
    riepilogo = []
    for corso, sezioni in SLIDE.items():
        copione = json.loads((RADICE / corso / "script.json").read_text(encoding="utf-8"))
        paragrafi = {s["id"]: [p.strip() for p in s["script"].split("\n\n") if p.strip()] for s in copione["sezioni"]}
        voci = []
        for sez, elenco in sezioni.items():
            if sez not in paragrafi:
                raise SystemExit(f"sezione sconosciuta {corso}/{sez}")
            for p, layout, campi in elenco:
                par = paragrafi[sez]
                if p >= len(par):
                    raise SystemExit(f"{corso}/{sez}: p {p} oltre i {len(par)} paragrafi")
                inizia = " ".join(par[p].split()[:6])
                voci.append({"sezione": sez, "p": p, "inizia": inizia, "layout": layout, **campi})
        (RADICE / corso / "slide.json").write_text(json.dumps(voci, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        conta = {}
        for v in voci:
            conta[v["layout"]] = conta.get(v["layout"], 0) + 1
        riepilogo.append((corso, len(voci), conta))
    for corso, n, conta in riepilogo:
        print(f"{corso}: {n} slide · " + ", ".join(f"{k} {v}" for k, v in sorted(conta.items(), key=lambda x: -x[1])))


main()
