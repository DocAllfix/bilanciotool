import { z } from "zod";
import { companyIdSchema, dataIsoSchema } from "@/features/campi";

// Validazioni di SA8000/2026. I CHECK della migrazione 0035 sono il secondo strato.

/**
 * I quattro stati di un criterio.
 *
 * ⚠️ «parziale» pesa ZERO nel punteggio, non 50 come nel Sistema integrato QAS. La
 * divergenza è voluta e sta scritta anche nella migrazione, perché non venga «corretta
 * per ragionevolezza»: un criterio sociale attuato a metà non protegge a metà un
 * lavoratore.
 */
export const STATI_CRITERIO = ["ok", "parziale", "no", "na"] as const;
export type StatoCriterio = (typeof STATI_CRITERIO)[number];

export const ETICHETTA_CRITERIO: Record<StatoCriterio, string> = {
  ok: "Attuato",
  parziale: "Parziale",
  no: "Non attuato",
  na: "Non applicabile",
};

export const sistemaSchema = z.object({ companyId: companyIdSchema });

export const profiloSchema = z.object({
  ragione: z.string().trim().max(300).optional(),
  forma: z.string().trim().max(120).optional(),
  piva: z.string().trim().max(60).optional(),
  sede: z.string().trim().max(300).optional(),
  settore: z.string().trim().max(300).optional(),
  addetti: z.string().trim().max(60).optional(),
  ccnl: z.string().trim().max(300).optional(),
  respSa: z.string().trim().max(300).optional(),
  direzione: z.string().trim().max(300).optional(),
  reclamiEmail: z.string().trim().max(300).optional(),
  sitoWeb: z.string().trim().max(300).optional(),
  scopo: z.string().trim().max(4000).optional(),
  siti: z.string().trim().max(4000).optional(),
  dataAdozione: dataIsoSchema.optional(),
  revisione: z.string().trim().max(60).optional(),
  note: z.string().trim().max(4000).optional(),
});

export const criterioSchema = z.object({
  criterionKey: z.string().trim().min(1).max(40),
  campo: z.enum(["stato", "note", "evidenza"]),
  valore: z.union([z.enum(STATI_CRITERIO), z.string().trim().max(4000), z.null()]),
});

/**
 * I dodici campi che l'anagrafica considera obbligatori.
 *
 * ⚠️ Sono quelli del prototipo, e servono a UNA cosa sola: il 15% del completamento che
 * discende dall'anagrafica. Non sono un vincolo di scrittura — bloccare il salvataggio
 * di una scheda finché tutti e dodici non sono pieni impedirebbe di lavorare a pezzi, che
 * è come si lavora davvero.
 */
export const CAMPI_ANAGRAFICA = [
  "ragione", "forma", "piva", "sede", "settore", "addetti",
  "ccnl", "respSa", "direzione", "dataAdozione", "reclamiEmail", "scopo",
] as const;
