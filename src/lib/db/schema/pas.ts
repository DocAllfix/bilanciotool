import { boolean, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, date } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { company } from "./tenancy";
import { contentSet } from "./content";

// Sistema di gestione sociale — PAS 24000:2022.
//
// Dal prototipo `aggiuntenuovimoduli/percorso-pas24000-v1.html`. I cataloghi si estraggono
// ESEGUENDOLO (`scripts/extract-pas.mjs`) e si congelano nel content set `pas-v1`.
//
// ⚠️ La radice `pas_system` e' UNA PER AZIENDA, come GDPR, SGI QAS, SA8000 e NIS2: il sistema
// e' una fotografia che si revisiona, non un esercizio. Gli esercizi esistono lo stesso, ma
// stanno nelle DATE delle registrazioni e nell'anno delle misure.
//
// ⚠️ Solo la radice porta `company_id`; le tabelle figlie portano `organization_id` (per la
// policy) e `system_id`. E' lo schema di GDPR e SGI QAS: il trigger `azienda_scrivibile` vale
// sulla radice, e per le figlie un'azienda archiviata si ferma in `pretendiSistema`.
//
// ⚠️ NIENTE NOMINATIVI nei registri. Il registro dei reclami porta l'avviso del prototipo
// (A.10: la riservatezza e' un requisito), e nessuna colonna e' fatta per il nome di chi
// segnala. Nei documenti pubblicati dei registri entrano solo conteggi e date.

// ─── Cataloghi del content set ──────────────────────────────────────────────

const catalogo = () => ({
  id: text("id").primaryKey(),
  setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
  key: text("key").notNull(),
  ordine: integer("ordine").notNull(),
});

/** I diciotto gruppi: sette clausole di sistema e undici aree dell'Allegato A, con la guida. */
export const pasGruppo = pgTable(
  "pas_gruppo",
  {
    ...catalogo(),
    /** «sistema» (clausole 4–10) o «allegato» (Allegato A, che non ammette esclusioni). */
    natura: text("natura", { enum: ["sistema", "allegato"] }).notNull(),
    nome: text("nome").notNull(),
    riferimento: text("riferimento").notNull(),
    definizione: text("definizione").notNull(),
    /** «Che cosa guarda l'auditor»: tre voci per gruppo. */
    verifiche: text("verifiche").array().notNull(),
    evidenze: text("evidenze").notNull(),
    attenzione: text("attenzione").notNull(),
  },
  (t) => [uniqueIndex("pas_gruppo_set_key_uq").on(t.setId, t.key)],
);

/** I 98 requisiti in sintesi operativa. La chiave (`4.1`, `A.2-9`) e' quella del prototipo. */
export const pasRequisito = pgTable(
  "pas_requisito",
  {
    ...catalogo(),
    gruppoKey: text("gruppo_key").notNull(),
    riferimento: text("riferimento").notNull(),
    testo: text("testo").notNull(),
  },
  (t) => [uniqueIndex("pas_requisito_set_key_uq").on(t.setId, t.key), index("pas_requisito_gruppo_idx").on(t.setId, t.gruppoKey)],
);

/** Le otto parti interessate ricorrenti: l'avvio del percorso le copia, poi si adattano. */
export const pasParteTipo = pgTable(
  "pas_parte_tipo",
  {
    ...catalogo(),
    nome: text("nome").notNull(),
    esigenze: text("esigenze").notNull(),
    obbligo: boolean("obbligo").notNull(),
    coinvolgimento: text("coinvolgimento").notNull(),
  },
  (t) => [uniqueIndex("pas_parte_tipo_set_key_uq").on(t.setId, t.key)],
);

/** I venti rischi sociali ricorrenti: l'avvio del percorso li copia, poi si valutano. */
export const pasRischioTipo = pgTable(
  "pas_rischio_tipo",
  {
    ...catalogo(),
    area: text("area").notNull(),
    ambito: text("ambito", { enum: ["O", "F"] }).notNull(),
    testo: text("testo").notNull(),
  },
  (t) => [uniqueIndex("pas_rischio_tipo_set_key_uq").on(t.setId, t.key)],
);

/** Le due scale da 1 a 5: probabilità e gravità per le persone. */
export const pasScala = pgTable(
  "pas_scala",
  {
    ...catalogo(),
    asse: text("asse", { enum: ["probabilita", "gravita"] }).notNull(),
    valore: integer("valore").notNull(),
    nome: text("nome").notNull(),
    descrizione: text("descrizione").notNull(),
  },
  (t) => [uniqueIndex("pas_scala_set_key_uq").on(t.setId, t.key)],
);

/** Le sei sezioni degli indicatori. */
export const pasSezione = pgTable(
  "pas_sezione",
  { ...catalogo(), nome: text("nome").notNull(), riferimento: text("riferimento").notNull() },
  (t) => [uniqueIndex("pas_sezione_set_key_uq").on(t.setId, t.key)],
);

