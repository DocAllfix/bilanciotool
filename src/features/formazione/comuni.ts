import { MODULI_AZIENDA, type ModuloAzienda } from "@/features/companies/moduli";
import { NUMERI } from "./numeri";
import type { Sezione } from "./tipi";

/**
 * Le sezioni valide per TUTTI i percorsi, scritte una volta.
 *
 * ⚠️ Metà del contenuto di un corso è identica fra i dodici moduli: come ci si muove, come
 * si salva, che cosa controlla la verifica, che cosa succede quando si pubblica. Scritta
 * dodici volte diverge alla prima correzione, e a divergere è sempre la copia che nessuno
 * rilegge.
 *
 * ⚠️ E QUI NON SI NOMINA NIENTE CHE NON ESISTA. I due corsi da cui questo materiale
 * proviene descrivevano i PROTOTIPI: dicevano che i dati vivono nel browser, che il backup
 * è l'esportazione di un JSON, che cambiare computer significa perdere il lavoro, e che il
 * PDF si fa con la stampa del browser. In EvalisDeck nessuna di queste è vera, e la terza
 * è anche allarmante — insegnerebbe un rito inutile a chi ha i dati al sicuro su un
 * database. Un corso che sbaglia il prodotto è peggio di nessun corso: chi lo legge smette
 * di cercare altrove.
 */
