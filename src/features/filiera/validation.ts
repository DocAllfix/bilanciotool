import { z } from "zod";
import { companyIdSchema, dataIsoSchema } from "@/features/campi";

// Validazioni della Due diligence di filiera. I CHECK della migrazione 0039 sono il
// secondo strato: nei prototipi non esiste un solo controllo di formato, obbligatorietà
// o intervallo, e i campi numerici sono salvati come stringhe.

export const LIVELLI = ["Livello 1", "Livello 2", "Livello 3 o oltre"] as const;
export const QUALIFICHE = ["In istruttoria", "Piena", "Condizionata", "Sospesa", "Negata"] as const;
export const SOSTITUIBILITA = [
  "Immediata",
  "Con tempi contenuti",
  "Difficile",
  "Non sostituibile nel breve",
] as const;

/**
 * Gli stati del rapporto.
 *
 * ⚠️ I CESSATI escono dai conteggi per numerosità. Nel prototipo la spesa totale li
 * includeva mentre tutti gli altri conteggi no, e un cessato grosso schiacciava ogni
 * percentuale di copertura: qui il filtro è lo stesso ovunque, ed è `RAPPORTI_VIVI`.
 */
export const STATI_RAPPORTO = ["Attivo", "In uscita graduale", "Sospeso", "Cessato"] as const;
export type StatoRapporto = (typeof STATI_RAPPORTO)[number];

/** Un rapporto è «vivo» se non è cessato: è il filtro di ogni conteggio. */
export const RAPPORTI_VIVI: readonly StatoRapporto[] = ["Attivo", "In uscita graduale", "Sospeso"];

export const SI_NO = ["No", "Sì"] as const;

/**
 * Il cascading ha TRE valori, e «Non richiesto» non è «No».
 *
 * Un partner di ultimo livello non ha nessuno a cui trasmettere le clausole: contarlo
 * come lacuna sarebbe dichiarare un problema che non esiste, e il piano di rimedio
 * porterebbe un'azione impossibile.
 */
export const CASCADING = ["Non richiesto", "No", "Sì"] as const;

export const programmaSchema = z.object({ companyId: companyIdSchema });

export const profiloSchema = z.object({
  ragione: z.string().trim().max(300).optional(),
  forma: z.string().trim().max(120).optional(),
  piva: z.string().trim().max(60).optional(),
  sede: z.string().trim().max(300).optional(),
  settore: z.string().trim().max(300).optional(),
  addetti: z.string().trim().max(60).optional(),
  responsabile: z.string().trim().max(300).optional(),
  organo: z.string().trim().max(300).optional(),
  direzione: z.string().trim().max(300).optional(),
  reclamiCanale: z.string().trim().max(300).optional(),
  politica: z.string().trim().max(4000).optional(),
  perimetro: z.string().trim().max(4000).optional(),
  esclusioni: z.string().trim().max(4000).optional(),
  riesameData: dataIsoSchema.optional(),
  riesameEsito: z.string().trim().max(4000).optional(),
  dataAdozione: dataIsoSchema.optional(),
  revisione: z.string().trim().max(60).optional(),
  note: z.string().trim().max(4000).optional(),
});

export const partnerNuovoSchema = z.object({
  nome: z.string().trim().min(1, "La ragione sociale serve").max(300),
  paese: z.string().trim().max(120).optional(),
  livello: z.enum(LIVELLI).optional(),
});

/**
 * Un campo per volta, mai la scheda intera.
 *
 * ⚠️ È la regola nata da tre difetti veri di questo progetto — materialità, ripartizione
 * energetica, costi: rimandare la riga intera da props stantie azzera il campo salvato un
 * istante prima. Qui l'azione accetta UN campo, e il valore precedente non passa mai dal
 * browser. L'unione discriminata dà anche il tipo giusto a ciascun campo: `addetti` è un
 * numero e `livello` è uno dei tre livelli, senza `as` da nessuna parte.
 */
export const campoPartnerSchema = z.discriminatedUnion("campo", [
  z.object({ campo: z.literal("nome"), valore: z.string().trim().min(1).max(300) }),
  z.object({ campo: z.literal("codiceInterno"), valore: z.string().trim().max(120).nullable() }),
  z.object({ campo: z.literal("livello"), valore: z.enum(LIVELLI).nullable() }),
  z.object({ campo: z.literal("categoria"), valore: z.string().trim().max(300).nullable() }),
  z.object({ campo: z.literal("paese"), valore: z.string().trim().max(120).nullable() }),
  z.object({ campo: z.literal("sito"), valore: z.string().trim().max(2000).nullable() }),
  z.object({ campo: z.literal("attivita"), valore: z.string().trim().max(2000).nullable() }),
  z.object({ campo: z.literal("addetti"), valore: z.number().int().min(0).max(1_000_000).nullable() }),
  z.object({ campo: z.literal("somministrati"), valore: z.number().int().min(0).max(1_000_000).nullable() }),
  z.object({ campo: z.literal("migranti"), valore: z.enum(SI_NO).nullable() }),
  z.object({ campo: z.literal("agenzie"), valore: z.string().trim().max(2000).nullable() }),
  z.object({ campo: z.literal("subappalto"), valore: z.enum(SI_NO).nullable() }),
  z.object({ campo: z.literal("spesa"), valore: z.number().min(0).max(1e12).nullable() }),
  z.object({ campo: z.literal("quotaFatturato"), valore: z.number().min(0).max(100).nullable() }),
  z.object({ campo: z.literal("sostituibilita"), valore: z.enum(SOSTITUIBILITA).nullable() }),
  z.object({ campo: z.literal("rapportoDal"), valore: dataIsoSchema.nullable() }),
  z.object({ campo: z.literal("qualifica"), valore: z.enum(QUALIFICHE).nullable() }),
  z.object({ campo: z.literal("qualificaValidaAl"), valore: dataIsoSchema.nullable() }),
  z.object({ campo: z.literal("codiceCondotta"), valore: z.enum(SI_NO).nullable() }),
  z.object({ campo: z.literal("clausole"), valore: z.enum(SI_NO).nullable() }),
  z.object({ campo: z.literal("cascading"), valore: z.enum(CASCADING).nullable() }),
  z.object({ campo: z.literal("canaleAffisso"), valore: z.enum(SI_NO).nullable() }),
  z.object({ campo: z.literal("stato"), valore: z.enum(STATI_RAPPORTO) }),
  z.object({ campo: z.literal("note"), valore: z.string().trim().max(4000).nullable() }),
]);

/** Un punteggio: 1÷4, oppure `null` per togliere la valutazione. */
export const punteggioSchema = z.object({
  genere: z.enum(["dim", "area"]),
  chiave: z.string().trim().min(1).max(40),
  valore: z.number().int().min(1).max(4).nullable(),
});

export const flagSchema = z.object({
  chiave: z.string().trim().min(1).max(40),
  acceso: z.boolean(),
});
