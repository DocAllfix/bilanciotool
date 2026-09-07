import { z } from "zod";
import { companyIdSchema, dataIsoSchema } from "@/features/campi";
import { PERIMETRI_NIS2 } from "@/lib/db/schema/nis2";

// Validazioni dei due percorsi NIS2 (D.Lgs. 138/2024).
//
// Due strati, come dappertutto: questo dice «no» con un messaggio scritto per il
// consulente, i CHECK della migrazione 0055 impediscono che una riga sbagliata esista.
// Il primo si puo' dimenticare, il secondo no.

export const PERIMETRI = PERIMETRI_NIS2;
export type Perimetro = (typeof PERIMETRI)[number];

export const DIMENSIONI = ["micro", "media", "grande"] as const;
export const CRITERI = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"] as const;
export const STATI_CONTROLLO = ["non_attuato", "in_attuazione", "attuato", "non_applicabile"] as const;
export const STATI_FASE = ["non_avviata", "in_corso", "completata"] as const;
export const VERSI = ["crescente", "decrescente"] as const;
export const FREQUENZE = ["mensile", "trimestrale", "semestrale", "annuale"] as const;
export const TIPI_INDICATORE = ["attuazione", "efficacia"] as const;

/**
 * Un numero, oppure niente.
 *
 * ⚠️ La stringa vuota NON diventa zero, ed e' la differenza fra «il target e' zero» e
 * «un target non c'e'». Nel prototipo SGI QAS `Number("")` valeva zero e un indicatore
 * senza target risultava a target qualunque valore avesse; qui il vuoto diventa `null`,
 * che il motore legge come «nessuno l'ha fissato».
 */
const numeroOpzionale = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || /^-?\d+([.,]\d+)?$/.test(v), "Serve un numero, oppure il campo vuoto")
  .transform((v) => (v === null ? null : v.replace(",", ".")));

/** Una data ISO, oppure niente. `dataIsoSchema` ricompone e confronta: il 31 febbraio non passa. */
const dataOpzionale = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .refine((v) => v === null || dataIsoSchema.safeParse(v).success, "Serve una data valida");

/**
 * Un ISTANTE, non una data.
 *
 * ⚠️ Il registro degli incidenti lavora su istanti perche' da li' decorrono le
 * ventiquattro ore della pre-notifica e le settantadue della notifica. Una data secca
 * perderebbe l'ora, e un termine perentorio calcolato sulla mezzanotte sbaglia di mezza
 * giornata in un verso o nell'altro.
 */
export const istanteSchema = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || !Number.isNaN(new Date(v).getTime()), "Serve una data e un'ora");

export const profiloSchema = z.object({
  companyId: companyIdSchema,
});

/**
 * L'ambito soggettivo: settore, dimensione, criteri specifici.
 *
 * ⚠️ Tutto opzionale, e non e' lassismo: la classificazione si costruisce in piu' momenti
 * — il settore lo si sa subito, la dimensione dopo aver visto il bilancio, i criteri dopo
 * aver parlato col cliente. Pretendere tutto insieme costringerebbe a inventare un valore
 * per proseguire, e un valore inventato in questo motore decide gli obblighi e il tetto
 * delle sanzioni.
 */
export const ambitoSchema = z.object({
  settore: z.string().trim().max(120).nullable().optional(),
  dimensione: z.enum(DIMENSIONI).nullable().optional(),
  criteri: z.array(z.enum(CRITERI)).optional(),
});

export const assettoSchema = z.object({
  organo: z.string().trim().max(200).nullable().optional(),
  responsabile: z.string().trim().max(200).nullable().optional(),
  sostituto: z.string().trim().max(200).nullable().optional(),
  puntoContatto: z.string().trim().max(200).nullable().optional(),
  contattoRecapito: z.string().trim().max(200).nullable().optional(),
  comunicazioneIl: dataOpzionale.optional(),
  registrazioneIl: dataOpzionale.optional(),
  classeAcn: z.string().trim().max(120).nullable().optional(),
  obiettivo: z.number().int().min(0).max(4).optional(),
});

/**
 * La valutazione di UN requisito, UN campo per volta.
 *
 * ⚠️ E' la regola piu' costosa di questo progetto, alla quinta occorrenza: la quantita'
 * dell'energetico, l'impatto della materialita', il contatto di riferimento, le politiche
 * del bilancio. Ogni volta il client rimandava la riga intera letta da props stantie, e
 * ogni volta salvare un campo ne azzerava un altro. Qui il campo e' un dominio CHIUSO e
 * il valore precedente il browser non lo conosce nemmeno.
 */
