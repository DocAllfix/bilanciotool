import type { EnergyWizardData } from "@/features/energy/queries";

// Tipi del percorso energetico al confine server→client.
//
// A differenza degli altri due moduli non si riscrivono a mano: si derivano
// dall'unica funzione di lettura. Sono import di solo tipo, quindi spariscono
// alla compilazione e non trascinano il database nel bundle del browser; in
// cambio, cambiare la forma dei dati senza aggiornare l'interfaccia diventa un
// errore di tipo invece di un difetto scoperto a schermo.

export type AziendaEnergia = EnergyWizardData["azienda"];
export type BilancioEnergia = NonNullable<EnergyWizardData["bilancio"]>;
export type CatalogoEnergia = NonNullable<EnergyWizardData["catalogo"]>;
export type StatoEnergia = NonNullable<EnergyWizardData["stato"]>;
export type RisultatiEnergia = NonNullable<EnergyWizardData["risultati"]>;

export type VettoreEnergia = CatalogoEnergia["vettori"][number];
export type UsoEnergia = CatalogoEnergia["usi"][number];
export type AreaEnergia = CatalogoEnergia["aree"][number];
export type InterventoEnergia = StatoEnergia["misure"][number];

export type PropsPasso = {
  companyId: string;
  bilancio: BilancioEnergia;
  catalogo: CatalogoEnergia;
  stato: StatoEnergia;
  risultati: RisultatiEnergia;
};

export const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"] as const;

export const NOMI_CATEGORIA: Record<"E" | "T" | "M", string> = {
  E: "Elettrico",
  T: "Termico",
  M: "Autotrazione",
};

/** Colore di area su token del sistema di design, mai valori cablati. */
export const COLORE_AREA: Record<string, string> = {
  P: "var(--chart-1)",
  A: "var(--chart-2)",
  G: "var(--chart-3)",
  T: "var(--chart-4)",
};
