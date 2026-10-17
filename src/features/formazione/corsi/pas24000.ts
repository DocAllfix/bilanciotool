import { ATTIVITA_ATTESE, FATTORI_ATTESI, OBIETTIVI_ATTESI } from "@/lib/calc/pas/avanzamento";
import { PESI_PAS } from "@/lib/calc/pas/conformita";
import { classe, livello } from "@/lib/calc/pas/rischio";
import { PARAMETRI_PREDEFINITI } from "@/lib/calc/pas/tipi";
import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

// Sistema di gestione sociale (PAS 24000:2022).
//
// ⚠️ Scritto sul MODULO, non sul prototipo. Il prototipo era un percorso a nove passi
// numerati che salvava nel browser, mediava i soli requisiti valutati e leggeva un indicatore
// vuoto come zero; qui ci sono dieci viste con un nome, il lavoro sta su un server, un
// requisito mai guardato pesa zero e un derivato senza tutti i suoi ingressi non esiste. Ogni
// regola citata sotto ha la sua funzione in `src/lib/calc/pas/`: se il motore cambia, questo
// testo va riletto.
//
// ⚠️ Mai «passo N»: le viste si chiamano per nome, perché è il nome che il consulente vede
// sulla linguetta.
//
// ⚠️ Le soglie del rischio, i limiti d'orario e i giorni di sollecito dei reclami sono
// PARAMETRI del percorso: il corso cita i valori PREDEFINITI e li legge dal motore, perché un
// «48» scritto qui resterebbe vero solo finché nessuno tocca il seme.
//
// ⚠️ PAS 24000 e SA8000 sono due schemi diversi, con due moduli diversi e nessun ponte di
// dati fra loro: il corso lo dice, e non prende in prestito niente dall'altro.

const P = PARAMETRI_PREDEFINITI;

/** Il rischio d'esempio della sezione sui rischi: probabilità e gravità a quattro. */
const ESEMPIO_RISCHIO = { probabilita: 4, gravita: 4 };
const LIVELLO_ESEMPIO = livello(ESEMPIO_RISCHIO);
const CLASSE_ESEMPIO = classe(LIVELLO_ESEMPIO, P);

