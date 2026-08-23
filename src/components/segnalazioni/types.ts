import type { getSegnalazioni } from "@/features/segnalazioni/queries";
import type { StatoTermine } from "@/lib/calc/segnalazioni/relazione";

// I tipi delle viste si DERIVANO dal modello di lettura, non si riscrivono: due
// dichiarazioni della stessa forma divergono al primo campo aggiunto, e il compilatore
// non direbbe niente perché entrambe sarebbero valide.

type Lettura = NonNullable<Awaited<ReturnType<typeof getSegnalazioni>>>;
export type DatiSegnalazioni = Lettura & { assetto: NonNullable<Lettura["assetto"]> };

export type Canale = DatiSegnalazioni["canali"][number];
export type RigaFascicolo = DatiSegnalazioni["fascicoli"][number];
export type Capo = DatiSegnalazioni["conformita"]["perCapitolo"][number];

/**
 * I colori dei termini di legge.
 *
 * ⚠️ «Fuori termine» ha un colore PROPRIO e non è verde: un adempimento reso in ritardo
 * è fatto, ma su un termine perentorio il ritardo è il fatto da riferire. Dargli il
 * verde di «nei termini» significherebbe nascondere in un colpo d'occhio l'unica cosa
 * che l'organo di controllo cerca.
 */
export const COLORE_TERMINE: Record<StatoTermine, string> = {
  fatto: "var(--success)",
  termini: "var(--primary)",
  scadenza: "var(--warning)",
  scaduto: "var(--destructive)",
  tardivo: "var(--warning)",
  na: "var(--muted-foreground)",
};

export const NOME_TERMINE: Record<StatoTermine, string> = {
  fatto: "nei termini",
  termini: "in corso",
  scadenza: "in scadenza",
  scaduto: "scaduto",
  tardivo: "fuori termine",
  na: "non applicabile",
};

/** L'esito dell'ammissibilità, e cosa comporta. */
export const COLORE_AMMISSIBILITA: Record<string, string> = {
  Ammissibile: "var(--success)",
  "Da integrare": "var(--warning)",
  Inammissibile: "var(--destructive)",
};

export const COLORE_RITORSIONE: Record<string, string> = {
  Basso: "var(--success)",
  Medio: "var(--warning)",
  Alto: "var(--destructive)",
};
