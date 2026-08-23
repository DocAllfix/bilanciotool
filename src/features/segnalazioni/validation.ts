import { z } from "zod";
import { companyIdSchema, dataIsoSchema } from "@/features/campi";
import { FORME_CANALE } from "@/lib/calc/segnalazioni/canale";

// Validazioni della gestione delle segnalazioni.
//
// Due strati, come dappertutto qui: questo dice «no» con un messaggio scritto per il
// consulente, i CHECK della migrazione 0027 impediscono che una riga sbagliata esista
// comunque. Gli elenchi qui sotto e quelli della migrazione devono restare uguali —
// `wb-vincoli.db.test.ts` li mette a confronto sul campo, inserendo il valore giusto e
// quello sbagliato.

// ─── I domini del decreto ────────────────────────────────────────────────────

export const SI_NO = ["Sì", "No"] as const;

export const CANALI_RICEZIONE = [
  "Scritto informatico",
  "Scritto analogico",
  "Orale telefonico",
  "Incontro diretto",
  /** Non è un canale nostro, ma l'ente ne viene a conoscenza e deve poterlo annotare. */
  "Canale esterno ANAC",
  "Altro",
] as const;

/**
 * La qualità del segnalante.
 *
 * ⚠️ L'elenco è largo di proposito e non va potato: l'art. 3 protegge anche chi
 * dipendente non è — candidati, ex dipendenti, volontari, lavoratori di appaltatori.
 * Restringerlo a «Dipendente / Dirigente / Altro» escluderebbe dalla tutela persone che
 * la legge tutela, e lo farebbe in silenzio.
 */
export const QUALITA_SEGNALANTE = [
  "Dipendente",
  "Dirigente",
  "Collaboratore o consulente",
  "Lavoratore autonomo",
  "Volontario o tirocinante",
  "Socio o amministratore",
  "Fornitore o appaltatore",
  "Lavoratore di appaltatore",
  "Candidato",
  "Ex dipendente",
  "Non dichiarata",
] as const;

export const AMBITI = [
  "Illecito rilevante ai sensi del D.Lgs. 231/2001",
  "Violazione del modello o del codice etico",
  "Appalti pubblici",
  "Servizi e mercati finanziari",
  "Riciclaggio e finanziamento del terrorismo",
  "Sicurezza dei prodotti",
  "Sicurezza dei trasporti",
  "Tutela dell'ambiente",
  "Sicurezza alimentare",
  "Salute pubblica",
  "Tutela dei consumatori",
  "Protezione dei dati personali e sicurezza delle reti",
  "Interessi finanziari dell'Unione",
  "Concorrenza e aiuti di Stato",
  "Salute e sicurezza sul lavoro",
  "Altro",
] as const;

export const STATI_FASCICOLO = [
  "Ricevuta",
  "In valutazione",
  "In istruttoria",
  "In attesa di integrazione",
  "Riscontrata",
  "Chiusa",
  "Archiviata",
] as const;

export const ESITI = [
  "Fondata",
  "Parzialmente fondata",
  "Non fondata",
  "Manifestamente infondata",
] as const;

export const STATI_REQUISITO = [
  "Conforme",
  "Parzialmente conforme",
  "Non conforme",
  "Non applicabile",
] as const;

export const TITOLI_OBBLIGO = [
  "Almeno 50 lavoratori subordinati",
  "Settore indicato dalla legge, indipendentemente dal numero",
  "Adozione del modello 231, indipendentemente dal numero",
  "Adesione volontaria",
  "Non obbligato",
] as const;

export const CONFIGURAZIONI_GESTORE = [
  "Persona interna dedicata",
  "Ufficio interno autonomo",
  "Organismo di vigilanza",
  "Soggetto esterno autonomo",
] as const;

// ─── Aiutanti ────────────────────────────────────────────────────────────────

/** Un testo facoltativo: il vuoto e l'assenza si equivalgono, `null` cancella. */
function testo(max: number) {
  return z.string().trim().max(max).nullable();
}

/** Una scelta da un elenco chiuso, oppure «non ancora scelta». */
function scelta<T extends readonly [string, ...string[]]>(valori: T) {
  return z.enum(valori).nullable();
}