export const requisitoSchema = z.discriminatedUnion("campo", [
  z.object({
    requirementKey: z.string().trim().min(1).max(20),
    campo: z.literal("livello"),
    valore: z.number().int().min(0).max(4).nullable(),
  }),
  z.object({
    requirementKey: z.string().trim().min(1).max(20),
    campo: z.literal("nonApplicabile"),
    valore: z.boolean(),
  }),
  z.object({
    requirementKey: z.string().trim().min(1).max(20),
    campo: z.literal("evidenza"),
    valore: z.string().trim().max(2000).nullable(),
  }),
  z.object({
    requirementKey: z.string().trim().min(1).max(20),
    campo: z.literal("note"),
    valore: z.string().trim().max(2000).nullable(),
  }),
]);

/** Lo stato di UN controllo, UN campo per volta. Stessa regola. */
export const controlloSchema = z.discriminatedUnion("campo", [
  z.object({
    controlKey: z.string().trim().min(1).max(20),
    campo: z.literal("stato"),
    valore: z.enum(STATI_CONTROLLO).nullable(),
  }),
  z.object({
    controlKey: z.string().trim().min(1).max(20),
    campo: z.literal("responsabile"),
    valore: z.string().trim().max(200).nullable(),
  }),
  z.object({
    controlKey: z.string().trim().min(1).max(20),
    campo: z.literal("evidenza"),
    valore: z.string().trim().max(2000).nullable(),
  }),
  z.object({
    controlKey: z.string().trim().min(1).max(20),
    campo: z.literal("ultimaVerifica"),
    valore: dataOpzionale,
  }),
  z.object({
    controlKey: z.string().trim().min(1).max(20),
    campo: z.literal("note"),
    valore: z.string().trim().max(2000).nullable(),
  }),
]);

export const faseSchema = z.discriminatedUnion("campo", [
  z.object({
    phaseKey: z.string().trim().min(1).max(10),
    campo: z.literal("stato"),
    valore: z.enum(STATI_FASE),
  }),
  z.object({
    phaseKey: z.string().trim().min(1).max(10),
    campo: z.literal("responsabile"),
    valore: z.string().trim().max(200).nullable(),
  }),
  z.object({
    phaseKey: z.string().trim().min(1).max(10),
    campo: z.literal("scadenza"),
    valore: dataOpzionale,
  }),
  z.object({
    phaseKey: z.string().trim().min(1).max(10),
    campo: z.literal("note"),
    valore: z.string().trim().max(2000).nullable(),
  }),
]);

export const nuovoIndicatoreSchema = z.object({
  codice: z.string().trim().min(1, "Serve un codice").max(30),
  nome: z.string().trim().min(1, "Serve un nome").max(200),
});

export const campoIndicatoreSchema = z.discriminatedUnion("campo", [
  z.object({ id: z.string().min(1), campo: z.literal("nome"), valore: z.string().trim().min(1).max(200) }),
  z.object({ id: z.string().min(1), campo: z.literal("ambito"), valore: z.string().trim().max(60).nullable() }),
  z.object({ id: z.string().min(1), campo: z.literal("tipo"), valore: z.enum(TIPI_INDICATORE).nullable() }),
  z.object({ id: z.string().min(1), campo: z.literal("misuraCollegata"), valore: z.string().trim().max(200).nullable() }),
  z.object({ id: z.string().min(1), campo: z.literal("formula"), valore: z.string().trim().max(500).nullable() }),
  z.object({ id: z.string().min(1), campo: z.literal("unita"), valore: z.string().trim().max(30).nullable() }),
  z.object({ id: z.string().min(1), campo: z.literal("fonte"), valore: z.string().trim().max(200).nullable() }),
  z.object({ id: z.string().min(1), campo: z.literal("frequenza"), valore: z.enum(FREQUENZE) }),
  z.object({ id: z.string().min(1), campo: z.literal("responsabile"), valore: z.string().trim().max(200).nullable() }),
  z.object({ id: z.string().min(1), campo: z.literal("valoreIniziale"), valore: numeroOpzionale }),
  z.object({ id: z.string().min(1), campo: z.literal("target"), valore: numeroOpzionale }),
  z.object({ id: z.string().min(1), campo: z.literal("soglia"), valore: numeroOpzionale }),
  z.object({ id: z.string().min(1), campo: z.literal("verso"), valore: z.enum(VERSI) }),
  z.object({ id: z.string().min(1), campo: z.literal("note"), valore: z.string().trim().max(2000).nullable() }),
]);

export const rilevazioneSchema = z.object({
  indicatorId: z.string().min(1),
  periodo: z.string().trim().min(4).max(20),
  valore: numeroOpzionale,
  note: z.string().trim().max(500).nullable().optional(),
});

export const roadmapSchema = z.object({
  mesiNotifica: z.number().int().min(0).max(60).optional(),
  mesiMisure: z.number().int().min(0).max(60).optional(),
});
