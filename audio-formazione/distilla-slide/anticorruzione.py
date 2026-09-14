# Slide della prevenzione della corruzione (ISO 37001).
from _scrivi import P, scrivi

SLIDE = {
    "anagrafica-37001": [
        (0, "apertura", dict(
            titolo="Anagrafica", sottotitolo="Cinque gruppi, due decidono la credibilità",
            testo="Identificazione, governance, esposizione, canale di segnalazione e campo di applicazione.",
            agenda=["Chi sorveglia", "Funzione esternalizzata", "Il perimetro", "Chi ricopre la funzione",
                    "Paesi di operatività", "Esposizione verso pubblici ufficiali"])),
        (1, "cards", dict(
            titolo="Identificazione e governance",
            cards=[P("Paesi di operatività", "Concorrono al rischio di contesto e alla valutazione dei soci."),
                   P("Governance", "Alta direzione, organo di governo, funzione di prevenzione e il suo impegno.")])),
        (4, "confronto", dict(
            titolo="Chi sorveglia, se l'organo di governo non c'è",
            a={"h": "Campo vuoto", "sub": "Nessuno ha detto chi sorveglia", "punti": ["Il primo rilievo di un audit"]},
            b={"h": "Dichiarato", "sub": "Sorveglia l'alta direzione", "punti": ["Legittimo in una piccola impresa", "Purché scritto"]})),
        (5, "evidenza", dict(
            eyebrow="Funzione di prevenzione esternalizzata",
            titolo="La responsabilità resta interna, sempre.",
            testo="Servono nome e ruolo del dirigente interno responsabile. Un sistema in cui non si capisce chi risponde è il primo rilievo scritto.")),
        (7, "evidenza", dict(
            eyebrow="Il campo di applicazione",
            titolo="Un perimetro taciuto si presume esteso a tutto.",
            testo="In certificazione si verifica ciò che il documento dichiara, non ciò che chi l'ha scritto aveva in mente.")),
        (8, "split", dict(
            titolo="Chi ricopre la funzione",
            lead="Competenza, autorità e risorse adeguate, e un riporto all'organo di governo.",
            punti=[P("Responsabile amministrativo o acquisti", "significa stare dentro i processi da sorvegliare"),
                   P("Si può fare", "con un meccanismo per il conflitto, dichiarato prima")])),
        (9, "definizione", dict(
            eyebrow="Paesi di operatività", titolo="Conta dove opera, non dove ha sede",
            definizione="E dove operano per suo conto i soci in affari: un intermediario in un paese ad alto rischio cambia il profilo.",
            punti=[P("Alimenta", "la prima delle {dimensioni37001} dimensioni del rischio dei soci")])),
        (10, "chiusura", dict(
            titolo="L'esposizione verso pubblici ufficiali",
            punti=[P("In termini concreti", "quante volte, per quale pratica, chi ha il contatto"),
                   P("Tre gare l'anno", "non sono rapporti quotidiani con l'ente di controllo"),
                   P("La differenza", "giustifica il livello dei presidi")])),
    ],
    "soci-in-affari": [
        (0, "apertura", dict(
            titolo="I soci in affari", sottotitolo="Il passo da cui discende tutto il resto",
            testo="E comincia con un fraintendimento da togliere di mezzo subito.",
            agenda=["Non solo fornitori", "Tre gruppi di dati", "Lo stato del rapporto", "Il censimento iniziale",
                    "Un approccio basato sul rischio", "I titolari effettivi"])),
        (1, "evidenza", dict(
            eyebrow="Il fraintendimento",
            titolo="Soci in affari non vuol dire fornitori.",
            testo="Anche clienti, joint venture, istituti finanziari, somministrazione, distributori, e soprattutto agenti e intermediari.")),
        (3, "cards", dict(
            titolo="Tre gruppi di dati per socio",
            cards=[P("Identificazione", "Categoria, paese, oggetto del rapporto, titolari effettivi."),
                   P("Rapporto economico", "Valore annuo, remunerazione, eventuale controllata."),
                   P("Adempimenti", "Verifica preliminare, politica, impegni, clausole, formazione, stato.")])),
        (4, "definizione", dict(
            eyebrow="La remunerazione conta più del valore", titolo="Provvigione o compenso a successo",
            definizione="Attivano la verifica di proporzionalità: sono le forme in cui un pagamento indebito si nasconde meglio.")),
        (6, "confronto", dict(
            titolo="Cessato o sospeso",
            a={"h": "Cessato", "sub": "Esce dai calcoli", "punti": ["Solo se il rapporto è davvero finito"]},
            b={"h": "Sospeso", "sub": "Resta dentro", "punti": ["Il socio su cui si interviene resta sorvegliato"]})),
        (7, "flusso", dict(
            titolo="Il censimento iniziale: tre fonti incrociate",
            passi=[P("Partitario", "fornitori"), P("Contratti", "di agenzia"), P("Primi venti clienti", "per fatturato")])),
        (8, "split", dict(
            titolo="Un approccio basato sul rischio",
            lead="Censire centinaia di fornitori con questo dettaglio è impossibile, e la norma non lo chiede.",
            punti=[P("Per intero", "agenti, intermediari, consulenti, distributori, joint venture"),
                   P("Con una soglia di valore", "le categorie ordinarie, dichiarando la soglia")])),
        (9, "evidenza", dict(
            eyebrow="La soglia",
            titolo="Dichiarata prima è metodo; ricostruita dopo è una giustificazione.",
            testo="Va scritta, e rivista quando cambia la struttura degli acquisti.")),
        (10, "definizione", dict(
            eyebrow="Titolari effettivi", titolo="Una ricerca proporzionata al rischio",
            definizione="Per un socio a basso rischio basta la visura; per uno critico servono banche dati specializzate.",
            punti=[P("Titolarità non ricostruibile", "non è un campo vuoto: è un aggravante")])),
        (11, "chiusura", dict(
            titolo="Tenere vivo il censimento",
            punti=[P("Il socio nuovo", "si inserisce quando nasce il rapporto"),
                   P("Agganciato", "all'apertura dell'anagrafica nel gestionale"),
                   P("La revisione annuale", "trova sempre trenta soci senza data")])),
    ],
    "rischio-e-obblighi": [
        (0, "apertura", dict(
            titolo="Rischio e obblighi", sottotitolo="Il meccanismo che decide che cosa è dovuto",
            testo="Non una classificazione statistica: dal livello di rischio discendono gli obblighi.",
            agenda=["Le dimensioni", "Gli aggravanti", "La soglia", "Otto obblighi", "La validità",
                    "Non fattibile", "Molti soci"])),
        (1, "cards", dict(
            titolo="Le {dimensioni37001} dimensioni del rischio",
            cards=[P("Paese", "Dove il socio opera per conto, non la sua sede."),
                   P("Pubblici ufficiali", "L'interazione con loro."),
                   P("Natura del rapporto", "Dai beni standard all'agire per conto verso terzi."),
                   P("Rilevanza e discrezionalità", "Della prestazione.")])),
        (2, "punti", dict(
            titolo="{fattori37001} fattori aggravanti",
            intro="Ne basta uno: il livello va almeno ad alto.",
            numerati=False,
            punti=[P("Provvigione", "o compenso a successo"), P("Socio imposto", "dal cliente o da un pubblico ufficiale"),
                   P("Titolarità o giurisdizione", "opache"), P("Precedenti", "indagini, condanne, sanzioni per corruzione"),
                   P("Legami", "con pubblici ufficiali o candidati"), P("Pagamenti", "a soggetti diversi dal contraente")])),
        (3, "evidenza", dict(
            eyebrow="Il difetto peggiore del percorso",
            titolo="Un agente a provvigione classificato basso.",
            testo="Quattro dimensioni medie non annullano un aggravante, e i precedenti per corruzione portano al massimo. Rivedili su ogni socio.")),
        (4, "definizione", dict(
            eyebrow="La regola su cui poggia la norma", titolo="Controlli rafforzati",
            definizione="Dovuti per i soci con rischio superiore al basso: in pratica, per ogni livello diverso dal più basso.")),
        (5, "confronto", dict(
            titolo="Otto obblighi",
            a={"h": "Sempre, sopra soglia", "sub": "Cinque",
               "punti": ["Verifica preliminare valida", "Politica comunicata", "Impegni acquisiti", "Clausole contrattuali",
                         "Controlli del socio verificati"]},
            b={"h": "Secondo la situazione", "sub": "Tre",
               "punti": ["Formazione, se agisce per conto", "Proporzionalità, se a provvigione", "Adeguamento, se controllata"]})),
        (6, "numeri", dict(
            titolo="La verifica preliminare scade",
            numeri=[{"n": "12 mesi", "h": "Livello critico", "d": "Rivista ogni anno."},
                    {"n": "36 mesi", "h": "Livello basso", "d": "La validità più lunga."}])),
        (8, "evidenza", dict(
            eyebrow="L'unica scorciatoia",
            titolo="Non fattibile: solo documentato, e valutato nel rischio.",
            testo="Senza il perché è la prima cosa che un auditor cerca. Cinque righe scritte subito valgono mezza giornata di ricostruzione.")),
        (9, "tabella", dict(
            titolo="Molti soci, senza metterci settimane",
            cols=["Situazione", "Come si valuta"],
            righe=[["Agisce per conto e ha contatti con pubblici ufficiali", "Uno per uno, con cura"],
                   ["Solo una delle due", "Con attenzione"],
                   ["Nessuna delle due", "Per categoria omogenea, dichiarandolo"]])),
        (11, "split", dict(
            titolo="La verifica di proporzionalità",
            lead="Non che il prezzo sia basso: che il compenso sia proporzionato alla prestazione resa.",
            punti=[P("15% per aver presentato un cliente", "sproporzionato"),
                   P("15% gestendo cliente, credito e assistenza", "proporzionato"),
                   P("Si registra", "il ragionamento, non il numero")])),
        (12, "chiusura", dict(
            titolo="Il carico delle verifiche",
            punti=[P("Cento soci, validità di due anni", "cinquanta verifiche l'anno per stare fermi"),
                   P("Va pianificato", "all'inizio"), P("Scadenze distribuite", "non tutte nel mese del censimento")])),
    ],
    "registri-37001": [
        (0, "apertura", dict(
            titolo="I registri", sottotitolo="{registri37001} registri che alimentano il cruscotto",
            testo="E gli indicatori, e la relazione all'organo di governo.",
            agenda=["Il registro dei rischi", "Regali e ospitalità", "Le date", "Come tenerli",
                    "Deleghe e conflitti", "Controlli finanziari e non"])),
        (1, "confronto", dict(
            titolo="Corruzione in uscita e in entrata",
            a={"h": "In uscita", "sub": "Commessa dall'organizzazione", "punti": ["Scenari per processo", "Probabilità e conseguenza"]},
            b={"h": "In entrata", "sub": "Subita dai propri addetti", "punti": ["Tenuta separata", "Con controlli e idoneità"]})),
        (2, "evidenza", dict(
            eyebrow="La regola pratica",
            titolo="Ogni scenario, almeno un controllo nel registro.",
            testo="Se non c'è, il controllo non esiste o non è registrato: in entrambi i casi va sistemato.")),
        (3, "definizione", dict(
            eyebrow="Regali e ospitalità", titolo="L'autorizzazione preventiva è preventiva",
            definizione="Registrata dopo, senza averla chiesta, resta come autorizzazione dovuta e mancata: un indicatore negativo.",
            punti=[P("Il rimedio", "la soglia comunicata a chi può ricevere, non a chi tiene il registro")])),
        (5, "tabella", dict(
            titolo="Conta la data",
            cols=["Registro", "Date che servono"],
            righe=[["Segnalazioni", "Ricezione e presa in carico"], ["Non conformità", "Termine e chiusura"],
                   ["Audit", "Esecuzione"], ["Controlli", "Ultima verifica ed esito"]])),
        (6, "numeri", dict(
            titolo="Come tenerli",
            numeri=[{"n": "Quattro", "h": "Registri vivi", "d": "Controlli, regali, formazione, conflitti di interessi."},
                    {"n": "Otto", "h": "Quando serve", "d": "Si toccano quando succede qualcosa."},
                    {"n": "Una volta al mese", "h": "Un momento fisso", "d": "Per non scoprirli vuoti a dicembre."}])),
        (7, "definizione", dict(
            eyebrow="Deleghe e poteri decisionali", titolo="La mappa di chi può decidere",
            definizione="La corruzione vuole qualcuno che possa decidere e nessuno che controlli: il registro è la mappa della prima metà.",
            punti=[P("Una delega mai revocata", "è un potere che nessuno sa di dover sorvegliare")])),
        (8, "evidenza", dict(
            eyebrow="Conflitti di interessi",
            titolo="Una dichiarazione all'assunzione non vale dopo due anni.",
            testo="I conflitti nascono. La raccolta si rifà con periodicità, soprattutto per chi ha poteri di spesa.")),
        (9, "cards", dict(
            titolo="Il registro delle segnalazioni",
            cards=[P("Con il percorso segnalazioni", "Rimanda al fascicolo."),
                   P("Senza", "È l'unico posto: annota anche quelle arrivate a voce, che sono la maggioranza.")])),
        (10, "confronto", dict(
            titolo="Controlli finanziari e non finanziari",
            a={"h": "Finanziari", "sub": "Il momento del pagamento",
               "punti": ["Doppia firma", "Tracciabilità", "Limiti al contante", "Controllo delle causali"]},
            b={"h": "Non finanziari", "sub": "Tutto ciò che accade prima",
               "punti": ["Separazione dei compiti", "Rotazione", "Verifiche a campione", "Autorizzazioni"]})),
    ],
    "conformita-37001": [
        (0, "apertura", dict(
            titolo="La mappa di conformità", sottotitolo="{requisiti37001} domande su {capi37001} capitoli",
            testo="Ciascuna riferita al punto della norma e collegata alla procedura che le risponde.",
            agenda=["Domande da certificatore", "Non valutato pesa zero", "Il non applicabile", "Le evidenze",
                    "Da dove cominciare", "Le parziali"])),
        (1, "evidenza", dict(
            eyebrow="Scritte come le porrebbe chi certifica",
            titolo="È l'autovalutazione che precede l'audit.",
            testo="L'evidenza annotata accanto a ogni domanda è il riferimento che esibirai.")),
        (2, "numeri", dict(
            titolo="Un requisito non valutato pesa zero",
            numeri=[{"n": "Dieci", "h": "Conformi, gli unici valutati", "d": "Mediati da soli, varrebbero il 100%."},
                    {"n": "{requisiti37001}", "h": "Tutti conformi", "d": "Lo stesso numero, per una situazione opposta."}])),
        (3, "definizione", dict(
            eyebrow="Con parsimonia", titolo="Non applicabile",
            definizione="Per requisiti oggettivamente estranei, come i punti sulle controllate quando non ce ne sono.",
            punti=[P("Usato per evitare una non conformità", "non regge la prima domanda in audit")])),
        (5, "confronto", dict(
            titolo="Quale evidenza",
            a={"h": "Una procedura", "sub": "Descrive l'intenzione", "punti": ["Un rimando generico"]},
            b={"h": "Una riga di registro", "sub": "Dimostra l'esecuzione", "punti": ["Verificabile in trenta secondi"]})),
        (6, "flusso", dict(
            titolo="Non in ordine di capitolo",
            passi=[P("Un terzo", "risponde già dai registri: un'ora, con l'evidenza pronta"),
                   P("Due terzi", "chiedono una decisione o un documento, e si affrontano sapendo dove si è")])),
        (7, "split", dict(
            titolo="Le parzialmente conformi",
            lead="Senza una nota non servono a nessuno, né a te fra sei mesi né all'auditor.",
            punti=[P("La nota dice", "che pezzo manca"), P("E dice", "che cosa serve per chiuderlo"),
                   P("L'elenco delle parziali", "diventa il piano di lavoro")])),
        (8, "chiusura", dict(
            titolo="Prima l'autovalutazione, poi l'audit interno",
            punti=[P("Non lo sostituisce", "e non lo segue"), P("L'audit interno", "arriva su un sistema già ripulito"),
                   P("Scoprire in audit", "che mancano le clausole è un audit sprecato")])),
    ],
    "indicatori-37001": [
        (0, "apertura", dict(
            titolo="Gli indicatori", sottotitolo="Che cosa è stato fatto, e se funziona",
            testo="Due famiglie per due domande diverse.",
            agenda=["Processo ed esito", "Zero segnalazioni", "I benefici autorizzati", "Misurare il canale",
                    "Obiettivi", "Percentuali e numeri assoluti"])),
        (1, "confronto", dict(
            titolo="Processo ed esito",
            a={"h": "Processo", "sub": "Che cosa è stato fatto",
               "punti": ["Verifiche preliminari valide", "Obblighi assolti", "Clausole e impegni", "Audit e formazione"]},
            b={"h": "Esito", "sub": "Come sta andando",
               "punti": ["Segnalazioni prese in carico nei termini", "Casi e riesami", "Ritorsioni", "Benefici autorizzati prima"]})),
        (3, "evidenza", dict(
            eyebrow="La lettura che conta",
            titolo="Nessuna segnalazione, nessun caso: da guardare con attenzione.",
            testo="Senza aver misurato il canale non dimostra efficacia, dimostra di non aver guardato. Zero in un anno è quasi sempre un canale sconosciuto o non creduto.")),
        (6, "definizione", dict(
            eyebrow="L'unico che misura un'abitudine", titolo="Benefici autorizzati preventivamente",
            definizione="Il più lento a migliorare. Se resta fermo mentre gli altri salgono, il sistema è documentato e non praticato.")),
        (7, "cards", dict(
            titolo="Tre domande in una rilevazione interna",
            cards=[P("Sapete che il canale esiste?", "Misura la comunicazione."),
                   P("Sapreste dove trovarlo adesso?", "Misura l'accessibilità."),
                   P("Lo usereste?", "Misura la fiducia: la più scomoda, e la più utile.")])),
        (8, "split", dict(
            titolo="Obiettivi che funzionano",
            lead="«Mantenere alto il livello di conformità» non è un obiettivo.",
            punti=[P("100% di verifiche preliminari", "sui soci critici entro giugno"),
                   P("Formazione", "a tutti i responsabili con poteri di spesa, entro l'anno"),
                   P("Oltre il 90%", "di autorizzazioni preventive sui benefici")])),
        (9, "numeri", dict(
            titolo="Percentuale e numero assoluto, insieme",
            numeri=[{"n": "100%", "h": "Su tre soci critici", "d": "La percentuale la premia."},
                    {"n": "80%", "h": "Su cinquanta soci critici", "d": "Una situazione completamente diversa."}])),
    ],
    "corpus-37001": [
        (0, "apertura", dict(
            titolo="Il corpus", sottotitolo="{procedure37001} procedure e {moduli37001} moduli",
            testo="Dal contesto e dal rischio fino a monitoraggio, audit e miglioramento, personalizzabile blocco per blocco.",
            agenda=["L'ordine di approvazione", "Due documenti", "Le criticità", "La politica", "La formazione", "Il riesame"])),
        (1, "flusso", dict(
            titolo="L'ordine di approvazione",
            passi=[P("Rischio", "e politica"), P("Funzione", "e deleghe"), P("Verifica preliminare", "e soci in affari"),
                   P("Controlli e benefici", "poi le segnalazioni"),
                   P("Per ultimi", "pianificazione, competenze, formazione, riesame")])),
        (2, "evidenza", dict(
            eyebrow="Perché si parte dal rischio",
            titolo="Procedure prima del rischio: controlli per scenari mai descritti.",
            testo="Arrivata la valutazione, i controlli sono sovradimensionati o insufficienti, e sono già passati in delibera.")),
        (3, "confronto", dict(
            titolo="Due documenti, due destinatari",
            a={"h": "La relazione", "sub": "All'organo di governo", "punti": ["Racconta", "Letta una volta all'anno"]},
            b={"h": "La matrice di conformità", "sub": "Per l'audit", "punti": ["Dimostra"]})),
        (5, "definizione", dict(
            eyebrow="La sezione più letta della relazione", titolo="Le criticità",
            definizione="Non l'elenco dei punti scoperti: che cosa succederebbe se restassero scoperti, e che cosa costa chiuderli.")),
        (6, "cards", dict(
            titolo="La politica deve dire tre cose",
            cards=[P("Che cosa è vietato", "In quell'azienda, con esempi concreti."),
                   P("Che cosa succede", "A chi lo fa."), P("A chi rivolgersi", "Per un dubbio.")])),
        (7, "split", dict(
            titolo="La formazione, differenziata per esposizione",
            lead="Uguale per tutti annoia i primi e non serve ai secondi.",
            punti=[P("Senza contatti esterni", "un'ora su politica e canale"),
                   P("Acquisti e rapporti pubblici", "casi concreti e soglie")])),
        (8, "chiusura", dict(
            titolo="Il riesame della direzione",
            punti=[P("Gli indicatori", "il primo ingresso"), P("Le criticità emerse", "il secondo"),
                   P("Le risorse della funzione", "il terzo: quello che si omette, e che lo rende utile")])),
    ],
    "errori-37001": [
        (0, "apertura", dict(
            titolo="L'ordine, e gli errori", sottotitolo="Il sistema costruito da zero",
            testo="Nell'ordine giusto, la maggior parte degli errori non arriva.",
            agenda=["L'ordine", "I primi due errori", "Gli altri quattro", "Che cosa chiede la norma", "Avviare l'incarico"])),
        (1, "flusso", dict(
            titolo="L'ordine in cui si costruisce",
            passi=[P("Anagrafica", "governance, funzione, canale"), P("Rischi", "scenari con controlli e idoneità"),
                   P("Soci in affari", "censimento, livelli, aggravanti, adempimenti"),
                   P("Deleghe e persone", "conflitti, dichiarazioni, formazione"),
                   P("Conformità", "audit interno e relazione")])),
        (3, "confronto", dict(
            titolo="I primi due valgono metà del rischio",
            a={"h": "Soci confusi con l'albo fornitori", "sub": "Fuori agenti, intermediari, clienti",
               "punti": ["Proprio quelli per cui la norma esiste"]},
            b={"h": "Aggravanti non compilati", "sub": "L'agente a provvigione resta basso",
               "punti": ["Nessun obbligo dovuto", "Il sistema funziona e non copre chi doveva"]})),
        (4, "tabella", dict(
            titolo="Gli altri quattro",
            cols=["Errore", "Effetto"],
            righe=[["Verifica preliminare senza data", "Obbligo mai assolto, quota a zero"],
                   ["Non fattibile senza motivazione", "Chiuso male: peggio che aperto"],
                   ["Conformi su procedure generiche", "Una conformità che non regge"],
                   ["Registri a fine anno", "Date vicine, mesi vuoti senza traccia"]])),
        (6, "evidenza", dict(
            eyebrow="Da spiegare prima di cominciare",
            titolo="Non dimostrare che la corruzione non c'è: dimostrare di aver guardato.",
            testo="Un sistema che dichiara zero rischio su tutto non è più credibile di uno che mostra i punti esposti e come li governa.")),
        (7, "definizione", dict(
            eyebrow="Avviare l'incarico", titolo="Uno strumento di gestione",
            definizione="Non un attestato di onestà: chi lo adotta per dimostrare di essere pulito rifiuta di scrivere dove potrebbe non esserlo.")),
        (8, "split", dict(
            titolo="Il censimento si prenota per primo",
            lead="È l'unica attività del percorso che non si fa da soli in ufficio.",
            punti=[P("Serve accesso", "a gestionale fornitori, contratti di agenzia, elenco clienti"),
                   P("Servono le persone", "che li conoscono")])),
        (9, "chiusura", dict(
            titolo="«La certificazione mi protegge?»",
            punti=[P("Certificato e applicato", "un elemento a favore"),
                   P("Certificato e non applicato", "peggio di nessun sistema"),
                   P("La differenza", "la fanno i registri e la formazione")])),
    ],
}

scrivi("anticorruzione", SLIDE)
