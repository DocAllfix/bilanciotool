import type { SupplierData } from "@/features/supplier/queries";

// Tipi del percorso fornitori al confine server→client: derivati dall'unica
// funzione di lettura, non riscritti a mano. Sono import di solo tipo, quindi
// spariscono alla compilazione e non trascinano il database nel browser.

export type AziendaSupplier = SupplierData["azienda"];
export type Valutazione = NonNullable<SupplierData["valutazione"]>;
export type CatalogoSupplier = NonNullable<SupplierData["catalogo"]>;
export type StatoSupplier = NonNullable<SupplierData["stato"]>;
export type EsitoSupplier = NonNullable<SupplierData["esito"]>;

export type DomandaSupplier = CatalogoSupplier["domande"][number];
export type AreaSupplier = CatalogoSupplier["aree"][number];
export type VocePianoUI = StatoSupplier["piano"][number];
export type RigaRisposta = StatoSupplier["risposte"][number];

export type PropsVista = {
  companyId: string;
  valutazione: Valutazione;
  catalogo: CatalogoSupplier;
  stato: StatoSupplier;
  esito: EsitoSupplier;
};

export const ETICHETTA_RISPOSTA: Record<string, string> = {
  si: "Sì",
  parziale: "In parte",
  no: "No",
  na: "Non applicabile",
};

export const ETICHETTA_DOCUMENTO: Record<string, string> = {
  assente: "Da produrre",
  da_aggiornare: "Da aggiornare",
  disponibile: "Disponibile",
};

export const ETICHETTA_AZIONE: Record<string, string> = {
  da_avviare: "Da avviare",
  in_corso: "In corso",
  completata: "Completata",
};

/** Colore della fascia sui token del sistema, mai valori cablati. */
export const COLORE_FASCIA: Record<string, string> = {
  avanzato: "var(--success)",
  supplier_ready: "var(--success)",
  adeguato: "var(--primary)",
  in_avvio: "var(--warning)",
  non_pronto: "var(--destructive)",
};
