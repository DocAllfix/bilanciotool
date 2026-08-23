import { z } from "zod";
import { companyIdSchema, dataIsoSchema } from "@/features/campi";

// Validazioni del Sistema di gestione integrato QAS.
//
// Due strati, come dappertutto: questo dice «no» con un messaggio scritto per il
// consulente, i CHECK della migrazione 0031 impediscono che una riga sbagliata esista.

export const NORME = ["Q", "A", "S"] as const;
export type Norma = (typeof NORME)[number];

export const STATI_REQUISITO = [
  "Conforme",
  "Parzialmente conforme",
  "Non conforme",
  "Non applicabile",
] as const;

export const AMBITI_INDICATORE = ["Qualità", "Ambiente", "Sicurezza", "Integrato"] as const;
export const TIPI_INDICATORE = ["Proattivo", "Reattivo"] as const;
export const FREQUENZE = ["Mensile", "Trimestrale", "Semestrale", "Annuale"] as const;

/**
 * Un numero, oppure niente.
 *
 * ⚠️ La stringa vuota NON è ammessa, ed è il difetto del prototipo reso
 * irrappresentabile: là `Number("")` valeva zero, e un indicatore senza target risultava
 * «a target» per uno «più è meglio» e «fuori» per uno «meno è meglio». Qui il vuoto
 * diventa `null`, che il motore legge come «nessuno l'ha fissato».
 */
const numeroOpzionale = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || /^-?\d+([.,]\d+)?$/.test(v), "Serve un numero, oppure il campo vuoto")
  .transform((v) => (v === null ? null : v.replace(",", ".")));

export const sistemaSchema = z.object({ companyId: companyIdSchema });

/**
 * Le norme nel perimetro.
 *
 * ⚠️ Almeno una: un sistema integrato senza nessuna norma non è un sistema, e la mappa
 * di conformità dividerebbe per zero requisiti. Il vincolo sta anche nel database.
 */
export const normeSchema = z
  .array(z.enum(NORME))
  .min(1, "Almeno una norma deve essere nel perimetro")
  .max(3);

export const profiloSchema = z.object({
  ragione: z.string().trim().max(300).optional(),
  forma: z.string().trim().max(120).optional(),
  piva: z.string().trim().max(60).optional(),
  sede: z.string().trim().max(300).optional(),
  settore: z.string().trim().max(300).optional(),
  addetti: z.string().trim().max(60).optional(),
  direzione: z.string().trim().max(300).optional(),
  rspp: z.string().trim().max(300).optional(),
  rls: z.string().trim().max(300).optional(),
  medico: z.string().trim().max(300).optional(),
  responsabileSistema: z.string().trim().max(300).optional(),
  scopo: z.string().trim().max(4000).optional(),
  esclusioni: z.string().trim().max(4000).optional(),
  siti: z.string().trim().max(4000).optional(),
  dataAdozione: dataIsoSchema.optional(),
  revisione: z.string().trim().max(60).optional(),
  note: z.string().trim().max(4000).optional(),
});

export const requisitoSchema = z.object({
  requirementKey: z.string().trim().min(1).max(40),
  campo: z.enum(["stato", "note", "evidenza"]),
  valore: z.union([z.enum(STATI_REQUISITO), z.string().trim().max(4000), z.null()]),
});

export const nuovoIndicatoreSchema = z.object({
  nome: z.string().trim().min(2, "Indica come si chiama l'indicatore").max(300),
  ambito: z.enum(AMBITI_INDICATORE).optional(),
});

/** Un campo per volta, mai la riga intera dalle props. */
export const campoIndicatoreSchema = z.discriminatedUnion("campo", [
  z.object({ campo: z.literal("codice"), valore: z.string().trim().max(40).nullable() }),
  z.object({ campo: z.literal("nome"), valore: z.string().trim().min(2).max(300) }),
  z.object({ campo: z.literal("ambito"), valore: z.enum(AMBITI_INDICATORE).nullable() }),
  z.object({ campo: z.literal("tipo"), valore: z.enum(TIPI_INDICATORE).nullable() }),
  z.object({ campo: z.literal("processo"), valore: z.string().trim().max(300).nullable() }),
  z.object({ campo: z.literal("finalita"), valore: z.string().trim().max(2000).nullable() }),
  z.object({ campo: z.literal("formula"), valore: z.string().trim().max(2000).nullable() }),
  z.object({ campo: z.literal("um"), valore: z.string().trim().max(40).nullable() }),
  z.object({ campo: z.literal("fonte"), valore: z.string().trim().max(300).nullable() }),
  z.object({ campo: z.literal("frequenza"), valore: z.enum(FREQUENZE).nullable() }),
  z.object({ campo: z.literal("responsabile"), valore: z.string().trim().max(300).nullable() }),
  z.object({ campo: z.literal("riferimentoIniziale"), valore: z.string().trim().max(120).nullable() }),
  z.object({ campo: z.literal("target"), valore: numeroOpzionale }),
  z.object({ campo: z.literal("soglia"), valore: numeroOpzionale }),
  z.object({ campo: z.literal("versoPositivo"), valore: z.boolean() }),
  z.object({ campo: z.literal("obiettivo"), valore: z.string().trim().max(300).nullable() }),
  z.object({ campo: z.literal("note"), valore: z.string().trim().max(4000).nullable() }),
]);

/**
 * Una rilevazione.
 *
 * ⚠️ Il periodo è testo perché la sua forma dipende dalla frequenza — «2026-03» per una
 * mensile, «2026-T1» per una trimestrale, «2026» per una annuale — ma NON è testo libero:
 * il formato si controlla, altrimenti la serie storica diventa un elenco disordinato e il
 * grafico una domanda senza risposta.
 */
export const rilevazioneSchema = z.object({
  indicatorId: z.string().min(1),
  periodo: z
    .string()
    .trim()
    .regex(/^\d{4}(-(0[1-9]|1[0-2]|T[1-4]|S[12]))?$/, "Periodo: «2026», «2026-03», «2026-T1» o «2026-S1»"),
  valore: numeroOpzionale,
  note: z.string().trim().max(1000).nullable().optional(),
});
