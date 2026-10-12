// Il percorso GDPR intero, come lo vede il motore: l'ingresso di segnali, avanzamento e
// verifica. Lo costruisce la lettura dal database; il test del golden lo costruisce dal
// dataset del prototipo.

import type { Misure } from "./indicatori";
import type { Registri } from "./registri";
import type { Fornitore, Parametri, SiNo, StatoRequisito, Trattamento } from "./tipi";

export type Profilo = {
  forma: string;
  sede: string;
  settore: string;
  ateco: string;
  dipendenti: string;
  legale: string;
  referente: string;
  contatto: string;
  /** Ci sono amministratori di sistema, interni o esterni? */
  amministratori: SiNo;
  /** Le tre domande dell'art. 37.1, lettere a), b), c). */
  dpoA: SiNo;
  dpoB: SiNo;
  dpoC: SiNo;
  dpoNome: string;
  dpoComunicatoIl: string | null;
};

export const STATI_DOCUMENTO = ["Da redigere", "In bozza", "Adottato", "Da aggiornare"] as const;
export type StatoDocumento = (typeof STATI_DOCUMENTO)[number];

export type DocumentoInventario = {
  tipo: string;
  oggetto: string;
  stato: StatoDocumento;
  revisioneIl: string | null;
};

export const STATI_ATTIVITA = ["Da fare", "In corso", "Fatto"] as const;
export type StatoAttivita = (typeof STATI_ATTIVITA)[number];
export type Attivita = { attivita: string; mese: number; stato: StatoAttivita };

export type Politica = { testo: string; contenuti: readonly string[]; approvataIl: string | null };

export type Quadro = {
  profilo: Profilo;
  parametri: Parametri;
  trattamenti: readonly Trattamento[];
  fornitori: readonly Fornitore[];
  /** Il catalogo dei requisiti, nell'ordine: chiave e gruppo. */
  requisiti: readonly { key: string; gruppo: string }[];
  /** Lo stato di ciascun requisito valutato. Chi manca è da valutare. */
  stati: Readonly<Record<string, StatoRequisito | null | undefined>>;
  /** Evidenza e azione d'adeguamento di ciascun requisito toccato. */
  dettagli: Readonly<Record<string, { evidenza: string; azione: string } | undefined>>;
  politica: Politica;
  /** Quanti contenuti attesi prevede il catalogo della politica. */
  contenutiPolitica: number;
  documenti: readonly DocumentoInventario[];
  attivita: readonly Attivita[];
  /** Misure per esercizio. */
  misure: Readonly<Record<number, Misure>>;
  /** Le chiavi degli indicatori del catalogo. */
  indicatori: readonly string[];
  registri: Registri;
};

/** L'obbligo dell'art. 37: valutato, ricorre, il designato c'è, è stato comunicato. */
export function obbligoDpo(p: Profilo) {
  const r = [p.dpoA, p.dpoB, p.dpoC];
  return {
    valutato: r.every((x) => x === "Sì" || x === "No"),
    obbligatorio: r.includes("Sì"),
    designato: !!p.dpoNome.trim(),
    comunicato: !!p.dpoComunicatoIl,
  };
}

/** Gli stati del catalogo, nell'ordine, `null` per i non valutati. */
export function statiDelCatalogo(q: Pick<Quadro, "requisiti" | "stati">, gruppo?: string) {
  return q.requisiti.filter((r) => !gruppo || r.gruppo === gruppo).map((r) => q.stati[r.key] ?? null);
}
