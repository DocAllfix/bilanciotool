import type { TipoDocumento } from "@/features/documents/tipi";

// I QUATTRO DOCUMENTI DEL METODO, e di che cosa sono fatti.
//
// ⚠️ Non hanno un template per uno. Il contenuto di ciascuno È il compilato di alcune
// schede — l'offerta è la scheda 00E, il verbale è la 01B — quindi un renderer solo li
// disegna tutti, parametrizzato da questo registro. È la stessa decisione delle 63
// schede, e per la stessa ragione: quattro template sarebbero quattro file da tenere
// allineati, e il quarto resterebbe indietro.
//
// ⚠️ E ciascuno DICHIARA che cosa non contiene. Alcune fasi hanno registri a righe che
// il prodotto non compila ancora (il registro delle lacune, la matrice RACI), e un
// documento che li tacesse prometterebbe più di quanto porta. Lo snapshot è immutabile:
// ciò che si scrive oggi resta scritto, quindi si scrive il vero.

export type DocumentoSgesg = {
  tipo: TipoDocumento;
  /** La fase del metodo a cui appartiene. */
  faseKey: string;
  /** Il titolo in copertina. */
  titolo: string;
  /** La riga sopra il titolo. */
  kicker: string;
  /** A che serve, in una riga, stampata in apertura. */
  scopo: string;
  /** Le schede che lo compongono, nell'ordine in cui si leggono. */
  schede: string[];
  /**
   * Che cosa il documento NON contiene, e perché. Vuoto quando non manca niente.
   * Si stampa riquadrato: è una dichiarazione, non una scusa nascosta in fondo.
   */
  avvertenza: string | null;
};

export const DOCUMENTI_SGESG: DocumentoSgesg[] = [
  {
    tipo: "offerta_esg",
    faseKey: "proc00",
    titolo: "Offerta professionale",
    kicker: "Proposta di incarico",
    scopo:
      "Riepiloga l'oggetto dell'incarico, il perimetro, i tempi e le condizioni economiche proposte al cliente.",
    schede: ["00E"],
    avvertenza: null,
  },
  {
    tipo: "verbale_avvio",
    faseKey: "proc01",
    titolo: "Verbale di avvio",
    kicker: "Riunione di apertura dell'incarico",
    scopo:
      "Dà conto della riunione di apertura: partecipanti, perimetro concordato, responsabilità e modalità di lavoro.",
    schede: ["01B", "01F", "01G"],
    avvertenza:
      "Il piano di progetto, la matrice delle responsabilità e il registro dei rischi del progetto sono registri a righe: si compilano in schermate dedicate che non fanno ancora parte del prodotto, e non sono riportati in questo verbale.",
  },
  {
    tipo: "diagnosi_esg",
    faseKey: "proc03",
    titolo: "Rapporto di diagnosi ESG",
    kicker: "Verifica dello stato di partenza",
    scopo:
      "Riporta il piano di verifica, le conclusioni della diagnosi e il passaggio alle fasi di raccolta dati e strategia.",
    schede: ["03A", "03G", "03H"],
    avvertenza:
      "Le verifiche per area (ambiente, sociale, governance) e il registro delle lacune sono registri a righe: si compilano in schermate dedicate che non fanno ancora parte del prodotto. Questo rapporto riporta il piano e le conclusioni, non l'elenco puntuale dei rilievi.",
  },
  {
    tipo: "dossier_finale",
    faseKey: "proc07",
    titolo: "Dossier di chiusura",
    kicker: "Consegna e chiusura dell'incarico",
    scopo:
      "Chiude l'incarico: che cosa è stato consegnato, come è andata secondo il cliente, e che cosa resta da fare.",
    schede: ["07A", "07B", "07G", "07LOG"],
    avvertenza:
      "Le lezioni apprese sono un registro a righe: si compila in una schermata dedicata che non fa ancora parte del prodotto, e non è riportata in questo dossier.",
  },
];

/** Il documento di un tipo, o `null` se quel tipo non è del metodo. */
export function documentoSgesg(tipo: TipoDocumento): DocumentoSgesg | null {
  return DOCUMENTI_SGESG.find((d) => d.tipo === tipo) ?? null;
}

/** I documenti che una fase produce. */
export function documentiDellaFase(faseKey: string): DocumentoSgesg[] {
  return DOCUMENTI_SGESG.filter((d) => d.faseKey === faseKey);
}
