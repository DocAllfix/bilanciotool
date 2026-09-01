import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

/**
 * Gestione delle segnalazioni (D.Lgs. 24/2023).
 *
 * ⚠️ Il punto che questo corso deve dire per primo e ripetere: **il prodotto non riceve
 * segnalazioni**. È il gestionale di chi le tratta, e nessuna sua colonna può contenere un
 * nominativo. Chi lo usasse come canale di ricezione starebbe garantendo la riservatezza
 * con una regola organizzativa invece che con una misura tecnica, che è esattamente ciò
 * che la legge non consente.
 */
export const SEGNALAZIONI: Sezione[] = [
  {
    id: "assetto-canale",
    titolo: "L'assetto del canale",
    minuti: 6,
    sommario: "Chi è obbligato, chi gestisce, quali canali servono, e i tre campi che vengono chiesti per primi.",
    blocchi: [
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Questo percorso NON è il canale di ricezione",
        testo:
          "È lo strumento con cui il gestore tratta le segnalazioni che riceve altrove. La ricezione va su una piattaforma dedicata, con la riservatezza assicurata da strumenti di crittografia: qui non entra nessun dato identificativo, e il legame fra codice e persona resta custodito dal gestore fuori dall'applicazione. Non è una limitazione tecnica: è la natura giuridica dello strumento, e cambiarla cambierebbe il prodotto.",
      },
      {
        tipo: "tabella",
        intestazioni: ["Gruppo", "Che cosa dichiara"],
        righe: [
          [
            "Identificazione e obbligo",
            "Media dei lavoratori subordinati nell'ultimo anno, e il titolo dell'obbligo. L'obbligo sorge anche per il solo fatto di aver adottato il modello 231, e la condivisione del canale fra enti è ammessa entro certe dimensioni e va formalizzata",
          ],
          [
            "Soggetto gestore",
            "Configurazione, gestore, **sostituto** per i casi di astensione, data di nomina, organo di indirizzo, organo di controllo, responsabile della protezione dei dati",
          ],
          [
            "Canali attivati",
            "Canale scritto, canale orale e modalità per l'incontro diretto, piattaforma e fornitore, strumenti di crittografia, data della consultazione sindacale",
          ],
          ["Adozione", "Data di adozione della procedura e revisione corrente"],
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Il canale è un'ENTITÀ, non tre caselle di testo",
        testo:
          "Le tre forme — scritta, orale, incontro diretto — sono cumulative per legge, e ciascuna è una riga con il proprio stato. Nel prototipo erano tre campi liberi che nessuno verificava, e un ente con la sola casella di posta risultava a posto. Con una riga per forma la verifica è totale, e distingue «non istituita» da «prevista e spenta»: sono due situazioni con due rimedi diversi.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Tre campi che vengono chiesti per primi",
        testo:
          "Data della consultazione sindacale, strumenti di crittografia del canale, nomina del gestore con il sostituto. La consultazione precede l'attivazione e la sua omissione è contestabile; la riservatezza va assicurata con misure tecniche, non con una regola di comportamento; e un gestore senza sostituto non può astenersi quando la segnalazione lo riguarda.",
      },
    ],
  },

  {
    id: "fascicolo",
    titolo: "Il fascicolo della segnalazione",
    minuti: 7,
    sommario: "Cinque schede, sette stati, e la regola che vale su tutte: mai nominativi.",
    blocchi: [
      {
        tipo: "elenco",
        voci: [
          "Ricezione: chi, come, che cosa; identificazione pseudonimizzata; termini di legge; stato.",
          "Ammissibilità: i criteri, l'esito calcolato, la motivazione, l'eventuale richiesta di integrazione.",
          "Istruttoria: piano, attività e audizioni, conclusioni, esito, rilevanza penale.",
          "Tutele: rischio di ritorsione, monitoraggio, soggetti tutelati, misure.",
          "Conservazione: esito finale, termine, cancellazione, eventuale proroga motivata.",
        ],
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Mai nominativi nel fascicolo",
        testo:
          "Né del segnalante, né delle persone coinvolte, né dei testimoni: codici e funzioni. La riservatezza si perde quasi sempre per il modo in cui il fascicolo è scritto e l'istruttoria è condotta, non per una rivelazione diretta — un oggetto formulato in modo riconoscibile identifica la persona a ogni autorizzato che apra l'elenco. L'oggetto si scrive in formulazione neutra proprio per questo.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Aprire un fascicolo lascia una traccia, e la traccia è una precondizione",
        testo:
          "Se l'annotazione dell'accesso non riesce, il fascicolo non si apre. È il contrario della regola che vale per il registro dei pagamenti, dove un'annotazione non deve poter far fallire il lavoro che registra — e le due non si contraddicono: là il registro annota un lavoro già fatto, qui il registro **è** la garanzia. Senza tracciamento, dopo un evento di riservatezza non si ricostruisce chi sapeva che cosa.",
      },
      {
        tipo: "prosa",
        testo:
          "I numeri dei fascicoli vengono da un contatore, non dal massimo più uno. Cancellando l'ultimo fascicolo, il massimo scende e il numero verrebbe **riusato**: il vincolo di unicità non può accorgersene, perché la riga vecchia non esiste più, e il fascicolo nuovo eredita i rimandi di quello cancellato.",
      },
    ],
  },

  {
    id: "termini",
    titolo: "I termini di legge e l'ammissibilità",
    minuti: 7,
    sommario: "Le due regole calcolate, e perché si calcolano in UTC.",
    blocchi: [
      {
        tipo: "formula",
        testo:
          "avviso entro = ricezione + 7 giorni\nriscontro entro = avviso + 3 mesi\ncancellazione entro = comunicazione dell'esito finale + 5 anni",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "I termini si calcolano in UTC, e i mesi si agganciano all'ultimo giorno",
        testo:
          "Il prototipo interpretava la data a mezzanotte universale e poi la manipolava nel fuso locale: su un browser italiano un avviso del 25 marzo scadeva il 31 invece che il primo aprile. Su un termine perentorio è una violazione. E i mesi non traboccano: dal 31 gennaio si va al 28 o 29 febbraio, non al 3 marzo. Nel caso del 31 gennaio i due difetti si annullavano a vicenda, e correggerne uno solo peggiorava le cose.",
      },
      {
        tipo: "prosa",
        testo:
          "Un segnalante è contattabile se non è anonimo e ha lasciato un recapito, oppure se è anonimo ma ha un codice o un recapito. Senza contatto i termini di avviso e riscontro non si applicano, **ma il fascicolo si tratta comunque**: l'anonimato non è un motivo di archiviazione.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "La richiesta di integrazione non sospende i termini",
        testo:
          "È l'errore che porta più spesso il riscontro fuori termine: si chiede un'integrazione, si aspetta, e i tre mesi passano lo stesso. Per l'istruttoria non conclusa nei tre mesi va resa la comunicazione di stato.",
      },
      {
        tipo: "prosa",
        testo:
          "L'ammissibilità si decide su criteri espliciti: che la violazione rientri nell'ambito oggettivo, che il segnalante sia fra i soggetti legittimati, che i fatti siano venuti a conoscenza nel contesto lavorativo, che ci siano elementi di fatto precisi e concordanti, e che non si tratti di una contestazione esclusivamente personale del rapporto di lavoro. La motivazione è obbligatoria per l'inammissibilità e per l'archiviazione, e a chi riceve un'inammissibilità si indicano i canali alternativi.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Un conflitto personale che porta alla luce un illecito resta una segnalazione",
        testo:
          "Per la parte che riguarda l'illecito. La contestazione personale del rapporto di lavoro esce dall'ambito; ciò che emerge intorno, no. Trattare l'intero fascicolo come una lite è il modo più comune di perdere una segnalazione fondata.",
      },
    ],
  },

  {
    id: "istruttoria-tutele",
    titolo: "Istruttoria, tutele e conservazione",
    minuti: 7,
    sommario: "Chi ha diritto di essere sentito, come si misura il rischio di ritorsione, quando si cancella.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "L'istruttoria si pianifica: fatti da accertare, fonti di prova, rischi di riconoscibilità e misure per contenerli, date di avvio e conclusione. **La persona coinvolta ha diritto di essere sentita**, anche in forma scritta, prima delle conclusioni.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "L'archiviazione per manifesta infondatezza non si fonda su un'impressione",
        testo:
          "La scarsa credibilità percepita del segnalante non è una motivazione. La manifesta infondatezza si sostiene su elementi oggettivi, e va scritta: è la parte del fascicolo che un'autorità legge per prima quando arriva un reclamo.",
      },
      {
        tipo: "prosa",
        testo:
          "Il rischio di ritorsione si calcola da fattori dichiarati: identità conoscibile all'interno, persona coinvolta gerarchicamente sovraordinata, contesto ristretto, precedenti di ritorsione nell'organizzazione, rapporto di lavoro precario, segnalante già esposto in passato. Da un livello medio in su il monitoraggio è dovuto, con periodicità, misure e soggetti tutelati per codice — oltre al segnalante, i facilitatori, i colleghi con rapporto abituale, i parenti entro il grado previsto e gli enti collegati.",
      },
      {
        tipo: "prosa",
        testo:
          "La documentazione si conserva per il tempo necessario e comunque non oltre il termine di legge dalla comunicazione dell'esito finale. Oltre quel termine si conserva solo per un obbligo o un contenzioso in corso, con la motivazione registrata; la cancellazione eseguita va annotata nel registro dedicato.",
      },
    ],
  },

  {
    id: "registri-wb",
    titolo: "I registri",
    minuti: 5,
    sommario: `I ${NUMERI.registriWb} registri che documentano impianto, tutele e protezione dei dati.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Sono **${NUMERI.registriWb}**: ritorsioni contestate, eventi di riservatezza, accessi ai fascicoli, persone autorizzate, astensioni del gestore, provvedimenti conseguenti, verifica preventiva sui provvedimenti verso soggetti tutelati, comunicazioni con le autorità, richieste degli interessati, cancellazioni, verifiche sul canale, formazione, diffusione dell'informazione.`,
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Il registro degli accessi è la prova della riservatezza",
        testo:
          "Ogni consultazione di un fascicolo va annotata. Senza, l'ambito della mappa che riguarda la riservatezza non regge, e dopo un evento non si può ricostruire chi ha visto che cosa. È anche il registro che protegge il gestore: dimostra che l'accesso è stato limitato a chi doveva.",
      },
      {
        tipo: "prosa",
        testo:
          "La verifica preventiva sui provvedimenti è quella che si dimentica: prima di adottare un provvedimento verso una persona tutelata si verifica che non sia una ritorsione, e la verifica si registra. Farla dopo non serve a niente.",
      },
    ],
  },

  {
    id: "conformita-wb",
    titolo: "La mappa di conformità",
    minuti: 4,
    sommario: `I ${NUMERI.requisitiWb} controlli sui ${NUMERI.ambitiWb} ambiti del decreto.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `**${NUMERI.requisitiWb} domande** riferite alle disposizioni del decreto, distribuite su **${NUMERI.ambitiWb} ambiti**, ciascuna con il riferimento all'articolo, la procedura che risponde, lo stato e l'evidenza. Le lettere degli ambiti saltano quelle che nel decreto non esistono: non è una svista, è fedeltà alla norma.`,
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Un requisito applicabile e non valutato pesa ZERO",
        testo:
          "Un ambito senza valutazioni vale zero, e la conformità sale solo compilando la mappa. Mediare sui soli valutati farebbe salire la percentuale man mano che si saltano le domande difficili, che è il contrario del vero.",
      },
      {
        tipo: "prosa",
        testo:
          "Molte domande trovano risposta nei registri: annotare il registro come evidenza è sufficiente e verificabile, e vale più di un rimando a un documento che descrive ciò che si dovrebbe fare.",
      },
    ],
  },

  {
    id: "relazione-wb",
    titolo: "La relazione periodica",
    minuti: 4,
    sommario: "Il documento per l'organo di indirizzo, e il caso in cui l'aggregato non basta.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il corpus porta **${NUMERI.procedureWb} procedure** e **${NUMERI.moduliWb} moduli**, dall'impianto del canale al monitoraggio. La relazione periodica riprende dati aggregati e anonimizzati: volumi, canali, ambiti, esiti, rispetto dei termini, tutele attivate.`,
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Con pochi casi, anche il dato aggregato identifica",
        testo:
          "In un periodo con pochissime segnalazioni, «una segnalazione in area amministrativa, esito fondato» basta a far riconoscere la persona a chiunque lavori lì. Quando i casi sono pochi il dettaglio va ridotto: è la stessa ragione per cui l'oggetto si scrive in formulazione neutra.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Zero segnalazioni non è un buon risultato",
        testo:
          "In un'organizzazione di una certa dimensione, un canale che non riceve niente è quasi sempre un canale che nessuno conosce o di cui nessuno si fida. Il registro delle verifiche sul canale e quello della diffusione dell'informazione servono a distinguere le due cose, e vanno alimentati anche quando non succede nulla.",
      },
    ],
  },

  {
    id: "errori-wb",
    titolo: "La sequenza di impianto, e gli errori più frequenti",
    minuti: 4,
    sommario: "Come si mette in piedi il sistema, e che cosa lo espone.",
    blocchi: [
      {
        tipo: "elenco",
        voci: [
          "Assetto: obbligo, gestore e sostituto, canali con la crittografia dichiarata, consultazione sindacale.",
          "Registri di impianto: persone autorizzate, verifiche sul canale, diffusione dell'informazione, formazione.",
          "Approvazione delle procedure di impianto, di processo e di tutela; mappa di conformità valutata.",
          "Gestione dei fascicoli con le date di avviso e riscontro, l'ammissibilità motivata, il rischio di ritorsione, gli accessi tracciati.",
          "Relazione periodica e riesame; cancellazioni allo scadere del termine.",
        ],
      },
      {
        tipo: "tabella",
        intestazioni: ["Errore", "Conseguenza", "Come si evita"],
        righe: [
          [
            "Usare questo percorso come canale di ricezione",
            "Riservatezza non garantita da misure tecniche",
            "Canale su piattaforma dedicata; qui solo la trattazione",
          ],
          [
            "Nominativi nel fascicolo",
            "Identità rivelata a ogni autorizzato che lo apre",
            "Codici e funzioni; il legame codice-identità resta fuori",
          ],
          ["Avviso o riscontro senza data", "Termini di legge non dimostrabili", "Date su ogni fascicolo contattabile"],
          [
            "Credere che l'integrazione sospenda i termini",
            "Riscontro fuori termine",
            "Comunicazione di stato alla scadenza dei tre mesi",
          ],
          [
            "Archiviazione per scarsa credibilità",
            "Motivazione inidonea, contestabile",
            "Manifesta infondatezza solo su elementi oggettivi",
          ],
          [
            "Rischio di ritorsione medio o alto senza monitoraggio",
            "Tutela mancata proprio dove serviva",
            "Monitoraggio con periodicità e soggetti tutelati per codice",
          ],
          ["Accessi non registrati", "Riservatezza non dimostrabile", "Annotazione a ogni consultazione"],
          [
            "Fascicoli conservati oltre il termine",
            "Violazione, e dati che non dovrebbero più esistere",
            "Cancellazione registrata, o proroga motivata",
          ],
        ],
      },
    ],
  },
];