/** I trentacinque indicatori. La chiave e' quella che il motore usa per i derivati. */
export const pasIndicatore = pgTable(
  "pas_indicatore",
  {
    ...catalogo(),
    sezioneKey: text("sezione_key").notNull(),
    nome: text("nome").notNull(),
    unita: text("unita").notNull(),
    aiuto: text("aiuto"),
  },
  (t) => [uniqueIndex("pas_indicatore_set_key_uq").on(t.setId, t.key)],
);

/** Il piano tipo: sedici attività ricorrenti nei dodici mesi. */
export const pasAttivitaTipo = pgTable(
  "pas_attivita_tipo",
  {
    ...catalogo(),
    mese: integer("mese").notNull(),
    riferimento: text("riferimento").notNull(),
    attivita: text("attivita").notNull(),
  },
  (t) => [uniqueIndex("pas_attivita_tipo_set_key_uq").on(t.setId, t.key)],
);

/** I nove contenuti attesi della politica sociale (5.2). */
export const pasContenutoPolitica = pgTable(
  "pas_contenuto_politica",
  { ...catalogo(), testo: text("testo").notNull() },
  (t) => [uniqueIndex("pas_contenuto_politica_set_key_uq").on(t.setId, t.key)],
);

/** Testi lunghi del catalogo: oggi il solo modello di politica, col segnaposto `{nome}`. */
export const pasTesto = pgTable(
  "pas_testo",
  { ...catalogo(), testo: text("testo").notNull() },
  (t) => [uniqueIndex("pas_testo_set_key_uq").on(t.setId, t.key)],
);

// ─── Tabelle tenant ─────────────────────────────────────────────────────────

const figlia = () => ({
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  systemId: text("system_id").notNull().references(() => pasSystem.id, { onDelete: "cascade" }),
});

const creata = () => ({ createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });

/**
 * Il percorso di un'azienda: profilo, campo di applicazione e ruoli, parametri, politica.
 *
 * ⚠️ Si crea SOLO col comando «Avvia il percorso», mai aprendo la pagina: un'azienda
 * archiviata si consulta e non scrive, e una pagina che creasse la propria radice
 * all'apertura si romperebbe proprio li'.
 */
