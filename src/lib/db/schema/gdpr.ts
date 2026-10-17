import { boolean, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, date } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { company } from "./tenancy";
import { contentSet } from "./content";

// Protezione dei dati personali — Reg. (UE) 2016/679 e D.Lgs. 196/2003.
//
// Dal prototipo `aggiuntenuovimoduli/percorso-gdpr-v1.html`. I cataloghi si estraggono
// ESEGUENDOLO (`scripts/extract-gdpr.mjs`) e si congelano nel content set `gdpr-v1`.
//
// ⚠️ La radice `gdpr_system` e' UNA PER AZIENDA, come SGI QAS, SA8000 e NIS2: la conformita'
// e' una fotografia che si revisiona, non un esercizio. Gli esercizi esistono lo stesso,
// ma stanno nelle DATE delle registrazioni e nell'anno delle misure.
//
// ⚠️ Solo la radice porta `company_id`; le tabelle figlie portano `organization_id` (per la
// policy) e `system_id`. E' lo schema di SGI QAS, e significa che il trigger
// `azienda_scrivibile` vale sulla radice: un'azienda archiviata non avvia il percorso.
//
// ⚠️ NIENTE NOMINATIVI nei registri. Come nel modulo Segnalazioni nessuna colonna porta il
// nome di un interessato: un riferimento interno e le note. Il prototipo lo raccomandava
// in una riga di guida; qui lo dice lo schema.

// ─── Cataloghi del content set ──────────────────────────────────────────────

const catalogo = () => ({
  id: text("id").primaryKey(),
  setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
  key: text("key").notNull(),
  ordine: integer("ordine").notNull(),
});

/** I dodici gruppi di requisiti, ciascuno con la sua guida. */
export const gdprGruppo = pgTable(
  "gdpr_gruppo",
  {
    ...catalogo(),
    nome: text("nome").notNull(),
    riferimento: text("riferimento").notNull(),
    definizione: text("definizione").notNull(),
    /** «Che cosa viene verificato»: tre voci per gruppo. */
    verifiche: text("verifiche").array().notNull(),
    evidenze: text("evidenze").notNull(),
    attenzione: text("attenzione").notNull(),
  },
  (t) => [uniqueIndex("gdpr_gruppo_set_key_uq").on(t.setId, t.key)],
);

/** I 99 requisiti. La chiave (`P-01`…) e' scritta nel seme, non derivata dalla posizione. */
export const gdprRequisito = pgTable(
  "gdpr_requisito",
  {
    ...catalogo(),
    gruppoKey: text("gruppo_key").notNull(),
    riferimento: text("riferimento").notNull(),
    testo: text("testo").notNull(),
  },
  (t) => [uniqueIndex("gdpr_requisito_set_key_uq").on(t.setId, t.key), index("gdpr_requisito_gruppo_idx").on(t.setId, t.gruppoKey)],
);

/** I nove criteri di vaglio per la valutazione d'impatto (art. 35). */
export const gdprCriterio = pgTable(
  "gdpr_criterio",
  { ...catalogo(), testo: text("testo").notNull() },
  (t) => [uniqueIndex("gdpr_criterio_set_key_uq").on(t.setId, t.key)],
);

/** Gli undici trattamenti ricorrenti, gia' impostati: un punto di partenza da adattare. */
export const gdprTrattamentoTipo = pgTable(
  "gdpr_trattamento_tipo",
  {
    ...catalogo(),
    nome: text("nome").notNull(),
    finalita: text("finalita").notNull(),
    base: text("base").notNull(),
    interessati: text("interessati").notNull(),
    dati: text("dati").notNull(),
    particolari: boolean("particolari").notNull(),
    condizione9: text("condizione9").notNull(),
    destinatari: text("destinatari").notNull(),
    conservazione: text("conservazione").notNull(),
    criteri: text("criteri").array().notNull(),
  },
  (t) => [uniqueIndex("gdpr_trattamento_tipo_set_key_uq").on(t.setId, t.key)],
);

/** Le due scale da 1 a 5: probabilità e gravità per l'interessato. */
export const gdprScala = pgTable(
  "gdpr_scala",
  {
    ...catalogo(),
    asse: text("asse", { enum: ["probabilita", "gravita"] }).notNull(),
    valore: integer("valore").notNull(),
    nome: text("nome").notNull(),
    descrizione: text("descrizione").notNull(),
  },
  (t) => [uniqueIndex("gdpr_scala_set_key_uq").on(t.setId, t.key)],
);

