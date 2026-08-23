import type { getAnticorruzione } from "@/features/anticorruzione/queries";

// I tipi delle viste si DERIVANO dal modello di lettura, non si riscrivono.
//
// Riscriverli sarebbe una seconda dichiarazione della stessa forma: al primo campo
// aggiunto una delle due resterebbe indietro, e il compilatore non direbbe niente
// perché entrambe sarebbero valide. Qui il server è la fonte e il client la segue.

type Modello = NonNullable<Awaited<ReturnType<typeof getAnticorruzione>>>;
export type DatiAnticorruzione = Modello & { sistema: NonNullable<Modello["sistema"]> };

export type Sistema = DatiAnticorruzione["sistema"];
export type Catalogo = DatiAnticorruzione["catalogo"];
export type Socio = DatiAnticorruzione["soci"][number];
export type CapitoloCalcolato = DatiAnticorruzione["capitoli"][number];
export type StatoRequisito = DatiAnticorruzione["statiRequisiti"][number];
export type Indicatori = DatiAnticorruzione["indicatori"];

/**
 * Il colore di un livello di rischio, coerente fra quadro, elenco e scheda.
 *
 * ⚠️ «Alto» NON usa la tinta dell'area. Ci aveva provato, e a schermo Alto e Medio
 * risultavano lo stesso ambra: su una scala di rischio dove distinguerli e' tutto il
 * punto, due gradini indistinguibili sono peggio di nessun colore. Alto prende il
 * primario (petrolio scuro), che sta lontano sia dall'ambra sia dal rosso.
 *
 * La tinta dell'area resta quella del modulo — icona, barre, riquadri — e non entra
 * nella scala: sono due significati diversi e non devono usare lo stesso segnale.
 */
export const COLORE_LIVELLO: Record<string, string> = {
  Basso: "var(--success)",
  Medio: "var(--warning)",
  Alto: "var(--primary)",
  Critico: "var(--destructive)",
};

export const PROPS_VISTA_COMUNI = ["companyId", "dati"] as const;
