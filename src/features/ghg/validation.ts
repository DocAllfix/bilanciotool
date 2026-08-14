import { z } from "zod";
import { companyIdSchema, annoSchema } from "@/features/campi";

// Validazioni zod del modulo GHG: ogni input attraversa questi schemi PRIMA di
// toccare il DB. I numeri viaggiano come stringhe decimali (politica NUMERIC).

export const numeroDecimale = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((s) => s === "" || /^-?(\d+([.,]\d+)?|\d{1,3}(\.\d{3})*,\d+)$/.test(s), {
    message: "Numero non valido",
  });

export const numeroDecimaleObbligatorio = numeroDecimale.refine((s) => s !== "", {
  message: "Valore obbligatorio",
});

export const CATEGORY_KEYS = ["1", "2", "3", "4", "5", "6"] as const;

export const inventarioSchema = z.object({
  companyId: companyIdSchema,
  anno: annoSchema,
  annoBase: annoSchema.optional(),
  gwpSetKey: z.enum(["AR4", "AR5", "AR6"]).default("AR6"),
});

// Confini e perimetro (passo 1): tutti testo libero, chiavi chiuse.
export const boundariesSchema = z
  .object({
    forma: z.string(),
    piva: z.string(),
    sede: z.string(),
    settore: z.string(),
    ateco: z.string(),
    siti: z.string(),
    dipendenti: z.string(),
    responsabile: z.string(),
    consolidamento: z.enum(["Controllo operativo", "Controllo finanziario", "Quota di partecipazione"]),
    perimetroOrg: z.string(),
    perimetroOp: z.string(),
    periodo: z.string(),
    significativita: z.string(),
    metodologia: z.string(),
    verifica: z.string(),
    motivoBase: z.string(),
    regolaRicalcolo: z.string(),
  })
  .partial();

export const metaPeriodoSchema = z
  .object({
    ricavi: numeroDecimale.nullable(),
    fte: numeroDecimale.nullable(),
    produzione: numeroDecimale.nullable(),
    umProduzione: z.string(),
  })
  .partial();

export const statoSorgenteSchema = z
  .object({
    sourceTypeKey: z.string().min(1),
    stato: z.enum(["in", "out", "na"]),
    motivazione: z.string().optional().default(""),
  })
  .superRefine((v, ctx) => {
    // Requisito della norma (e rilievo d'audit più frequente): un'esclusione
    // senza motivazione scritta non è ammessa.
    if ((v.stato === "out" || v.stato === "na") && !v.motivazione.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivazione"],
        message: "La motivazione è obbligatoria per le sorgenti escluse o non applicabili",
      });
    }
  });

export const rigaAttivitaSchema = z.object({
  sourceTypeKey: z.string().min(1),
  categoryKey: z.enum(CATEGORY_KEYS),
  sede: z.string().optional().default(""),
  descrizione: z.string().optional().default(""),
  factorKey: z.string().nullable().optional().default(null),
  um: z.string().min(1),
  quantita: numeroDecimaleObbligatorio,
  fe: numeroDecimaleObbligatorio,
  feMarket: numeroDecimale.nullable().optional().default(null),
  quotaGo: numeroDecimale.nullable().optional().default(null),
  feBiogenic: numeroDecimale.nullable().optional().default(null),
  dq: z.enum(["M", "F", "C", "E", "S"]).default("F"),
  incertezza: numeroDecimale.nullable().optional().default(null),
  evidenza: z.string().optional().default(""),
  note: z.string().optional().default(""),
});

export const fattoreOrgSchema = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_]+$/, "Chiave: solo minuscole, cifre e underscore"),
  baseFactorKey: z.string().nullable().optional().default(null),
  gruppo: z.string().min(1),
  nome: z.string().min(1),
  um: z.string().min(1),
  fe: numeroDecimaleObbligatorio,
  feMarket: numeroDecimale.nullable().optional().default(null),
  feBiogenic: numeroDecimale.nullable().optional().default(null),
  categoryKey: z.enum(CATEGORY_KEYS),
  sourceTypeKey: z.string().min(1),
  fonte: z.string().optional().default(""),
});

export const obiettivoSchema = z.object({
  companyId: companyIdSchema,
  nome: z.string().min(1),
  ambito: z.enum(["1", "2", "12", "3", "tot"]),
  riduzionePct: numeroDecimaleObbligatorio,
  annoTarget: z.coerce.number().int().min(2020).max(2100),
  note: z.string().optional().default(""),
});

export const statoChecklistSchema = z.object({
  requirementKey: z.string().min(1),
  stato: z.enum(["ok", "par", "no"]),
  nota: z.string().optional().default(""),
});
