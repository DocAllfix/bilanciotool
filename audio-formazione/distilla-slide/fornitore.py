# Slide dell'autovalutazione ESG del fornitore.
# ⚠️ Le soglie delle fasce (supplier-bands.json) non stanno in NUMERI: non si scrivono sulle
# slide, perché diventerebbero numeri a mano che nessuna guardia confronta col catalogo.
from _scrivi import P, scrivi

SLIDE = {
    "anagrafica-e-richiesta": [
        (0, "apertura", dict(
            titolo="Anagrafica e richiesta", sottotitolo="Due colonne che non sono anagrafica",
            testo="A sinistra l'azienda valutata; a destra la richiesta del committente: chi è, quale punteggio minimo, entro quando.",
            agenda=["La soglia", "Se il committente non la indica", "La richiesta originale", "La dimensione",
                    "Il referente interno", "Il termine di consegna"])),
        (1, "definizione", dict(
            eyebrow="Il campo che governa tutto il resto", titolo="La soglia",
            definizione="La tacca sulla barra del quadro di sintesi, i punti che mancano, e la direzione in cui ordina il piano.",
            punti=[P("Senza soglia", "il piano ordina verso nessun posto")])),
        (2, "evidenza", dict(
            eyebrow="Se il committente non la indica",
            titolo="Non lasciare la soglia predefinita.",
            testo="Scegli quella della fascia che l'azienda vuole raggiungere, e annota che è una scelta vostra. Altrimenti si festeggia un obiettivo che nessuno ha posto.")),
        (3, "split", dict(
            titolo="La richiesta originale, sotto gli occhi",
            lead="Non ricostruita da una telefonata.",
            punti=[P("Sessanta o sessantacinque", "cambia il piano di settimane di lavoro"),
                   P("Il termine", "decide se le azioni lunghe hanno senso")])),
        (4, "confronto", dict(
            titolo="La dimensione serve a leggere, non a classificare",
            a={"h": "Dieci persone", "sub": "Stesso punteggio", "punti": ["La formalizzazione che manca pesa poco"]},
            b={"h": "Duecento persone", "sub": "Stesso punteggio", "punti": ["Quella formalizzazione è sostanza"]})),
        (5, "cards", dict(
            titolo="Il referente interno",
            cards=[P("Scelto perché ha accesso", "Ai documenti, e può convocare gli altri: qualità, amministrazione, titolare."),
                   P("Scelto perché ha tempo", "Allunga il lavoro di settimane, che allo studio nessuno paga.")])),
        (6, "chiusura", dict(
            titolo="Il termine di consegna",
            punti=[P("Tre settimane", "non bastano a raggiungere la soglia"),
                   P("Il piano, allora", "dimostra che l'azienda sa dove sta"),
                   P("Dillo prima", "a chi si aspetta un salto di trenta punti")])),
    ],
    "questionario": [
        (0, "apertura", dict(
            titolo="Il questionario", sottotitolo="{domandeFornitore} domande su {areeFornitore} aree",
            testo="Ogni domanda porta il riferimento normativo, l'evidenza attesa e un peso da 1 a 3.",
            agenda=["Quattro risposte", "Non applicabile o nessuna risposta", "La regola dell'evidenza", "Dettagli d'uso",
                    "Le aree", "L'ordine della sessione"])),
        (1, "tabella", dict(
            titolo="Quattro risposte",
            cols=["Risposta", "Vale", "Quando"],
            righe=[["Sì", "Pieno", "Requisito soddisfatto, evidenza reperibile oggi"],
                   ["In parte", "Metà", "C'è, ma incompleto, non aggiornato o non formalizzato"],
                   ["No", "Zero", "Assente: diventa un'azione nel piano"],
                   ["Non applicabile", "Esce dal conto", "Il requisito non riguarda l'attività"]])),
        (2, "confronto", dict(
            titolo="Non applicabile non è nessuna risposta",
            a={"h": "Non applicabile", "sub": "Una scelta", "punti": ["Conta come valutata", "Esce dal punteggio"]},
            b={"h": "Nessuna risposta", "sub": "Una lacuna", "punti": ["Esce anche dalle valutate", "Saltare non alza l'indice"]})),
        (3, "evidenza", dict(
            eyebrow="La regola dell'evidenza",
            titolo="Sì solo se il documento esiste, ed è reperibile oggi.",
            testo="Da cercare, ricostruire o firmare: è «in parte». È esattamente ciò che il committente chiederà di vedere.")),
        (4, "cards", dict(
            titolo="Due dettagli d'uso",
            cards=[P("Ripremere annulla", "La stessa risposta premuta di nuovo si cancella."),
                   P("La nota interna", "Stato, chi se ne occupa, dove sta la bozza: la ritrovi nel piano.")])),
        (6, "punti", dict(
            titolo="Dal vivo, con il referente accanto",
            intro="E con l'accesso ai documenti aperto.",
            punti=[P("L'evidenza prima del Sì", "non dopo"), P("Chiedere dopo", "significa tornare su venti domande"),
                   P("La nota", "si scrive mentre la persona parla")])),
        (7, "cards", dict(
            titolo="Le {areeFornitore} aree, prima di aprirle",
            cards=[P("Governo della sostenibilità", "Quasi sempre la più scoperta: documenti formali mai scritti."),
                   P("Ambiente", "Spesso messa meglio di quanto l'azienda crede."),
                   P("Lavoro e diritti umani", "Molti requisiti coincidono con adempimenti già assolti."),
                   P("Etica e conformità", "Dipende quasi tutta dal modello organizzativo."),
                   P("Catena di fornitura", "La più giovane, e scoperta ovunque.")])),
        (8, "split", dict(
            titolo="L'ordine della sessione",
            lead="Cominciare dalle lacune produce un'ora di no e un referente che si difende.",
            punti=[P("Prima Ambiente e Lavoro", "arrivano le risposte positive"),
                   P("A metà il governo", "quando la fiducia c'è")])),
        (9, "chiusura", dict(
            titolo="Le note interne",
            punti=[P("Durante il colloquio", "con le parole del referente"),
                   P("«La tiene Marco nella cartella condivisa»", "dice più di «non formalizzato»"),
                   P("Sei mesi dopo", "riprendi il lavoro invece di ricominciarlo")])),
    ],
    "come-si-calcola": [
        (0, "apertura", dict(
            titolo="Come si calcola", sottotitolo="Tre passaggi, e un quarto valore",
            testo="Capirli spiega perché certe azioni fanno salire il punteggio e altre quasi no.",
            agenda=["Il punteggio di area", "L'indice pesato", "Il valore di ogni domanda", "L'ordine del piano",
                    "Che cosa muove l'indice", "Leggere per area"])),
        (1, "tabella", dict(
            titolo="Un'area, domanda per domanda",
            cols=["Domanda", "Peso", "Risposta", "Porta"],
            righe=[["Prima", "2", "Sì", "200"], ["Seconda", "2", "In parte", "100"], ["Terza", "1", "No", "0"],
                   ["Quarta", "2", "Sì", "200"], ["Quinta", "—", "Non applicabile", "Esce dal conto"],
                   ["Area", "", "", "500 su 700: 71"]])),
        (2, "numeri", dict(
            titolo="L'indice: una media pesata",
            numeri=[{"n": "25%", "h": "Ambiente, Lavoro, Etica", "d": "Ciascuna."},
                    {"n": "15%", "h": "Catena di fornitura", "d": "Sul totale."},
                    {"n": "10%", "h": "Governo della sostenibilità", "d": "Sul totale."},
                    {"n": "Fuori", "h": "Aree non valutate", "d": "Escono dalla media invece di contare zero."}])),
        (4, "definizione", dict(
            eyebrow="Il quarto valore", titolo="Quanto sposta una domanda",
            definizione="I punti dell'indice che guadagni portandola a Sì: lo spostamento della sua area, per il peso dell'area.",
            punti=[P("Dieci punti in Ambiente", "valgono due volte e mezzo quelli nel Governo")])),
        (5, "evidenza", dict(
            eyebrow="L'ordine del piano",
            titolo="Punti recuperati, diviso giornate.",
            testo="In cima le azioni che rendono di più per il tempo che costano: per avvicinarti alla soglia, lavora dall'alto della lista.")),
        (6, "confronto", dict(
            titolo="Che cosa muove l'indice",
            a={"h": "Azione completata", "sub": "Non lo muove", "punti": ["Una riga verde nel piano, e basta"]},
            b={"h": "Risposta portata a Sì", "sub": "Lo muove", "punti": ["L'azione esce dal piano da sola"]})),
        (7, "split", dict(
            titolo="Lo stesso cinquantotto, due situazioni",
            lead="L'indice serve al committente; all'azienda servono i punteggi per area.",
            punti=[P("Quattro aree sopra soglia, una molto sotto", "si sistema con un intervento mirato"),
                   P("Cinquantotto uniforme", "richiede un programma")])),
    ],
    "piano-fornitore": [
        (0, "apertura", dict(
            titolo="Il piano", sottotitolo="Non si scrive: si genera",
            testo="Ogni No e ogni In parte producono un'azione, con l'impatto già calcolato e una stima di giornate.",
            agenda=["Efficienza e logica", "Le giornate", "L'errore più comune", "Negoziare il tempo",
                    "Il responsabile", "Le scadenze"])),
        (2, "confronto", dict(
            titolo="Efficienza e logica",
            a={"h": "Il prodotto", "sub": "Dà l'efficienza", "punti": ["Punti recuperati per giornata"]},
            b={"h": "Il consulente", "sub": "Mette la logica del progetto",
               "punti": ["La materialità prima degli obiettivi", "Anche se costa più giornate"]})),
        (3, "definizione", dict(
            eyebrow="Non un preventivo", titolo="Le giornate",
            definizione="Un ordine di grandezza per pianificare: mezza giornata o due settimane, non quanto fatturerai.",
            punti=[P("Il costo", "dipende da chi esegue e da quanto materiale c'è già")])),
        (4, "evidenza", dict(
            eyebrow="L'errore più comune del percorso",
            titolo="Righe verdi nel piano, indice fermo.",
            testo="Chiusa l'azione, torna alla domanda e portala a Sì: l'azione esce dal piano da sola e l'indice sale.")),
        (5, "numeri", dict(
            titolo="Il piano negozia il tempo",
            numeri=[{"n": "5", "h": "Le prime azioni", "d": "Portate al referente con l'impatto in punti accanto."},
                    {"n": "5 punti", "h": "Per due giornate", "d": "Una frase che una direzione capisce."}])),
        (6, "split", dict(
            titolo="Il responsabile è una persona",
            lead="L'ufficio acquisti non fa niente; Laura fa.",
            punti=[P("Azioni piccole", "nessuna urgente presa da sola"), P("Senza un nome", "restano tutte ferme insieme")])),
        (7, "chiusura", dict(
            titolo="Le scadenze",
            punti=[P("Non tutte alla stessa data", "è il modo più rapido di renderle inutili"),
                   P("A due o tre settimane", "l'una dall'altra, nell'ordine del piano"),
                   P("Ogni chiusura", "un piccolo risultato che tiene vivo il lavoro")])),
    ],
    "evidenze-e-attestato": [
        (0, "apertura", dict(
            titolo="Evidenze e attestato", sottotitolo="Il fascicolo, prima che lo chiedano",
            testo="I documenti attesi dalle {domandeFornitore} domande, per area: assente, in redazione, disponibile, non applicabile.",
            agenda=["Allineare evidenze e risposte", "Che cosa porta l'attestato", "La natura del documento",
                    "Tre controlli", "Il fascicolo", "Quando pubblicare"])),
        (1, "evidenza", dict(
            eyebrow="Non si sincronizzano",
            titolo="A fine sessione, allinea le evidenze alle risposte.",
            testo="Un Sì con il documento assente, o un documento disponibile accanto a un No: il committente li vede al primo sguardo.")),
        (2, "cards", dict(
            titolo="Che cosa porta l'attestato",
            cards=[P("Esito e punteggi", "per area, con le barre"), P("Risposte", "con le note"),
                   P("Piano", "e scala delle fasce"), P("Riferimenti", "normativi"),
                   P("Codice di verifica", "controllabile dal sito, senza account")])),
        (3, "definizione", dict(
            eyebrow="Non si tocca", titolo="Autovalutazione, non certificazione",
            definizione="Il paragrafo riquadrato sulla natura del documento non si toglie e non si riformula: tutela chi rilascia l'attestato.",
            punti=[P("Presentarlo come certificazione", "è un rischio reputazionale e legale, e ricade su di te")])),
        (4, "punti", dict(
            titolo="Tre controlli prima di pubblicare",
            punti=[P("Tutte le domande", "con una risposta, non applicabile compreso"),
                   P("Le evidenze dei Sì", "disponibili e raccolte"),
                   P("L'anagrafica completa", "committente e partita IVA compaiono solo se compilati")])),
        (5, "split", dict(
            titolo="Il fascicolo come cartella vera",
            lead="Il committente chiede tre o quattro evidenze a campione, quasi sempre le più impegnative.",
            punti=[P("I documenti dei Sì", "raccolti in una cartella"),
                   P("Nominati come le domande", "e la richiesta diventa una mail di due minuti")])),
        (6, "chiusura", dict(
            titolo="Quando pubblicare",
            punti=[P("Non subito", "dopo il questionario"),
                   P("Prima un giro", "sulle evidenze e sul quadro, col referente"),
                   P("Ripubblicato dopo una settimana", "con numeri migliori, si nota")])),
    ],
    "errori-fornitore": [
        (0, "apertura", dict(
            titolo="La sessione, e gli errori", sottotitolo="Mezza giornata con l'azienda davanti",
            testo="Questo percorso quasi sempre si fa dal vivo, non da soli in ufficio.",
            agenda=["Come si conduce", "Sei errori", "Il tono", "La rivalutazione", "Il valore per l'azienda"])),
        (1, "flusso", dict(
            titolo="Come si conduce",
            passi=[P("Anagrafica", "con la richiesta del committente"), P("Questionario", "col referente e i documenti"),
                   P("Evidenze", "allineate alle risposte"), P("Quadro", "distanza dalla soglia e priorità"),
                   P("Piano e attestato", "responsabili, rivalutazione, poi l'attestato")])),
        (2, "confronto", dict(
            titolo="Due errori che gonfiano l'indice",
            a={"h": "Il Sì di buona volontà", "sub": "Senza documento", "punti": ["Figura pessima quando chiedono le evidenze"]},
            b={"h": "Non applicabile al posto del No", "sub": "Denominatore ridotto", "punti": ["Punteggio indifendibile"]})),
        (3, "tabella", dict(
            titolo="Altri quattro errori",
            cols=["Errore", "Effetto"],
            righe=[["Domande senza risposta", "Indice non confrontabile"],
                   ["Azione chiusa, risposta ferma", "Il piano gira a vuoto"],
                   ["Evidenze non allineate", "Il committente dubita del resto"],
                   ["Lavorare sull'area più leggera", "Molto sforzo, pochi punti"]])),
        (4, "evidenza", dict(
            eyebrow="Il tono",
            titolo="Non è un'ispezione.",
            testo="Chi si sente esaminato risponde Sì per non sfigurare. Detto all'inizio che un no oggi vale più di un sì fragile, le risposte cambiano.")),
        (5, "definizione", dict(
            eyebrow="Il lavoro ricorrente", titolo="La rivalutazione",
            definizione="Si aggiorna quando le azioni si chiudono, e il committente quasi sempre la chiede ogni anno.",
            punti=[P("Chi sa che ci tornerà", "scrive le note per sé fra un anno")])),
        (6, "chiusura", dict(
            titolo="Il valore per l'azienda",
            punti=[P("Il committente", "la chiede per selezionare i fornitori"),
                   P("Il piano", "è l'unico elenco ordinato di cose da fare in sostenibilità"),
                   P("Per lo studio", "la differenza fra un incarico e una relazione")])),
    ],
}

scrivi("fornitore", SLIDE)
