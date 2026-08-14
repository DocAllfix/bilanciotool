import { z } from "zod";
import { companyIdSchema, annoSchema } from "@/features/campi";

// Validazioni zod del modulo energetico: ogni input attraversa questi schemi
// PRIMA di toccare il DB. I numeri viaggiano come stringhe decimali (NUMERIC).

export const numeroDecimale = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((s) => s === "" || /^-?(\d+([.,]\d+)?|\d{1,3}(\.\d{3})*,\d+)$/.test(s), {
    message: "Numero non valido",
  });

export const numeroDecimaleObbligatorio = numeroDecimale.refine((s) => s !== "", {
  message: "Valore obbligatorio",
});

export const AREE_KEYS = ["P", "A", "G", "T"] as const;
export const METODI_KEYS = ["mis", "cal", "sti"] as const;
export const STATI_MISURA = ["proposto", "valutato", "approvato", "in_corso", "realizzato", "scartato"] as const;

export const bilancioSchema = z.object({
  companyId: companyIdSchema,
  anno: annoSchema,
  annoBase: annoSchema.optional(),
});

// Sito e perimetro (passo 1): testo libero, chiavi chiuse.
export const profiloSchema = z
  .object({
    forma: z.string(),
    piva: z.string(),
    sede: z.string(),
    settore: z.string(),
    ateco: z.string(),
    sito: z.string(),
    attivita: z.string(),
    turni: z.string(),
    referente: z.string(),
    perimetro: z.string(),
    unitaProd: z.string(),
  })
  .partial();

export type ProfiloEnergetico = z.infer<typeof profiloSchema>;

/** I sette campi che contano per l'avanzamento del passo 1. */
export const PROFILO_RICHIESTI = ["forma", "sede", "settore", "ateco", "sito", "attivita", "referente"] as const;

/** Un campo per volta: il client non rimanda mai la riga intera, così salvare il
 *  costo non può cancellare la quantità appena inserita (difetto già visto in
 *  Fase 7 sulla materialità: read-modify-write da props stantie). */
export const vettoreCampoSchema = z.object({
  vettoreKey: z.string().min(1),
  campo: z.enum(["quantita", "costo"]),
  valore: numeroDecimale,
});

export const mensileSchema = z.object({
  vettoreKey: z.string().min(1),
  mese: z.coerce.number().int().min(0).max(11),
  valore: numeroDecimale,
});

export const allocazioneSchema = z.object({
  usoKey: z.string().min(1),
  vettoreKey: z.string().min(1),
  quantita: numeroDecimale, // stringa vuota = cancella la cella
});

export const usoStatoSchema = z.object({
  usoKey: z.string().min(1),
  attivo: z.boolean().optional(),
  metodo: z.enum(METODI_KEYS).nullable().optional(),
  nota: z.string().optional(),
});

export const stimaSchema = z.object({
  usoKey: z.string().min(1),
  stimaVettoreKey: z.string().optional(),
  stimaKw: numeroDecimale.optional(),
  stimaOre: numeroDecimale.optional(),
  stimaFattoreCarico: numeroDecimale.optional(),
});

export const driverSchema = z.object({
  anno: annoSchema,
  driverKey: z.string().min(1),
  valore: numeroDecimale,
});

export const misuraSchema = z.object({
  descrizione: z.string().default(""),
  vettoreKey: z.string().min(1),
  quantita: numeroDecimale.optional(),
  investimento: numeroDecimale.optional(),
  incentivo: numeroDecimale.optional(),
  usoKey: z.string().nullable().optional(),
  stato: z.enum(STATI_MISURA).optional(),
  annoPrevisto: annoSchema.nullable().optional(),
  note: z.string().nullable().optional(),
});

export const fattoreCompanySchema = z.object({
  key: z.string().min(1),
  kwhUnita: numeroDecimale.optional(),
  tepUnita: numeroDecimale.optional(),
  feUnita: numeroDecimale.optional(),
  feMarket: numeroDecimale.optional(),
  fonte: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

/** Normalizza una stringa decimale italiana per la persistenza NUMERIC. */
export function perNumeric(v: string | undefined | null): string | null {
  if (v === undefined || v === null) return null;
  const s = v.trim();
  if (s === "") return null;
  return s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
}
