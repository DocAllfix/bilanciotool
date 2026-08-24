import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { company } from "./tenancy";
import { contentSet } from "./content";

// Sistema di gestione SA8000/2026.
//
// Le 22 procedure, i 104 moduli e i 10 registri stanno nel CORPUS: qui c'è il dominio,
// che per questo modulo sono i 112 criteri dello Standard.
//
// ⚠️ Il nome porta l'ANNO, ed è una richiesta esplicita del committente: «SA8000/2026,
// con l'anno, perché fa differenza». Le norme si datano perché si superano, e un sistema
// costruito sull'edizione precedente non è lo stesso sistema.

// ─── Cataloghi ───────────────────────────────────────────────────────────────

/** Le tre sezioni: F fondazionali · M sistema di gestione · D prestazione. */
export const saSection = pgTable(
  "sa_section",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("sa_section_set_key_uq").on(t.setId, t.key)],
);

/**
 * I diciotto gruppi di criteri.
 *
 * ⚠️ Fra questi c'è `F`, «Criteri fondazionali (F1–F5)», che nel prototipo esiste e non
 * viene MAI usato: il raggruppamento si ricavava con `codice.split(".")[0]`, che per
 * «F1» dà «F1» invece di «F». I cinque fondazionali finivano in cinque riquadri separati
 * e senza titolo. Vedi `gruppoDelCriterio` in `src/lib/calc/sa8000/punteggio.ts`.
 */
export const saGroup = pgTable(
  "sa_group",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    sectionKey: text("section_key").notNull(),
    nome: text("nome").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [
    uniqueIndex("sa_group_set_key_uq").on(t.setId, t.key),
    index("sa_group_set_sez_idx").on(t.setId, t.sectionKey),
  ],
);

/** I 112 criteri: 5 fondazionali, 42 di sistema, 65 di prestazione. */
export const saCriterion = pgTable(
  "sa_criterion",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    /** «F1», «M1.1», «D7.2». */
    key: text("key").notNull(),
    sectionKey: text("section_key").notNull(),
    groupKey: text("group_key").notNull(),
    testo: text("testo").notNull(),
    /**
     * Le procedure del corpus che attuano il criterio.
     *
     * ⚠️ Array e non colonna singola: dei 112 criteri, **102 puntano a una procedura e
     * 10 a due**. Una colonna sola perderebbe il secondo rimando in silenzio, e la
     * domanda «quali criteri copre questa procedura» diventerebbe sbagliata proprio sui
     * dieci che ne hanno più di una.
     */
    procedure: text("procedure").array().notNull().default([]),
    ordine: integer("ordine").notNull(),
  },
  (t) => [
    uniqueIndex("sa_criterion_set_key_uq").on(t.setId, t.key),
    index("sa_criterion_set_grp_idx").on(t.setId, t.groupKey),
  ],
);

// ─── Tabelle tenant ──────────────────────────────────────────────────────────

/** Il sistema SA8000 di un'azienda. Una per azienda: è una fotografia che si revisiona. */
export const saSystem = pgTable(
  "sa_system",
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
    /** Il contratto collettivo applicato: è il riferimento di ogni criterio su orario e retribuzione. */
    ccnl: text("ccnl"),
    /** Il rappresentante SA8000 dei lavoratori e quello della direzione. */
    respSa: text("resp_sa"),
    direzione: text("direzione"),
    /** Il canale di reclamo, che lo Standard pretende raggiungibile. */
    reclamiEmail: text("reclami_email"),
    /** Il sito dove la politica e' pubblicata: lo Standard chiede che sia accessibile. */
    sitoWeb: text("sito_web"),
    scopo: text("scopo"),
    siti: text("siti"),
    dataAdozione: text("data_adozione"),
    revisione: text("revisione"),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sa_system_company_uq").on(t.companyId),
    index("sa_system_org_idx").on(t.organizationId),
  ],
);

/**
 * Lo stato di un criterio.
 *
 * ⚠️ Gli stati sono quattro e «parziale» pesa ZERO nel punteggio — non 50 come nel
 * Sistema integrato QAS. È una divergenza voluta fra due prototipi dello stesso autore,
 * e la ragione metodologica regge: un criterio sociale attuato a metà non protegge a
 * metà un lavoratore.
 */
export const saCriterionState = pgTable(
  "sa_criterion_state",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    systemId: text("system_id").notNull().references(() => saSystem.id, { onDelete: "cascade" }),
    criterionKey: text("criterion_key").notNull(),
    stato: text("stato"),
    note: text("note"),
    evidenza: text("evidenza"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sa_crit_state_uq").on(t.systemId, t.criterionKey),
    index("sa_crit_state_org_idx").on(t.organizationId),
  ],
);

export const saSystemRelations = relations(saSystem, ({ many }) => ({
  criteri: many(saCriterionState),
}));
