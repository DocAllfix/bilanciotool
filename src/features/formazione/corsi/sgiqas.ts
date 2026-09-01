import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

/** SGI QAS (qualità, ambiente, sicurezza). Metodo dal corso del committente. */
export const SGIQAS: Sezione[] = [
  {
    id: "anagrafica-qas",
    titolo: "Anagrafica, norme applicate e perimetro",
    minuti: 5,
    sommario: "Le norme dichiarate decidono che cosa conta, e le ore lavorate fanno gli indici.",
    blocchi: [
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Il perimetro decide quanti requisiti sono in gioco",
        testo: `Le norme applicate sono un elenco, non una scelta unica: si possono combinare, e da quella combinazione dipende quali dei **${NUMERI.requisitiQas} requisiti** entrano nella mappa. Chi è certificato su una norma sola non deve vedersi contare addosso i requisiti delle altre due.`,
      },
      {
        tipo: "tabella",
        intestazioni: ["Gruppo", "Che cosa muove"],
        righe: [
          [
            "Identificazione",
            "Unità locali e cantieri, addetti, e le **ore lavorate nel periodo**, che sono il denominatore degli indici infortunistici",
          ],
          ["Ruoli", "Direzione, responsabile del sistema, responsabile della prevenzione, medico competente, rappresentanti dei lavoratori"],
          [
            "Sistema",
            "Norme applicate e certificazioni, campo di applicazione, esclusioni motivate, e la determinazione sul cambiamento climatico come fattore rilevante",
          ],
        ],
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Le esclusioni valgono solo dove la norma le ammette",
        testo:
          "Si può escludere un requisito di qualità non applicabile, per esempio la progettazione. Non esistono esclusioni per attività con impatti ambientali significativi, né per i luoghi di lavoro: chi le dichiara sta escludendo qualcosa che nessun organismo accetterà di escludere.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Senza le ore lavorate gli indici restano vuoti",
        testo:
          "E restano vuoti nel cruscotto e nel riesame, che sono i due posti in cui vengono cercati. Vanno aggiornate a ogni periodo di rendicontazione, non una volta sola all'avvio.",
      },
    ],
  },

  {
    id: "indicatori-qas",
    titolo: "Gli indicatori",
    minuti: 8,
    sommario: `I ${NUMERI.indicatoriQas} indicatori del set di partenza, e le due cose che li fanno mentire.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Ogni indicatore ha una definizione, una formula, una fonte del dato, una frequenza, un valore iniziale, un target con il proprio **verso di miglioramento** e una soglia di attenzione. Il set di partenza ne propone **${NUMERI.indicatoriQas}**, distribuiti fra qualità, ambiente, sicurezza e integrati, con formula e riferimenti già compilati: i target vanno rivisti sul contesto dell'organizzazione, perché un target ereditato non è un obiettivo.`,
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Il verso sbagliato inverte ogni lettura",
        testo:
          "Per un indicatore che deve calare — reclami, infortuni, consumi — la soglia di attenzione sta **sopra** il target; per uno che deve salire sta sotto. Un verso sbagliato non produce un errore: produce stati, scostamenti e tendenze rovesciati, e un cruscotto che dice «a target» proprio mentre le cose peggiorano.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Un cruscotto di soli indicatori reattivi arriva tardi",
        testo:
          "I reattivi registrano ciò che è già accaduto — infortuni, reclami, non conformità — e sono i più facili da compilare perché il dato esiste già. I proattivi misurano la prevenzione: sopralluoghi, mancati infortuni segnalati, formazione in regola. Almeno uno per ambito, altrimenti il sistema misura solo i propri fallimenti.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Un indicatore senza target non è «a target»",
        testo:
          "Resta non rilevato. Nel prototipo un target vuoto veniva letto come zero, e l'indicatore risultava conforme senza che nessuno avesse fissato niente — il ramo della soglia non veniva mai raggiunto. È lo stesso difetto dell'indicatore energetico senza denominatore: un vuoto letto come uno zero è la lettura più lusinghiera possibile di un dato che non c'è.",
      },
      {
        tipo: "prosa",
        testo:
          "Cambiare il criterio di calcolo di un indicatore va annotato: la serie storica o si ricostruisce o si interrompe esplicitamente. Un grafico che prosegue attraverso un cambio di formula confronta due cose diverse e non lo dice.",
      },
    ],
  },

  {
    id: "registri-qas",
    titolo: "I registri",
    minuti: 6,
    sommario: `I ${NUMERI.registriQas} registri che alimentano cruscotto, riesame e stampe.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Sono **${NUMERI.registriQas}**: mappa dei processi, parti interessate, consultazione dei lavoratori, aspetti ambientali, pericoli e rischi, obblighi di conformità, autorizzazioni e verifiche periodiche, obiettivi e programmi, gestione delle modifiche, formazione, albo fornitori, prove di emergenza, reclami e soddisfazione, audit interni, non conformità e azioni correttive, incidenti e infortuni.`,
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Date e stati fanno i calcoli",
        testo:
          "Un audit risulta eseguito solo con la data; una non conformità è chiusa nei termini solo con termine e chiusura; un infortunio entra negli indici solo se è classificato come tale e ha i giorni di assenza. Registrazioni incomplete restano nell'elenco e non muovono né cruscotto né riesame — ed è giusto, perché nemmeno in audit muoverebbero qualcosa.",
      },
      {
        tipo: "prosa",
        testo:
          "Il registro delle autorizzazioni porta la scadenza e l'anticipo con cui va avviato il rinnovo: è l'unico posto del sistema dove una data che passa produce un problema che non dipende da noi, e per questo l'anticipo si compila insieme alla scadenza.",
      },
    ],
  },

  {
    id: "motori-qas",
    titolo: "I due motori di valutazione",
    minuti: 7,
    sommario: "Significatività degli aspetti ambientali, e livello di rischio dei pericoli.",
    blocchi: [
      {
        tipo: "formula",
        testo: "significatività = gravità × frequenza × sensibilità del contesto",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "I criteri assoluti rendono significativo un aspetto a prescindere dal punteggio",
        testo:
          "Una prescrizione legale non pienamente presidiata, un esposto o un reclamo ricevuto, un superamento di limiti, una condizione di emergenza grave: ciascuno rende l'aspetto significativo da solo. Valutare solo il prodotto dei tre fattori porta a classificare non significativa una prescrizione che non si sta rispettando, che è esattamente il caso per cui questi criteri esistono.",
      },
      {
        tipo: "prosa",
        testo:
          "Per ogni aspetto si dichiarano anche la fase del ciclo di vita e la condizione: normale, anomala, di emergenza. Un aspetto valutato solo in condizioni normali descrive l'organizzazione nei giorni in cui tutto funziona.",
      },
      {
        tipo: "formula",
        testo: "livello di rischio = probabilità × gravità",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "La gerarchia dei controlli si dichiara, e fermarsi ai dispositivi va motivato",
        testo:
          "Eliminazione, sostituzione, controlli tecnici, controlli amministrativi, dispositivi di protezione individuale: in quest'ordine. Se non si applicano i livelli superiori serve la ragione, ed è il rilievo più tipico di un audit sulla sicurezza — una valutazione che risolve tutto con i dispositivi non ha guardato il problema, l'ha spostato sulla persona.",
      },
      {
        tipo: "prosa",
        testo:
          "Il rischio residuo si dichiara **dopo** le misure da attuare, con responsabile e termine: prima di allora è una previsione, non una valutazione.",
      },
    ],
  },

  {
    id: "conformita-qas",
    titolo: "La mappa di conformità",
    minuti: 6,
    sommario: `I ${NUMERI.requisitiQas} controlli sui ${NUMERI.capiQas} capitoli, filtrabili per norma.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Ogni domanda porta il punto della norma e la marcatura delle **${NUMERI.normeQas} norme** che lo richiedono, la procedura che risponde, lo stato e l'evidenza. Il filtro per norma mostra solo le domande di quel sistema e la sua conformità: è così che chi applica una norma sola vede il proprio perimetro invece di quello di tutti.`,
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Un requisito applicabile e non valutato pesa ZERO",
        testo:
          "Mediare sui soli valutati farebbe salire la conformità man mano che si saltano i requisiti difficili. Su un documento che precede un audit di certificazione è la differenza fra sapere a che punto si è e credere di esserci.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "«Non applicabile» con parsimonia",
        testo:
          "È corretto per le norme non applicate e per le esclusioni motivate dichiarate in anagrafica. Usato per evitare una non conformità svuota la mappa: la percentuale sale e non regge alla prima domanda.",
      },
      {
        tipo: "prosa",
        testo:
          "Le domande non conformi e parzialmente conformi sono l'elenco delle azioni prima della certificazione, e l'evidenza annotata è il riferimento che si esibirà. Molte trovano risposta nei registri: annotare il registro è più solido che rimandare a una procedura che descrive l'intenzione.",
      },
    ],
  },

  {
    id: "documenti-qas",
    titolo: "Procedure e documenti prodotti",
    minuti: 5,
    sommario: `Le ${NUMERI.procedureQas} procedure, i ${NUMERI.moduliQas} moduli, e i tre documenti che escono.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il corpus base porta **${NUMERI.procedureQas} procedure** e **${NUMERI.moduliQas} moduli**, dal contesto al miglioramento. Ogni procedura riporta i punti delle norme che copre, e alcune sono specifiche di un solo ambito: chi non applica quella norma le dichiara non applicabili invece di personalizzarle.`,
      },
      {
        tipo: "prosa",
        testo:
          "Il percorso produce tre documenti: il **Riesame di direzione**, che precompila gli elementi in ingresso delle norme con i dati del sistema lasciando alla direzione la colonna delle valutazioni; l'**Analisi ambientale**, con aspetti, impatti, criteri e significatività; e la **Valutazione dei rischi**, con pericoli, gerarchia dei controlli e residuo. Gli ultimi due sono i documenti che un auditor chiede per primi.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Un riesame che elenca i dati non è un riesame",
        testo:
          "Il requisito chiede valutazioni e decisioni: risorse, obiettivi, modifiche. Un documento che riporta gli indicatori senza dire che cosa la direzione ne pensa e che cosa ha deciso non soddisfa il punto della norma, e lo dice il documento stesso.",
      },
    ],
  },

  {
    id: "errori-qas",
    titolo: "La sequenza di impianto, e gli errori più frequenti",
    minuti: 4,
    sommario: "In che ordine si costruisce, e che cosa fa mentire il cruscotto.",
    blocchi: [
      {
        tipo: "elenco",
        voci: [
          "Anagrafica con ruoli, norme applicate, campo di applicazione e ore lavorate.",
          "Registri di contesto: mappa dei processi, parti interessate, obblighi di conformità, autorizzazioni con le scadenze.",
          "I due motori: aspetti ambientali e pericoli valutati per intero; obiettivi collegati agli aspetti significativi e ai rischi più alti.",
          "Indicatori dal set di partenza, target rivisti, prime rilevazioni; procedure approvate in ordine di capitolo.",
          "Mappa valutata su tutte le domande delle norme applicate; audit interno; riesame di direzione.",
        ],
      },
      {
        tipo: "tabella",
        intestazioni: ["Errore", "Conseguenza", "Come si evita"],
        righe: [
          ["Ore lavorate non inserite", "Indici infortunistici vuoti dove servono", "Aggiornarle a ogni periodo"],
          [
            "Verso di miglioramento sbagliato",
            "Stati, scostamenti e tendenze invertiti, in silenzio",
            "Decrescente per ciò che deve calare",
          ],
          ["Solo indicatori reattivi", "Il cruscotto registra gli esiti quando è tardi", "Almeno un proattivo per ambito"],
          [
            "Criterio cambiato senza nota",
            "Serie storica che confronta cose diverse",
            "Annotare la modifica, o interrompere la serie",
          ],
          [
            "Aspetti valutati senza i criteri assoluti",
            "Prescrizioni non presidiate classificate non significative",
            "Compilare i criteri assoluti su ogni aspetto",
          ],
          [
            "Gerarchia dei controlli ferma ai dispositivi senza motivazione",
            "Il rilievo più tipico di un audit sulla sicurezza",
            "Motivare quando i livelli superiori non si applicano",
          ],
          ["Riesame senza valutazioni della direzione", "Requisito non soddisfatto", "Colonna di valutazione e decisioni compilate"],
        ],
      },
    ],
  },
];
