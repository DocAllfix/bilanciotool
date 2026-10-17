// I tipi del motore PAS 24000: dati semplici, nessun accesso al database, nessun «adesso»
// letto di nascosto. Chi chiama passa tutto, compreso il giorno corrente.
//
// I nomi sono i nostri, non quelli del prototipo (`amb`, `claus`, `ris`…): il motore parla la
// lingua delle colonne, e il test del golden traduce il dataset del prototipo una volta, in un
// posto solo.

import domini from "@/lib/db/seeds/data/pas-domini.json";

/** c conforme · p parziale · n non conforme · na non pertinente. Vuoto: da valutare. */
export type StatoRequisito = "c" | "p" | "n" | "na";
export const STATI_REQUISITO = ["c", "p", "n", "na"] as const satisfies readonly StatoRequisito[];

/** O: rischio nelle attività dell'organizzazione · F: nella catena di fornitura. */
export type Ambito = "O" | "F";
export const AMBITI = ["O", "F"] as const satisfies readonly Ambito[];

export const TIPI_FATTORE = domini.tipiFattore as readonly string[];
export const EFFETTI_FATTORE = domini.effettiFattore as readonly string[];
export const CATEGORIE_FORNITORE = domini.categorieFornitore as readonly string[];
export const RISCHI_FORNITORE = domini.rischiFornitore as readonly string[];
export const ESITI_FORNITORE = domini.esitiFornitore as readonly string[];
export const STATI_OBIETTIVO = domini.statiObiettivo as readonly string[];
export const STATI_ATTIVITA = domini.statiAttivita as readonly string[];

export type Parametri = {
  /** Limite settimanale dell'orario ordinario, in ore. */
  oreOrdinarie: number;
  /** Limite settimanale complessivo, straordinario compreso. */
  oreTotali: number;
  /** Settimane lavorate nell'anno, per la media settimanale. */
  settimane: number;
  /** Livello (probabilità × gravità) da cui il rischio è alto. */
  alto: number;
  /** Livello da cui il rischio è medio. */
  medio: number;
  /** Giorni dopo i quali un reclamo aperto va sollecitato. */
  giorniReclamo: number;
};

export const PARAMETRI_PREDEFINITI: Parametri = {
  oreOrdinarie: domini.parametri.ore_ord,
  oreTotali: domini.parametri.ore_tot,
  settimane: domini.parametri.sett,
  alto: domini.parametri.alto,
  medio: domini.parametri.medio,
  giorniReclamo: domini.parametri.gg_recl,
};

export type Fattore = { tipo: string; descrizione: string; effetto: string };

export type Parte = {
  nome: string;
  esigenze: string;
  /** L'esigenza è o può diventare un obbligo. */
  obbligo: boolean;
  /** Il sistema sceglie di gestirla. */
  gestita: boolean;
  coinvolgimento: string;
};

export type Rischio = {
  /** Chiave del gruppo (area dell'Allegato A, oppure C5 per il sistema). */
  area: string;
  ambito: Ambito;
  testo: string;
  probabilita: number | null;
  gravita: number | null;
  misure: string;
  responsabile: string;
};

export type Fornitore = {
  nome: string;
  categoria: string;
  paese: string;
  /** Vuoto: livello di rischio non ancora attribuito. */
  rischio: string;
  clausola: boolean;
  questionario: boolean;
  verificatoIl: string | null;
  esito: string;
};

export type Obiettivo = {
  obiettivo: string;
  area: string;
  indicatore: string;
  traguardo: string;
  scadenza: string | null;
  responsabile: string;
  risorse: string;
  stato: string;
};

export type Attivita = { attivita: string; mese: number; stato: string };

export type Politica = { testo: string; contenuti: readonly string[]; approvataIl: string | null; firma: string };