export function sezioniComuni(modulo: ModuloAzienda): Sezione[] {
  const m = MODULI_AZIENDA.find((x) => x.href === modulo)!;
  const documento = m.documenti[0];

  return [
    {
      id: "dove-sei",
      titolo: "Dove sei, e come ci si muove",
      minuti: 3,
      sommario: "Tre livelli: il portafoglio, il fascicolo di un'azienda, il percorso che stai seguendo.",
      blocchi: [
        {
          tipo: "prosa",
          testo:
            `EvalisDeck si attraversa sempre nello stesso ordine. Il **portafoglio** elenca le aziende che segui. ` +
            `Aprendone una si entra nel suo **fascicolo**, che raccoglie i ${NUMERI.moduli} percorsi disponibili ` +
            `divisi in ${NUMERI.gruppi} gruppi. Da lì si apre il percorso su cui si vuole lavorare.`,
        },
        {
          tipo: "prosa",
          testo:
            `La barra laterale segue questa struttura: quando sei dentro un'azienda mostra il suo nome e i suoi ` +
            `percorsi, così passi dal Bilancio alla SoA della stessa azienda senza tornare indietro.`,
        },
        {
          tipo: "avviso",
          tono: "nota",
          titolo: "I percorsi che non apri non ti disturbano",
          testo:
            `Un'azienda ha ${NUMERI.moduli} percorsi disponibili, non ${NUMERI.moduli} percorsi da fare. Si aprono ` +
            `quelli che servono a quel cliente: gli altri restano nel fascicolo, spenti, e non compaiono nello ` +
            `scadenzario.`,
        },
      ],
    },

    {
      id: "come-si-salva",
      titolo: "Come si salva",
      minuti: 3,
      sommario: "Da solo, campo per campo. Non c'è un pulsante «salva», e non c'è niente da esportare.",
      blocchi: [
        {
          tipo: "prosa",
          testo:
            `Ogni campo si salva quando lo lasci: compare per un istante la conferma accanto al campo, e il dato ` +
            `è sul server. Non esiste un pulsante «salva», e non esiste un modo di perdere il lavoro chiudendo la ` +
            `pagina.`,
        },
        {
          tipo: "avviso",
          tono: "attenzione",
          titolo: "Il salvataggio è per CAMPO, e conta",
          testo:
            `Ogni modifica riguarda il solo campo che hai toccato, mai la riga intera. È una scelta pagata con ` +
            `quattro difetti veri: salvare il costo azzerava la quantità, impostare la rilevanza finanziaria ` +
            `cancellava l'impatto appena messo. Per te significa che puoi compilare in fretta, anche saltando da ` +
            `un campo all'altro, senza che l'ultimo sovrascriva il penultimo.`,
        },
        {
          tipo: "prosa",
          testo:
            `I dati di ogni studio sono isolati **a livello di database**: un altro studio non può leggerli nemmeno ` +
            `per errore di programmazione. I colleghi che inviti nel tuo studio vedono invece tutto il portafoglio, ` +
            `perché è lavoro condiviso.`,
        },
        {
          tipo: "avviso",
          tono: "nota",
          titolo: "Niente esportazioni di sicurezza",
          testo:
            `Non c'è nessun archivio da esportare e nessun file da conservare: il lavoro sta sul server, e cambiare ` +
            `computer significa solo rifare l'accesso. Se hai usato i prototipi, è il cambiamento più grande: lì il ` +
            `backup era compito tuo.`,
        },
      ],
    },

    esercizio(m.perEsercizio),

    {
      id: "la-verifica",
      titolo: "La verifica prima di consegnare",
      minuti: 3,
      sommario: "L'elenco di cosa manca, con il collegamento che porta al punto da sistemare.",
      blocchi: [
        {
          tipo: "prosa",
          testo:
            `Il passo di verifica non è un riassunto: è la lista di ciò che impedisce di consegnare. Ogni voce ` +
            `porta al punto esatto da correggere, così non devi cercarlo.`,
        },
        {
          tipo: "avviso",
          tono: "errore",
          titolo: "Verde non vuol dire corretto",
          testo:
            `La verifica controlla la **completezza**, non la **correttezza**: un numero sbagliato ma presente ` +
            `risulta a posto. La quadratura con le fatture, la plausibilità dei fattori di carico, la coerenza dei ` +
            `delta da un anno all'altro restano lavoro tuo. Nessun software può firmare al posto di chi firma.`,
        },
      ],
    },

    {
      id: "pubblicare",
      titolo: "Che cosa succede quando pubblichi",
      minuti: 4,
      sommario: "Il documento si congela. Da quel momento non può più cambiare, ed è il motivo per cui vale.",
      blocchi: [
        {
          tipo: "prosa",
          testo:
            `Pubblicare non significa «stampare». Significa congelare in una versione numerata i dati **e i calcoli** ` +
            `che li accompagnano: da quel momento il documento non cambia più, nemmeno se domani correggi un dato ` +
            `del percorso. Il divieto è imposto dal database, non è una promessa dell'applicazione.`,
        },
        {
          tipo: "elenco",
          voci: [
            "Il documento prende un **numero di versione**: ripubblicando ottieni la v2, e la v1 resta consultabile.",
            "Il **marchio** si sceglie in quel momento e resta quello: i documenti già consegnati non cambiano intestazione.",
            "L'**edizione dei contenuti** su cui è stato redatto viene congelata: le norme si aggiornano, e chi riceve il documento deve poter sapere su quale versione è stato costruito.",
            "Il documento riceve un **codice di verifica pubblico**: chi lo ha in mano può controllarne l'autenticità da una pagina del sito, senza account.",
          ],
        },
        {
          tipo: "prosa",
          testo:
            `Il PDF si genera una volta e resta archiviato: riscaricarlo restituisce lo stesso file, byte per byte. ` +
            `È coerente con l'immutabilità — quello consegnato al cliente è quello, e non può cambiare impaginazione ` +
            `sotto i suoi occhi.`,
        },
        documentoProdotto(documento),
      ],
    },

    {
      id: "errori-comuni",
      titolo: "Gli errori più frequenti",
      minuti: 3,
      sommario: "Quelli che costano tempo davvero, e come si evitano.",
      blocchi: [
        {
          tipo: "tabella",
          intestazioni: ["Errore", "Conseguenza", "Come si evita"],
          righe: [
            [
              "Lavorare sull'azienda o sull'esercizio sbagliato",
              "Dati corretti nel posto sbagliato: nessun avviso, perché sono validi",
              "Guardare i due selettori in cima a ogni sessione",
            ],
            [
              "Lasciare vuoto invece di scrivere zero",
              "La verifica lo conta come «non rilevato», e il documento lo dichiara mancante",
              "Zero esplicito quando il dato è nullo; vuoto solo se la voce non esiste",
            ],
            [
              "Non compilare l'anno di confronto",
              "Il documento esce senza delta: dice cosa fai, non se stai migliorando",
              "Compilare la colonna del confronto insieme a quella dell'esercizio",
            ],
            [
              "Pubblicare per «vedere come viene»",
              "Una versione in più nell'archivio, che resta lì per sempre",
              "L'anteprima si guarda dal percorso; si pubblica quando è finito",
            ],
          ],
        },
      ],
    },
  ];
}

