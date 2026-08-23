import type { getMog231 } from "@/features/mog231/queries";

// I tipi delle viste si DERIVANO dal modello di lettura, non si riscrivono: due
// dichiarazioni della stessa forma divergono al primo campo aggiunto, e il compilatore
// non direbbe niente perche' entrambe sarebbero valide.

type Modello = NonNullable<Awaited<ReturnType<typeof getMog231>>>;
export type DatiMog231 = Modello & { modello: NonNullable<Modello["modello"]> };

export type Processo = DatiMog231["processi"][number];
export type Scenario = DatiMog231["scenari"][number];
export type Pilastro = DatiMog231["pilastri"][number];

/** La scala del rischio, la stessa di ISO 37001 e per la stessa ragione: quattro
 *  gradini devono essere distinguibili, e l'ambra dell'area non entra nella scala. */
export const COLORE_LIVELLO: Record<string, string> = {
  Basso: "var(--success)",
  Medio: "var(--warning)",
  Alto: "var(--primary)",
  Critico: "var(--destructive)",
};
