import { z } from "zod";

// Validazione del confine server↔client del corpus.
//
// Nei sei prototipi la validazione **non esiste**: nessun campo obbligatorio, nessun
// formato, nessun intervallo, e i campi numerici salvati come testo. Qui si progetta da
// zero, e non è pedanteria: una server action è un endpoint HTTP, e nessun tipo
// TypeScript sopravvive a runtime.

export const STATI_DOC = ["da_personalizzare", "in_redazione", "approvato", "non_applicabile"] as const;
export type StatoDoc = (typeof STATI_DOC)[number];

/** Gli identificativi del corpus sono codici, non testo libero: «PAC-01», «MOD-01.01». */
const codice = z.string().trim().min(1).max(40);

export const riferimentoDocumento = z.object({
  companyId: z.string().min(1),
  contentSetId: z.string().min(1).max(60),
  docCode: codice,
});

export const statoDocumentoSchema = riferimentoDocumento.extend({
  stato: z.enum(STATI_DOC).optional(),
  // La revisione è una sigla breve («01», «02»), non una frase.
  revisione: z.string().trim().max(10).optional(),
  // Data ISO o vuota: il campo è testo perché il corpus la stampa così com'è.
  dataEmissione: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional(),
  note: z.string().max(4000).optional(),
  integrazioni: z.string().max(20_000).optional(),
});

export const overrideSchema = riferimentoDocumento.extend({
  blockId: z.string().trim().min(1).max(40),
  /** Il testo su misura. Vuoto significa «torna all'originale», e lo gestisce l'azione. */
  testo: z.string().max(20_000),
});

export const rigaRegistroSchema = z.object({
  companyId: z.string().min(1),
  contentSetId: z.string().min(1).max(60),
  registerId: codice,
  /** I valori arrivano come mappa chiave→testo: il dominio lo definisce il catalogo, e
   *  l'azione verifica che ogni chiave esista fra le colonne di quel registro. */
  dati: z.record(z.string().max(80), z.string().max(10_000)),
});

export const aggiornaRigaSchema = z.object({
  companyId: z.string().min(1),
  rowId: z.string().min(1),
  dati: z.record(z.string().max(80), z.string().max(10_000)),
});
