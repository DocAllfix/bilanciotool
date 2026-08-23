import { relations } from "drizzle-orm";
import { index, integer, pgTable, smallint, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { company } from "./tenancy";
import { contentSet } from "./content";

// Modello di organizzazione, gestione e controllo (D.Lgs. 231/2001).
//
// Come per ISO 37001: le 18 procedure, i 54 moduli e i 12 registri stanno nel CORPUS
// (Fase A) e nel registro generico, quindi questo modulo non porta dodici tabelle. La
// regola che pesa i presidi sta in `calc/comune/valutazione.ts`, condivisa.

// ─── Cataloghi ───────────────────────────────────────────────────────────────

/** Le dieci famiglie di reato presupposto (PA, societari, sicurezza…). */
export const mogFamily = pgTable(
  "mog_family",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("mog_family_set_key_uq").on(t.setId, t.key)],
);

/** I 25 reati presupposto, ciascuno con l'articolo del decreto. */
export const mogCrime = pgTable(
  "mog_crime",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    /** L'articolo del D.Lgs. 231/2001, es. «24», «25-septies». */
    key: text("key").notNull(),
    familyKey: text("family_key").notNull(),
    titolo: text("titolo").notNull(),
    descrizione: text("descrizione"),
    ordine: integer("ordine").notNull(),
  },
  (t) => [
    uniqueIndex("mog_crime_set_key_uq").on(t.setId, t.key),
    index("mog_crime_set_fam_idx").on(t.setId, t.familyKey),
  ],
);

/** I dieci pilastri su cui si misura l'idoneità del Modello. */
export const mogPillar = pgTable(
  "mog_pillar",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    descrizione: text("descrizione").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("mog_pillar_set_key_uq").on(t.setId, t.key)],
);

/** Gli 81 requisiti, ancorati a un comma del decreto e a una procedura del corpus. */
export const mogRequirement = pgTable(
  "mog_requirement",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    pillarKey: text("pillar_key").notNull(),
    /** Riferimento normativo, es. «art. 6 c. 1». */
    riferimento: text("riferimento").notNull(),
    procedura: text("procedura"),
    testo: text("testo").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [
    uniqueIndex("mog_requirement_set_key_uq").on(t.setId, t.key),
    index("mog_requirement_set_pil_idx").on(t.setId, t.pillarKey),
  ],
);

// ─── Tenant ──────────────────────────────────────────────────────────────────

/** Il Modello di un'azienda: uno solo, e si revisiona invece di rifarsi ogni anno. */
export const mogModel = pgTable(
  "mog_model",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
    contentSetId: text("content_set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),

    ragione: text("ragione"),
    forma: text("forma"),
    piva: text("piva"),
    sede: text("sede"),
    settore: text("settore"),
    addetti: text("addetti"),
    organoAmministrativo: text("organo_amministrativo"),
    odvComposizione: text("odv_composizione"),
    odvNomina: text("odv_nomina"),
    dataAdozione: text("data_adozione"),
    dataDelibera: text("data_delibera"),
    scopo: text("scopo"),
    esclusioni: text("esclusioni"),
    canaleSegnalazione: text("canale_segnalazione"),
    revisione: text("revisione"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("mog_model_company_uq").on(t.companyId),
    index("mog_model_org_idx").on(t.organizationId),
  ],
);

/** I processi sensibili: dove i reati possono essere commessi. */
export const mogProcess = pgTable(
  "mog_process",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    modelId: text("model_id").notNull().references(() => mogModel.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    area: text("area"),
    responsabile: text("responsabile"),
    descrizione: text("descrizione"),
    presidi: text("presidi"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("mog_process_model_idx").on(t.modelId),
    index("mog_process_org_idx").on(t.organizationId),
  ],
);

/**
 * Uno scenario: la coppia processo × reato.
 *
 * ⚠️ Una riga per coppia VALUTATA, non per ogni combinazione possibile. Venticinque
 * reati per venti processi farebbero cinquecento righe, la gran parte prive di senso: è
 * il consulente a dire quali reati sono ipotizzabili in quale processo, e quella scelta
 * è essa stessa parte del Modello.
 *
 * Le tre valutazioni sono colonne separate e non un jsonb: il rischio residuo si
 * interroga (quanti scenari non accettabili, quali processi critici), e su un jsonb ogni
 * domanda diventerebbe una scansione.
 */
export const mogScenario = pgTable(
  "mog_scenario",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    processId: text("process_id").notNull().references(() => mogProcess.id, { onDelete: "cascade" }),
    /** L'articolo del decreto: chiave nel catalogo `mog_crime`. */
    crimeKey: text("crime_key").notNull(),

    /** 1 ÷ 4. NULL = non valutata, ed è diverso da 1. */
    probabilita: smallint("probabilita"),
    impatto: smallint("impatto"),
    /**
     * ⚠️ NULL vale «Assenti» nel calcolo, non «da valutare»: in materia 231 l'onere è
     * dell'ente. Il valore resta NULL nel database perché «non dichiarato» e
     * «dichiarato assente» sono due fatti diversi da raccontare in un documento; è il
     * motore a trattarli allo stesso modo, e sta scritto lì.
     */
    adeguatezza: text("adeguatezza"),
    modalita: text("modalita"),
    note: text("note"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("mog_scenario_uq").on(t.processId, t.crimeKey),
    index("mog_scenario_org_idx").on(t.organizationId),
  ],
);

/**
 * L'applicabilità di un reato all'ente, con la motivazione.
 *
 * Il default è «non determinata», e non «applicabile»: dichiarare che un reato non
 * riguarda l'ente è una decisione che va presa e motivata, non un silenzio.
 */
export const mogCrimeApplicability = pgTable(
  "mog_crime_applicability",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    modelId: text("model_id").notNull().references(() => mogModel.id, { onDelete: "cascade" }),
    crimeKey: text("crime_key").notNull(),
    applicabile: text("applicabile"),
    motivazione: text("motivazione"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("mog_crime_app_uq").on(t.modelId, t.crimeKey),
    index("mog_crime_app_org_idx").on(t.organizationId),
  ],
);

/** Lo stato di ciascuno degli 81 requisiti. Una riga solo per quelli toccati. */
export const mogRequirementState = pgTable(
  "mog_requirement_state",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    modelId: text("model_id").notNull().references(() => mogModel.id, { onDelete: "cascade" }),
    requirementKey: text("requirement_key").notNull(),
    stato: text("stato"),
    note: text("note"),
    evidenza: text("evidenza"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("mog_req_state_uq").on(t.modelId, t.requirementKey),
    index("mog_req_state_org_idx").on(t.organizationId),
  ],
);

export const mogModelRelations = relations(mogModel, ({ many }) => ({
  processi: many(mogProcess),
  requisiti: many(mogRequirementState),
}));

export const mogProcessRelations = relations(mogProcess, ({ many, one }) => ({
  scenari: many(mogScenario),
  modello: one(mogModel, { fields: [mogProcess.modelId], references: [mogModel.id] }),
}));
