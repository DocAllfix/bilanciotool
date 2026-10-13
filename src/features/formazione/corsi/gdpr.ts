import { PESI_GDPR } from "@/lib/calc/gdpr/conformita";
import { classe, livello } from "@/lib/calc/gdpr/rischio";
import { ORE_NOTIFICA, MESI_RISCONTRO_PROROGA } from "@/lib/calc/gdpr/termini";
import { PARAMETRI_PREDEFINITI } from "@/lib/calc/gdpr/tipi";
import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

// Protezione dei dati personali (Reg. UE 2016/679, D.Lgs. 196/2003).
//
// ⚠️ Scritto sul MODULO, non sul prototipo. Il prototipo era uno stepper a passi numerati
// che salvava nel browser e media i soli requisiti valutati; qui ci sono dieci viste, il
// lavoro sta su un server, e un requisito mai guardato pesa zero. Ogni regola citata sotto
// ha la sua funzione in `src/lib/calc/gdpr/`: se il motore cambia, questo testo va riletto.
//
// ⚠️ Le soglie del rischio e della valutazione d'impatto sono PARAMETRI del percorso, che
// il consulente può cambiare: il corso cita i valori PREDEFINITI e li legge dal motore,
// perché un «15» scritto qui resterebbe vero solo finché nessuno tocca il seme.

const P = PARAMETRI_PREDEFINITI;

/** Il trattamento d'esempio della sezione sui rischi: probabilità e gravità a quattro. */
const ESEMPIO_RISCHIO = { probabilita: 4, gravita: 4 };
const LIVELLO_ESEMPIO = livello(ESEMPIO_RISCHIO);
const CLASSE_ESEMPIO = classe(LIVELLO_ESEMPIO, P);

/** Requisiti valutati conformi nell'esempio della sezione sulla conformità. */
const CONFORMI_ESEMPIO = 3;

