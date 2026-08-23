import { z } from "zod";
import { companyIdSchema, dataIsoSchema } from "@/features/campi";

// Validazioni del modulo ISO 37001: ogni input attraversa questi schemi PRIMA di
// toccare il database, e i domini si ricontrollano anche nel CHECK della migrazione
// 0021. Due strati, come dappertutto qui: uno dice «no» con un messaggio per il
// consulente, l'altro impedisce che una riga sbagliata esista comunque.
//
// ⚠️ Nei prototipi non esisteva un solo controllo di formato, obbligatorietà o
// intervallo, e i numeri erano salvati come stringhe: questa validazione è scritta da
// zero, non portata.

/** I quattro stati di un requisito. «Non applicabile» è una valutazione, non un vuoto. */
export const STATI_REQUISITO = ["Conforme", "Parzialmente conforme", "Non conforme", "Non applicabile"] as const;

export const STATI_RAPPORTO = ["Attivo", "Sospeso", "Cessato"] as const;

export const CATEGORIE_SOCIO = [
  "Agente o intermediario",
  "Consulente",
  "Fornitore di beni",
  "Fornitore di servizi",
  "Appaltatore",
  "Subappaltatore",
  "Distributore o rivenditore",
  "Cliente o acquirente",
  "Joint venture o consorzio",
  "Agenzia di somministrazione",
  "Istituto finanziario",
  "Altro",
] as const;

export const REMUNERAZIONI = [
  "Corrispettivo fisso",
  "A consumo o a misura",
  "A provvigione",
  "A successo",
  "Mista",
] as const;

export const SI_NO = ["No", "Sì"] as const;
export const IMPEGNI = ["No", "Sì", "Non fattibile, motivato"] as const;
export const CLAUSOLE = ["No", "Sì", "Non applicabile"] as const;
export const CONTROLLI = [
  "Da verificare",
  "Adeguati",
  "Richiesti e attuati",
  "Richiesti e non attuati",
  "Non fattibile, valutato nel rischio",
] as const;
export const VERIFICHE = ["No", "Sì", "Non applicabile"] as const;
export const ESITI_DD = ["Favorevole", "Favorevole con condizioni", "Sfavorevole"] as const;
export const ADEGUAMENTI = ["Applica il nostro sistema", "Applica controlli propri", "Da definire"] as const;
export const IMPEGNO_FUNZIONE = ["Tempo pieno", "Tempo parziale", "Esternalizzata"] as const;

/**
 * Una dimensione del rischio: 1 ÷ 4, oppure `null`.
 *
 * ⚠️ `null` non è 0 e non è 1. «Non valutata» esce dalla media; 1 ci entra e la
 * abbassa. Un socio con una sola dimensione a 4 è Critico; se il vuoto valesse 1
 * sarebbe Basso, e non gli si chiederebbe nemmeno la due diligence.
 */
export const dimensioneSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.null()]);

export const sistemaSchema = z.object({ companyId: companyIdSchema });

/** I campi del profilo, tutti facoltativi: il sistema si compila un pezzo per volta. */
export const profiloSchema = z.object({
  ragione: z.string().trim().max(300).optional(),
  forma: z.string().trim().max(120).optional(),
  piva: z.string().trim().max(60).optional(),
  sede: z.string().trim().max(300).optional(),
  settore: z.string().trim().max(300).optional(),
  addetti: z.string().trim().max(60).optional(),
  paesi: z.string().trim().max(500).optional(),
  direzione: z.string().trim().max(300).optional(),
  organoGov: z.enum(SI_NO).nullable().optional(),
  organoComp: z.string().trim().max(2000).optional(),
  funzionePc: z.string().trim().max(300).optional(),
  funzionePcImpegno: z.enum(IMPEGNO_FUNZIONE).nullable().optional(),
  funzionePcDirigente: z.string().trim().max(300).optional(),
  odv: z.string().trim().max(300).optional(),
  pubbliciUfficiali: z.string().trim().max(4000).optional(),
  canaleEmail: z.string().trim().max(300).optional(),
  canaleUrl: z.string().trim().max(500).optional(),
  canaleTelefono: z.string().trim().max(120).optional(),
  canaleTerzo: z.string().trim().max(300).optional(),
  canaleLingue: z.string().trim().max(300).optional(),
  scopo: z.string().trim().max(4000).optional(),
  esclusioni: z.string().trim().max(4000).optional(),
  dataAdozione: dataIsoSchema.optional(),
  revisione: z.string().trim().max(60).optional(),
});
export type ProfiloSistema = z.infer<typeof profiloSchema>;

