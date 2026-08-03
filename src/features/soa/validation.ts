import { z } from "zod";

// Validazioni del modulo Dichiarazione di Applicabilità: ogni input attraversa
// questi schemi PRIMA di toccare il database, e i domini si ricontrollano anche
// nella funzione che scrive (vedi declarations.ts).

export const STATI = ["nd", "pl", "pa", "at", "av"] as const;
export const MOTIVAZIONI = ["rv", "ol", "oc", "rb", "bp"] as const;
export const STATI_AZIONE = ["da_avviare", "in_corso", "completata"] as const;
export const RUOLI_PRIVACY = ["titolare", "responsabile", "entrambi", "nessuno"] as const;
export const RUOLI_CLOUD = ["cliente", "fornitore", "entrambi", "nessuno"] as const;
export const MODULI = ["27017", "27018", "27701A", "27701B"] as const;

export const dichiarazioneSchema = z.object({
  companyId: z.string().min(1),
  sogliaObiettivo: z.coerce.number().int().min(0).max(100).optional(),
  ruoloPrivacy: z.enum(RUOLI_PRIVACY).optional(),
  ruoloCloud: z.enum(RUOLI_CLOUD).optional(),
});

/** Contesto del sistema di gestione: quello che l'auditor legge per primo. */
export const profiloSchema = z
  .object({
    piva: z.string(),
    sede: z.string(),
    scope: z.string(),
    esclusioni: z.string(),
    versione: z.string(),
    data: z.string(),
    redatto: z.string(),
    approvato: z.string(),
  })
  .partial();

export type ProfiloSoa = z.infer<typeof profiloSchema>;

/** I campi del contesto che contano per la completezza della Dichiarazione. */
export const PROFILO_RICHIESTI = ["sede", "scope", "versione", "redatto", "approvato"] as const;

/** Un campo per volta della decisione sul controllo: cambiare lo stato non deve
 *  cancellare il riferimento documentale, e viceversa. */
export const decisioneSchema = z.object({
  frameworkKey: z.string().min(1),
  controlloId: z.string().min(1),
  campo: z.enum([
    "applicabile", "giustificazione", "stato", "riferimentoDoc", "responsabile", "scadenza", "statoAzione", "note",
  ]),
  valore: z.string(),
});

export const motivazioneSchema = z.object({
  frameworkKey: z.string().min(1),
  controlloId: z.string().min(1),
  motivazione: z.enum(MOTIVAZIONI),
  attiva: z.boolean(),
});

export const moduloSchema = z.object({
  frameworkKey: z.enum(MODULI),
  attivo: z.boolean(),
});

export const ruoliSchema = z.object({
  ruoloPrivacy: z.enum(RUOLI_PRIVACY).optional(),
  ruoloCloud: z.enum(RUOLI_CLOUD).optional(),
  sogliaObiettivo: z.coerce.number().int().min(0).max(100).optional(),
});

/** Etichette in italiano dei domini chiusi, per interfaccia e documento. */
export const ETICHETTA_STATO: Record<string, string> = {
  nd: "Non attuato",
  pl: "Pianificato",
  pa: "Parzialmente attuato",
  at: "Attuato",
  av: "Attuato e verificato",
};

export const ETICHETTA_MOTIVAZIONE: Record<string, { nome: string; sigla: string }> = {
  rv: { nome: "Valutazione del rischio", sigla: "VR" },
  ol: { nome: "Obbligo legale o regolamentare", sigla: "OL" },
  oc: { nome: "Obbligo contrattuale", sigla: "OC" },
  rb: { nome: "Requisito di business", sigla: "RB" },
  bp: { nome: "Buona prassi di settore", sigla: "BP" },
};

export const ETICHETTA_RUOLO_PRIVACY: Record<string, string> = {
  titolare: "Titolare del trattamento",
  responsabile: "Responsabile del trattamento",
  entrambi: "Titolare e responsabile",
  nessuno: "Nessun trattamento di dati personali",
};

export const ETICHETTA_RUOLO_CLOUD: Record<string, string> = {
  cliente: "Cliente di servizi cloud",
  fornitore: "Fornitore di servizi cloud",
  entrambi: "Cliente e fornitore di servizi cloud",
  nessuno: "Nessun servizio cloud",
};

export const ETICHETTA_AZIONE: Record<string, string> = {
  da_avviare: "Da avviare",
  in_corso: "In corso",
  completata: "Completata",
};
