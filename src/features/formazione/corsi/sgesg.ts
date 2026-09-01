import { NUMERI } from "../numeri";
import type { Sezione } from "../tipi";

/**
 * Implementazione del sistema di gestione ESG.
 *
 * ⚠️ È l'unico dei dodici percorsi per cui il committente non ha scritto un corso: questo
 * è ricavato dal prodotto. Vale la stessa regola degli altri — nessun numero a mano — e in
 * più una cosa che va detta subito a chi lo apre: tre delle otto fasi non si lavorano qui.
 */
export const SGESG: Sezione[] = [
  {
    id: "che-cosa-e",
    titolo: "Che cos'è questo percorso",
    minuti: 4,
    sommario: "Non un secondo gestionale: il filo che porta un'azienda da zero a un sistema ESG funzionante.",
    blocchi: [
      {
        tipo: "prosa",
        testo: `Le **${NUMERI.fasiSgesg} fasi** sono il lavoro che porta un'azienda, nell'arco di un anno, da nessun presidio a un sistema ESG che sta in piedi. È un percorso come gli altri undici, non un contenitore che li governa: la sua radice sta accanto a quella dell'inventario e del bilancio.`,
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Non è uno stepper, ed è deliberato",
        testo:
          "Nelle otto fasi si lavora avanti e indietro: la materialità si riapre quando la diagnosi trova qualcosa, e la fase 4 rimanda alla 2 più spesso di quanto la sequenza suggerisca. Uno stepper che pretendesse l'ordine costringerebbe a barare per procedere, e la finzione finirebbe nel documento finale.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Una fase esiste solo quando la si tocca",
        testo:
          "Non ci sono otto righe create in anticipo, e la ragione è che cancellerebbero la differenza fra «non avviata» e «avviata e vuota» — che è informazione, ed è la prima cosa che si guarda riaprendo un lavoro dopo due mesi.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "Una fase dovuta e non conclusa pesa ZERO",
        testo:
          "Tre fasi concluse su otto non danno cento. Mediare sulle sole fasi toccate darebbe lo stesso numero di «tutte e otto concluse»: due situazioni opposte con una percentuale sola, su un lavoro che si consegna a un cliente.",
      },
    ],
  },

  {
    id: "le-fasi",
    titolo: "Le otto fasi, e chi le chiude",
    minuti: 5,
    sommario: "Che cosa dichiara ogni fase, e perché lo stato non si deduce.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Ogni fase porta uno stato dichiarato dal consulente, le note di lavoro e, quando conclusa, la data di chiusura. Riaprendola la data si cancella, e lo pretende il database: senza, il documento finale riporterebbe una data di chiusura per un lavoro riaperto.",
      },
      {
        tipo: "avviso",
        tono: "nota",
        titolo: "Lo stato di una fase è un giudizio, non un calcolo",
        testo:
          "Sarebbe comodo far concludere da sola la fase quando il percorso collegato è pubblicato. Ma «questo pezzo di lavoro l'ho chiuso» è una dichiarazione di chi firma, e dedurla da un dato tecnico gliela toglierebbe di mano — mentre nel documento comparirebbe come sua. Il ponte informa; chi decide è chi firma.",
      },
    ],
  },

  {
    id: "le-schede",
    titolo: "Le schede del metodo",
    minuti: 6,
    sommario: `Le ${NUMERI.schedeSgesg} schede, e le ventuno che dichiarano di essere altro.`,
    blocchi: [
      {
        tipo: "prosa",
        testo: `Il metodo porta **${NUMERI.schedeSgesg} schede**, ciascuna con le proprie sezioni e i propri campi. Sono dati seminati, non altrettanti moduli scritti a mano: un renderer solo le disegna tutte, come i documenti del corpus.`,
      },
      {
        tipo: "elenco",
        voci: [
          "Una scelta multipla si salva come elenco, non come testo con le virgole: la prima opzione che contiene una virgola renderebbe illeggibile la scelta, e nel catalogo ce ne sono.",
          "Svuotare un campo lo toglie, invece di lasciare una stringa vuota: così «è compilato?» resta una domanda sola.",
          "Lo stato di una scheda è dichiarato, non dedotto dal riempimento: una scheda si può chiudere con dei facoltativi vuoti, ed è un giudizio del consulente.",
        ],
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Alcune schede sono tabelle di lavoro, e lo dicono",
        testo:
          "Registro dei rischi, matrice delle responsabilità, valutazione degli impatti, catalogo delle iniziative, indice dei contenuti: hanno le sezioni e nessun campo compilabile, perché sono tabelle a righe. Il prodotto lo dichiara a schermo con l'elenco delle sezioni previste, e il server rifiuta di compilarle anche forzandolo. Una scheda vuota in mezzo ad altre piene si legge come un guasto: qui si legge come ciò che è.",
      },
    ],
  },

  {
    id: "i-ponti",
    titolo: "I ponti verso gli altri percorsi",
    minuti: 5,
    sommario: "Tre fasi su otto si lavorano dove il dato nasce, e non si copiano qui.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Tre fasi chiedono cose che il prodotto fa già, e le fa meglio di come le farebbe una scheda: la doppia materialità, le emissioni e gli indicatori, i capitoli e la pubblicazione. Quelle fasi **mostrano lo stato del percorso e ci portano dentro**. Il dato resta dove nasce.",
      },
      {
        tipo: "avviso",
        tono: "errore",
        titolo: "La tentazione di copiare i temi materiali qui dentro",
        testo:
          "Sembrerebbe un servizio: il consulente li vedrebbe senza cambiare pagina. Il giorno dopo qualcuno corregge un punteggio nel bilancio, la scheda mostra ancora il vecchio, e nessuno dei due sa quale sia quello buono. **Un dato in due posti è un dato in nessun posto**, ed è la stessa ragione per cui le emissioni del bilancio si leggono dall'inventario invece di essere ricopiate.",
      },
      {
        tipo: "prosa",
        testo:
          "Un percorso che non esiste ancora si dichiara tale, e non si presenta come «zero su diciotto»: uno zero direbbe «avviato e vuoto», che è un'altra cosa e porta a cercare il problema nel posto sbagliato.",
      },
    ],
  },

  {
    id: "documenti-sgesg",
    titolo: "I quattro documenti",
    minuti: 5,
    sommario: "Offerta, verbale di avvio, rapporto di diagnosi, dossier di chiusura.",
    blocchi: [
      {
        tipo: "prosa",
        testo:
          "Il contenuto di ciascuno **è** il compilato di alcune schede: l'offerta è una scheda, il verbale ne è tre. Ciò che cambia sta in un registro, non in quattro file da tenere allineati. Tutti e quattro passano dalla stessa strozzatura degli altri quindici tipi, quindi ereditano il marchio congelato, l'edizione dei contenuti, il colophon e il codice di verifica senza una riga di codice in più.",
      },
      {
        tipo: "avviso",
        tono: "attenzione",
        titolo: "Ogni documento dichiara che cosa NON contiene, in apertura",
        testo:
          "Riquadrato e in cima, non in fondo in corpo otto. Alcune fasi hanno registri a righe che il prodotto non compila ancora, e un documento che li tacesse prometterebbe più di quanto porta. Lo snapshot è immutabile: ciò che si scrive oggi resta scritto per sempre, e allora si scrive il vero. Le voci vuote si stampano come «non compilato» invece di sparire, perché chi firma deve accorgersene.",
      },
    ],
  },
];