/** Il socio alla creazione: serve solo il nome, il resto si compila dopo. */
export const nuovoSocioSchema = z.object({
  nome: z.string().trim().min(2, "Indica la denominazione del socio in affari").max(300),
});

/**
 * Un solo campo del socio per volta.
 *
 * ⚠️ MAI la riga intera dalle props. È la regola nata in Fase 12 e ripetuta tre
 * volte: salvare il costo azzerava la quantità, impostare la rilevanza finanziaria
 * azzerava l'impatto appena salvato. Il client manda il campo e il valore; il valore
 * precedente degli ALTRI campi non esce mai dal database.
 */
export const campoSocioSchema = z.discriminatedUnion("campo", [
  z.object({ campo: z.literal("nome"), valore: z.string().trim().min(2).max(300) }),
  z.object({ campo: z.literal("categoria"), valore: z.enum(CATEGORIE_SOCIO).nullable() }),
  z.object({ campo: z.literal("paeseOperativita"), valore: testo(200) }),
  z.object({ campo: z.literal("sede"), valore: testo(500) }),
  z.object({ campo: z.literal("oggetto"), valore: testo(2000) }),
  z.object({ campo: z.literal("titolariEffettivi"), valore: testo(2000) }),
  z.object({ campo: z.literal("valoreAnnuo"), valore: z.number().nonnegative().max(1e12).nullable() }),
  z.object({ campo: z.literal("remunerazione"), valore: z.enum(REMUNERAZIONI).nullable() }),
  z.object({ campo: z.literal("attivoDal"), valore: dataIsoSchema.nullable() }),
  z.object({ campo: z.literal("controllata"), valore: z.enum(SI_NO).nullable() }),
  z.object({ campo: z.literal("adeguamento"), valore: z.enum(ADEGUAMENTI).nullable() }),
  z.object({ campo: z.literal("dimPaese"), valore: dimensioneSchema }),
  z.object({ campo: z.literal("dimPubbliciUfficiali"), valore: dimensioneSchema }),
  z.object({ campo: z.literal("dimNatura"), valore: dimensioneSchema }),
  z.object({ campo: z.literal("dimValore"), valore: dimensioneSchema }),
  z.object({ campo: z.literal("flagSuccesso"), valore: z.boolean() }),
  z.object({ campo: z.literal("flagCliente"), valore: z.boolean() }),
  z.object({ campo: z.literal("flagTitolarita"), valore: z.boolean() }),
  z.object({ campo: z.literal("flagPrecedenti"), valore: z.boolean() }),
  z.object({ campo: z.literal("flagLegami"), valore: z.boolean() }),
  z.object({ campo: z.literal("flagPagamenti"), valore: z.boolean() }),
  z.object({ campo: z.literal("dueDiligenceIl"), valore: dataIsoSchema.nullable() }),
  z.object({ campo: z.literal("dueDiligenceEsito"), valore: z.enum(ESITI_DD).nullable() }),
  z.object({ campo: z.literal("dueDiligenceNote"), valore: testo(4000) }),
  z.object({ campo: z.literal("politicaComunicata"), valore: z.enum(SI_NO).nullable() }),
  z.object({ campo: z.literal("impegni"), valore: z.enum(IMPEGNI).nullable() }),
  z.object({ campo: z.literal("impegniNote"), valore: testo(4000) }),
  z.object({ campo: z.literal("clausole"), valore: z.enum(CLAUSOLE).nullable() }),
  z.object({ campo: z.literal("controlli"), valore: z.enum(CONTROLLI).nullable() }),
  z.object({ campo: z.literal("formazioneIl"), valore: dataIsoSchema.nullable() }),
  z.object({ campo: z.literal("verificaCorrispettivo"), valore: z.enum(VERIFICHE).nullable() }),
  z.object({ campo: z.literal("stato"), valore: z.enum(STATI_RAPPORTO) }),
  z.object({ campo: z.literal("note"), valore: testo(4000) }),
]);
export type CampoSocio = z.infer<typeof campoSocioSchema>;

export const requisitoSchema = z.object({
  requirementKey: z.string().trim().min(1).max(40),
  campo: z.enum(["stato", "note", "evidenza"]),
  valore: z.union([z.enum(STATI_REQUISITO), z.string().trim().max(4000), z.null()]),
});


function testo(max: number) {
  return z.string().trim().max(max);
}