export const GDPR: Sezione[] = [
  {
    id: "ruoli-e-dpo",
    titolo: "Chi decide, e se serve il responsabile della protezione dei dati",
    minuti: 6,
    sommario:
      "La vista Organizzazione: il ruolo dell'azienda, le tre domande dell'art. 37 e la differenza fra «non serve» e «non ci abbiamo pensato».",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Il regolamento distingue chi **decide** perché e come trattare i dati, il titolare, da chi li tratta **per conto** di un altro, il responsabile. Un'azienda è quasi sempre titolare dei propri trattamenti e, a volte, responsabile per quelli dei suoi clienti. La vista **Organizzazione** comincia da qui: l'anagrafica, il referente interno e il recapito a cui un interessato può scrivere.",
      },
      {
        tipo: "prosa",
        testo:
          "Poi le **tre domande dell'art. 37.1**, una per lettera: a) il trattamento è svolto da un'autorità o da un organismo pubblico; b) le attività principali consistono in un monitoraggio regolare e sistematico degli interessati su larga scala; c) consistono nel trattamento su larga scala di categorie particolari di dati o di dati giudiziari. **Basta un «Sì»** perché la designazione del responsabile della protezione dei dati sia obbligatoria.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Situazione", "Che cosa dice il prodotto", "Peso"],
        righe: [
          ["Una delle tre domande senza risposta", "Obbligo non ancora valutato", "Punto d'attenzione"],
          ["Un «Sì» e nessun nome designato", "Designazione obbligatoria mancante", "**Criticità**"],
          ["Designato, ma senza data di comunicazione", "Contatti non comunicati al Garante (art. 37.7)", "Punto d'attenzione"],
          ["Tre «No»", "Designazione non obbligatoria", "Nessun segnale"],
        ],
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Tre risposte vuote non sono tre «No»",
        testo:
          "«Non serve» è una **conclusione** che qualcuno ha tratto rispondendo alle tre domande. Una domanda lasciata vuota dice che quella conclusione non è ancora stata tratta, e il prodotto la segnala invece di darla per buona. Un'azienda che dichiara di non dover designare nessuno sulla base di una domanda a cui nessuno ha risposto ha un problema che la prima ispezione trova.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Gli amministratori di sistema cambiano i registri dovuti",
        testo:
          "Nella stessa vista si dichiara se ci sono amministratori di sistema, interni o esterni. Con un «Sì» la verifica annuale del loro operato, prevista dal provvedimento del Garante del 27 novembre 2008, entra fra le registrazioni dovute: senza quella registrazione l'esercizio non risulta completo.",
      },
      {
        tipo: "interfaccia",
        titolo: "Le tre lettere dell'art. 37.1",
        nota: "Il «Sì» alla lettera b) basta da solo: le altre due non lo compensano.",
        vista: {
          genere: "riga",
          intestazioni: ["Lettera a)", "Lettera b)", "Lettera c)"],
          celle: ["No", "Sì", "No"],
          risultato: { etichetta: "Responsabile della protezione dei dati", valore: "designazione obbligatoria" },
        },
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo:
            "Un'azienda risponde «No» alle lettere a) e c) e lascia vuota la lettera b). Che cosa mostra il prodotto?",
          opzioni: [
            "Designazione non obbligatoria: due «No» bastano",
            "Obbligo non ancora valutato, come punto d'attenzione",
            "Designazione obbligatoria, per prudenza",
            "Nessun segnale finché non si pubblica",
          ],
          corretta: 1,
          spiegazione:
            "Basta un «Sì» per far scattare l'obbligo, quindi finché una lettera è vuota la conclusione non si può trarre. Il prodotto lo dice invece di presumere un «No» che nessuno ha dato.",
        },
        {
          testo: "Il responsabile della protezione dei dati è obbligatorio ma nessuno è stato designato. Che peso ha il segnale?",
          opzioni: ["Punto d'attenzione", "Criticità", "Nessuno: è una scelta dell'azienda", "Dipende dal numero di dipendenti"],
          corretta: 1,
          spiegazione:
            "È una criticità: l'obbligo è stato accertato e non è stato adempiuto. Un punto d'attenzione resta per i casi più lievi, come i contatti del designato non ancora comunicati al Garante.",
        },
        {
          testo: "L'azienda dichiara di avere amministratori di sistema. Che cosa cambia?",
          opzioni: [
            "Niente: è un dato anagrafico",
            "La verifica annuale del loro operato diventa una registrazione dovuta",
            "Diventa obbligatorio il responsabile della protezione dei dati",
            "Si aggiunge un documento alla serie",
          ],
          corretta: 1,
          spiegazione:
            "Con un «Sì» il registro degli amministratori di sistema entra fra quelli dovuti nell'anno: senza una verifica registrata, l'esercizio non risulta completo e la vista Verifica lo elenca.",
        },
      ],
    },
  },

  {
    id: "registro-trattamenti",
    titolo: "Il registro dei trattamenti",
    minuti: 7,
    sommario:
      "L'art. 30 riga per riga: i campi che non possono mancare, la base giuridica, i dati particolari e i trattamenti tipici già impostati.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il registro è il primo documento che il Garante chiede, ed è la base di tutto il resto: i rischi, le valutazioni d'impatto e la conformità si costruiscono sui trattamenti che vi sono censiti. Per non partire da zero, la vista **Trattamenti** propone **${NUMERI.trattamentiTipoGdpr} trattamenti tipici** — dal rapporto di lavoro alla videosorveglianza, dalla newsletter alla geolocalizzazione dei veicoli — che si aggiungono con un clic e si correggono sul caso concreto.`,
      },
      {
        tipo: "elenco",
        voci: [
          "**Finalità**: perché si trattano quei dati, detto in modo che un estraneo lo capisca.",
          "**Base giuridica**: una delle sei dell'art. 6, per ogni trattamento.",
          "**Interessati** e **categorie di dati**.",
          "**Destinatari**: a chi i dati vengono comunicati.",
          "**Termine di conservazione**: un tempo o un criterio, non «quanto serve».",
          "**Misure di sicurezza**.",
        ],
      },
      {
        tipo: "prosa",
        testo:
          "Sono i sette campi che l'art. 30.1 rende obbligatori — la finalità, la base, gli interessati, i dati, i destinatari, la conservazione e le misure — e il prodotto misura per ogni trattamento quanti sono compilati. Un trattamento senza base giuridica è una **criticità**; uno senza termine di conservazione, un punto d'attenzione.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Il legittimo interesse si dimostra",
        testo:
          "Se la base è il legittimo interesse dell'art. 6.1.f, il prodotto chiede se il **bilanciamento** con i diritti degli interessati è documentato. Finché la risposta non è «Sì» il trattamento resta segnalato: il legittimo interesse non è una base di riserva per quando le altre non tornano, è una valutazione che va scritta.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Dati particolari senza condizione dell'art. 9.2",
        testo:
          "Salute, appartenenza sindacale, dati biometrici: quando un trattamento li riguarda non basta la base dell'art. 6, serve anche una delle dieci condizioni dell'art. 9.2. Spuntare «dati particolari» senza indicarla produce una **criticità**, perché in quel caso il trattamento è vietato finché la condizione non c'è.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Il consenso non è la base per tutto",
        testo:
          "Nel rapporto di lavoro il consenso quasi mai è libero, e chiederlo dove non serve crea un obbligo di gestirne la revoca che poi nessuno sa onorare. La base giusta di una busta paga è il contratto o l'obbligo di legge.",
      },
      {
        tipo: "interfaccia",
        titolo: "Un trattamento con i campi che mancano",
        vista: {
          genere: "verifica",
          voci: [
            { testo: "Finalità · gestione delle presenze e delle paghe", esito: "ok" },
            { testo: "Base giuridica · contratto (6.1.b)", esito: "ok" },
            { testo: "Interessati e categorie di dati", esito: "ok" },
            { testo: "Destinatari · consulente del lavoro", esito: "ok" },
            { testo: "Termine di conservazione", esito: "manca" },
            { testo: "Misure di sicurezza", esito: "manca" },
          ],
        },
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo: "Un trattamento riguarda dati sulla salute dei dipendenti e ha come base l'obbligo di legge. Che cosa manca?",
          opzioni: [
            "Niente: la base giuridica c'è",
            "Una delle condizioni dell'art. 9.2",
            "Il consenso esplicito, sempre",
            "La valutazione d'impatto",
          ],
          corretta: 1,
          spiegazione:
            "Per le categorie particolari la base dell'art. 6 non basta: serve anche una condizione dell'art. 9.2, nel caso dei dipendenti di solito quella sul lavoro e la sicurezza sociale. Senza, il prodotto segna una criticità.",
        },
        {
          testo: "La base di un trattamento è il legittimo interesse. Quando smette di essere segnalato?",
          opzioni: [
            "Subito, appena si sceglie la base",
            "Quando il bilanciamento risulta documentato",
            "Quando l'interessato dà il consenso",
            "Mai: il legittimo interesse è sempre segnalato",
          ],
          corretta: 1,
          spiegazione:
            "Il legittimo interesse regge solo se il bilanciamento con i diritti degli interessati è stato fatto e scritto. Il prodotto chiede proprio questo, e finché la risposta non è «Sì» il trattamento resta fra i punti d'attenzione.",
        },
        {
          testo: "Che cosa sono i trattamenti tipici della vista Trattamenti?",
          opzioni: [
            "Un elenco da cui ne va scelto almeno uno",
            "Trattamenti già impostati da aggiungere con un clic e correggere sul caso",
            "Gli unici trattamenti che il registro accetta",
            "Un esempio che non si può modificare",
          ],
          corretta: 1,
          spiegazione:
            "Sono un punto di partenza: si aggiungono e si adattano all'azienda. Il registro accetta anche trattamenti scritti da zero, ed è giusto che ce ne siano quando l'attività del cliente non è fra quelle tipiche.",
        },
      ],
    },
  },

  {
    id: "conformita-requisiti",
    titolo: "I requisiti, e il peso di quelli non guardati",
    minuti: 6,
    sommario:
      "Come si valuta un requisito, quanto pesa ciascun esito, e perché all'inizio l'indice è basso anche se tutto quello che hai guardato è a posto.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `La vista **Conformità** raccoglie **${NUMERI.requisitiGdpr} requisiti** in **${NUMERI.gruppiGdpr} gruppi**, dai principi e le basi giuridiche fino alla normativa italiana e ai provvedimenti del Garante. Ogni gruppo ha la sua guida: che cosa chiede, che cosa verificare, quali evidenze cercare e dove si sbaglia più spesso.`,
      },
      {
        tipo: "tabella",
        intestazioni: ["Esito", "Peso nell'indice", "Che cosa pretende"],
        righe: [
          ["Conforme", `${PESI_GDPR.c}`, "Un'evidenza scritta accanto"],
          ["Parziale", `${PESI_GDPR.p}`, "Un'azione d'adeguamento"],
          ["Non conforme", `${PESI_GDPR.n}`, "Un'azione d'adeguamento"],
          ["Non pertinente", "esce dal conto", "Una ragione"],
          ["Da valutare", `${PESI_GDPR.n}, e **resta nel conto**`, "Di essere valutato"],
        ],
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Un requisito mai guardato pesa zero",
        testo: `Un foglio di calcolo che media i soli requisiti valutati dà cento a tre conformi e al resto mai aperto: lo stesso numero di un sistema interamente conforme. Qui un requisito pertinente e non valutato **pesa zero e resta nel denominatore**, come in tutti i moduli di conformità del prodotto. Con ${CONFORMI_ESEMPIO} requisiti conformi su ${NUMERI.requisitiGdpr} l'indice è poco sopra il 3%, ed è il numero giusto: dice quanto è stato dimostrato, non la media di ciò che si è guardato.`,
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "«Non pertinente» è una valutazione",
        testo:
          "Un requisito non pertinente esce dal conto, e non abbassa l'indice a chi ha dichiarato, motivandolo, che quel requisito non lo riguarda. Ma è una dichiarazione, non un modo di far salire la percentuale. E se nessun requisito è ancora stato valutato, l'indice non compare affatto: zero direbbe «tutto non conforme» di un sistema di cui non si sa ancora niente.",
      },
      {
        tipo: "prosa",
        testo:
          "La vista **Verifica** guarda dentro le valutazioni: elenca i requisiti **conformi senza evidenza** e quelli **parziali o non conformi senza un'azione** definita. Un «Conforme» che nessun documento sostiene è la prima cosa che un'ispezione smonta, e una non conformità senza azione non entra in nessun piano.",
      },
      {
        tipo: "interfaccia",
        titolo: "Quattro esiti, un requisito alla volta",
        vista: {
          genere: "stati",
          voci: [
            { testo: "Conforme — con l'evidenza accanto", stato: "ok" },
            { testo: "Parziale — vale metà, serve un'azione", stato: "parziale" },
            { testo: "Non conforme — vale zero, serve un'azione", stato: "no" },
            { testo: "Non pertinente — esce dal conto", stato: "na" },
          ],
        },
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo: `Su ${NUMERI.requisitiGdpr} requisiti tutti pertinenti ne hai valutati tre, tutti conformi. Che cosa dice l'indice?`,
          opzioni: ["100%: tutto ciò che è valutato è conforme", "Poco sopra il 3%", "Nessun indice finché non li valuti tutti", "Il 50%"],
          corretta: 1,
          spiegazione:
            "I requisiti non valutati pesano zero e restano nel denominatore: l'indice misura quanto è stato dimostrato. Mediare sui soli valutati darebbe 100%, lo stesso numero di un sistema interamente conforme.",
        },
        {
          testo: "Quanto pesa un requisito parziale?",
          opzioni: ["Zero, come un non conforme", "Metà di un conforme", "Come un conforme, se c'è un'azione", "Non entra nell'indice"],
          corretta: 1,
          spiegazione: `Conforme vale ${PESI_GDPR.c}, parziale ${PESI_GDPR.p}, non conforme ${PESI_GDPR.n}. Il parziale chiede comunque un'azione d'adeguamento: senza, la vista Verifica lo elenca.`,
        },
        {
          testo: "Un requisito è segnato «Conforme» ma il campo dell'evidenza è vuoto. Che cosa succede?",
          opzioni: [
            "Niente: l'esito è quello che conta",
            "Compare nella Verifica fra i conformi senza evidenza",
            "Viene declassato a parziale",
            "Il prodotto impedisce di salvarlo",
          ],
          corretta: 1,
          spiegazione:
            "L'esito resta, ma la Verifica lo elenca: un «Conforme» senza un documento che lo sostenga non regge davanti a un'ispezione, e il prodotto preferisce dirlo prima.",
        },
      ],
    },
  },

  {
    id: "rischi-e-responsabili",
    titolo: "Rischi, valutazioni d'impatto e responsabili",
    minuti: 7,
    sommario:
      "Quando serve una valutazione d'impatto, come si calcola il rischio, e perché un contratto «non dovuto» vale solo per il titolare autonomo.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `Per ogni trattamento la vista **Rischi e responsabili** propone i **${NUMERI.criteriGdpr} criteri** delle linee guida europee sulla valutazione d'impatto: profilazione, decisioni automatizzate, monitoraggio sistematico, dati sensibili, larga scala, incrocio di banche dati, interessati vulnerabili, tecnologie nuove, effetti che impediscono di esercitare un diritto. Con la soglia predefinita, **da ${P.sogliaDpia} criteri in su** la valutazione d'impatto dell'art. 35 è di norma necessaria.`,
      },
      {
        tipo: "prosa",
        testo: `Il rischio per gli interessati è **probabilità per gravità**, ciascuna da 1 a 5. Con le soglie predefinite il livello è **alto da ${P.alto}**, **medio da ${P.medio}**, basso sotto. Le soglie si possono cambiare per il singolo percorso, e il prodotto pretende che quella dell'alto resti sopra quella del medio.`,
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Un asse solo non fa un rischio",
        testo:
          "Un livello esiste solo se **entrambi** i punteggi sono stati dati. Con la sola probabilità il trattamento resta «da valutare»: un rischio calcolato su un asse solo sarebbe un numero inventato, e la matrice lo disegnerebbe in una casella dove non sta.",
      },
      {
        tipo: "prosa",
        testo:
          "Un rischio alto senza misure di mitigazione è un punto d'attenzione; una valutazione d'impatto necessaria e non conclusa è una **criticità**. Se la valutazione si chiude con un rischio residuo elevato, l'esito «consultazione preventiva» porta a un segnale specifico: l'art. 36 chiede di consultare il Garante prima di cominciare.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Qualifica del fornitore", "Contratto", "«Non dovuto» ammesso?"],
        righe: [
          ["Responsabile (art. 28)", "Sempre dovuto", "No: la validazione lo respinge"],
          ["Sub-responsabile", "Sempre dovuto", "No"],
          ["Contitolare (art. 26)", "Accordo di contitolarità", "No"],
          ["Titolare autonomo", "Non dovuto", "Sì, ed è l'unico caso"],
        ],
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Un responsabile senza contratto è una criticità",
        testo:
          "«Non dovuto» descrive solo il titolare autonomo, che tratta i dati per fini propri. Su un responsabile quella scelta non si salva, e se arrivasse comunque il motore la conterebbe come contratto mancante: chi tratta dati per conto dell'azienda deve avere un contratto ai sensi dell'art. 28, senza eccezioni.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "I trasferimenti fuori dallo Spazio economico europeo",
        testo:
          "Per ogni fornitore si indica la garanzia del trasferimento: nessun trasferimento, decisione di adeguatezza, clausole contrattuali tipo, norme vincolanti d'impresa, deroga dell'art. 49. «Da definire» è una **criticità**; la deroga è un punto d'attenzione, perché vale solo per trasferimenti occasionali.",
      },
      {
        tipo: "interfaccia",
        titolo: "Il livello si calcola, la classe discende",
        vista: {
          genere: "riga",
          intestazioni: ["Probabilità", "Gravità", "Criteri presenti"],
          celle: [`${ESEMPIO_RISCHIO.probabilita}`, `${ESEMPIO_RISCHIO.gravita}`, `${P.sogliaDpia}`],
          risultato: {
            etichetta: "Rischio",
            valore: `livello ${LIVELLO_ESEMPIO} · ${CLASSE_ESEMPIO} · valutazione d'impatto necessaria`,
          },
        },
      },
    ],
    verifica: {
      minime: 3,
      domande: [
        {
          testo: "Un trattamento ha probabilità 4 e la gravità non è ancora stata indicata. Che livello di rischio ha?",
          opzioni: ["4, cioè basso", "Nessuno: è da valutare", "Alto, per prudenza", "Medio, come valore di mezzo"],
          corretta: 1,
          spiegazione:
            "Il livello esiste solo con entrambi i punteggi. Con un asse solo il trattamento resta da valutare, e la Verifica lo elenca fra i rischi da completare.",
        },
        {
          testo: "Un fornitore è qualificato «Responsabile (art. 28)» e qualcuno prova a segnare il contratto «Non dovuto». Che cosa succede?",
          opzioni: [
            "Il prodotto lo accetta e lo esclude dalle lacune",
            "La validazione lo respinge: il contratto con un responsabile è sempre dovuto",
            "Diventa un titolare autonomo",
            "Compare solo come punto d'attenzione",
          ],
          corretta: 1,
          spiegazione:
            "«Non dovuto» descrive solo il titolare autonomo. Su un responsabile è un'incoerenza: non si salva, e il motore conta comunque quel contratto come mancante.",
        },
        {
          testo: "Con le soglie predefinite, da quanti criteri di vaglio la valutazione d'impatto è di norma necessaria?",
          opzioni: ["Da uno", `Da ${P.sogliaDpia}`, "Da tutti", "Solo con dati sensibili"],
          corretta: 1,
          spiegazione: `Da ${P.sogliaDpia} criteri in su, come indicano le linee guida europee. La soglia è un parametro del percorso: si può alzare o abbassare, e il prodotto ricalcola quali trattamenti la richiedono.`,
        },
        {
          testo: "Un fornitore americano riceve i dati e la garanzia del trasferimento è «Da definire». Che peso ha?",
          opzioni: ["Nessuno, se il contratto c'è", "Punto d'attenzione", "Criticità", "Dipende dal numero di interessati"],
          corretta: 2,
          spiegazione:
            "Un trasferimento fuori dallo Spazio economico europeo senza garanzia definita è una criticità. La deroga dell'art. 49 invece è solo un punto d'attenzione: è ammessa, ma per trasferimenti occasionali.",
        },
      ],
    },
  },

  {
    id: "registri-e-termini",
    titolo: "I registri, e i due termini che non si recuperano",
    minuti: 7,
    sommario: `Un mese per rispondere a un interessato, ${ORE_NOTIFICA} ore per notificare una violazione: da quando decorrono, come li calcola il server, e perché nei registri non si scrivono nomi.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `La vista **Registri** ne tiene **${NUMERI.registriGdpr}**: le richieste degli interessati, le violazioni dei dati, la formazione, gli audit e le verifiche, gli amministratori di sistema, il riesame annuale. Le registrazioni si attribuiscono all'anno per data; le richieste scadute e le violazioni aperte invece si contano su tutto l'archivio, perché una richiesta dell'anno scorso ancora senza risposta è un problema di oggi.`,
      },
      {
        tipo: "tabella",
        intestazioni: ["Registro", "Termine", "Decorre da"],
        righe: [
          ["Richieste degli interessati", "1 mese", "la ricezione (art. 12.3)"],
          ["Con proroga comunicata e motivata", `${MESI_RISCONTRO_PROROGA} mesi in tutto`, "la ricezione"],
          ["Violazioni con rischio non improbabile", `${ORE_NOTIFICA} ore`, "**l'istante** in cui l'azienda ne è venuta a conoscenza (art. 33.1)"],
        ],
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Il mese si conta sul calendario",
        testo:
          "Una richiesta ricevuta il 31 gennaio scade il 28 febbraio: il mese si somma sul calendario e, se il giorno non esiste, si aggancia all'ultimo del mese. Una risposta data dopo la scadenza resta «fuori termine» anche quando arriva: è un fatto, e il registro lo riporta.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: `Le ${ORE_NOTIFICA} ore sono ore vere`,
        testo:
          "La conoscenza di una violazione si registra con data **e ora**, e il termine lo calcola il server in ora italiana. Non il browser, non il fuso del server: un calcolo nel fuso sbagliato sposterebbe la scadenza di due ore, e la notte del cambio d'ora settantadue ore di orologio non sono settantadue ore vere. Il prodotto conta le ore vere.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Il limite compare subito, anche col rischio in bianco",
        testo:
          "Appena inserisci la data e l'ora della conoscenza, il prodotto mostra il limite delle settantadue ore, marcato **«rischio da valutare»**, e il quadro lo segnala come punto d'attenzione: l'orologio lo vedi già. Dalla valutazione dipende poi se la notifica è dovuta: con «Improbabile» la scadenza scompare, con «Rischio» o «Rischio elevato» diventa un termine vero. Per questo il rischio va valutato subito. Si registrano **tutte** le violazioni, anche quelle che non si notificano, e con un rischio elevato va registrata anche la comunicazione agli interessati dell'art. 34.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Nei registri non si scrivono nomi",
        testo:
          "Né il registro delle richieste né quello delle violazioni ha una colonna per il nome dell'interessato: si usa un **riferimento interno**, e ogni campo di testo libero lo ricorda. Nei documenti pubblicati, poi, di questi due registri entrano solo **conteggi**: il collegamento che si dà al cliente serve tutti i documenti dell'azienda, e una descrizione libera di una violazione non deve finire lì dentro.",
      },
      {
        tipo: "interfaccia",
        titolo: "Una violazione a cavallo del cambio d'ora",
        nota: "La notte fra il 24 e il 25 ottobre l'orologio torna indietro di un'ora: la scadenza cade un'ora prima sull'orologio, dopo le stesse ore vere.",
        vista: {
          genere: "riga",
          intestazioni: ["Conosciuta il", "Rischio", "Notificare entro"],
          celle: ["24/10/2026 · 09:30", "Rischio", "27/10/2026 · 08:30"],
          risultato: { etichetta: "Notifica al Garante", valore: "termine in corso" },
        },
      },
    ],
    verifica: {
      minime: 3,
      domande: [
        {
          testo: "Una richiesta di accesso arriva il 31 gennaio, senza proroga. Quando scade il riscontro?",
          opzioni: ["Il 2 marzo", "Il 28 febbraio", "Il 31 marzo", "Dopo trenta giorni lavorativi"],
          corretta: 1,
          spiegazione:
            "Il mese si somma sul calendario: dal 31 gennaio si arriva al 31 febbraio, che non esiste, e il termine si aggancia all'ultimo giorno del mese.",
        },
        {
          testo: "Da quale istante decorrono le ore per notificare una violazione al Garante?",
          opzioni: [
            "Dal momento in cui la violazione è avvenuta",
            "Dal momento in cui l'azienda ne è venuta a conoscenza",
            "Dalla valutazione del rischio",
            "Dalla mezzanotte del giorno della scoperta",
          ],
          corretta: 1,
          spiegazione:
            "Dalla conoscenza, ed è un istante: per questo il registro chiede anche l'ora. Una data secca, letta come mezzanotte, sposterebbe il termine di mezza giornata.",
        },
        {
          testo: "Che cosa si scrive nel campo che identifica chi ha presentato una richiesta?",
          opzioni: [
            "Nome e cognome, per ritrovarla",
            "Un riferimento interno, mai il nome",
            "L'indirizzo di posta elettronica",
            "Il codice fiscale",
          ],
          corretta: 1,
          spiegazione:
            "Un riferimento interno. Il registro non ha una colonna per il nome apposta, e nei documenti pubblicati di questi registri entrano solo i conteggi.",
        },
        {
          testo: "Una violazione è registrata con data e ora della conoscenza, ma il rischio per gli interessati è ancora in bianco. Che cosa mostra il prodotto?",
          opzioni: [
            "Nessuna scadenza, finché il rischio non è valutato",
            "Il limite delle settantadue ore, marcato «rischio da valutare»",
            "La violazione come a rischio improbabile",
            "Un termine di un mese, come per le richieste",
          ],
          corretta: 1,
          spiegazione:
            "Il limite compare appena c'è la conoscenza, perché le ore decorrono da lì. Resta marcato «rischio da valutare» finché non decidi: «Improbabile» toglie la scadenza, gli altri due esiti la rendono un termine vero.",
        },
      ],
    },
  },

  {
    id: "documenti-e-dimostrabile",
    titolo: "Politica, indicatori e i sei documenti",
    minuti: 6,
    sommario:
      "Che cosa serve perché il sistema risulti dimostrabile, e che cosa esce alla fine: sei documenti, ciascuno con le sue revisioni.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `La vista **Politica e piano** parte da un modello di politica da adattare e da un elenco di contenuti attesi: i principi, i ruoli, i diritti, la sicurezza, i fornitori, la formazione, l'approvazione del vertice, la comunicazione alle persone autorizzate, il riesame. Accanto, l'**inventario dei documenti** — con ${NUMERI.documentiTipoGdpr} documenti tipici da cui partire — e il **piano annuale**, con ${NUMERI.attivitaTipoGdpr} attività tipiche.`,
      },
      {
        tipo: "prosa",
        testo: `La vista **Indicatori** chiede **${NUMERI.indicatoriGdpr} misure** per l'anno, accanto a quelle dell'anno precedente, e ne ricava le percentuali: persone formate, utenze con autenticazione a più fattori, dispositivi cifrati, contatti con un consenso documentato.`,
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Un numero che non si conosce non è zero",
        testo:
          "Se manca il totale o la parte, la percentuale non si calcola: lasciare vuoti i formati non vuol dire «nessuno formato», e il prodotto non lo stampa. E un «di cui» maggiore del suo totale — più persone formate che autorizzate — viene **respinto**: un dato sbagliato si corregge, non si mette in un documento.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Documento", "Che cosa contiene"],
        righe: [
          ["Registro dei trattamenti", "Il registro dell'art. 30, una scheda per trattamento"],
          ["Modello organizzativo", "Ruoli, regole, rischi, responsabili, registri e conformità insieme"],
          ["Politica", "Il testo, con approvazione e firma"],
          ["Valutazioni d'impatto", "Il vaglio dei trattamenti e una scheda per ogni valutazione necessaria"],
          ["Rapporto di conformità", "L'indice, il piano di adeguamento e il dettaglio dei requisiti"],
          ["Relazione annuale", "L'anno scelto, con il confronto sul precedente"],
        ],
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Una serie di revisioni, non un documento per anno",
        testo:
          "Ognuno dei sei documenti si pubblica in revisioni successive, e ogni revisione è congelata: dice ciò che era vero il giorno della firma. La relazione annuale porta **dentro di sé** l'anno di cui parla, e il pannello di pubblicazione distingue la serie dall'anno descritto: la revisione 3 della relazione può parlare del 2026 anche se è stata firmata nel 2027.",
      },
      {
        tipo: "prosa",
        testo:
          "La vista **Verifica** dice che cosa oggi non si potrebbe mostrare a un'ispezione, vista per vista. Il percorso risulta **dimostrabile** solo se insieme non ci sono criticità, il registro non è vuoto, tutti i requisiti sono valutati e nessuno è non conforme, le registrazioni dell'anno sono complete e la compilazione arriva almeno all'85%.",
      },
      {
        tipo: "interfaccia",
        titolo: "Che cosa manca per essere dimostrabile",
        vista: {
          genere: "verifica",
          voci: [
            { testo: "Nessuna criticità aperta", esito: "ok" },
            { testo: "Registro dei trattamenti non vuoto", esito: "ok" },
            { testo: "Tutti i requisiti valutati, nessuno non conforme", esito: "manca" },
            { testo: "Formazione, audit e riesame registrati nell'anno", esito: "manca" },
            { testo: "Compilazione almeno all'85%", esito: "ok" },
          ],
        },
      },
    ],
    verifica: {
      minime: 2,
      domande: [
        {
          testo: "Negli indicatori hai inserito le persone autorizzate ma non quante sono state formate. Che cosa mostra la percentuale di formati?",
          opzioni: ["0%", "Niente: senza la parte non si calcola", "100%", "La percentuale dell'anno precedente"],
          corretta: 1,
          spiegazione:
            "Un numero che non si conosce non è zero. Leggere il vuoto come zero farebbe dire al documento «nessuno è stato formato», che è un'affermazione, e falsa.",
        },
        {
          testo: "Hai già pubblicato la relazione annuale e poi correggi un dato dell'anno. Che cosa succede alla revisione consegnata?",
          opzioni: [
            "Si aggiorna da sola",
            "Resta com'era: la correzione entra in una revisione successiva",
            "Viene annullata",
            "Cambia solo nel PDF scaricato da quel momento",
          ],
          corretta: 1,
          spiegazione:
            "Ogni revisione è congelata il giorno della firma. Un documento che cambiasse sotto le mani di chi l'ha ricevuto non varrebbe niente: la correzione produce la revisione successiva.",
        },
        {
          testo: "Tutti i requisiti sono valutati, uno è non conforme, il resto è in ordine. Il percorso è dimostrabile?",
          opzioni: [
            "Sì, l'indice è comunque alto",
            "No: serve che nessun requisito sia non conforme",
            "Sì, se c'è un'azione d'adeguamento",
            "Dipende dal gruppo del requisito",
          ],
          corretta: 1,
          spiegazione:
            "Dimostrabile pretende anche zero non conformità. Un'azione d'adeguamento la porta nel piano, ma finché non è chiusa il sistema ha una lacuna, e la Verifica lo dice.",
        },
      ],
    },
  },
];
