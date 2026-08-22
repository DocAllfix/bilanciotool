import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { company } from "./tenancy";
import { contentSet } from "./content";

// ISO 37001 — sistema di gestione per la prevenzione della corruzione.
//
// Tre cose vivono altrove, e non è una dimenticanza:
// - le 12 procedure e i 47 moduli stanno nel CORPUS (Fase A), condivisi fra tutti i
//   clienti, con le sole personalizzazioni per azienda;
// - i 12 registri stanno in `corpus_register_row`, generico: è il motivo per cui
//   questo modulo non porta dodici tabelle;
// - gli otto obblighi derivati stanno in `src/lib/calc/anticorruzione/obblighi.ts`,
//   perché sono REGOLE ESEGUIBILI e non contenuto. Metterne le etichette qui e la
//   logica lì vorrebbe dire poterle far divergere.

// ─── Cataloghi (versionati, senza organization_id) ───────────────────────────

/** I sette capitoli della norma (4 ÷ 10). */
export const briberyChapter = pgTable(
  "bribery_chapter",
  {
    id: text("id").primaryKey(),
    setId: text("set_id")
      .notNull()
      .references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    descrizione: text("descrizione").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("bribery_chapter_set_key_uq").on(t.setId, t.key)],
);

/** Gli 91 requisiti, ciascuno ancorato a un punto della norma e a una procedura. */
export const briberyRequirement = pgTable(
  "bribery_requirement",
  {
    id: text("id").primaryKey(),
    setId: text("set_id")
      .notNull()
      .references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    chapterKey: text("chapter_key").notNull(),
    /** Punto della norma, es. «8.2». */
    riferimento: text("riferimento").notNull(),
    /** Procedura del corpus che lo attua, es. «PAC-07». */
    procedura: text("procedura"),
    testo: text("testo").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [
    uniqueIndex("bribery_requirement_set_key_uq").on(t.setId, t.key),
    index("bribery_requirement_set_cap_idx").on(t.setId, t.chapterKey),
  ],
);

/**
 * Le quattro dimensioni del rischio, con la scala descritta.
 *
 * Le descrizioni dei quattro gradini sono CONTENUTO CONSULENZIALE — dicono al
 * consulente cosa distingue un 2 da un 3 — quindi stanno nel catalogo versionato e non
 * nel codice. La logica che li media sta in `calc/anticorruzione/rischio.ts`.
 */
export const briberyDimension = pgTable(
  "bribery_dimension",
  {
    id: text("id").primaryKey(),
    setId: text("set_id")
      .notNull()
      .references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    etichetta: text("etichetta").notNull(),
    descrizione: text("descrizione").notNull(),
    /** I quattro gradini, dal meno al più esposto. */
    scala: jsonb("scala").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("bribery_dimension_set_key_uq").on(t.setId, t.key)],
);

/** I sei fattori che alzano il livello a prescindere dalla media. */
export const briberyFlag = pgTable(
  "bribery_flag",
  {
    id: text("id").primaryKey(),
    setId: text("set_id")
      .notNull()
      .references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    etichetta: text("etichetta").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("bribery_flag_set_key_uq").on(t.setId, t.key)],
);

// ─── Tenant ──────────────────────────────────────────────────────────────────

/**
 * Il sistema di un'azienda: uno solo, come la SoA e l'autovalutazione fornitore.
 *
 * Non è un esercizio annuale — un sistema di gestione non «si rifà ogni anno», si
 * mantiene e si revisiona. Le revisioni sono le versioni del documento pubblicato.
 */
export const briberySystem = pgTable(
  "bribery_system",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    /** Congelato alla creazione: un catalogo nuovo non cambia un sistema avviato. */
    contentSetId: text("content_set_id")
      .notNull()
      .references(() => contentSet.id, { onDelete: "restrict" }),

    // Identificazione
    ragione: text("ragione"),
    forma: text("forma"),
    piva: text("piva"),
    sede: text("sede"),
    settore: text("settore"),
    addetti: text("addetti"),
    paesi: text("paesi"),

    // Governance
    direzione: text("direzione"),
    organoGov: text("organo_gov"),
    organoComp: text("organo_comp"),
    funzionePc: text("funzione_pc"),
    funzionePcImpegno: text("funzione_pc_impegno"),
    funzionePcDirigente: text("funzione_pc_dirigente"),
    odv: text("odv"),

    // Esposizione
    pubbliciUfficiali: text("pubblici_ufficiali"),

    // Canale di segnalazione
    canaleEmail: text("canale_email"),
    canaleUrl: text("canale_url"),
    canaleTelefono: text("canale_telefono"),
    canaleTerzo: text("canale_terzo"),
    canaleLingue: text("canale_lingue"),

    // Campo di applicazione
    scopo: text("scopo"),
    esclusioni: text("esclusioni"),
    dataAdozione: text("data_adozione"),
    revisione: text("revisione"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("bribery_system_company_uq").on(t.companyId),
    index("bribery_system_org_idx").on(t.organizationId),
  ],
);

/**
 * I soci in affari.
 *
 * Le quattro dimensioni sono colonne numeriche e non un jsonb: il livello di rischio si
 * interroga (quanti soci sopra soglia, quante due diligence scadute), e su un jsonb ogni
 * domanda diventerebbe una scansione.
 */
export const briberyPartner = pgTable(
  "bribery_partner",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    systemId: text("system_id")
      .notNull()
      .references(() => briberySystem.id, { onDelete: "cascade" }),

    // Identificazione
    nome: text("nome").notNull(),
    categoria: text("categoria"),
    paeseOperativita: text("paese_operativita"),
    sede: text("sede"),
    oggetto: text("oggetto"),
    titolariEffettivi: text("titolari_effettivi"),

    // Rapporto economico
    valoreAnnuo: numeric("valore_annuo", { precision: 18, scale: 2 }),
    remunerazione: text("remunerazione"),
    attivoDal: text("attivo_dal"),
    controllata: text("controllata"),
    adeguamento: text("adeguamento"),

    // Dimensioni del rischio, 1 ÷ 4. NULL = non valutata, ed è diverso da 1.
    dimPaese: smallint("dim_paese"),
    dimPubbliciUfficiali: smallint("dim_pubblici_ufficiali"),
    dimNatura: smallint("dim_natura"),
    dimValore: smallint("dim_valore"),

    // Fattori
    flagSuccesso: boolean("flag_successo").notNull().default(false),
    flagCliente: boolean("flag_cliente").notNull().default(false),
    flagTitolarita: boolean("flag_titolarita").notNull().default(false),
    flagPrecedenti: boolean("flag_precedenti").notNull().default(false),
    flagLegami: boolean("flag_legami").notNull().default(false),
    flagPagamenti: boolean("flag_pagamenti").notNull().default(false),

    // Adempimenti
    dueDiligenceIl: text("due_diligence_il"),
    dueDiligenceEsito: text("due_diligence_esito"),
    dueDiligenceNote: text("due_diligence_note"),
    politicaComunicata: text("politica_comunicata"),
    impegni: text("impegni"),
    impegniNote: text("impegni_note"),
    clausole: text("clausole"),
    controlli: text("controlli"),
    formazioneIl: text("formazione_il"),
    verificaCorrispettivo: text("verifica_corrispettivo"),

    stato: text("stato").notNull().default("Attivo"),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bribery_partner_system_idx").on(t.systemId),
    index("bribery_partner_org_idx").on(t.organizationId),
  ],
);

/** Lo stato di ciascuno dei 91 requisiti. Una riga solo per quelli toccati. */
export const briberyRequirementState = pgTable(
  "bribery_requirement_state",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    systemId: text("system_id")
      .notNull()
      .references(() => briberySystem.id, { onDelete: "cascade" }),
    requirementKey: text("requirement_key").notNull(),
    stato: text("stato"),
    note: text("note"),
    evidenza: text("evidenza"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("bribery_req_state_uq").on(t.systemId, t.requirementKey),
    index("bribery_req_state_org_idx").on(t.organizationId),
  ],
);

export const briberySystemRelations = relations(briberySystem, ({ many }) => ({
  soci: many(briberyPartner),
  requisiti: many(briberyRequirementState),
}));
