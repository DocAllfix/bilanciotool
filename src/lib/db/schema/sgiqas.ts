import { relations } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { company } from "./tenancy";
import { contentSet } from "./content";

// Sistema di gestione integrato Qualità · Ambiente · Sicurezza
// (ISO 9001 · ISO 14001 · ISO 45001).
//
// Le 18 procedure, i 56 moduli e i 16 registri stanno nel CORPUS: qui c'è il dominio.
// ⚠️ Fra i sedici registri ce ne sono DUE che non sono semplici elenchi — gli aspetti
// ambientali e i pericoli SSL — perché su di loro il prodotto calcola: significatività e
// livello di rischio. Il calcolo vive in `src/lib/calc/sgiqas/motori.ts` e si applica
// alle righe del registro generico; non ci sono tabelle dedicate, ed è la scelta del
// prototipo (`calc:"asp"`, `calc:"per"`), conservata perché quei due registri hanno
// diciotto colonne di anagrafica ciascuno e duplicarle qui sarebbe una seconda verità.

// ─── Cataloghi ───────────────────────────────────────────────────────────────

/** Le tre norme. L'ordine Q → A → S è quello dei distintivi, e si conserva. */
export const qasNorm = pgTable(
  "qas_norm",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    /** «Q», «A», «S»: la lettera con cui il corpus marca i requisiti. */
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    /** «ISO 9001:2015». */
    norma: text("norma").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("qas_norm_set_key_uq").on(t.setId, t.key)],
);

/** I sette capitoli della struttura di alto livello (4 ÷ 10). */
export const qasChapter = pgTable(
  "qas_chapter",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("qas_chapter_set_key_uq").on(t.setId, t.key)],
);

/**
 * I 107 requisiti, ciascuno valido per una o più norme.
 *
 * ⚠️ `norme` è un ARRAY, non la stringa concatenata del prototipo.
 *
 * Nel prototipo il campo è `nrm: "QAS"` — un insieme di lettere appiccicate, interrogato
 * con `String.includes`. In Postgres quella forma diventa `LIKE '%Q%'`: inindicizzabile,
 * e destinata a peggiorare a ogni norma aggiunta. Con `text[]` la domanda «quali
 * requisiti valgono per la 14001» è un operatore di contenimento con indice GIN.
 *
 * Distribuzione misurata sul prototipo: QAS 33 · S 28 · Q 24 · AS 11 · A 11. La
 * copertura per norma è Q 57 · A 55 · S 72, e le somme si sovrappongono: 184 ≠ 107,
 * perché 33 requisiti valgono per tutte e tre.
 */
export const qasRequirement = pgTable(
  "qas_requirement",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    chapterKey: text("chapter_key").notNull(),
    /** Il punto della norma, es. «4.1». */
    riferimento: text("riferimento").notNull(),
    /** Le lettere delle norme per cui il requisito vale: `{Q,A,S}`. */
    norme: text("norme").array().notNull(),
    procedura: text("procedura"),
    testo: text("testo").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [
    uniqueIndex("qas_requirement_set_key_uq").on(t.setId, t.key),
    index("qas_requirement_set_cap_idx").on(t.setId, t.chapterKey),
  ],
);

/** I venti indicatori precaricabili, con target e verso già suggeriti. */
export const qasIndicatorDefault = pgTable(
  "qas_indicator_default",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    /** «Qualità», «Ambiente», «Sicurezza», «Integrato». */
    ambito: text("ambito"),
    tipo: text("tipo"),
    formula: text("formula"),
    um: text("um"),
    frequenza: text("frequenza"),
    versoPositivo: boolean("verso_positivo").notNull().default(true),
    /** Target e soglia SUGGERITI: il catalogo li propone, l'azienda li adatta. */
    target: text("target"),
    soglia: text("soglia"),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("qas_indicator_default_set_key_uq").on(t.setId, t.key)],
);

// ─── Tabelle tenant ──────────────────────────────────────────────────────────

/**
 * Il sistema integrato di un'azienda.
 *
 * ⚠️ `norme` dice quali delle tre sono NEL PERIMETRO, e non è un dettaglio: un cliente
 * certificato solo ISO 9001 deve vedere i suoi 57 requisiti, non 107. Chiedergli di
 * ignorare cinquanta requisiti che non lo riguardano è il modo più rapido per fargli
 * abbandonare il percorso — e la mappa di conformità, calcolata su tutti e 107,
 * mostrerebbe una percentuale che non significa niente per lui.
 */
