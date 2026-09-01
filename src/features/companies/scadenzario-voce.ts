import type { ModuloAzienda } from "./moduli";

// La FORMA di una voce di scadenzario, e come si legge il suo motivo.
//
// ⚠️ Sta in un file proprio, separato da `scadenzario.ts`, per una ragione strutturale:
// questa roba serve al BROWSER — le tre viste della dashboard sono un componente client —
// e `scadenzario.ts` importa `withTenant`, cioè `postgres`. Tenerle insieme fa finire il
// driver del database nel bundle, e il build si ferma con «Can't resolve 'fs'».
//
// È la stessa regola già pagata con `euro` in Fase 7: le funzioni pure che servono al
// browser non possono stare accanto al database.

export type MotivoScadenza = "mai-avviato" | "da-pubblicare" | "esercizio-mancante";

export type VoceScadenzario = {
  companyId: string;
  companyNome: string;
  isDemo: boolean;
  modulo: ModuloAzienda;
  moduloNome: string;
  motivo: MotivoScadenza;
  /** Esercizio a cui si riferisce la voce, per i moduli annuali. */
  anno: number | null;
  href: string;
  /** Più basso = più urgente. */
  priorita: number;
};

const MOTIVO_TESTO: Record<MotivoScadenza, string> = {
  "esercizio-mancante": "ultimo esercizio da aprire",
  "da-pubblicare": "avviato, mai pubblicato",
  "mai-avviato": "mai avviato",
};

export function testoMotivo(m: MotivoScadenza): string {
  return MOTIVO_TESTO[m];
}