/** Le quattro sezioni degli indicatori. */
export const gdprSezione = pgTable(
  "gdpr_sezione",
  { ...catalogo(), nome: text("nome").notNull(), riferimento: text("riferimento").notNull() },
  (t) => [uniqueIndex("gdpr_sezione_set_key_uq").on(t.setId, t.key)],
);

/** I ventidue indicatori. La chiave e' quella che il motore usa per i derivati. */
export const gdprIndicatore = pgTable(
  "gdpr_indicatore",
  {
    ...catalogo(),
    sezioneKey: text("sezione_key").notNull(),
    nome: text("nome").notNull(),
    unita: text("unita").notNull(),
    aiuto: text("aiuto"),
  },
  (t) => [uniqueIndex("gdpr_indicatore_set_key_uq").on(t.setId, t.key)],
);

/** L'elenco tipo dei documenti del sistema: quindici voci ricorrenti. */
export const gdprDocumentoTipo = pgTable(
  "gdpr_documento_tipo",
  { ...catalogo(), tipo: text("tipo").notNull(), oggetto: text("oggetto").notNull() },
  (t) => [uniqueIndex("gdpr_documento_tipo_set_key_uq").on(t.setId, t.key)],
);

/** Il piano tipo: quindici attività ricorrenti nei dodici mesi. */
export const gdprAttivitaTipo = pgTable(
  "gdpr_attivita_tipo",
  {
    ...catalogo(),
    mese: integer("mese").notNull(),
    riferimento: text("riferimento").notNull(),
    attivita: text("attivita").notNull(),
  },
  (t) => [uniqueIndex("gdpr_attivita_tipo_set_key_uq").on(t.setId, t.key)],
);

/** I nove contenuti attesi della politica. */
export const gdprContenutoPolitica = pgTable(
  "gdpr_contenuto_politica",
  { ...catalogo(), testo: text("testo").notNull() },
  (t) => [uniqueIndex("gdpr_contenuto_politica_set_key_uq").on(t.setId, t.key)],
);

/** Testi lunghi del catalogo: oggi il solo modello di politica, col segnaposto `{nome}`. */
export const gdprTesto = pgTable(
  "gdpr_testo",
  { ...catalogo(), testo: text("testo").notNull() },
  (t) => [uniqueIndex("gdpr_testo_set_key_uq").on(t.setId, t.key)],
);

// ─── Tabelle tenant ─────────────────────────────────────────────────────────

const figlia = () => ({
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  systemId: text("system_id").notNull().references(() => gdprSystem.id, { onDelete: "cascade" }),
});

/**
 * Il percorso di un'azienda: profilo del titolare, obbligo del responsabile della
 * protezione dei dati, parametri di classificazione e politica.
 *
 * ⚠️ Si crea SOLO col comando «Avvia il percorso», mai aprendo la pagina: un'azienda
 * archiviata si consulta e non scrive, e una pagina che creasse la propria radice
 * all'apertura si romperebbe proprio li'.
 */
