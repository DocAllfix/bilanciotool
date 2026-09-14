# Slide dell'inventario GHG (ISO 14064-1). Nessuna cifra per i conteggi del catalogo:
# si usano i segnaposto di NUMERI. I riferimenti ai punti della norma restano scritti.
from _scrivi import P, scrivi

SLIDE = {
    "passo-1-confini": [
        (0, "apertura", dict(
            titolo="I confini dell'inventario", sottotitolo="Il contratto su cui si reggono i numeri",
            testo="La norma chiede di dichiarare quali unità entrano prima di contare una sola tonnellata.",
            agenda=["Confini organizzativi", "Unità nel perimetro", "Confini di rendicontazione",
                    "Periodo e metodo", "Set di GWP e dati del periodo", "Il confine congelato"])),
        (1, "split", dict(
            titolo="Il consolidamento, punto 5.1",
            lead="Una scelta fra tre approcci, applicata a tutte le unità e mantenuta negli anni.",
            punti=[P("Controllo operativo", "quasi sempre la scelta giusta per una PMI"),
                   P("Controllo finanziario", "o quota di partecipazione, le alternative"),
                   P("Uniforme", "su tutte le unità del perimetro"),
                   P("Stabile", "cambiarlo a metà impone il ricalcolo del passo 6")])),
        (2, "evidenza", dict(
            eyebrow="Il rilievo più frequente in verifica",
            titolo="Escludere si può. Escludere senza dirlo, no.",
            testo="Un magazzino affittato a terzi si lascia fuori benissimo; senza una riga che lo spieghi diventa una lacuna.")),
        (3, "punti", dict(
            titolo="I criteri di significatività, punto 5.2.4",
            intro="Si dichiarano prima di usarli, non quando i numeri sono già usciti.",
            punti=[P("Una soglia", "quantitativa"), P("L'influenza", "dell'organizzazione sulla sorgente"),
                   P("La rilevanza", "per gli stakeholder"), P("Il rischio", "legato alla sorgente")])),
        (4, "definizione", dict(
            eyebrow="Periodo e metodo", titolo="La metodologia di quantificazione",
            definizione="Dati di attività moltiplicati per fattori di emissione: è la regola.",
            punti=[P("Bilancio di massa", "è un'eccezione, e si dichiara"),
                   P("Misura diretta", "è un'eccezione, e si dichiara")])),
        (5, "evidenza", dict(
            eyebrow="Il set di GWP",
            titolo="Uno solo fra i {gwpSet} disponibili, per tutto l'inventario.",
            testo="Coerente con l'edizione dei fattori adottata: mescolarli produce numeri che non tornano con nessuna fonte.")),
        (6, "cards", dict(
            titolo="I dati del periodo sono denominatori",
            cards=[P("Ricavi netti", "per l'intensità sui ricavi"),
                   P("Organico medio", "per l'intensità per addetto"),
                   P("Produzione e unità", "per l'intensità per unità di prodotto"),
                   P("Per ogni periodo", "anno base compreso: senza, le intensità restano vuote")])),
        (7, "chiusura", dict(
            titolo="Da portare via",
            punti=[P("Il confine", "si congela quando crei l'inventario"),
                   P("Ogni esclusione", "con la sua motivazione"),
                   P("La significatività", "dichiarata prima dei numeri"),
                   P("Il set di GWP", "coerente con i fattori")])),
    ],
    "passo-2-registro": [
        (0, "apertura", dict(
            titolo="Il registro delle sorgenti", sottotitolo="Tutte, non solo quelle che ti riguardano",
            testo="Per ciascuna delle {sorgentiGhg} sorgenti, nelle {categorieGhg} categorie, dichiari se è inclusa o esclusa.",
            agenda=["Tre stati", "Non significativa", "Si include ciò che si quantifica",
                    "Le esclusioni nel rapporto", "Tutte in una sessione", "L'ordine del giro"])),
        (1, "tabella", dict(
            titolo="Tre stati, non intercambiabili",
            cols=["Stato", "Significa", "Che cosa serve"],
            righe=[["Inclusa", "Esiste nel perimetro", "Quantificarla al passo 3"],
                   ["Esclusa", "Esiste ma non la quantifichi", "Motivazione obbligatoria"],
                   ["Non applicabile", "Nell'attività non c'è", "Una riga breve"]])),
        (2, "definizione", dict(
            eyebrow="Una precisazione che vale un rilievo", titolo="«Non significativa»",
            definizione="Regge soltanto se al passo 1 hai dichiarato il criterio di significatività. Senza, è un'opinione.",
            punti=[P("Con il criterio", "è una regola scritta prima di vedere i numeri")])),
        (3, "evidenza", dict(
            eyebrow="La regola pratica",
            titolo="Si include ciò che si quantifica.",
            testo="Senza dati, la strada corretta è escludere dichiarando che non sono disponibili, non includere sperando di tornarci.")),
        (4, "cards", dict(
            titolo="Le esclusioni finiscono nel rapporto",
            cards=[P("Scritte una volta", "Entrano da sole nel capitolo dei confini di rendicontazione."),
                   P("Per esteso, non a sigle", "Le leggerà qualcuno che non era presente quando hai deciso.")])),
        (5, "split", dict(
            titolo="Tutte le sorgenti in una sessione",
            lead="Anche con motivazioni provvisorie, invece di lasciarne metà senza stato.",
            punti=[P("Un registro a metà", "non distingue le sorgenti scartate da quelle mai guardate"),
                   P("Dopo un mese", "non lo distingue più nemmeno chi ci ha lavorato")])),
        (6, "confronto", dict(
            titolo="Il giro, dal più vicino al più lontano",
            a={"h": "Le prime tre categorie", "sub": "Dirette, energia importata, trasporti",
               "punti": ["Si chiudono con fatture e libretti dei mezzi", "Quasi sempre pesano di più"]},
            b={"h": "Le ultime tre", "sub": "Acquisti, prodotti venduti, altre fonti",
               "punti": ["Serve parlare con chi compra e chi vende", "Le esclusioni motivate sono la norma"]})),
    ],
    "passo-3-dati": [
        (0, "apertura", dict(
            titolo="L'inserimento dei dati", sottotitolo="Una voce per sorgente e per sito",
            testo="Il sito distingue le righe dello stesso vettore su stabilimenti diversi.",
            agenda=["I campi della voce", "Categoria 2 e biomasse", "Qualità ed evidenza",
                    "I conti", "Copia dal periodo precedente", "Tre errori sulle unità"])),
        (1, "flusso", dict(
            titolo="I campi di una voce",
            passi=[P("Categoria e sorgente", "la sorgente si filtra sulla categoria"),
                   P("Descrizione", "come la scriveresti a un collega"),
                   P("Fattore", "dalla libreria o personalizzato"),
                   P("Quantità", "nell'unità del fattore")])),
        (2, "confronto", dict(
            titolo="Due campi che valgono solo in certi casi",
            a={"h": "Categoria 2", "sub": "Energia importata",
               "punti": ["Fattore market based", "Quota coperta da garanzie d'origine, nella stessa unità"]},
            b={"h": "Biomasse", "sub": "CO₂ biogenica",
               "punti": ["Fattore biogenico", "Rendicontata a parte, fuori dai totali"]})),
        (3, "cards", dict(
            titolo="I due campi che reggono la verifica",
            cards=[P("Qualità del dato", "{livelliQualitaGhg} livelli dal misurato allo stimato, con l'incertezza proposta e modificabile."),
                   P("Evidenza documentale", "Il rinvio al documento che il verificatore seguirà: requisito 6.3.")])),
        (4, "tabella", dict(
            titolo="I conti",
            cols=["Grandezza", "Calcolo"],
            righe=[["tCO₂e", "quantità × fattore ÷ 1000"],
                   ["Market based", "max(0, quantità − quota coperta) × fattore market ÷ 1000"],
                   ["CO₂ biogenica", "quantità × fattore biogenico ÷ 1000, tenuta separata"]])),
        (5, "evidenza", dict(
            eyebrow="L'anteprima nel dialogo",
            titolo="È lo stesso motore che scriverà la riga.",
            testo="Non un secondo calcolo scritto a parte: due aritmetiche separate divergono sempre, e ce ne si accorge sul documento.")),
        (6, "definizione", dict(
            eyebrow="Il campo su cui si bara senza accorgersene", titolo="Qualità del dato",
            definizione="Serve a dirti dove mettere un contatore, non a farti fare bella figura adesso.",
            punti=[P("Una stima dichiarata documentale", "abbassa l'incertezza e nasconde dove investire")])),
        (7, "split", dict(
            titolo="Copia dal periodo precedente",
            lead="Il modo più rapido di aprire un esercizio nuovo.",
            punti=[P("Restano", "struttura, fattori ed evidenze"), P("Si azzerano", "le quantità"),
                   P("Eviti", "di dimenticare un pezzo del registro")])),
        (8, "cards", dict(
            titolo="Tre errori sulle unità che passano ogni controllo",
            cards=[P("Gasolio", "Da riscaldamento e da autotrazione sono fattori distinti: non si sommano."),
                   P("Fotovoltaico", "L'energia immessa in rete non è consumo: l'hai venduta."),
                   P("Quota coperta", "In un'altra unità falsa il market based, senza nessun avviso.")])),
        (9, "punti", dict(
            titolo="L'ordine del lavoro",
            punti=[P("Una sorgente alla volta", "fattore, unità ed evidenza condivisi: costa la metà"),
                   P("La stessa descrizione ogni anno", "e il confronto è immediato")])),
        (10, "chiusura", dict(
            titolo="Da portare via",
            punti=[P("Il sito", "compilalo anche con uno stabilimento solo"),
                   P("La qualità del dato", "dichiarata onestamente"),
                   P("L'evidenza", "un rinvio che si può seguire"),
                   P("Le unità", "quelle del fattore, quota coperta compresa")])),
    ],
    "passo-4-fattori": [
        (0, "apertura", dict(
            titolo="La libreria dei fattori", sottotitolo="Di piattaforma, con le tue sovrascritture",
            testo="{fattoriGhg} fattori precaricati e versionati: quello che cambi vive sopra, non dentro.",
            agenda=["Piattaforma e sovrascrittura", "Che cosa porta un fattore", "Eliminare e ripristinare",
                    "Le voci non cambiano", "Prima della verifica"])),
        (1, "definizione", dict(
            titolo="Un fattore",
            definizione="Valore, unità, fonte e anno. La fonte non è facoltativa: rende difendibile il numero.",
            punti=[P("Categoria 2", "in più il valore market based"),
                   P("Biomasse", "un fattore fossile nei totali, uno biogenico a parte")])),
        (2, "confronto", dict(
            titolo="Eliminare non è ripristinare",
            a={"h": "Fattore personalizzato", "sub": "In uso, non si elimina",
               "punti": ["Le voci resterebbero senza riferimento"]},
            b={"h": "Sovrascrittura", "sub": "Si ripristina sempre",
               "punti": ["Sotto ricompare la chiave di piattaforma", "Nessuna voce resta senza fattore"]})),
        (3, "evidenza", dict(
            eyebrow="Quello che sorprende più spesso",
            titolo="Cambiare un fattore non cambia le voci già inserite.",
            testo="Il fattore si congela sulla riga quando salvi. Per ricalcolare le voci vanno rimesse a mano: è una decisione da motivare.")),
        (4, "punti", dict(
            titolo="Prima di una verifica di parte terza",
            intro="I valori precaricati sono indicativi.",
            punti=[P("Aggiornali", "all'edizione dichiarata nel rapporto"), P("Fonte e anno", "su ogni fattore usato"),
                   P("La stessa edizione", "anche per l'anno base"),
                   P("Un cambio di edizione", "si dichiara, e può imporre il ricalcolo")])),
    ],
    "passo-5-risultati": [
        (0, "apertura", dict(
            titolo="I risultati", sottotitolo="Il passo che non chiede niente",
            testo="È la pagina dove fermarsi più a lungo: qui si capisce se l'inventario regge.",
            agenda=["Location e market based", "Che cosa trovi", "Incertezza e qualità",
                    "Peso incrociato con qualità", "Due segnali da capire", "Le variazioni sopra il 20%"])),
        (1, "confronto", dict(
            titolo="Due totali, due domande diverse",
            a={"h": "Location based", "sub": "Quanto si è emesso",
               "punti": ["Fattore medio della rete", "Le emissioni fisiche dei tuoi siti"]},
            b={"h": "Market based", "sub": "Che cosa hai comprato",
               "punti": ["Fattori contrattuali per la quota certificata", "Da solo porterebbe un sito quasi a zero"]})),
        (2, "cards", dict(
            titolo="Che cosa trovi sulla pagina",
            cards=[P("Composizione", "per scope e per categoria, calcolata dai dati"),
                   P("Riepilogo per categoria", "voci, tonnellate, peso, incertezza, qualità"),
                   P("Intensità", "per ricavi, per addetto, per unità di prodotto"),
                   P("Voci più pesanti", "in ordine"),
                   P("CO₂ biogenica", "a parte, fuori dai totali")])),
        (3, "tabella", dict(
            titolo="Due indicatori di qualità",
            cols=["Indicatore", "Come si calcola", "Che cosa ne segue"],
            righe=[["Incertezza combinata", "Somma in quadratura dei contributi, divisa per il totale", "Domina la voce più pesante, non la più incerta"],
                   ["Qualità ponderata", "Media dei punteggi pesata sulle emissioni", "Dice dove conviene migliorare il dato"]])),
        (4, "evidenza", dict(
            eyebrow="Come si legge",
            titolo="Peso e qualità, incrociati.",
            testo="La categoria che pesa di più con la qualità più bassa è il primo posto dove investire prima della verifica.")),
        (5, "split", dict(
            titolo="Due segnali da non fraintendere",
            lead="Nessuno dei due è un difetto del calcolo.",
            punti=[P("Un'intensità vuota", "manca il denominatore fra i dati del periodo"),
                   P("Market uguale a location", "nessun contratto, oppure quota coperta non compilata")])),
        (6, "flusso", dict(
            titolo="Prima di consegnare",
            passi=[P("Confronta", "voce per voce con l'anno precedente"),
                   P("Cerca i salti", "le variazioni sopra il 20%"),
                   P("Spiegali", "attività, fattore o modo di contare"),
                   P("Il modo di contare", "se non l'hai deciso tu, è un errore")])),
        (7, "definizione", dict(
            eyebrow="Per il colloquio col cliente", titolo="L'intensità per gli obiettivi",
            definizione="Quella per unità di prodotto: l'intensità per ricavi migliora anche quando salgono soltanto i prezzi.")),
    ],
    "passo-6-anno-base": [
        (0, "apertura", dict(
            titolo="L'anno base", sottotitolo="Il metro di tutto il resto",
            testo="Punti 7.2 e 7.3: sceglierlo, giustificarlo, e corredarlo in anticipo delle regole di ricalcolo.",
            agenda=["Perché in anticipo", "Tre campi", "Traguardo e percorso", "Completo non è credibile", "Quale periodo"])),
        (1, "evidenza", dict(
            eyebrow="La parola che conta",
            titolo="Le regole di ricalcolo si scrivono prima.",
            testo="Cedi lo stabilimento più energivoro e scendi del 30%: la regola scritta prima ti obbliga a dire che il calo non è merito tuo.")),
        (2, "tabella", dict(
            titolo="Tre campi",
            cols=["Campo", "Che cosa contiene"],
            righe=[["Periodo di riferimento", "Uno dei periodi con dati, col suo totale"],
                   ["Motivazione", "Verificabile: primo periodo con dati completi su tutti i siti"],
                   ["Regola di ricalcolo", "Acquisizioni e cessioni, cambio di metodo, errori significativi, variazione dei confini"]])),
        (3, "definizione", dict(
            titolo="Traguardo e percorso",
            definizione="Traguardo = base × (1 − riduzione). Percorso compiuto = (base − attuale) ÷ (base − traguardo).",
            punti=[P("Il prodotto", "dice a che punto sei rispetto a dove volevi arrivare")])),
        (4, "confronto", dict(
            titolo="Completo non vuol dire credibile",
            a={"h": "Il prodotto", "sub": "Calcola", "punti": ["Il traguardo", "Il percorso compiuto"]},
            b={"h": "Il consulente", "sub": "Giudica",
               "punti": ["Se la riduzione è raggiungibile con le azioni scritte", "È a lui che lo chiedono in verifica"]})),
        (5, "chiusura", dict(
            titolo="Quale periodo scegliere",
            punti=[P("Non l'anno peggiore", "si paga in verifica e l'anno dopo"),
                   P("Il primo con dati completi", "su tutti i siti"),
                   P("Quasi sempre", "coincide col primo inventario fatto bene")])),
    ],
    "verifica-e-rapporto": [
        (0, "apertura", dict(
            titolo="Verifica e rapporto", sottotitolo="I {checklistGhg} requisiti della checklist",
            testo="Ciascuno riferito al suo punto della norma: per ognuno lo stato, e l'evidenza o l'azione da fare.",
            agenda=["Annotazioni che diventano fascicolo", "I segnaposto nel rapporto", "Il limite della verifica",
                    "Che cosa chiede il verificatore"])),
        (1, "confronto", dict(
            titolo="Annotazioni per chi le leggerà",
            a={"h": "«Evidenza presente»", "sub": "Non si può seguire", "punti": ["Non dice dove guardare"]},
            b={"h": "«Contratto di fornitura 2024, cartella contratti»", "sub": "Si segue",
               "punti": ["Diventa un riferimento del fascicolo di audit"]})),
        (2, "evidenza", dict(
            eyebrow="Il rapporto, punto 9.3.1",
            titolo="I testi mancanti compaiono come segnaposto.",
            testo="Un vuoto dichiarato è informazione. Un vuoto silenzioso promette più di quanto porta, finché un verificatore non lo nota.")),
        (4, "tabella", dict(
            titolo="Completezza formale, e il suo limite",
            cols=["La verifica può dirti", "Non può dirti"],
            righe=[["Che due sorgenti sono escluse senza motivazione", "Che la motivazione scritta non regge"],
                   ["Che la qualità del dato è compilata", "Che hai dichiarato documentale una stima"]])),
        (6, "cards", dict(
            titolo="Che cosa chiede il verificatore",
            cards=[P("Fatture e letture", "a supporto delle voci più pesanti"),
                   P("Fonte e anno", "dei fattori usati"),
                   P("Motivazioni", "delle esclusioni"),
                   P("Anno base", "con le regole di ricalcolo")])),
    ],
    "errori-ghg": [
        (0, "apertura", dict(
            titolo="L'ordine, e gli errori", sottotitolo="Nove errori, e quasi tutti silenziosi",
            testo="Seguire l'ordine giusto fa risparmiare più tempo di qualunque scorciatoia dentro i passi.",
            agenda=["L'ordine dei passi", "Perché i fattori prima delle voci", "Quattro errori frequenti",
                    "Quattro che falsano in silenzio", "Il più costoso"])),
        (1, "flusso", dict(
            titolo="L'ordine in cui lavorare",
            passi=[P("Confini e periodo", "consolidamento, perimetro, significatività, GWP"),
                   P("Registro", "ogni sorgente con uno stato"),
                   P("Fattori", "all'edizione dichiarata, con fonte e anno"),
                   P("Voci", "per sorgente e sito, con evidenza e qualità"),
                   P("Risultati e verifica", "anno base, obiettivi, pubblicazione")])),
        (2, "evidenza", dict(
            eyebrow="Perché i fattori prima delle voci",
            titolo="Il fattore si congela sulla riga.",
            testo="Trecento voci inserite e poi la libreria aggiornata: o tieni i valori vecchi, o rimetti trecento voci a mano.")),
        (3, "cards", dict(
            titolo="Quattro errori che tornano spesso",
            cards=[P("Azienda o esercizio sbagliato", "Nessun avviso, perché i dati sono validi."),
                   P("Esclusioni senza motivazione", "Il rilievo classico sul punto 5.2."),
                   P("Inclusa e mai quantificata", "Un'incoerenza visibile a chiunque."),
                   P("Fattori precaricati tali e quali", "Senza fonte né anno, emissioni non difendibili.")])),
        (4, "tabella", dict(
            titolo="Quattro errori che falsano in silenzio",
            cols=["Errore", "Effetto"],
            righe=[["Quota coperta in un'altra unità", "Market based falsato"],
                   ["Fattore biogenico dentro il totale", "Violazione del punto 6.5"],
                   ["Tutto dichiarato documentale", "Incertezza sottostimata"],
                   ["Evidenza documentale vuota", "Requisito 6.3 non soddisfatto"]])),
        (5, "definizione", dict(
            eyebrow="Il più costoso", titolo="Cambiare senza ricalcolare",
            definizione="Fattori o confini cambiati senza applicare la regola di ricalcolo: il confronto con l'anno base non significa più niente, ma resta nel documento.")),
        (6, "chiusura", dict(
            titolo="Sette errori su nove non avvisano",
            punti=[P("Sono errori di significato", "non di forma"),
                   P("I conti tornano", "e la verifica diventa verde"),
                   P("Rileggi i risultati", "prima di aprire la verifica, non dopo")])),
    ],
}

scrivi("ghg", SLIDE)