/**
 * La sezione sull'esercizio, che cambia forma secondo il modulo.
 *
 * ⚠️ Due percorsi su ${NUMERI.moduli} NON sono annuali: l'autovalutazione e la
 * Dichiarazione di Applicabilità sono fotografie che si aggiornano per revisioni. Una
 * sezione unica che parlasse di «esercizio» sarebbe falsa proprio per loro, ed è il tipo di
 * dettaglio che chi legge nota subito — perché sta guardando quella schermata mentre legge.
 */
function esercizio(perEsercizio: boolean): Sezione {
  if (perEsercizio) {
    return {
      id: "esercizio",
      titolo: "L'esercizio, e il confronto con l'anno prima",
      minuti: 3,
      sommario: "Questo percorso si redige per anno, e il confronto è ciò che lo rende leggibile.",
      blocchi: [
        {
          tipo: "prosa",
          testo:
            `Il selettore in cima dice su quale anno stai lavorando. I dati sono per esercizio: cambiando anno ` +
            `cambia tutto quello che vedi sotto.`,
        },
        {
          tipo: "avviso",
          tono: "attenzione",
          titolo: "L'anno di confronto non è facoltativo",
          testo:
            `Senza i dati dell'anno precedente il documento esce con le colonne dei delta vuote: dice quanto ` +
            `consumi, non se stai migliorando. È la differenza fra una fotografia e una misura, e la nota se ne ` +
            `accorge chi legge il documento, non chi lo compila.`,
        },
      ],
    };
  }
  return {
    id: "revisione",
    titolo: "Una fotografia, non un esercizio",
    minuti: 2,
    sommario: "Questo percorso non si redige per anno: si aggiorna, e ogni aggiornamento è una revisione.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          `A differenza dei percorsi annuali, qui non c'è un esercizio da scegliere: c'è **lo stato corrente**, che ` +
          `si aggiorna quando qualcosa cambia. Pubblicando ottieni una revisione numerata, e le precedenti restano ` +
          `consultabili.`,
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Quando conviene pubblicare",
        testo:
          `Quando qualcuno deve riceverlo: un committente, un ente di certificazione, una banca. Fra una consegna ` +
          `e l'altra si lavora sullo stato corrente senza pubblicare.`,
      },
    ],
  };
}

/** Che cosa produce questo percorso, detto col nome vero del documento. */
function documentoProdotto(tipo: string | undefined) {
  if (!tipo) {
    return {
      tipo: "avviso" as const,
      tono: "nota" as const,
      titolo: "Questo percorso non produce ancora un documento",
      testo:
        `È l'unico dei ${NUMERI.moduli}: il lavoro che ci fai alimenta gli altri percorsi, e i suoi documenti ` +
        `arrivano nelle fasi conclusive. Detto qui perché una sezione muta, in mezzo ad altre che nominano ` +
        `un'uscita, si legge come una svista.`,
    };
  }
  return {
    tipo: "prosa" as const,
    testo:
      `Il documento che questo percorso produce si trova poi nell'archivio, filtrabile per tipo e per azienda, e ` +
      `si può condividere con il cliente tramite un collegamento che non richiede account.`,
  };
}