const data = dataIsoSchema.nullable();

// ─── L'assetto ───────────────────────────────────────────────────────────────

export const assettoSchema = z.object({ companyId: companyIdSchema });

/**
 * Il profilo dell'assetto: più campi insieme, come il profilo del Modello 231.
 *
 * È una scheda anagrafica con salvataggio automatico e campi indipendenti: qui il
 * difetto del read-modify-write non si presenta, perché nessun comando calcola nulla a
 * partire dagli altri campi della stessa scheda.
 */
export const profiloAssettoSchema = z.object({
  ragione: z.string().trim().max(300).optional(),
  formaGiuridica: z.string().trim().max(120).optional(),
  piva: z.string().trim().max(60).optional(),
  sede: z.string().trim().max(300).optional(),
  settore: z.string().trim().max(300).optional(),
  addetti: z.string().trim().max(60).optional(),
  obbligo: z.enum(TITOLI_OBBLIGO).nullable().optional(),
  mogAdottato: z.enum(SI_NO).nullable().optional(),
  canaleCondiviso: z.enum(SI_NO).nullable().optional(),
  gestoreTipo: z.enum(CONFIGURAZIONI_GESTORE).nullable().optional(),
  gestore: z.string().trim().max(300).optional(),
  sostituto: z.string().trim().max(300).optional(),
  nomina: dataIsoSchema.optional(),
  organoIndirizzo: z.string().trim().max(300).optional(),
  organoControllo: z.string().trim().max(300).optional(),
  dpo: z.string().trim().max(300).optional(),
  consultazioneSindacale: dataIsoSchema.optional(),
  dataAdozione: dataIsoSchema.optional(),
  revisione: z.string().trim().max(60).optional(),
  note: z.string().trim().max(4000).optional(),
});
export type ProfiloAssetto = z.infer<typeof profiloAssettoSchema>;

// ─── Il canale ───────────────────────────────────────────────────────────────

export const nuovoCanaleSchema = z.object({
  forma: z.enum(FORME_CANALE),
  descrizione: z.string().trim().max(500).optional(),
});

export const campoCanaleSchema = z.discriminatedUnion("campo", [
  z.object({ campo: z.literal("attiva"), valore: z.boolean() }),
  z.object({ campo: z.literal("descrizione"), valore: testo(500) }),
  z.object({ campo: z.literal("fornitore"), valore: testo(300) }),
  z.object({ campo: z.literal("riservatezza"), valore: testo(2000) }),
  z.object({ campo: z.literal("attivatoIl"), valore: data }),
  z.object({ campo: z.literal("note"), valore: testo(2000) }),
]);

// ─── Il fascicolo ────────────────────────────────────────────────────────────

/**
 * I campi del fascicolo, ciascuno col proprio dominio.
 *
 * ⚠️ SI MANDA UN CAMPO PER VOLTA, e lo pretende `unSoloCampo` qui sotto. Non è
 * pedanteria: la scheda della segnalazione è una maschera grande con un pannello che
 * ricalcola ammissibilità, rischio di ritorsione e termini a ogni tocco — cioè
 * esattamente la forma in cui questo progetto ha già preso lo stesso difetto tre volte
 * (materialità in F7, costi dell'energetico in F12, e prima ancora i punteggi
 * fornitore). Rimandare la riga intera da props stantie azzera il campo salvato un
 * attimo prima. Qui la regola non è una convenzione: è un rifiuto.
 */
