import type { SoaData } from "@/features/soa/queries";

// Tipi del percorso SoA al confine server→client, derivati dall'unica funzione
// di lettura. Import di solo tipo: spariscono alla compilazione.

export type AziendaSoa = SoaData["azienda"];
export type Dichiarazione = NonNullable<SoaData["dichiarazione"]>;
export type CatalogoSoa = NonNullable<SoaData["catalogo"]>;
export type StatoSoa = NonNullable<SoaData["stato"]>;
export type EsitoSoa = NonNullable<SoaData["esito"]>;

export type ControlloSoa = CatalogoSoa["controlli"][number];
export type QuadroSoa = CatalogoSoa["quadri"][number];
export type DecisioneSoa = StatoSoa["decisioni"][number];
export type VocePianoSoa = StatoSoa["piano"][number];

export type PropsVista = {
  companyId: string;
  dichiarazione: Dichiarazione;
  catalogo: CatalogoSoa;
  stato: StatoSoa;
  esito: EsitoSoa;
};

/** Colore di stato sui token del sistema, mai valori cablati. */
export const COLORE_STATO: Record<string, string> = {
  nd: "var(--destructive)",
  pl: "var(--warning)",
  pa: "var(--warning)",
  at: "var(--success)",
  av: "var(--success)",
};

export const COLORE_FASCIA: Record<string, string> = {
  pronto: "var(--success)",
  maturo: "var(--success)",
  consolidamento: "var(--primary)",
  avvio: "var(--warning)",
  non_presidiato: "var(--destructive)",
};

/** Chiave in memoria di un controllo: la chiave vera nel database è la coppia
 *  (quadro, controllo), questa forma serve solo come identificativo React. */
export const chiave = (frameworkKey: string, controlloId: string) => `${frameworkKey}|${controlloId}`;
