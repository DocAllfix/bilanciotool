// Il percorso PAS 24000 intero, come lo vede il motore: l'ingresso di segnali, avanzamento e
// verifica. Lo costruisce la lettura dal database; il test del golden lo costruisce dal dataset
// del prototipo.

import type { Misure } from "./indicatori";
import type { Registri } from "./registri";
import type { Attivita, Fattore, Fornitore, Obiettivo, Parametri, Parte, Politica, Rischio, StatoRequisito } from "./tipi";

export type Profilo = {
  forma: string;
  piva: string;
  sede: string;
  settore: string;
  ateco: string;
  /** Il contratto collettivo applicato: il termine di confronto per paghe, orari, disciplina. */
  ccnl: string;
  siti: string;
  /** Il campo di applicazione del sistema (4.3). */
  campo: string;
  direzione: string;
  /** Il responsabile del sistema di gestione sociale (5.3). */
  responsabile: string;
  rappresentanti: string;
  contatto: string;
};

/** I campi del profilo che contano per l'avanzamento e la verifica, con l'etichetta del prototipo. */
export const CAMPI_PROFILO = {
  forma: "forma giuridica",
  sede: "sede",
  settore: "settore",
  ateco: "codice ATECO",
  ccnl: "contratto collettivo",
  siti: "siti inclusi",
  campo: "campo di applicazione",
  direzione: "alta direzione",
  responsabile: "responsabile del sistema",
  rappresentanti: "rappresentanti dei lavoratori",
} as const satisfies Partial<Record<keyof Profilo, string>>;

export type Quadro = {
  profilo: Profilo;
  parametri: Parametri;
  fattori: readonly Fattore[];
  parti: readonly Parte[];
  /** Il catalogo dei requisiti, nell'ordine: chiave e gruppo. */
  requisiti: readonly { key: string; gruppo: string }[];
  /** Lo stato di ciascun requisito valutato. Chi manca è da valutare. */
  stati: Readonly<Record<string, StatoRequisito | null | undefined>>;
  /** Evidenza e azione d'adeguamento di ciascun requisito toccato. */
  dettagli: Readonly<Record<string, { evidenza: string; azione: string } | undefined>>;
  rischi: readonly Rischio[];
  fornitori: readonly Fornitore[];
  politica: Politica;
  /** Quanti contenuti attesi prevede il catalogo della politica. */
  contenutiPolitica: number;
  obiettivi: readonly Obiettivo[];
  attivita: readonly Attivita[];
  /** Misure per esercizio. */
  misure: Readonly<Record<number, Misure>>;
  /** Le chiavi degli indicatori del catalogo. */
  indicatori: readonly string[];
  registri: Registri;
};

/** Gli stati del catalogo, nell'ordine, `null` per i non valutati. */
export function statiDelCatalogo(q: Pick<Quadro, "requisiti" | "stati">, gruppo?: string) {
  return q.requisiti.filter((r) => !gruppo || r.gruppo === gruppo).map((r) => q.stati[r.key] ?? null);
}
