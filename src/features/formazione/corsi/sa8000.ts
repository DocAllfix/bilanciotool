import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

/** SA8000. Metodo dal corso del committente, prodotto riscritto. */
export const SA8000: Sezione[] = [
  {
    id: "anagrafica-sa8000",
    titolo: "Anagrafica, ruoli e canali",
    minuti: 5,
    sommario: "I dati che il Manuale mostra, e il gruppo che non può essere di soli dirigenti.",
    blocchi: [
      {
        tipo: "tabella",
        intestazioni: ["Gruppo", "Che cosa muove"],
        righe: [
          ["Identificazione", "Siti operativi nel campo di applicazione, uno per riga: finiscono nel Manuale"],
          [
            "Rapporto di lavoro",
            "Contratto collettivo applicato e rappresentanze sindacali, con «nessuna» quando non ci sono: è il presupposto dei criteri sulla libertà di associazione e sugli orari",
          ],
          [
            "Ruoli del sistema",
            "Alta direzione, responsabile del sistema, e composizione del gruppo per la prestazione sociale con nome, ruolo e da chi ciascuno è espresso",
          ],
          ["Canali di reclamo", "Email dedicata e linea telefonica reali, che sostituiscono quelle di esempio nelle procedure"],
          ["Campo di applicazione", "Attività, siti e relazioni commerciali coperti"],
        ],
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Il gruppo per la prestazione sociale deve avere una rappresentanza equilibrata",
        testo:
          "Include rappresentanti dei lavoratori — eletti, non designati — e del management. Un gruppo di soli dirigenti è il rilievo più tipico dell'audit su questo standard, e non si corregge con una riga in anagrafica: la composizione scritta qui va riscontrata nel registro delle riunioni, con l'elezione e la prima seduta.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "I canali di esempio lasciati nelle procedure sono canali che non esistono",
        testo:
          "Un indirizzo di esempio in un documento consegnato ai lavoratori rende inapplicabile la procedura di reclamo. Email e telefono reali si mettono in anagrafica, e da lì entrano ovunque servano.",
      },
    ],
  },

  {
    id: "criteri-sa8000",
    titolo: "I criteri e la mappa di conformità",
    minuti: 7,
    sommario: `I ${NUMERI.criteriSa8000} criteri in ${NUMERI.gruppiSa8000} gruppi, e perché «parziale» non vale metà.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Lo standard porta **${NUMERI.criteriSa8000} criteri** raggruppati in **${NUMERI.gruppiSa8000} gruppi** e distribuiti su **${NUMERI.sezioniSa8000} sezioni**: i criteri fondazionali, il sistema di gestione e la prestazione. Per ognuno si dichiara lo stato di presidio, si collegano le procedure che lo governano e si annota l'evidenza.`,
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "I criteri fondazionali stanno insieme, e non è un dettaglio grafico",
        testo:
          "Nel prototipo il gruppo si ricavava tagliando il codice al primo punto, e i cinque fondazionali finivano ciascuno in un riquadro proprio senza titolo, mentre il loro gruppo era lì scritto per loro. Chi apriva la mappa trovava cinque sezioni anonime prima di quelle vere.",
      },
      {
        tipo: "formula",
        testo: "conformità = criteri presidiati ÷ (criteri totali − non applicabili)",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "«Parziale» pesa ZERO, non metà",
        testo:
          "È uno scostamento voluto rispetto agli altri percorsi di conformità di questo prodotto, e la ragione regge da sola: nell'audit su questo standard un criterio di prestazione non pienamente soddisfatto **è** una non conformità, non un mezzo risultato. Contare i parziali per metà darebbe una percentuale che in visita non si ritrova, ed è il numero su cui l'organizzazione si è preparata.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "«Non applicabile» quasi mai",
        testo:
          "Pochissimi criteri sono davvero estranei. L'assenza di giovani lavoratori, per esempio, non rende inapplicabile il criterio relativo: va presidiato lo stesso, con la procedura di verifica dell'età. Usato per evitare uno scoperto, il non applicabile svuota la mappa.",
      },
    ],
  },

  {
    id: "registri-sa8000",
    titolo: "I registri operativi",
    minuti: 7,
    sommario: `I ${NUMERI.registriSa8000} registri che muovono avanzamento, scadenzario e indicatori.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Sono **${NUMERI.registriSa8000}**: impatti e rischi, obiettivi e piano d'azione, stakeholder ed engagement, reclami interni, reclami esterni, azioni correttive e rimedi, audit interni, riunioni del gruppo per la prestazione sociale, giovani lavoratori, incidenti e mancati incidenti.`,
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Stati e date muovono la pagina iniziale",
        testo:
          "Le situazioni aperte contano gli stati diversi da chiuso; lo scadenzario prende le date di scadenza delle registrazioni non chiuse; gli indicatori usano le date di ricezione, conferma e chiusura dei reclami. Una registrazione senza stato o senza date non compare da nessuna parte, e non è una svista del prodotto: è un lavoro che non si può dimostrare.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Il registro dei giovani lavoratori si alimenta anche quando non ce ne sono",
        testo:
          "Serve a dichiarare l'assenza con la procedura di verifica dell'età, non solo a censire chi c'è. È l'area su cui l'audit non ammette approssimazioni, e un registro vuoto senza dichiarazione si legge come un'area non presidiata.",
      },
    ],
  },

  {
    id: "rischi-reclami-rimedio",
    titolo: "Rischi, reclami e rimedio",
    minuti: 7,
    sommario: "Le tre regole che tengono insieme il sistema.",
    blocchi: [
      {
        tipo: "formula",
        testo: "punteggio di rischio = gravità × probabilità",
      },
      {
        tipo: "prosa",
        testo:
          "L'ambito distingue le operazioni proprie dal partner commerciale diretto e da quello indiretto: è così che la catena di fornitura entra nel registro invece di restarne fuori. E la relazione con l'impatto — causato, contribuito, direttamente collegato — determina la risposta attesa: cessazione e rimedio nei primi due casi, uso della leva nel terzo.",
      },
      {
        tipo: "prosa",
        testo:
          "I reclami interni hanno termini propri: una conferma di ricezione entro pochi giorni, e una chiusura più stretta per le gravità alte. Il ciclo si chiude col riscontro a chi ha segnalato — senza, il meccanismo funziona per l'organizzazione e non per la persona.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Il rimedio alle persone coinvolte non è opzionale",
        testo:
          "Un'azione correttiva ha tre parti distinte: la correzione immediata, l'azione sulle cause e il **rimedio a chi ha subito l'impatto**. Chiudere un'azione con le prime due lascia fuori l'unica che riguarda la persona, ed è il punto su cui questo standard si distingue dagli altri sistemi di gestione. La chiusura richiede la verifica di efficacia.",
      },
      {
        tipo: "prosa",
        testo:
          "Un reclamo fondato o un incidente genera un'azione correttiva, e il riferimento si scrive nel registro di origine: è quel collegamento a rendere ricostruibile la catena dal fatto al rimedio.",
      },
    ],
  },

  {
    id: "manuale-sa8000",
    titolo: "Il corpus e il Manuale",
    minuti: 5,
    sommario: `Le ${NUMERI.procedureSa8000} procedure e i ${NUMERI.moduliSa8000} moduli, e il fascicolo che si porta in visita.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il corpus porta **${NUMERI.procedureSa8000} procedure** e **${NUMERI.moduliSa8000} moduli**, e ogni procedura riporta in testata i criteri che governa. L'ordine di approvazione che funziona: politica e gruppo per la prestazione sociale per prime, poi rischi e obiettivi, poi reclami e rimedio, poi le procedure di prestazione partendo dai criteri con i rischi più alti, e per ultime audit e riesame.`,
      },
      {
        tipo: "prosa",
        testo:
          "Il Manuale del sistema si compone dai dati dell'anagrafica e dallo stato del corpus: organizzazione, campo di applicazione e siti, ruoli, struttura documentale, piano di implementazione. **I dati mancanti compaiono come «da compilare»** invece di sparire, ed è la ragione per cui conviene guardarlo presto: dice che cosa manca meglio di qualunque contatore.",
      },
      {
        tipo: "prosa",
        testo:
          "Gli indicatori si calcolano dai registri e sono gli elementi in ingresso del riesame della direzione: reclami e tempi dicono se il meccanismo è accessibile e creduto, azioni correttive e rimedi se il sistema corregge davvero, rischi e obiettivi se il piano è ancorato alla realtà.",
      },
    ],
  },

  {
    id: "errori-sa8000",
    titolo: "La sequenza di impianto, e gli errori più frequenti",
    minuti: 5,
    sommario: "Come si arriva alla visita, e che cosa la fa andare male.",
    blocchi: [
      {
        tipo: "elenco",
        voci: [
          "Anagrafica coi campi obbligatori, il gruppo per la prestazione sociale e i canali di reclamo reali.",
          "Elezione e prima riunione del gruppo nel registro; politica approvata.",
          "Rischi per criterio e per ambito, con la relazione con l'impatto; obiettivi collegati ai rischi alti; stakeholder censiti.",
          "Approvazione delle procedure di reclamo e rimedio e di quelle di prestazione; mappa dei criteri presidiata con le evidenze.",
          "Audit interno, riesame della direzione, Manuale.",
        ],
      },
      {
        tipo: "tabella",
        intestazioni: ["Errore", "Conseguenza", "Come si evita"],
        righe: [
          [
            "Gruppo di soli dirigenti, o senza riunioni registrate",
            "Criterio scoperto, e il rilievo più tipico della visita",
            "Composizione in anagrafica, elezione e riunioni nel registro",
          ],
          [
            "Canali di reclamo lasciati con gli indirizzi di esempio",
            "Procedura inapplicabile nei fatti",
            "Email e telefono reali in anagrafica",
          ],
          [
            "Reclami senza date di conferma e chiusura",
            "Termini non dimostrabili, indicatori a zero",
            "Date su ogni reclamo, e riscontro a chi ha segnalato",
          ],
          [
            "Azioni correttive senza rimedio alle persone",
            "Il criterio sul rimedio resta scoperto",
            "Campo del rimedio compilato per ogni azione nata da un reclamo o da un incidente",
          ],
          [
            "Rischi limitati alle operazioni proprie",
            "La catena di fornitura resta fuori dal sistema",
            "Ambito del partner e relazione con l'impatto su ogni rischio",
          ],
          [
            "Criteri marcati «parziale» a oltranza",
            "La conformità non sale: contano solo i presidiati",
            "Chiudere i parziali con un'evidenza o con un'azione correttiva",
          ],
          [
            "Giovani lavoratori non censiti",
            "Area scoperta anche quando è conforme",
            "Registro alimentato anche per dichiarare l'assenza",
          ],
        ],
      },
    ],
  },
];
