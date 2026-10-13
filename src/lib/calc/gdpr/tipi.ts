// I tipi del motore GDPR: dati semplici, nessun accesso al database, nessun «adesso»
// letto di nascosto. Chi chiama passa tutto, compreso il giorno e l'istante correnti.
//
// I nomi sono i nostri, non quelli del prototipo (`fin`, `int`, `dpa`…): il motore parla
// la lingua delle colonne, e il test del golden traduce il dataset del prototipo una volta,
// in un posto solo.

import domini from "@/lib/db/seeds/data/gdpr-domini.json";

/** c conforme · p parziale · n non conforme · na non pertinente. Vuoto: da valutare. */
export type StatoRequisito = "c" | "p" | "n" | "na";
export const STATI_REQUISITO = ["c", "p", "n", "na"] as const satisfies readonly StatoRequisito[];

/** Le sei basi dell'art. 6, con l'etichetta del prototipo. */
export const BASI = domini.basi;
/** Le dieci condizioni dell'art. 9.2. */
export const CONDIZIONI_9 = domini.condizioni9;
/** Qualifiche dei fornitori. */
export const QUALIFICHE = domini.qualifiche;
/** Garanzie per i trasferimenti. */
export const GARANZIE = domini.garanzie;

export const QUALIFICA_TITOLARE_AUTONOMO = "Titolare autonomo";
export const GARANZIA_NESSUNA = "Nessun trasferimento";
export const GARANZIA_DA_DEFINIRE = "Da definire";
export const GARANZIA_DEROGA = "Deroga art. 49";

export type SiNo = "" | "Sì" | "No";

export type StatoDpia = "Da avviare" | "In corso" | "Conclusa";

export type Trattamento = {
  nome: string;
  finalita: string;
  base: string;
  /** Solo se la base è il legittimo interesse: il bilanciamento è documentato? */
  bilanciamento: SiNo;
  interessati: string;
  dati: string;
  particolari: boolean;
  condizione9: string;
  destinatari: string;
  trasferimento: boolean;
  conservazione: string;
  misure: string;
  /** Chiavi dei criteri di vaglio presenti (art. 35). */
  criteri: readonly string[];
  probabilita: number | null;
  gravita: number | null;
  mitigazione: string;
  dpiaStato: StatoDpia;
  dpiaEsito: string;
};

export type Contratto = "" | "Sì" | "No" | "Non dovuto";
export type EsitoFornitore = "" | "Adeguato" | "Azioni richieste" | "Critico";

export type Fornitore = {
  nome: string;
  qualifica: string;
  contratto: Contratto;
  garanzia: string;
  verificatoIl: string | null;
  esito: EsitoFornitore;
};

export type Parametri = {
  /** Livello (probabilità × gravità) da cui il rischio è alto. */
  alto: number;
  /** Livello da cui il rischio è medio. */
  medio: number;
  /** Quanti criteri di vaglio rendono necessaria la valutazione d'impatto. */
  sogliaDpia: number;
};

export const PARAMETRI_PREDEFINITI: Parametri = {
  alto: domini.parametri.alto,
  medio: domini.parametri.medio,
  sogliaDpia: domini.parametri.dpia_n,
};

export type Richiesta = {
  /** Data di ricezione, ISO `AAAA-MM-GG`. */
  ricevutaIl: string | null;
  proroga: boolean;
  riscontroIl: string | null;
};

export type RischioViolazione = "" | "Improbabile" | "Rischio" | "Rischio elevato";

export type Violazione = {
  /** Istante ISO in cui l'organizzazione ne è venuta a conoscenza. */
  conoscenzaIl: string | null;
  rischio: RischioViolazione;
  /** Istante ISO della notifica al Garante. */
  notificataIl: string | null;
  comunicataIl: string | null;
  chiusaIl: string | null;
  interessati: number | null;
};
