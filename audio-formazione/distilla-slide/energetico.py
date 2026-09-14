# Slide del bilancio energetico (diagnosi EN 16247-1 / riesame ISO 50001).
# ⚠️ Intervalli con cifre del catalogo (15, 25…) si scrivono col trattino corto «15-25%»: il
# trattino lungo non è fra i separatori che la guardia sui numeri riconosce.
from _scrivi import P, scrivi

SLIDE = {
    "passo-1-sito": [
        (0, "apertura", dict(
            titolo="Il sito", sottotitolo="Tre scelte che decidono tutti i numeri",
            testo="Sembra un modulo anagrafico, e non lo è: cambiare queste scelte più avanti significa rifare il lavoro.",
            agenda=["Lo standard di riferimento", "Il perimetro", "L'unità di produzione", "Il profilo del sito", "Marchio e copertina"])),
        (1, "confronto", dict(
            titolo="Lo standard cambia l'indice del documento",
            a={"h": "EN 16247-1", "sub": "Diagnosi energetica", "punti": ["L'impostazione di partenza"]},
            b={"h": "ISO 50001", "sub": "Riesame energetico", "punti": ["Se è questo che serve al cliente"]})),
        (2, "evidenza", dict(
            eyebrow="Il perimetro",
            titolo="La domanda è: che cosa avete escluso, e perché?",
            testo="Un perimetro dichiarato largo e compilato stretto è la prima incoerenza: basta confrontarlo con le fatture del passo 2.")),
        (3, "definizione", dict(
            eyebrow="Il denominatore di ogni indicatore", titolo="L'unità di produzione",
            definizione="Tonnellate, pezzi, metri quadri, litri: si sceglie una volta e si tiene ferma.",
            punti=[P("Se la cambi", "il confronto con l'anno base perde senso, e nessuno se ne accorge")])),
        (4, "split", dict(
            titolo="I {profiloAttesiEnergia} campi del profilo",
            lead="La visura camerale ne copre quattro: tienila sottomano prima di cominciare.",
            punti=[P("Forma giuridica", "e sede legale"), P("Settore", "e codice ATECO"),
                   P("Stabilimento", "indirizzo e attività svolte"), P("Referente", "che risponde dei dati"),
                   P("Turni di lavoro", "per leggere i consumi a stabilimento fermo")])),
        (5, "chiusura", dict(
            titolo="Da portare via",
            punti=[P("Lo standard", "si sceglie prima di scrivere"), P("Le esclusioni", "si dichiarano qui"),
                   P("L'unità di produzione", "resta ferma negli anni"),
                   P("Marchio e copertina", "vanno sulla prima pagina"),
                   P("I contenuti metodologici", "si congelano quando crei l'esercizio")])),
    ],
    "passo-2-vettori": [
        (0, "apertura", dict(
            titolo="I vettori energetici", sottotitolo="L'inventario dell'energia che entra",
            testo="{vettori} tipi fra elettrico, termico e trazione: una riga per vettore, e quelle che non ti riguardano restano vuote.",
            agenda=["Da dove arriva ogni numero", "Tre regole per tutte le righe", "Due errori frequenti", "I mesi e il carico di base"])),
        (1, "tabella", dict(
            titolo="Da dove arriva ogni numero",
            cols=["Vettore", "Fonte del dato"],
            righe=[["Energia elettrica", "Fatture per fascia, per competenza sull'anno solare"],
                   ["Garanzie d'origine", "Contratto di fornitura, in una riga sua"],
                   ["Fotovoltaico autoconsumato", "Inverter: produzione meno energia immessa"],
                   ["Gas naturale", "Fatture; processo e riscaldamento dall'andamento mensile"],
                   ["Gasolio, GPL, olio combustibile", "Registro di carico e scarico"],
                   ["Biomassa, calore, flotta", "Bolle, fatture del fornitore, schede carburante"]])),
        (2, "cards", dict(
            titolo="Tre regole per tutte le righe",
            cards=[P("Zero non è vuoto", "Vettore assente: vuoto. Presente con consumo nullo: zero."),
                   P("I mesi", "Almeno per elettrico e gas: stagionalità e consumo a stabilimento fermo."),
                   P("Il costo", "Dà il prezzo medio: senza, il ritorno degli interventi non si calcola.")])),
        (3, "confronto", dict(
            titolo="Due errori che si vedono spesso",
            a={"h": "Gasolio sommato", "sub": "Riscaldamento più autotrazione",
               "punti": ["Fattori diversi, righe distinte", "Falsa ripartizione ed emissioni"]},
            b={"h": "Fotovoltaico immesso", "sub": "Contato come consumo",
               "punti": ["Quell'energia l'hai venduta", "Conta solo l'autoconsumo"]})),
        (4, "numeri", dict(
            titolo="Il carico di base",
            numeri=[{"n": "15-25%", "h": "Del totale", "d": "L'energia consumata anche quando il sito non produce, su molti stabilimenti."},
                    {"n": "Agosto", "h": "E fine anno", "d": "I mesi di fermata da cui si stima."},
                    {"n": "Il primo", "h": "Intervento che ripaga", "d": "Luci accese, compressori a vuoto, cicli di mantenimento."}])),
    ],
    "passo-3-usi": [
        (0, "apertura", dict(
            titolo="Gli usi finali", sottotitolo="Dove va a finire l'energia",
            testo="{usiFinali} usi finali su {areeEnergia} aree funzionali: si attivano solo quelli pertinenti al sito.",
            agenda=["Le aree funzionali", "La quadratura", "La tolleranza", "I metodi", "Il calcolatore", "Il fattore di carico"])),
        (1, "cards", dict(
            titolo="Le {areeEnergia} aree funzionali",
            cards=[P("Attività principali", "Forni, formatura, finitura, essiccazione: realizzano il prodotto."),
                   P("Servizi ausiliari", "Aria compressa, freddo, pompaggi, ventilazione, vapore."),
                   P("Servizi generali", "Climatizzazione degli ambienti, illuminazione, uffici."),
                   P("Trasporti", "Dai carrelli di piazzale ai mezzi su strada.")])),
        (2, "confronto", dict(
            titolo="Il segno del residuo dice che cosa cercare",
            a={"h": "Residuo positivo", "sub": "Manca energia attribuita",
               "punti": ["Un'utenza dimenticata", "Una quota sottostimata"]},
            b={"h": "Residuo negativo", "sub": "Attribuita più di quella entrata",
               "punti": ["Una stima gonfiata da qualche parte"]})),
        (3, "evidenza", dict(
            eyebrow="La tolleranza",
            titolo="±{tolleranzaQuadraturaPct}% è il valore di partenza, non una norma.",
            testo="Se il tuo caso ne chiede un altro, cambialo e dichiaralo nel capitolo metodologico. Taciuto, è la prima cosa che un verificatore trova.")),
        (4, "tabella", dict(
            titolo="Metodi dichiarati: il 35% dell'avanzamento",
            cols=["Metodo", "Da dove viene il valore"],
            righe=[["Misurato", "Contatore dedicato o campagna di misura"],
                   ["Calcolato", "Grandezze misurate e bilanci di impianto"],
                   ["Stimato", "Potenza installata e ore di funzionamento"]])),
        (5, "definizione", dict(
            eyebrow="Il calcolatore di stima", titolo="Prima approssimazione",
            definizione="kWh stimati = potenza media assorbita × ore di funzionamento × fattore di carico.",
            punti=[P("Un comando", "riversa il risultato nella cella")])),
        (6, "evidenza", dict(
            eyebrow="L'errore singolo più frequente",
            titolo="Il fattore di carico non è mai uno.",
            testo="Per i forni a induzione sta fra 0,55 e 0,75. A uno gonfia gli usi, e abbassare un'altra voce finché torna sposta l'errore invece di toglierlo.")),
        (7, "chiusura", dict(
            titolo="Dove spendere una misura vera",
            punti=[P("Sull'utenza dominante", "di solito il processo termico primario"),
                   P("Un errore del 10% lì", "sposta più di tutto il resto"),
                   P("Un contatore dedicato", "vale più di dieci stime sulle utenze marginali")])),
    ],
    "passo-4-indicatori": [
        (0, "apertura", dict(
            titolo="Driver e indicatori", sottotitolo="I denominatori di tutto il resto",
            testo="{driverAttesi} variabili: produzione, superfici, volume riscaldato, addetti, ore, gradi giorno, fatturato.",
            agenda=["I gradi giorno effettivi", "Gli indicatori calcolati", "Il confronto con l'anno base",
                    "Vuoto, non zero", "Volume o efficienza"])),
        (1, "confronto", dict(
            titolo="Gradi giorno: effettivi, non di zona",
            a={"h": "Di zona", "sub": "Costante amministrativa",
               "punti": ["Uguali ogni anno", "Un inverno mite sembra un risparmio"]},
            b={"h": "Effettivi", "sub": "Dell'esercizio", "punti": ["Normalizzano sull'inverno vero", "Tolgono di mezzo il clima"]})),
        (2, "cards", dict(
            titolo="Fra i {indicatoriEnergia} indicatori calcolati",
            cards=[P("Consumo specifico di processo", "kWh per unità prodotta"),
                   P("Intensità primaria", "tep per unità: per i confronti di settore"),
                   P("Elettrico specifico", "kWh per metro quadro coperto"),
                   P("Termico normalizzato", "kWh per metro cubo e grado giorno: l'unico onesto fra due stagioni")])),
        (3, "evidenza", dict(
            eyebrow="L'errore più costoso del passo",
            titolo="Senza i driver dell'anno base, gli indicatori non dimostrano niente.",
            testo="Il documento riporta i numeri dell'anno e basta. Te ne accorgi alla fine, quando i dati vanno recuperati da chi ha chiuso il file.")),
        (4, "definizione", dict(
            eyebrow="Una scelta deliberata", titolo="Vuoto, non zero",
            definizione="Un indicatore senza denominatore resta vuoto: zero kWh per unità si leggerebbe come produrre senza consumare.",
            punti=[P("Il prototipo", "restituiva zero")])),
        (5, "tabella", dict(
            titolo="Un indicatore peggiora: quale storia?",
            cols=["Causa", "Come si riconosce", "Che cosa significa"],
            righe=[["Effetto volume", "Consumo assoluto fermo o in calo, specifico in salita", "Si è prodotto meno, nessuno spreco"],
                   ["Efficienza", "Consumo in salita a parità di produzione", "Un problema vero"]])),
    ],
    "passo-5-interventi": [
        (0, "apertura", dict(
            titolo="Gli interventi", sottotitolo="Il programma di miglioramento",
            testo="La parte che il committente legge per prima, e spesso l'unica. Gli scartati si tengono: la risposta scritta vale più di un ricordo.",
            agenda=["I due conti", "Quando il passo è completo", "La trappola dei costi", "Come presentarli"])),
        (1, "definizione", dict(
            titolo="I due conti",
            definizione="Risparmio in euro = quantità risparmiata × prezzo medio. Tempo di ritorno = (investimento − incentivi) ÷ risparmio annuo.",
            punti=[P("Gli incentivi", "hanno un campo loro: si vede quanto valgono")])),
        (2, "cards", dict(
            titolo="Completo con {interventiAttesi} interventi quantificati",
            cards=[P("Energia evitata", "in kWh e tep"), P("Emissioni evitate", "in tonnellate di CO₂ equivalente"),
                   P("Quota sul sito", "del consumo totale"), P("Risparmio e ritorno", "in euro e in anni")])),
        (3, "evidenza", dict(
            eyebrow="La trappola, nata due passi prima",
            titolo="Senza il costo del vettore, il tempo di ritorno resta vuoto.",
            testo="Zero si leggerebbe «rientra subito». Prima i costi al passo 2, poi gli interventi al passo 5.")),
        (4, "confronto", dict(
            titolo="Presentarli in due gruppi",
            a={"h": "Ritorno breve", "sub": "Investimento basso",
               "punti": ["Si fanno subito", "Costruiscono fiducia", "Spesso regolazioni e spegnimenti"]},
            b={"h": "Strutturali", "sub": "Nel bilancio dell'anno prossimo",
               "punti": ["Accompagnati dal risparmio assoluto", "Non dal solo tempo di ritorno"]})),
    ],
    "passo-6-racconto": [
        (0, "apertura", dict(
            titolo="Il racconto", sottotitolo="{capitoliEnergia} capitoli discorsivi",
            testo="Coprono il documento dall'inizio alla fine.",
            agenda=["Sintesi per la direzione", "Sito e attività", "Impianti e utenze", "Metodo di raccolta e ripartizione",
                    "Lettura del bilancio", "Programma di miglioramento", "Piano di monitoraggio"])),
        (1, "split", dict(
            titolo="I diagrammi si calcolano dai dati",
            lead="Mai grafici incollati da fuori: al primo dato corretto direbbero altro dalle tabelle accanto.",
            punti=[P("Sankey", "dai vettori alle aree funzionali"), P("Pareto", "degli usi finali, con la cumulata"),
                   P("Andamento", "mensile"), P("Indicatori", "contro l'anno base"), P("Interventi", "in barre divergenti")])),
        (2, "evidenza", dict(
            eyebrow="La soglia di completamento",
            titolo="Oltre {paroleMinimeCapitolo} parole un capitolo è scritto, non credibile.",
            testo="È una soglia tecnica: distingue un capitolo da un campo toccato per sbaglio. Un capitolo credibile è molto più lungo.")),
    ],
    "verifica-e-documento": [
        (0, "apertura", dict(
            titolo="La verifica e il documento", sottotitolo="Controlli da anticipare, non da subire",
            testo="Sapere che cosa guarda la verifica permette di prepararsi mentre si lavora.",
            agenda=["I sette controlli", "Il limite", "Prima di pubblicare", "Le domande del verificatore"])),
        (1, "punti", dict(
            titolo="Sette controlli",
            intro="Il più utile riguarda i driver dell'anno base: è l'unico su un anno già chiuso.",
            punti=[P("Profilo", "del sito e perimetro"), P("Vettori", "con il costo annuo"),
                   P("Quadratura", "residui oltre ±{tolleranzaQuadraturaPct}%"), P("Usi finali", "con il metodo dichiarato"),
                   P("Driver", "dell'esercizio e dell'anno base"), P("Interventi", "descrizione, quantità, investimento"),
                   P("Capitoli", "sopra la soglia di testo")])),
        (2, "tabella", dict(
            titolo="La verifica, e il suo limite",
            cols=["Può dirti", "Non può dirti"],
            righe=[["Che il residuo sta entro la tolleranza", "Che ci sta perché hai abbassato una voce"],
                   ["Che il fattore di carico è compilato", "Che vale uno, e tutto il resto è gonfio"]])),
        (3, "evidenza", dict(
            eyebrow="Prima di pubblicare",
            titolo="Guarda il selettore dell'anno.",
            testo="Il documento si costruisce sull'esercizio aperto in quel momento, e da lì in poi non cambia più.")),
        (4, "cards", dict(
            titolo="Le tre domande del verificatore",
            cards=[P("Che cosa avete escluso", "dal perimetro, e perché"),
                   P("Che cosa avete misurato", "invece di stimare"),
                   P("Gradi giorno e driver", "dell'anno base: come li avete ottenuti")])),
    ],
    "fattori-energia": [
        (0, "apertura", dict(
            titolo="I fattori di conversione", sottotitolo="Tre per ogni vettore",
            testo="kWh al potere calorifico inferiore, tep di energia primaria, kg di CO₂ equivalente: finiscono nel capitolo metodologico.",
            agenda=["Per azienda, non per studio", "Il cambio di fattore", "Gli errori più frequenti", "Le garanzie d'origine"])),
        (1, "confronto", dict(
            titolo="Si sovrascrivono per azienda, non per studio",
            a={"h": "Per studio", "sub": "Sbagliato", "punti": ["Cambieresti il cippato di tutti i clienti"]},
            b={"h": "Per azienda", "sub": "Giusto",
               "punti": ["Il potere calorifico è di quell'impianto", "Verificato ogni anno, con fonte e anno"]})),
        (2, "evidenza", dict(
            eyebrow="Un numero credibile e sbagliato",
            titolo="Un fattore cambiato e non dichiarato misura il cambio, non il risparmio.",
            testo="Lo stesso consumo può comparire migliorato del 7%. Il rimedio è una riga nel capitolo metodologico.")),
        (3, "punti", dict(
            titolo="Gli errori più frequenti",
            punti=[P("Azienda o esercizio", "sbagliato"), P("Gasolio", "riscaldamento e autotrazione sommati"),
                   P("Fotovoltaico immesso", "contato come consumo"), P("Fattore di carico", "lasciato a uno"),
                   P("Driver dell'anno base", "non compilati"), P("Interventi", "prima dei costi"),
                   P("Vuoto", "dove volevi scrivere zero")])),
        (4, "confronto", dict(
            titolo="Garanzie d'origine: due letture",
            a={"h": "Localizzazione", "sub": "Quanto si è emesso", "punti": ["Fattore medio della rete nazionale"]},
            b={"h": "Mercato", "sub": "Che cosa si è comprato",
               "punti": ["Fattore contrattuale per la quota certificata", "Residual mix per il resto"]})),
    ],
}

scrivi("energetico", SLIDE)