export const campiFascicolo = {
  // Ricezione
  dataRicezione: data,
  canale: scelta(CANALI_RICEZIONE),
  anonima: z.boolean(),
  qualita: scelta(QUALITA_SEGNALANTE),
  ambito: scelta(AMBITI),
  oggetto: testo(2000),
  fatti: testo(20000),
  quando: testo(2000),
  dove: testo(2000),
  coinvolti: testo(4000),
  elementi: testo(4000),
  altrove: scelta(["No", "Sì, internamente", "Sì, ad ANAC", "Sì, ad altra autorità"] as const),
  incontroRichiesto: scelta(["No", "Sì, fissato", "Sì, da fissare"] as const),

  // Identificazione
  codice: testo(120),
  recapito: scelta(SI_NO),
  consensoRegistrazione: scelta(["Non applicabile", "Prestato", "Negato"] as const),
  verbaleConfermato: scelta(["Non applicabile", "Sì", "No"] as const),

  // Termini di legge
  avvisoReso: data,
  riscontroReso: data,
  comunicazioneStato: scelta(["Non necessaria", "Resa", "Dovuta e non resa"] as const),
  stato: z.enum(STATI_FASCICOLO),

  // Ammissibilità
  ammOggetto: scelta(SI_NO),
  ammLegittimato: scelta(SI_NO),
  ammContesto: scelta(SI_NO),
  ammElementi: scelta(SI_NO),
  ammNonPersonale: scelta(SI_NO),
  ammMotivazione: testo(4000),
  ammAlternativi: testo(2000),
  integrazioneChiesta: data,
  integrazioneRicevuta: data,

  // Incompatibilità del gestore
  conflitto: scelta(SI_NO),
  subentrante: testo(300),
  conflittoMotivo: testo(2000),

  // Istruttoria
  piano: testo(8000),
  rischiRiconoscibilita: testo(4000),
  avvio: data,
  conclusione: data,
  attivita: testo(8000),
  personaSentita: scelta(["No", "Sì", "Non applicabile"] as const),
  audizioni: z.number().int().min(0).max(999).nullable(),
  evidenze: testo(8000),
  esito: scelta(ESITI),
  rilevanzaPenale: scelta(["No", "Sì, valutata la denuncia", "Sì, denuncia effettuata"] as const),
  motivazione: testo(8000),
  fattiNonAccertati: testo(4000),
  proposteDisciplinari: testo(4000),
  proposteCorrettive: testo(4000),
  destinatariRelazione: scelta([
    "Organo di indirizzo",
    "Organo di controllo",
    "Organismo di vigilanza",
    "Organo di controllo e OdV",
  ] as const),
  contenutoRiscontro: testo(8000),

  // Rischio di ritorsione
  ritIdentitaConoscibile: scelta(SI_NO),
  ritSovraordinato: scelta(SI_NO),
  ritContestoRistretto: scelta(SI_NO),
  ritPrecedenti: scelta(SI_NO),
  ritRapportoPrecario: scelta(SI_NO),
  ritGiaEsposto: scelta(SI_NO),
  monitoraggioAperto: scelta(SI_NO),
  monitoraggioFino: data,
  monitoraggioPeriodicita: scelta(["Mensile", "Trimestrale", "Semestrale"] as const),
  soggettiTutelati: testo(4000),
  misurePreventive: testo(4000),
  rilevazioniMonitoraggio: testo(8000),

  // Riservatezza dell'identità
  identitaRivelata: scelta(SI_NO),
  consensoRivelazione: scelta(["Non necessario", "Sì", "Negato"] as const),
  rivelazioneRagioni: testo(4000),
  rivelazioneEffetti: testo(4000),

  // Conservazione
  dataChiusura: data,
  cancellata: scelta(SI_NO),
  dataCancellazione: data,
  prorogaMotivo: testo(4000),
} as const;

/**
 * Una modifica al fascicolo: esattamente un campo.
 *
 * `.strict()` non è decorativo — una server action è un endpoint HTTP, e senza di esso
 * una chiave `organizationId` mandata dal client verrebbe silenziosamente scartata
 * invece che rifiutata. Scartata va bene finché nessuno la usa: rifiutata resta vero
 * anche dopo.
 */
export const campoFascicoloSchema = z
  .object(campiFascicolo)
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length === 1, {
    message: "Si aggiorna un campo per volta: la scheda non rimanda mai la riga intera",
  });

export type CampoFascicolo = keyof typeof campiFascicolo;

export const nuovoFascicoloSchema = z.object({
  dataRicezione: dataIsoSchema,
  canale: z.enum(CANALI_RICEZIONE),
  anonima: z.boolean().default(false),
});

// ─── I requisiti ─────────────────────────────────────────────────────────────

export const requisitoSchema = z.object({
  requirementKey: z.string().trim().min(1).max(40),
  campo: z.enum(["stato", "note", "evidenza"]),
  valore: z.union([z.enum(STATI_REQUISITO), z.string().trim().max(4000), z.null()]),
});