export const pasSystem = pgTable(
  "pas_system",
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
    /** Il contratto collettivo applicato: termine di confronto per paghe, orari, disciplina. */
    ccnl: text("ccnl"),
    siti: text("siti"),
    /** Il campo di applicazione (4.3): deve comprendere anche somministrati e appaltatori. */
    campo: text("campo"),
    direzione: text("direzione"),
    /** Il responsabile del sistema di gestione sociale (5.3). */
    responsabile: text("responsabile"),
    rappresentanti: text("rappresentanti"),
    contatto: text("contatto"),

    /** Le soglie con cui si leggono i dati: i limiti della PAS, piu' stretti se legge o CCNL lo sono. */
    paramOreOrdinarie: integer("param_ore_ordinarie").notNull().default(48),
    paramOreTotali: integer("param_ore_totali").notNull().default(60),
    paramSettimane: integer("param_settimane").notNull().default(46),
    paramAlto: integer("param_alto").notNull().default(15),
    paramMedio: integer("param_medio").notNull().default(8),
    paramGiorniReclamo: integer("param_giorni_reclamo").notNull().default(30),

    politicaTesto: text("politica_testo"),
    /** Chiavi dei contenuti attesi spuntati: `array_append` / `array_remove`. */
    politicaContenuti: text("politica_contenuti").array().notNull().default([]),
    politicaApprovataIl: date("politica_approvata_il"),
    politicaFirma: text("politica_firma"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pas_system_company_uq").on(t.companyId), index("pas_system_org_idx").on(t.organizationId)],
);

/** Un fattore interno o esterno del contesto (4.1). */
export const pasFattore = pgTable(
  "pas_fattore",
  {
    ...figlia(),
    tipo: text("tipo").notNull().default("Esterno"),
    descrizione: text("descrizione").notNull().default(""),
    effetto: text("effetto").notNull().default("Rischio"),
    ordine: integer("ordine").notNull().default(0),
    ...creata(),
  },
  (t) => [index("pas_fattore_system_idx").on(t.systemId), index("pas_fattore_org_idx").on(t.organizationId)],
);

/** Una parte interessata (4.2). */
export const pasParte = pgTable(
  "pas_parte",
  {
    ...figlia(),
    nome: text("nome").notNull().default(""),
    esigenze: text("esigenze").notNull().default(""),
    /** L'esigenza e' o puo' diventare un obbligo. */
    obbligo: boolean("obbligo").notNull().default(false),
    /** Il sistema sceglie di gestirla. */
    gestita: boolean("gestita").notNull().default(true),
    coinvolgimento: text("coinvolgimento").notNull().default(""),
    /** Da quale voce del catalogo e' nata: l'avvio e' idempotente. */
    tipoKey: text("tipo_key"),
    ordine: integer("ordine").notNull().default(0),
    ...creata(),
  },
  (t) => [
    index("pas_parte_system_idx").on(t.systemId),
    index("pas_parte_org_idx").on(t.organizationId),
    uniqueIndex("pas_parte_tipo_uq").on(t.systemId, t.tipoKey),
  ],
);

/** Lo stato di un requisito. Una riga solo per quelli toccati. */
export const pasRequisitoStato = pgTable(
  "pas_requisito_stato",
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
  (t) => [uniqueIndex("pas_requisito_stato_uq").on(t.systemId, t.requisitoKey), index("pas_requisito_stato_org_idx").on(t.organizationId)],
);

/** Un rischio sociale dell'inventario (6.1.1, A.1 · 1). */
export const pasRischio = pgTable(
  "pas_rischio",
  {
    ...figlia(),
    area: text("area").notNull().default("A1"),
    ambito: text("ambito").notNull().default("O"),
    testo: text("testo").notNull().default(""),
    probabilita: integer("probabilita"),
    gravita: integer("gravita"),
    misure: text("misure"),
    responsabile: text("responsabile"),
    tipoKey: text("tipo_key"),
    ordine: integer("ordine").notNull().default(0),
    ...creata(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pas_rischio_system_idx").on(t.systemId),
    index("pas_rischio_org_idx").on(t.organizationId),
    uniqueIndex("pas_rischio_tipo_uq").on(t.systemId, t.tipoKey),
  ],
);

/** Un fornitore della due diligence (8.1.3). */
export const pasFornitore = pgTable(
  "pas_fornitore",
  {
    ...figlia(),
    nome: text("nome").notNull().default(""),
    categoria: text("categoria").notNull().default("Materie prime"),
    paese: text("paese").notNull().default("Italia"),
    rischio: text("rischio"),
    clausola: boolean("clausola").notNull().default(false),
    questionario: boolean("questionario").notNull().default(false),
    verificatoIl: date("verificato_il"),
    esito: text("esito"),
    ordine: integer("ordine").notNull().default(0),
    ...creata(),
  },
  (t) => [index("pas_fornitore_system_idx").on(t.systemId), index("pas_fornitore_org_idx").on(t.organizationId)],
);

/** Un obiettivo di prestazione sociale (6.2). */
export const pasObiettivo = pgTable(
  "pas_obiettivo",
  {
    ...figlia(),
    obiettivo: text("obiettivo").notNull().default(""),
    area: text("area").notNull().default("A6"),
    indicatore: text("indicatore"),
    traguardo: text("traguardo"),
    scadenza: date("scadenza"),
    responsabile: text("responsabile"),
    risorse: text("risorse"),
    stato: text("stato").notNull().default("In corso"),
    ordine: integer("ordine").notNull().default(0),
    ...creata(),
  },
  (t) => [index("pas_obiettivo_system_idx").on(t.systemId), index("pas_obiettivo_org_idx").on(t.organizationId)],
);

/** Un'attivita' del piano di lavoro annuale (8.1.2). */
export const pasAttivita = pgTable(
  "pas_attivita",
  {
    ...figlia(),
    mese: integer("mese").notNull(),
    attivita: text("attivita").notNull().default(""),
    riferimento: text("riferimento"),
    responsabile: text("responsabile"),
    stato: text("stato").notNull().default("Da fare"),
    tipoKey: text("tipo_key"),
    ordine: integer("ordine").notNull().default(0),
    ...creata(),
  },
  (t) => [
    index("pas_attivita_system_idx").on(t.systemId),
    index("pas_attivita_org_idx").on(t.organizationId),
    uniqueIndex("pas_attivita_tipo_uq").on(t.systemId, t.tipoKey),
  ],
);

/**
 * Il valore di un indicatore in un esercizio.
 *
 * ⚠️ NUMERIC, mai float, e nessuna riga quando non si conosce: il prototipo leggeva un campo
 * vuoto come zero, e un ingresso mancante produceva un divario di genere del 100%. Svuotare il
 * campo cancella la riga.
 */
export const pasMisura = pgTable(
  "pas_misura",
  {
    ...figlia(),
    anno: integer("anno").notNull(),
    indicatoreKey: text("indicatore_key").notNull(),
    valore: numeric("valore").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pas_misura_uq").on(t.systemId, t.anno, t.indicatoreKey), index("pas_misura_org_idx").on(t.organizationId)],
);

// ─── Registri ───────────────────────────────────────────────────────────────

/** Reclami e segnalazioni (A.10, 10.2). Nessun dato che identifichi chi segnala. */
export const pasReclamo = pgTable(
  "pas_reclamo",
  {
    ...figlia(),
    data: date("data"),
    canale: text("canale"),
    provenienza: text("provenienza"),
    area: text("area"),
    oggetto: text("oggetto"),
    istruttoria: text("istruttoria"),
    responsabile: text("responsabile"),
    chiusoIl: date("chiuso_il"),
    esito: text("esito").notNull().default("In istruttoria"),
    ...creata(),
  },
  (t) => [index("pas_reclamo_system_idx").on(t.systemId), index("pas_reclamo_org_idx").on(t.organizationId)],
);

/** Non conformità e azioni correttive (10.2), fino alla verifica di efficacia. */
export const pasNonConformita = pgTable(
  "pas_non_conformita",
  {
    ...figlia(),
    data: date("data"),
    origine: text("origine"),
    requisito: text("requisito"),
    responsabile: text("responsabile"),
    descrizione: text("descrizione"),
    cause: text("cause"),
    azione: text("azione"),
    scadenza: date("scadenza"),
    chiusaIl: date("chiusa_il"),
    efficacia: text("efficacia").notNull().default("Da verificare"),
    ...creata(),
  },
  (t) => [index("pas_non_conformita_system_idx").on(t.systemId), index("pas_non_conformita_org_idx").on(t.organizationId)],
);

/** Formazione (7.2, 7.3, A.6). */
export const pasFormazione = pgTable(
  "pas_formazione",
  {
    ...figlia(),
    data: date("data"),
    tema: text("tema"),
    destinatari: text("destinatari"),
    docente: text("docente"),
    partecipanti: integer("partecipanti"),
    ore: numeric("ore"),
    efficacia: text("efficacia"),
    ...creata(),
  },
  (t) => [index("pas_formazione_system_idx").on(t.systemId), index("pas_formazione_org_idx").on(t.organizationId)],
);

/** Emergenze e antincendio (8.2, A.7): la prova e' richiesta almeno una volta l'anno. */
export const pasEmergenza = pgTable(
  "pas_emergenza",
  {
    ...figlia(),
    data: date("data"),
    tipo: text("tipo").notNull().default("Prova di evacuazione"),
    sito: text("sito"),
    responsabile: text("responsabile"),
    esito: text("esito"),
    azioni: text("azioni"),
    ...creata(),
  },
  (t) => [index("pas_emergenza_system_idx").on(t.systemId), index("pas_emergenza_org_idx").on(t.organizationId)],
);

/** Comunicazioni (7.4): almeno una interna e una esterna ogni anno. */
export const pasComunicazione = pgTable(
  "pas_comunicazione",
  {
    ...figlia(),
    data: date("data"),
    tipo: text("tipo").notNull().default("Interna"),
    destinatari: text("destinatari"),
    canale: text("canale"),
    contenuto: text("contenuto"),
    ...creata(),
  },
  (t) => [index("pas_comunicazione_system_idx").on(t.systemId), index("pas_comunicazione_org_idx").on(t.organizationId)],
);

/** Consultazione e partecipazione dei lavoratori (5.4). */
export const pasConsultazione = pgTable(
  "pas_consultazione",
  {
    ...figlia(),
    data: date("data"),
    forma: text("forma").notNull().default("Riunione con i lavoratori"),
    partecipanti: integer("partecipanti"),
    condottaDa: text("condotta_da"),
    argomenti: text("argomenti"),
    esiti: text("esiti"),
    ...creata(),
  },
  (t) => [index("pas_consultazione_system_idx").on(t.systemId), index("pas_consultazione_org_idx").on(t.organizationId)],
);

/** Audit interni (9.2): devono coprire anche l'Allegato A. */
export const pasAudit = pgTable(
  "pas_audit",
  {
    ...figlia(),
    data: date("data"),
    ambito: text("ambito"),
    auditor: text("auditor"),
    stato: text("stato").notNull().default("Pianificato"),
    rilievi: integer("rilievi"),
    sintesi: text("sintesi"),
    ...creata(),
  },
  (t) => [index("pas_audit_system_idx").on(t.systemId), index("pas_audit_org_idx").on(t.organizationId)],
);

/** Riesame della direzione (9.3): almeno una volta l'anno. Gli elementi in ingresso li calcola il verbale. */
export const pasRiesame = pgTable(
  "pas_riesame",
  {
    ...figlia(),
    data: date("data"),
    partecipanti: text("partecipanti"),
    comunicatoIl: date("comunicato_il"),
    risorse: text("risorse"),
    idoneita: text("idoneita"),
    miglioramento: text("miglioramento"),
    modifiche: text("modifiche"),
    azioni: text("azioni"),
    ...creata(),
  },
  (t) => [index("pas_riesame_system_idx").on(t.systemId), index("pas_riesame_org_idx").on(t.organizationId)],
);
