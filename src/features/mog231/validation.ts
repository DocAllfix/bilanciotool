import { z } from "zod";
import { companyIdSchema, dataIsoSchema } from "@/features/campi";

// Validazioni del Modello 231. Due strati, come dappertutto qui: questo dice «no» con un
// messaggio scritto per il consulente, i CHECK della migrazione 0024 impediscono che una
// riga sbagliata esista comunque.

/** I tre stati di un presidio, più la non applicabilità. */
export const STATI_PRESIDIO = [
  "Presente ed efficace",
  "Presente ma da rafforzare",
  "Assente",
  "Non applicabile",
] as const;

export const ADEGUATEZZE = ["Assenti", "Parziali", "Adeguati"] as const;
export const SI_NO = ["Sì", "No"] as const;

/** Le due scale del primo stadio, nella forma che il motore sa leggere. */
export const SCALA_PROBABILITA = ["1 · remota", "2 · possibile", "3 · probabile", "4 · attesa"] as const;
export const SCALA_IMPATTO = ["1 · lieve", "2 · moderato", "3 · grave", "4 · molto grave"] as const;

/**
 * Un gradino di scala: 1 ÷ 4, oppure `null`.
 *
 * ⚠️ `null` non è 0 e non è 1. Senza una delle due il rischio inerente non esiste, e lo
 * scenario risulta NON accettabile: un rischio non misurato non è un rischio assente. Se
 * il vuoto valesse 1, ogni scenario appena creato sarebbe «Basso» e accettabile.
 */
export const gradinoSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.null()]);

export const modelloSchema = z.object({ companyId: companyIdSchema });

export const profiloSchema = z.object({
  ragione: z.string().trim().max(300).optional(),
  forma: z.string().trim().max(120).optional(),
  piva: z.string().trim().max(60).optional(),
  sede: z.string().trim().max(300).optional(),
  settore: z.string().trim().max(300).optional(),
  addetti: z.string().trim().max(60).optional(),
  organoAmministrativo: z.string().trim().max(500).optional(),
  odvComposizione: z.string().trim().max(2000).optional(),
  odvNomina: dataIsoSchema.optional(),
  dataAdozione: dataIsoSchema.optional(),
  dataDelibera: dataIsoSchema.optional(),
  scopo: z.string().trim().max(4000).optional(),
  esclusioni: z.string().trim().max(4000).optional(),
  canaleSegnalazione: z.string().trim().max(500).optional(),
  revisione: z.string().trim().max(60).optional(),
});
export type ProfiloModello = z.infer<typeof profiloSchema>;

export const nuovoProcessoSchema = z.object({
  nome: z.string().trim().min(2, "Indica il nome del processo sensibile").max(300),
});

/** Un campo per volta, mai la riga intera dalle props. */
export const campoProcessoSchema = z.discriminatedUnion("campo", [
  z.object({ campo: z.literal("nome"), valore: z.string().trim().min(2).max(300) }),
  z.object({ campo: z.literal("area"), valore: testo(200) }),
  z.object({ campo: z.literal("responsabile"), valore: testo(300) }),
  z.object({ campo: z.literal("descrizione"), valore: testo(4000) }),
  z.object({ campo: z.literal("presidi"), valore: testo(4000) }),
]);

export const campoScenarioSchema = z.discriminatedUnion("campo", [
  z.object({ campo: z.literal("probabilita"), valore: gradinoSchema }),
  z.object({ campo: z.literal("impatto"), valore: gradinoSchema }),
  z.object({ campo: z.literal("adeguatezza"), valore: z.enum(ADEGUATEZZE).nullable() }),
  z.object({ campo: z.literal("modalita"), valore: testo(4000) }),
  z.object({ campo: z.literal("note"), valore: testo(4000) }),
]);

export const applicabilitaSchema = z.object({
  crimeKey: z.string().trim().min(1).max(40),
  campo: z.enum(["applicabile", "motivazione"]),
  valore: z.union([z.enum(SI_NO), z.string().trim().max(4000), z.null()]),
});

export const requisitoSchema = z.object({
  requirementKey: z.string().trim().min(1).max(40),
  campo: z.enum(["stato", "note", "evidenza"]),
  valore: z.union([z.enum(STATI_PRESIDIO), z.string().trim().max(4000), z.null()]),
});


function testo(max: number) {
  return z.string().trim().max(max);
}
