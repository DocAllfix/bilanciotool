import { z } from "zod";
import { companyIdSchema } from "@/features/campi";

// Validazioni del modulo ESG Supplier Ready: ogni input attraversa questi schemi
// PRIMA di toccare il database.

export const RISPOSTE = ["si", "parziale", "no", "na"] as const;
export const STATI_DOCUMENTO = ["assente", "da_aggiornare", "disponibile"] as const;
export const STATI_AZIONE = ["da_avviare", "in_corso", "completata"] as const;

export const valutazioneSchema = z.object({
  companyId: companyIdSchema,
  sogliaRichiesta: z.coerce.number().int().min(0).max(100).optional(),
});

/** Anagrafica e contesto della richiesta (chi la chiede, entro quando). */
export const profiloSchema = z
  .object({
    piva: z.string(),
    settore: z.string(),
    ateco: z.string(),
    dipendenti: z.string(),
    fatturato: z.string(),
    sede: z.string(),
    referente: z.string(),
    committente: z.string(),
    scadenza: z.string(),
  })
  .partial();

export type ProfiloSupplier = z.infer<typeof profiloSchema>;

/** I campi che contano per l'avanzamento del passo anagrafico. */
export const PROFILO_RICHIESTI = ["piva", "settore", "sede", "referente", "committente"] as const;

/** Un campo per volta: il client non rimanda mai la riga intera della domanda,
 *  così rispondere non cancella la nota e viceversa. */
export const rispostaSchema = z.object({
  questionKey: z.string().min(1),
  campo: z.enum(["risposta", "nota", "statoDocumento", "responsabile", "scadenza", "statoAzione"]),
  valore: z.string(),
});

export const sogliaSchema = z.coerce.number().int().min(0).max(100);

/** Normalizza il valore di un campo: la stringa vuota è assenza, non "". */
export function perColonna(campo: string, valore: string): string | null {
  const v = valore.trim();
  if (v === "") return null;
  if (campo === "risposta" && !(RISPOSTE as readonly string[]).includes(v)) {
    throw new Error("Risposta non ammessa");
  }
  if (campo === "statoDocumento" && !(STATI_DOCUMENTO as readonly string[]).includes(v)) {
    throw new Error("Stato del documento non ammesso");
  }
  if (campo === "statoAzione" && !(STATI_AZIONE as readonly string[]).includes(v)) {
    throw new Error("Stato dell'azione non ammesso");
  }
  return v;
}