export const qasSystem = pgTable(
  "qas_system",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
    contentSetId: text("content_set_id").notNull().references(() => contentSet.id, { onDelete: "restrict" }),

    /** Le norme nel perimetro: `{Q,A,S}`, `{Q}`, `{A,S}`… */
    norme: text("norme").array().notNull().default(["Q", "A", "S"]),

    ragione: text("ragione"),
    forma: text("forma"),
    piva: text("piva"),
    sede: text("sede"),
    settore: text("settore"),
    addetti: text("addetti"),
    direzione: text("direzione"),
    rspp: text("rspp"),
    rls: text("rls"),
    medico: text("medico"),
    responsabileSistema: text("responsabile_sistema"),
    scopo: text("scopo"),
    esclusioni: text("esclusioni"),
    siti: text("siti"),
    dataAdozione: text("data_adozione"),
    revisione: text("revisione"),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("qas_system_company_uq").on(t.companyId),
    index("qas_system_org_idx").on(t.organizationId),
  ],
);

/** Lo stato di ciascuno dei 107 requisiti. Una riga solo per quelli toccati. */
export const qasRequirementState = pgTable(
  "qas_requirement_state",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    systemId: text("system_id").notNull().references(() => qasSystem.id, { onDelete: "cascade" }),
    requirementKey: text("requirement_key").notNull(),
    stato: text("stato"),
    note: text("note"),
    evidenza: text("evidenza"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("qas_req_state_uq").on(t.systemId, t.requirementKey),
    index("qas_req_state_org_idx").on(t.organizationId),
  ],
);

/**
 * Un indicatore di prestazione, con target, soglia e verso.
 *
 * ⚠️ `target` e `soglia` sono NULLABILI e restano `null` quando nessuno li ha fissati.
 * Nel prototipo erano stringhe vuote lette con `Number("")`, cioè **zero**: un indicatore
 * senza target risultava «a target» per uno «più è meglio» e «fuori» per uno «meno è
 * meglio». Due verdetti opposti da un dato che nessuno aveva inserito. La colonna
 * numerica rende quel difetto irrappresentabile.
 */
export const qasIndicator = pgTable(
  "qas_indicator",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    systemId: text("system_id").notNull().references(() => qasSystem.id, { onDelete: "cascade" }),

    codice: text("codice"),
    nome: text("nome").notNull(),
    ambito: text("ambito"),
    tipo: text("tipo"),
    processo: text("processo"),
    finalita: text("finalita"),
    formula: text("formula"),
    um: text("um"),
    fonte: text("fonte"),
    frequenza: text("frequenza"),
    responsabile: text("responsabile"),
    riferimentoIniziale: text("riferimento_iniziale"),

    /** NUMERIC come testo, per non perdere i decimali: la politica di questo prodotto. */
    target: text("target"),
    soglia: text("soglia"),
    versoPositivo: boolean("verso_positivo").notNull().default(true),
    obiettivo: text("obiettivo"),
    note: text("note"),

    ordine: integer("ordine").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("qas_indicator_system_idx").on(t.systemId), index("qas_indicator_org_idx").on(t.organizationId)],
);

/**
 * Una rilevazione: il valore dell'indicatore in un periodo.
 *
 * ⚠️ Una riga per periodo, con unicità: la serie storica è il valore metodologico di
 * questo modulo — un indicatore senza storia non dice se si sta migliorando — e due
 * rilevazioni per lo stesso periodo renderebbero il grafico una domanda senza risposta.
 */
export const qasMeasurement = pgTable(
  "qas_measurement",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    indicatorId: text("indicator_id").notNull().references(() => qasIndicator.id, { onDelete: "cascade" }),
    /** «2026-03», «2026-T1», «2026»: la forma dipende dalla frequenza. */
    periodo: text("periodo").notNull(),
    valore: text("valore"),
    note: text("note"),
    /** L'ordine cronologico, che dal testo del periodo non si deduce sempre. */
    ordine: integer("ordine").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("qas_measurement_uq").on(t.indicatorId, t.periodo),
    index("qas_measurement_org_idx").on(t.organizationId),
  ],
);

export const qasSystemRelations = relations(qasSystem, ({ many }) => ({
  requisiti: many(qasRequirementState),
  indicatori: many(qasIndicator),
}));

export const qasIndicatorRelations = relations(qasIndicator, ({ many, one }) => ({
  rilevazioni: many(qasMeasurement),
  sistema: one(qasSystem, { fields: [qasIndicator.systemId], references: [qasSystem.id] }),
}));