export const PAS24000: Sezione[] = [
  {
    id: "avvio-e-organizzazione",
    titolo: "Avviare il sistema: campo di applicazione, ruoli e contesto",
    minuti: 6,
    sommario:
      "«Avvia il percorso», l'esercizio scelto in alto, le viste Organizzazione e Contesto e parti, e perché PAS 24000 non è SA8000.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il sistema di gestione sociale nasce una volta sola per azienda, col pulsante **«Avvia il percorso»**: aprire la pagina non scrive niente, così un'azienda archiviata si consulta senza che la consultazione diventi una modifica. L'avvio carica **${NUMERI.partiTipoPas} parti interessate tipo** e **${NUMERI.rischiTipoPas} rischi tipo** da adattare; il piano annuale tipo invece si carica dopo, a richiesta.`,
      },
      {
        tipo: "prosa",
        testo:
          "Il lavoro è diviso in **dieci viste con un nome**: Quadro, Organizzazione, Contesto e parti, Conformità, Rischi e fornitori, Politica e piano, Indicatori, Registri, Verifica, Documenti. Non sono passi da fare in ordine: si torna su ciascuna quando serve, e ogni segnale del Quadro porta dritto alla vista dove si rimedia.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "L'esercizio si sceglie in alto",
        testo:
          "Indicatori e registrazioni appartengono a un anno. L'esercizio si sceglie in cima alla pagina, e finisce nell'indirizzo: chi apre il collegamento vede lo stesso anno. Cambiare esercizio non crea un percorso nuovo, cambia l'anno che si sta guardando dentro l'unica radice dell'azienda.",
      },
      {
        tipo: "prosa",
        testo:
          "La vista **Organizzazione** chiede l'anagrafica, il contratto collettivo applicato, i siti, l'alta direzione, il **responsabile del sistema** del punto 5.3 e i rappresentanti dei lavoratori. Il campo più delicato è il **campo di applicazione**: deve dire quali siti e quali attività sono coperti e, soprattutto, quali lavoratori. Per la specifica è lavoratore chiunque operi sotto il controllo dell'organizzazione, compresi somministrati, soci di cooperativa e appaltatori in sito.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Il contratto collettivo è il termine di confronto",
        testo:
          "Retribuzioni, orari e disciplina si misurano sul contratto collettivo indicato qui. Se non ci sono rappresentanze sindacali, si descrive come avviene la consultazione: un campo vuoto non dice che non ci sono, dice che nessuno l'ha scritto.",
      },
      {
        tipo: "prosa",
        testo: `La vista **Contesto e parti** raccoglie i fattori esterni e interni, ciascuno come rischio o opportunità: ne bastano ${FATTORI_ATTESI}, purché specifici — la stagionalità che genera picchi di straordinario, il ricorso ad agenzie, lavoratori stranieri che chiedono materiali tradotti. Le parti interessate caricate all'avvio si adattano: per ciascuna le esigenze, se l'esigenza è o può diventare un obbligo, se il sistema la gestisce e come la si coinvolge. Una parte con le esigenze vuote compare nella Verifica.`,
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "PAS 24000 non è SA8000",
        testo:
          "Sono temi vicini con schemi diversi. La **PAS 24000** è la specifica pubblicata dall'ente britannico di normazione, con la struttura delle norme ISO per il sistema e l'**Allegato A** per la prestazione sociale. **SA8000** è lo standard di Social Accountability International, con criteri e regole di certificazione suoi. Nel prodotto sono due percorsi separati, e fra i due non passa nessun dato: una valutazione fatta per uno non vale per l'altro.",
      },
      {
        tipo: "interfaccia",
        titolo: "Che cosa carica l'avvio",
        nota: "Il piano annuale tipo non arriva con l'avvio: si carica a richiesta dalla vista Politica e piano.",
        vista: {
          genere: "verifica",
          voci: [
            { testo: `Parti interessate tipo · ${NUMERI.partiTipoPas}`, esito: "ok" },
            { testo: `Rischi tipo da valutare · ${NUMERI.rischiTipoPas}`, esito: "ok" },
            { testo: "Piano annuale tipo", esito: "manca" },
          ],
        },
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo: "Come nasce il sistema di gestione sociale di un'azienda?",
          opzioni: [
            "Aprendo per la prima volta la pagina del percorso",
            "Col pulsante «Avvia il percorso», una volta sola per azienda",
            "Creando un percorso nuovo per ogni esercizio",
            "Importando i dati da SA8000",
          ],
          corretta: 1,
          spiegazione:
            "La radice nasce solo dal comando «Avvia il percorso», ed è una per azienda. Gli esercizi si scelgono in alto dentro la stessa radice, e aprire la pagina non scrive niente.",
        },
        {
          testo: "Chi va compreso fra i lavoratori nel campo di applicazione?",
          opzioni: [
            "Solo i dipendenti a tempo indeterminato",
            "Chiunque operi sotto il controllo dell'organizzazione, compresi somministrati e appaltatori in sito",
            "Solo chi ha un contratto collettivo",
            "I dipendenti e i fornitori di materie prime",
          ],
          corretta: 1,
          spiegazione:
            "La specifica guarda a chi lavora sotto il controllo dell'organizzazione, non al tipo di contratto: somministrati, soci di cooperativa e appaltatori in sito ci rientrano.",
        },
        {
          testo: "Un'azienda ha già valutato i criteri SA8000 nel prodotto. Che cosa ritrova nel percorso PAS 24000?",
          opzioni: [
            "Le stesse valutazioni, già importate",
            "Nulla: sono due schemi diversi e fra i due moduli non passa nessun dato",
            "Solo i rischi",
            "I requisiti dell'Allegato A già compilati",
          ],
          corretta: 1,
          spiegazione:
            "PAS 24000 e SA8000 hanno schemi e requisiti diversi. Il prodotto li tiene separati apposta: una valutazione fatta su un criterio dell'uno non dimostra un requisito dell'altro.",
        },
      ],
    },
  },

  {
    id: "conformita-requisiti",
    titolo: "I requisiti, e il peso di quelli non guardati",
    minuti: 6,
    sommario:
      "Le clausole di sistema e l'Allegato A, come si valuta un requisito, quanto pesa ciascun esito, e perché «non pertinente» non è un'esclusione.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `La vista **Conformità** raccoglie **${NUMERI.requisitiPas} requisiti** in **${NUMERI.gruppiPas} gruppi**: ${NUMERI.requisitiSistemaPas} sulle ${NUMERI.clausolePas} clausole di sistema, dal contesto al miglioramento, e ${NUMERI.requisitiAllegatoPas} sulle ${NUMERI.areeAllegatoPas} aree dell'**Allegato A**, dai diritti umani all'etica aziendale. Ogni gruppo ha la sua guida: che cosa guarda l'auditor, dove trovare le evidenze e qual è l'errore ricorrente.`,
      },
      {
        tipo: "tabella",
        intestazioni: ["Esito", "Peso nell'indice", "Che cosa pretende"],
        righe: [
          ["Conforme", `${PESI_PAS.c}`, "Un'evidenza scritta accanto"],
          ["Parziale", `${PESI_PAS.p}`, "Un'azione, chi la porta e per quando"],
          ["Non conforme", `${PESI_PAS.n}`, "Un'azione, chi la porta e per quando"],
          ["Non pertinente", "esce dal conto", "Una motivazione"],
          ["Da valutare", `${PESI_PAS.n}, e **resta nel conto**`, "Di essere valutato"],
        ],
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Un requisito mai guardato pesa zero",
        testo: `Mediare i soli requisiti valutati darebbe cento a un requisito conforme su ${NUMERI.requisitiPas}, e al resto mai aperto: lo stesso numero di un sistema interamente conforme. Qui un requisito pertinente e non valutato **pesa zero e resta nel denominatore**, e il parziale vale metà. Se nessun requisito è ancora stato valutato, l'indice non compare affatto: zero direbbe «tutto non conforme» di un sistema di cui non si sa ancora niente.`,
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "«Non pertinente» non è un'esclusione",
        testo:
          "L'Allegato A si applica per intero e non ammette esclusioni. «Non pertinente» dice che la situazione nell'organizzazione **non ricorre** — per esempio, non vengono forniti alloggi — e chiede la motivazione al posto dell'evidenza. Esce dal conto perché non c'è niente da dimostrare, non perché qualcuno ha deciso che il requisito non lo riguarda.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "L'errore ricorrente",
        testo:
          "Segnare conforme ciò che è solo previsto da una procedura. La specifica si verifica con interviste e sopralluoghi: si valuta la situazione reale. L'evidenza di un requisito conforme finisce nel manuale come descrizione del presidio, quindi va scritta pensando a chi la leggerà.",
      },
      {
        tipo: "prosa",
        testo:
          "La vista **Verifica** guarda dentro le valutazioni: elenca i requisiti **da valutare**, quelli **parziali o non conformi senza un'azione** e quelli **conformi senza evidenza**, ciascuno col nome del gruppo accanto al riferimento. Un riferimento da solo, in un elenco lungo, non dice niente a chi lo legge.",
      },
      {
        tipo: "interfaccia",
        titolo: "Quattro esiti, un requisito alla volta",
        nota: "Lo stato si annulla ripremendo il pulsante acceso: «da valutare» non si sceglie, è l'assenza di una scelta.",
        vista: {
          genere: "stati",
          voci: [
            { testo: "Conforme — con l'evidenza accanto", stato: "ok" },
            { testo: "Parziale — vale metà, serve un'azione", stato: "parziale" },
            { testo: "Non conforme — vale zero, serve un'azione", stato: "no" },
            { testo: "Non pertinente — la situazione non ricorre, va motivato", stato: "na" },
          ],
        },
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo: "Quanto pesa un requisito parziale nell'indice di conformità?",
          opzioni: ["Zero, come un non conforme", "Metà di un conforme", "Come un conforme, se c'è un'azione", "Non entra nell'indice"],
          corretta: 1,
          spiegazione: `Conforme vale ${PESI_PAS.c}, parziale ${PESI_PAS.p}, non conforme ${PESI_PAS.n}. Il parziale chiede comunque un'azione con responsabile e scadenza: senza, la Verifica lo elenca.`,
        },
        {
          testo: "Hai valutato un requisito, conforme, e non hai ancora aperto gli altri. Che cosa dice l'indice?",
          opzioni: [
            "100%: tutto ciò che è valutato è conforme",
            "Un numero basso: i non valutati pesano zero e restano nel conto",
            "Nessun indice finché non li valuti tutti",
            "Il 50%",
          ],
          corretta: 1,
          spiegazione:
            "Un requisito pertinente e mai valutato pesa zero e resta nel denominatore. L'indice misura quanto è stato dimostrato, non la media di ciò che si è guardato.",
        },
        {
          testo: "Un requisito dell'Allegato A riguarda gli alloggi, e l'azienda non ne fornisce. Come si valuta?",
          opzioni: [
            "Si esclude dall'Allegato A",
            "«Non pertinente», con la motivazione: la situazione non ricorre",
            "«Conforme», perché non c'è niente di sbagliato",
            "Si lascia da valutare",
          ],
          corretta: 1,
          spiegazione:
            "L'Allegato A non ammette esclusioni. «Non pertinente» dice che la situazione non ricorre, esce dal conto e chiede una motivazione al posto dell'evidenza.",
        },
      ],
    },
  },

  {
    id: "rischi-e-fornitori",
    titolo: "Rischi per le persone e due diligence sui fornitori",
    minuti: 6,
    sommario:
      "Probabilità per gravità dal punto di vista di chi lavora, perché un asse solo non fa un rischio, e che cosa registrare per ogni fornitore.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `La vista **Rischi e fornitori** parte dai ${NUMERI.rischiTipoPas} rischi tipo caricati all'avvio, ciascuno legato a un'area dell'Allegato A e a un ambito: le attività dell'organizzazione oppure la catena di fornitura. Per ognuno si danno **probabilità** e **gravità** da 1 a 5, pensando alle conseguenze **per le persone**, non per l'azienda. Con le soglie predefinite il livello è **alto da ${P.alto}**, **medio da ${P.medio}**, basso sotto.`,
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Un asse solo non fa un rischio",
        testo:
          "Un livello esiste solo se **entrambi** i punteggi sono stati dati, interi da 1 a 5. Con la sola probabilità il rischio resta «da valutare» e la Verifica lo conta: un livello calcolato su un asse solo sarebbe un numero inventato.",
      },
      {
        tipo: "prosa",
        testo:
          "Un rischio alto senza misure di prevenzione o mitigazione è un **punto d'attenzione** nel Quadro, e la Verifica lo elenca per testo. Le soglie sono parametri del percorso: si cambiano per il singolo cliente, e il prodotto ricalcola le classi di tutti i rischi.",
      },
      {
        tipo: "prosa",
        testo:
          "Accanto ai rischi, i **fornitori** che contano per il sistema. Agenzie per il lavoro, cooperative e appaltatori in sito vanno sempre inseriti; per gli altri si parte da paese, settore e intensità di manodopera. Per ciascuno si registrano il livello di rischio, la **clausola sociale**, il **questionario**, la data dell'ultima verifica e l'esito: è la traccia della due diligence chiesta dall'Allegato A.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Situazione del fornitore", "Che cosa dice il prodotto", "Peso"],
        righe: [
          ["Rischio alto, mai verificato", "Fornitore a rischio alto mai verificato", "Punto d'attenzione"],
          ["Esito «Critico» alla verifica", "Fornitore con esito critico", "**Criticità**"],
          ["Nessun livello di rischio", "Fornitore senza livello di rischio, nella Verifica", "Da completare"],
          ["Nessun fornitore censito", "Quote di clausole e verifiche non calcolate", "Nella Verifica"],
        ],
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Senza fornitori le quote non sono zero",
        testo:
          "La quota di fornitori con clausola, con questionario o verificati si calcola sui fornitori censiti. Con un elenco vuoto la quota non esiste e si legge «—»: zero direbbe «nessuno ha firmato», detto di un elenco che non c'è.",
      },
      {
        tipo: "interfaccia",
        titolo: "Il livello si calcola, la classe discende",
        vista: {
          genere: "riga",
          intestazioni: ["Probabilità", "Gravità", "Ambito"],
          celle: [`${ESEMPIO_RISCHIO.probabilita}`, `${ESEMPIO_RISCHIO.gravita}`, "Catena di fornitura"],
          risultato: { etichetta: "Rischio", valore: `livello ${LIVELLO_ESEMPIO} · ${CLASSE_ESEMPIO} · servono misure` },
        },
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo: "Un rischio ha probabilità 3 e la gravità non è ancora stata indicata. Che livello ha?",
          opzioni: ["3, cioè basso", "Nessuno: è da valutare", "Alto, per prudenza", "Medio, come valore di mezzo"],
          corretta: 1,
          spiegazione:
            "Il livello esiste solo con entrambi i punteggi. Con un asse solo il rischio resta da valutare, e la Verifica lo conta fra quelli da completare.",
        },
        {
          testo: "Da quale punto di vista si attribuisce la gravità di un rischio sociale?",
          opzioni: ["Del danno economico per l'azienda", "Delle conseguenze per le persone", "Della probabilità di un'ispezione", "Del costo delle misure"],
          corretta: 1,
          spiegazione:
            "Il sistema di gestione sociale guarda alle persone: lavoratori, lavoratori dei fornitori, comunità. Un rischio piccolo per il bilancio può essere grave per chi lo subisce.",
        },
        {
          testo: "Un fornitore ha avuto esito «Critico» alla verifica. Che peso ha il segnale?",
          opzioni: ["Nessuno, se c'è la clausola sociale", "Punto d'attenzione", "Criticità", "Dipende dal paese"],
          corretta: 2,
          spiegazione:
            "Un esito critico è una criticità. Il fornitore a rischio alto mai verificato invece è un punto d'attenzione: manca la verifica, non è ancora emerso un problema.",
        },
      ],
    },
  },

  {
    id: "politica-e-piano",
    titolo: "La politica sociale, gli obiettivi e il piano annuale",
    minuti: 4,
    sommario:
      "I contenuti che l'auditor cerca nella politica, gli obiettivi misurabili e datati, e il piano tipo che si carica a richiesta.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `La vista **Politica e piano** parte da un testo modello, che si inserisce con un comando e si adatta, e da una lista di **${NUMERI.contenutiPoliticaPas} contenuti attesi**: i quattro temi — diritti umani, condizioni di lavoro, etica negli affari, salute e sicurezza — i due impegni, al rispetto dei requisiti e al miglioramento continuo, l'approvazione dell'alta direzione, la comunicazione all'interno e quella verso fornitori e partner.`,
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Una politica senza data non è approvata",
        testo:
          "La Verifica elenca ogni contenuto non spuntato e chiede la data di approvazione. Un testo di poche righe resta un abbozzo: il prodotto lo conta solo quando ha la sostanza di una politica.",
      },
      {
        tipo: "prosa",
        testo: `Gli **obiettivi** devono essere misurabili e datati, con un indicatore, un traguardo, una scadenza e un responsabile: ne servono almeno ${OBIETTIVI_ATTESI}. «Migliorare il clima aziendale» non è un obiettivo; «portare lo straordinario per addetto sotto 80 ore entro dicembre» lo è. Un obiettivo senza indicatore, scadenza o responsabile compare nella Verifica come incompleto.`,
      },
      {
        tipo: "prosa",
        testo: `Il **piano annuale** è un requisito proprio della specifica, al punto 8.1.2: le attività dei dodici mesi, ciascuna col suo mese, il responsabile e lo stato. Il pulsante **«Carica il piano tipo»** aggiunge ${NUMERI.attivitaTipoPas} attività che coprono gli adempimenti a cadenza annuale, dalla formazione sul canale di reclamo al riesame di dicembre. Sotto le ${ATTIVITA_ATTESE} attività il piano risulta incompleto.`,
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Il piano tipo si carica a richiesta, e una volta sola",
        testo:
          "Non arriva con l'avvio, perché un piano si costruisce dopo aver capito l'azienda. Premuto due volte non duplica niente: aggiunge solo le attività che mancano.",
      },
      {
        tipo: "interfaccia",
        titolo: "I contenuti della politica",
        vista: {
          genere: "verifica",
          voci: [
            { testo: "Tratta i diritti umani", esito: "ok" },
            { testo: "Tratta le condizioni di lavoro", esito: "ok" },
            { testo: "Impegna al miglioramento continuo del sistema", esito: "ok" },
            { testo: "È approvata e firmata dall'alta direzione", esito: "manca" },
            { testo: "È comunicata a fornitori e altri partner rilevanti", esito: "manca" },
          ],
        },
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo: "Quale di questi è un obiettivo che il prodotto considera completo?",
          opzioni: [
            "Migliorare il clima aziendale",
            "Straordinario per addetto sotto 80 ore entro dicembre, con indicatore e responsabile",
            "Più attenzione ai fornitori",
            "Rispettare la PAS 24000",
          ],
          corretta: 1,
          spiegazione:
            "Un obiettivo ha un indicatore, una scadenza e un responsabile. Senza uno dei tre la Verifica lo elenca come incompleto.",
        },
        {
          testo: "Quando si carica il piano annuale tipo?",
          opzioni: [
            "Con «Avvia il percorso», insieme ai rischi",
            "A richiesta, con «Carica il piano tipo» nella vista Politica e piano",
            "Ogni volta che si cambia esercizio",
            "Mai: il piano si scrive solo a mano",
          ],
          corretta: 1,
          spiegazione:
            "L'avvio carica parti interessate e rischi; il piano tipo si carica a richiesta, e premuto due volte non duplica le attività.",
        },
      ],
    },
  },

  {
    id: "indicatori-e-segnali",
    titolo: "Gli indicatori, e i derivati che non si inventano",
    minuti: 6,
    sommario:
      "Le misure dell'esercizio, i derivati calcolati solo con tutti gli ingressi, i «di cui» respinti e i segnali che nascono dai dati.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `La vista **Indicatori** chiede **${NUMERI.indicatoriPas} misure** per l'esercizio scelto, in ${NUMERI.sezioniIndicatoriPas} sezioni — organico, retribuzioni, orario, salute e sicurezza, formazione, rappresentanza e disciplina — con l'anno precedente accanto. Ne ricava **${NUMERI.derivatiPas} derivati**: le quote sull'organico, il margine sul minimo contrattuale, il divario retributivo di genere, le ore settimanali medie, gli indici di frequenza e di gravità degli infortuni.`,
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Un derivato esiste solo con TUTTI i suoi ingressi",
        testo:
          "Se manca anche un solo ingresso, il derivato non si calcola e si legge **«—»**. Leggere il vuoto come zero produrrebbe numeri falsi: senza la retribuzione media delle donne il divario di genere uscirebbe al 100%, senza la retribuzione più bassa il margine sul contratto collettivo uscirebbe a meno 100%, senza lo straordinario gli indici infortunistici sembrerebbero migliori del vero. Numeri così finirebbero nel manuale e nel verbale di riesame, che si firmano.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Lo zero è un'informazione, il vuoto è un dato mancante",
        testo:
          "Zero infortuni è un dato, e si scrive. Un campo che non si conosce si lascia vuoto, e la Verifica lo elenca fra gli indicatori da compilare. Un «di cui» maggiore del suo totale — più donne che addetti — viene **respinto** al salvataggio: un dato sbagliato si corregge, non entra in un documento.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Dato dell'esercizio", "Segnale", "Peso"],
        righe: [
          ["Minori di 15 anni al lavoro", "Lavoro minorile", "**Criticità**"],
          ["Retribuzione più bassa sotto il minimo contrattuale", "Retribuzione sotto contratto", "**Criticità**"],
          ["Trattenute disciplinari sulla retribuzione", "Trattenute applicate", "**Criticità**"],
          [`Settimana oltre ${P.oreTotali} ore`, "Oltre il limite complessivo", "**Criticità**"],
          [`Settimana oltre ${P.oreOrdinarie} ore`, "Verificare che l'eccedenza sia straordinario volontario e retribuito", "Punto d'attenzione"],
          ["Mensilità in ritardo, riposi non fruiti, sotto il salario dignitoso", "Da presidiare", "Punto d'attenzione"],
        ],
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "I limiti d'orario sono parametri",
        testo: `La specifica fissa ${P.oreOrdinarie} ore ordinarie e ${P.oreTotali} complessive a settimana. La normativa italiana e il contratto collettivo sono spesso più restrittivi, e vale la regola più favorevole ai lavoratori: i limiti si adeguano nei parametri del percorso, insieme alle ${P.settimane} settimane lavorate su cui si calcola la media.`,
      },
      {
        tipo: "interfaccia",
        titolo: "Un ingresso mancante",
        nota: "La retribuzione media delle donne non è stata inserita: il divario non si calcola.",
        vista: {
          genere: "riga",
          intestazioni: ["Media annua uomini", "Media annua donne"],
          celle: ["31.400 €", ""],
          risultato: { etichetta: "Divario retributivo di genere", valore: "—" },
        },
      },
    ],
    verifica: {
      minime: 3,
      domande: [
        {
          testo: "Hai inserito la retribuzione media degli uomini ma non quella delle donne. Che cosa mostra il divario retributivo di genere?",
          opzioni: ["100%", "0%", "«—»: senza tutti gli ingressi il derivato non esiste", "Il valore dell'anno precedente"],
          corretta: 2,
          spiegazione:
            "Un derivato si calcola solo con tutti i suoi ingressi. Leggere il vuoto come zero darebbe un divario del 100%, un numero falso che finirebbe in un documento firmato.",
        },
        {
          testo: "Provi a inserire 42 donne su 40 addetti. Che cosa succede?",
          opzioni: [
            "Il prodotto calcola una quota del 105%",
            "Il salvataggio viene respinto: il «di cui» non può superare il totale",
            "Il valore si arrotonda a 48",
            "Compare solo un punto d'attenzione",
          ],
          corretta: 1,
          spiegazione: "Un «di cui» maggiore del totale è un dato sbagliato, e si corregge prima che entri nei calcoli e nei documenti.",
        },
        {
          testo: `La settimana più lunga registrata è di ${P.oreOrdinarie + 4} ore, con i limiti predefiniti. Che segnale compare?`,
          opzioni: [
            "Nessuno",
            "Un punto d'attenzione: verificare che l'eccedenza sia straordinario volontario e retribuito",
            "Una criticità",
            "Un requisito non conforme",
          ],
          corretta: 1,
          spiegazione: `Sopra le ${P.oreOrdinarie} ore ordinarie è un punto d'attenzione; diventa una criticità solo oltre il limite complessivo di ${P.oreTotali} ore.`,
        },
      ],
    },
  },

  {
    id: "registri",
    titolo: "Gli otto registri, e il reclamo che non identifica",
    minuti: 4,
    sommario: `Che cosa si registra, perché la data assegna la voce all'esercizio, i reclami da sollecitare dopo ${P.giorniReclamo} giorni e la riservatezza di chi segnala.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `La vista **Registri** ne tiene **${NUMERI.registriPas}**: reclami e segnalazioni, non conformità e azioni correttive, formazione, emergenze, comunicazioni, consultazione dei lavoratori, audit interni e riesame della direzione. Ogni voce ha una data, ed è la data ad assegnarla all'esercizio.`,
      },
      {
        tipo: "prosa",
        testo: `Le voci aperte invece si contano su **tutto l'archivio**: un reclamo dell'anno scorso ancora aperto è un problema di oggi. Un reclamo aperto da più di ${P.giorniReclamo} giorni va sollecitato, un'azione correttiva con la scadenza passata e non chiusa è scaduta; entrambi sono punti d'attenzione nel Quadro. I giorni li conta il server, sul calendario italiano.`,
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Nel registro reclami non si identifica chi segnala",
        testo:
          "La riservatezza di chi segnala è un requisito dell'Allegato A, e il registro lo ricorda: non si riportano elementi che permettano di identificarlo. Nei documenti pubblicati, poi, dei registri entrano solo **conteggi**: l'oggetto di un reclamo o la descrizione di una non conformità non finiscono nel manuale.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Registrazione attesa nell'esercizio", "Riferimento"],
        righe: [
          ["Una prova di emergenza o un'esercitazione", "8.2"],
          ["Una comunicazione interna e una esterna sul sistema", "7.4.2 · 7.4.3"],
          ["Una consultazione dei lavoratori", "5.4"],
          ["Una formazione", "7.2"],
          ["Un audit interno svolto", "9.2"],
          ["Il riesame della direzione", "9.3"],
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Un audit pianificato non è un audit fatto",
        testo:
          "Un audit in stato «Pianificato» conta come voce del registro, ma non come audit svolto: il segnale resta finché non è svolto o chiuso. Allo stesso modo, fra le emergenze contano come prova solo le prove e le esercitazioni, non la verifica dei presidi.",
      },
      {
        tipo: "interfaccia",
        titolo: "Le registrazioni minime dell'esercizio",
        vista: {
          genere: "verifica",
          voci: [
            { testo: "Prova di emergenza", esito: "ok" },
            { testo: "Comunicazione interna", esito: "ok" },
            { testo: "Comunicazione esterna", esito: "manca" },
            { testo: "Audit interno svolto", esito: "manca" },
            { testo: "Riesame della direzione", esito: "manca" },
          ],
        },
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo: "Un reclamo ricevuto nell'esercizio precedente è ancora aperto. Il prodotto lo vede nell'esercizio corrente?",
          opzioni: [
            "No: appartiene all'anno della sua data",
            "Sì: le voci aperte si contano su tutto l'archivio",
            "Solo se lo si copia nell'anno nuovo",
            "Solo nei documenti",
          ],
          corretta: 1,
          spiegazione:
            "La data assegna la voce all'esercizio, ma aperte e scadute si contano su tutto l'archivio: un reclamo ancora aperto è un problema di oggi.",
        },
        {
          testo: "Che cosa non si scrive nel registro reclami?",
          opzioni: [
            "La data di ricezione",
            "Elementi che permettano di identificare chi segnala",
            "L'area dell'Allegato A",
            "L'esito dell'istruttoria",
          ],
          corretta: 1,
          spiegazione:
            "La riservatezza di chi segnala è un requisito della specifica. E nei documenti pubblicati dei registri entrano solo conteggi.",
        },
        {
          testo: "C'è un solo audit interno nell'esercizio, in stato «Pianificato». Il segnale «nessun audit interno svolto» scompare?",
          opzioni: ["Sì, la voce c'è", "No: un audit pianificato non è un audit svolto", "Sì, se ha una data", "Dipende dai rilievi"],
          corretta: 1,
          spiegazione: "La voce conta per la compilazione del registro, ma il segnale chiede un audit svolto o chiuso.",
        },
      ],
    },
  },

  {
    id: "verifica-e-documenti",
    titolo: "La verifica, e i quattro documenti",
    minuti: 5,
    sommario:
      "Che cosa serve perché il sistema risulti presentabile, e che cosa esce alla fine: quattro documenti, ciascuno una serie di revisioni.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "La vista **Verifica** dice che cosa oggi manca prima dell'audit di certificazione, vista per vista, ciascuna voce col collegamento al punto da sistemare. Il sistema risulta **presentabile** solo se insieme non ci sono criticità, tutti i requisiti sono valutati e nessuno è non conforme, le registrazioni minime dell'esercizio ci sono tutte e la compilazione arriva almeno all'85%.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Compilazione e conformità sono due misure",
        testo:
          "L'avanzamento misura quanto è compilato, in sette parti; l'indice di conformità misura quanto è dimostrato. Un percorso al 100% può essere pieno di non conformità, purché valutate e documentate: per questo «presentabile» le chiede entrambe.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Documento", "Che cosa contiene"],
        righe: [
          ["Manuale del sistema", "Il sistema in dieci sezioni, dal campo di applicazione al miglioramento, con gli indicatori dell'esercizio scelto"],
          ["Politica sociale", "Il testo, con approvazione e firma: da affiggere e da inviare ai fornitori"],
          ["Rapporto di conformità e piano di adeguamento", "L'indice per gruppo, le azioni, i non pertinenti con la motivazione e il dettaglio dei requisiti"],
          ["Verbale di riesame", "Gli elementi in ingresso calcolati dai dati dell'esercizio, e le decisioni dell'alta direzione"],
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Una serie di revisioni, non un documento per anno",
        testo:
          "Ognuno dei quattro documenti si pubblica in revisioni successive, e l'esercizio **non** fa parte della serie. Manuale e verbale riportano l'esercizio scelto in alto al momento della pubblicazione; politica e rapporto fotografano il sistema alla data. Ogni revisione è congelata: dice ciò che era vero il giorno della firma, derivati compresi.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Dai registri solo conteggi, tranne le decisioni del riesame",
        testo:
          "Il collegamento che si dà al cliente serve tutti i documenti dell'azienda: per questo dei registri entrano solo i numeri. L'unica eccezione sono le **decisioni del riesame**, che sono testo dell'alta direzione e il contenuto stesso del verbale. Il verbale cita anche il riesame precedente: sempre quello prima dell'esercizio, mai uno successivo.",
      },
      {
        tipo: "interfaccia",
        titolo: "Che cosa manca per essere presentabile",
        vista: {
          genere: "verifica",
          voci: [
            { testo: "Nessuna criticità aperta", esito: "ok" },
            { testo: "Tutti i requisiti valutati, nessuno non conforme", esito: "manca" },
            { testo: "Registrazioni minime dell'esercizio complete", esito: "manca" },
            { testo: "Compilazione almeno all'85%", esito: "ok" },
          ],
        },
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo: "Tutti i requisiti sono valutati, uno è non conforme, il resto è in ordine. Il sistema è presentabile?",
          opzioni: [
            "Sì, l'indice è comunque alto",
            "No: serve che nessun requisito sia non conforme",
            "Sì, se c'è un'azione d'adeguamento",
            "Dipende dal gruppo",
          ],
          corretta: 1,
          spiegazione:
            "Presentabile pretende zero criticità, zero non conformità, registrazioni complete e compilazione almeno all'85%. Un'azione porta la non conformità nel piano, ma finché non è chiusa resta una lacuna.",
        },
        {
          testo: "Hai pubblicato il manuale riferito al 2026. Pubblicandolo di nuovo, sul 2027, che cosa ottieni?",
          opzioni: [
            "Un documento nuovo, separato da quello del 2026",
            "La revisione successiva della stessa serie, che riporta il 2027",
            "La sostituzione della revisione già consegnata",
            "Un errore: il manuale è uno per esercizio",
          ],
          corretta: 1,
          spiegazione:
            "L'esercizio non fa parte della serie: la nuova pubblicazione è la revisione successiva, e porta dentro di sé l'esercizio scelto in alto. Le revisioni già consegnate non cambiano.",
        },
        {
          testo: "Che cosa dei registri entra nei documenti pubblicati?",
          opzioni: [
            "Tutto, per trasparenza",
            "Solo i conteggi, tranne le decisioni del riesame",
            "Gli oggetti dei reclami, senza nomi",
            "Niente",
          ],
          corretta: 1,
          spiegazione:
            "Il collegamento del cliente serve tutti i documenti: descrizioni di reclami e non conformità non devono finirci. Le decisioni del riesame sono l'eccezione, perché sono il contenuto del verbale.",
        },
      ],
    },
  },
];