export const gdprSystem = pgTable(
  "gdpr_system",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
    contentSetId: text("content_set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),

    forma: text("forma"),
    piva: text("piva"),
    sede: text("sede"),
    settore: text("settore"),
    ateco: text("ateco"),
    dipendenti: text("dipendenti"),
    siti: text("siti"),
    ruolo: text("ruolo"),
    legale: text("legale"),
    referente: text("referente"),
    contatto: text("contatto"),
    /** «Sì» / «No»: ci sono amministratori di sistema, interni o esterni. */
    amministratori: text("amministratori"),

    /** Le tre domande dell'art. 37.1: «Sì» / «No». */
    dpoA: text("dpo_a"),
    dpoB: text("dpo_b"),
    dpoC: text("dpo_c"),
    dpoNome: text("dpo_nome"),
    dpoContatti: text("dpo_contatti"),
    dpoComunicatoIl: date("dpo_comunicato_il"),

    /** Soglie di classificazione: rischio alto e medio da (P × G), criteri per la DPIA. */
    paramAlto: integer("param_alto").notNull().default(15),
    paramMedio: integer("param_medio").notNull().default(8),
    paramSogliaDpia: integer("param_soglia_dpia").notNull().default(2),

    politicaTesto: text("politica_testo"),
    /** Chiavi dei contenuti attesi spuntati: `array_append` / `array_remove`. */
    politicaContenuti: text("politica_contenuti").array().notNull().default([]),
    politicaApprovataIl: date("politica_approvata_il"),
    politicaFirma: text("politica_firma"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("gdpr_system_company_uq").on(t.companyId), index("gdpr_system_org_idx").on(t.organizationId)],
);

/** Un trattamento del registro dell'art. 30, con il suo vaglio e la sua DPIA. */
export const gdprTrattamento = pgTable(
  "gdpr_trattamento",
  {
    ...figlia(),
    nome: text("nome").notNull().default(""),
    ruolo: text("ruolo").notNull().default("Titolare"),
    funzione: text("funzione"),
    finalita: text("finalita"),
    base: text("base"),
    bilanciamento: text("bilanciamento"),
    interessati: text("interessati"),
    destinatari: text("destinatari"),
    dati: text("dati"),
    particolari: boolean("particolari").notNull().default(false),
    condizione9: text("condizione9"),
    giudiziari: boolean("giudiziari").notNull().default(false),
    trasferimento: boolean("trasferimento").notNull().default(false),
    trasferimentoDettaglio: text("trasferimento_dettaglio"),
    conservazione: text("conservazione"),
    sistemi: text("sistemi"),
    misure: text("misure"),
    /** Chiavi dei criteri di vaglio presenti. */
    criteri: text("criteri").array().notNull().default([]),
    probabilita: integer("probabilita"),
    gravita: integer("gravita"),
    mitigazione: text("mitigazione"),
    dpiaStato: text("dpia_stato").notNull().default("Da avviare"),
    dpiaData: date("dpia_data"),
    dpiaNecessita: text("dpia_necessita"),
    dpiaParere: text("dpia_parere"),
    dpiaEsito: text("dpia_esito"),
    /** Da quale voce del catalogo e' nato: l'aggiunta dal catalogo e' idempotente. */
    tipoKey: text("tipo_key"),
    /** Proposto all'avvio (migrazione 0069) e non ancora toccato: il motivo. */
    propostaMotivo: text("proposta_motivo"),
    ordine: integer("ordine").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("gdpr_trattamento_system_idx").on(t.systemId),
    index("gdpr_trattamento_org_idx").on(t.organizationId),
    uniqueIndex("gdpr_trattamento_tipo_uq").on(t.systemId, t.tipoKey),
  ],
);

/** Lo stato di un requisito. Una riga solo per quelli toccati. */
export const gdprRequisitoStato = pgTable(
  "gdpr_requisito_stato",
  {
    ...figlia(),
    requisitoKey: text("requisito_key").notNull(),
    stato: text("stato"),
    evidenza: text("evidenza"),
    azione: text("azione"),
    responsabile: text("responsabile"),
    scadenza: date("scadenza"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("gdpr_requisito_stato_uq").on(t.systemId, t.requisitoKey), index("gdpr_requisito_stato_org_idx").on(t.organizationId)],
);

/** Un fornitore che tratta dati per conto dell'organizzazione, e il suo trasferimento. */
export const gdprFornitore = pgTable(
  "gdpr_fornitore",
  {
    ...figlia(),
    nome: text("nome").notNull().default(""),
    servizio: text("servizio"),
    qualifica: text("qualifica").notNull().default("Responsabile (art. 28)"),
    paese: text("paese"),
    contratto: text("contratto"),
    garanzia: text("garanzia"),
    verificatoIl: date("verificato_il"),
    esito: text("esito"),
    ordine: integer("ordine").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gdpr_fornitore_system_idx").on(t.systemId), index("gdpr_fornitore_org_idx").on(t.organizationId)],
);

/** L'inventario dei documenti del sistema: versione, adozione, revisione, stato. */
export const gdprDocumento = pgTable(
  "gdpr_documento",
  {
    ...figlia(),
    tipo: text("tipo").notNull(),
    oggetto: text("oggetto").notNull().default(""),
    versione: text("versione").notNull().default("1.0"),
    adottatoIl: date("adottato_il"),
    revisioneIl: date("revisione_il"),
    stato: text("stato").notNull().default("Da redigere"),
    /** Voce dell'elenco tipo da cui e' nato: «carica elenco tipo» e' idempotente. */
    tipoKey: text("tipo_key"),
    ordine: integer("ordine").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("gdpr_documento_system_idx").on(t.systemId),
    index("gdpr_documento_org_idx").on(t.organizationId),
    uniqueIndex("gdpr_documento_tipo_uq").on(t.systemId, t.tipoKey),
  ],
);

/** Un'attivita' del piano annuale. */
export const gdprAttivita = pgTable(
  "gdpr_attivita",
  {
    ...figlia(),
    mese: integer("mese").notNull(),
    attivita: text("attivita").notNull().default(""),
    riferimento: text("riferimento"),
    responsabile: text("responsabile"),
    stato: text("stato").notNull().default("Da fare"),
    tipoKey: text("tipo_key"),
    ordine: integer("ordine").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("gdpr_attivita_system_idx").on(t.systemId),
    index("gdpr_attivita_org_idx").on(t.organizationId),
    uniqueIndex("gdpr_attivita_tipo_uq").on(t.systemId, t.tipoKey),
  ],
);

/**
 * Il valore di un indicatore in un esercizio.
 *
 * ⚠️ NUMERIC, mai float, e NULL quando non si conosce: il prototipo leggeva un campo vuoto
 * come zero, e «formati: vuoto» diventava «0% di formati». Una riga senza valore non
 * esiste: svuotare il campo cancella la riga.
 */
export const gdprMisura = pgTable(
  "gdpr_misura",
  {
    ...figlia(),
    anno: integer("anno").notNull(),
    indicatoreKey: text("indicatore_key").notNull(),
    valore: numeric("valore").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("gdpr_misura_uq").on(t.systemId, t.anno, t.indicatoreKey), index("gdpr_misura_org_idx").on(t.organizationId)],
);

/** Registro delle richieste degli interessati (artt. 12, 15–22). */
export const gdprRichiesta = pgTable(
  "gdpr_richiesta",
  {
    ...figlia(),
    ricevutaIl: date("ricevuta_il"),
    diritto: text("diritto").notNull().default("Accesso (art. 15)"),
    riferimento: text("riferimento"),
    canale: text("canale"),
    trattamento: text("trattamento"),
    proroga: boolean("proroga").notNull().default(false),
    riscontroIl: date("riscontro_il"),
    esito: text("esito").notNull().default("In lavorazione"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gdpr_richiesta_system_idx").on(t.systemId), index("gdpr_richiesta_org_idx").on(t.organizationId)],
);

/**
 * Registro delle violazioni (artt. 33–34).
 *
 * ⚠️ `conoscenza_il` e `notificata_il` sono ISTANTI: dalla conoscenza decorrono 72 ore, e
 * con una data secca l'ora si perde.
 */
export const gdprViolazione = pgTable(
  "gdpr_violazione",
  {
    ...figlia(),
    conoscenzaIl: timestamp("conoscenza_il", { withTimezone: true }),
    natura: text("natura").notNull().default("Riservatezza"),
    interessati: integer("interessati"),
    rischio: text("rischio"),
    descrizione: text("descrizione"),
    categorie: text("categorie"),
    notificataIl: timestamp("notificata_il", { withTimezone: true }),
    comunicataIl: date("comunicata_il"),
    chiusaIl: date("chiusa_il"),
    valutazione: text("valutazione"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gdpr_violazione_system_idx").on(t.systemId), index("gdpr_violazione_org_idx").on(t.organizationId)],
);

/** Registro della formazione. */
export const gdprFormazione = pgTable(
  "gdpr_formazione",
  {
    ...figlia(),
    data: date("data"),
    tema: text("tema"),
    destinatari: text("destinatari"),
    docente: text("docente"),
    partecipanti: integer("partecipanti"),
    ore: numeric("ore"),
    apprendimento: text("apprendimento"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gdpr_formazione_system_idx").on(t.systemId), index("gdpr_formazione_org_idx").on(t.organizationId)],
);

/** Registro degli audit e delle verifiche. */
export const gdprVerifica = pgTable(
  "gdpr_verifica",
  {
    ...figlia(),
    data: date("data"),
    tipo: text("tipo").notNull().default("Audit interno"),
    ambito: text("ambito"),
    svoltaDa: text("svolta_da"),
    stato: text("stato").notNull().default("Pianificato"),
    rilievi: integer("rilievi"),
    sintesi: text("sintesi"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gdpr_verifica_system_idx").on(t.systemId), index("gdpr_verifica_org_idx").on(t.organizationId)],
);

/** Registro delle verifiche annuali sugli amministratori di sistema. */
export const gdprVerificaAds = pgTable(
  "gdpr_verifica_ads",
  {
    ...figlia(),
    data: date("data"),
    amministratore: text("amministratore"),
    ambito: text("ambito"),
    registrazioniConservate: text("registrazioni_conservate"),
    esito: text("esito"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gdpr_verifica_ads_system_idx").on(t.systemId), index("gdpr_verifica_ads_org_idx").on(t.organizationId)],
);

/** Registro del riesame annuale della direzione. */
export const gdprRiesame = pgTable(
  "gdpr_riesame",
  {
    ...figlia(),
    data: date("data"),
    partecipanti: text("partecipanti"),
    relazione: text("relazione"),
    adeguatezza: text("adeguatezza"),
    miglioramento: text("miglioramento"),
    azioni: text("azioni"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gdpr_riesame_system_idx").on(t.systemId), index("gdpr_riesame_org_idx").on(t.organizationId)],
);
