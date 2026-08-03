import { pgTable, text, timestamp, integer, numeric, jsonb, boolean, uniqueIndex } from "drizzle-orm/pg-core";

// Contenuti metodologici versionati (seed di piattaforma, Fase 2C).
// Tabelle NON-tenant: leggibili da tutti i tenant (passthrough RLS scoped ad app_rls),
// scrivibili solo da staff/seed. Un aggiornamento normativo = nuovo content_set,
// senza riscrivere i bilanci passati.

export const contentSet = pgTable(
  "content_set",
  {
    id: text("id").primaryKey(),
    dominio: text("dominio", { enum: ["ghg", "report", "energy", "supplier", "soa"] }).notNull(),
    versione: integer("versione").notNull(),
    note: text("note"),
    publishedAt: timestamp("published_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("content_set_dom_ver_uq").on(t.dominio, t.versione)],
);

// 6 categorie ISO 14064-1 (+ corrispondenza scope GHG Protocol).
export const ghgCategory = pgTable(
  "ghg_category",
  {
    id: text("id").primaryKey(), // es. 'v1:1'
    setId: text("set_id").notNull().references(() => contentSet.id),
    key: text("key").notNull(), // '1'..'6'
    nome: text("nome").notNull(),
    scope: integer("scope").notNull(), // 1 | 2 | 3
    descrizione: text("descrizione").notNull(),
  },
  (t) => [uniqueIndex("ghg_category_set_key_uq").on(t.setId, t.key)],
);

// 26 sorgenti operative del registro.
export const ghgSourceType = pgTable(
  "ghg_source_type",
  {
    id: text("id").primaryKey(), // es. 'v1:1a'
    setId: text("set_id").notNull().references(() => contentSet.id),
    key: text("key").notNull(), // '1a'..'6c'
    categoryKey: text("category_key").notNull(),
    nome: text("nome").notNull(),
    descrizione: text("descrizione").notNull(),
  },
  (t) => [uniqueIndex("ghg_source_type_set_key_uq").on(t.setId, t.key)],
);

// Libreria fattori di emissione di piattaforma (~60, ISPRA/DEFRA/IPCC).
export const emissionFactor = pgTable(
  "emission_factor",
  {
    id: text("id").primaryKey(), // es. 'v1:gas_smc'
    setId: text("set_id").notNull().references(() => contentSet.id),
    key: text("key").notNull(),
    gruppo: text("gruppo").notNull(),
    nome: text("nome").notNull(),
    um: text("um").notNull(),
    fe: numeric("fe").notNull(), // kgCO2e/unità
    feMarket: numeric("fe_market"), // solo cat 2
    feBiogenic: numeric("fe_biogenic"),
    categoryKey: text("category_key").notNull(),
    sourceTypeKey: text("source_type_key").notNull(),
    fonte: text("fonte"),
  },
  (t) => [uniqueIndex("emission_factor_set_key_uq").on(t.setId, t.key)],
);

// Set di GWP (AR4/AR5/AR6).
export const gwpSet = pgTable(
  "gwp_set",
  {
    id: text("id").primaryKey(), // es. 'v1:AR6'
    setId: text("set_id").notNull().references(() => contentSet.id),
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    valori: jsonb("valori").notNull(), // { ch4, ch4b, n2o }
  },
  (t) => [uniqueIndex("gwp_set_set_key_uq").on(t.setId, t.key)],
);

// Checklist di conformità ISO (15 requisiti).
export const checklistRequirement = pgTable(
  "checklist_requirement",
  {
    id: text("id").primaryKey(), // es. 'v1:v1'
    setId: text("set_id").notNull().references(() => contentSet.id),
    key: text("key").notNull(),
    clausola: text("clausola").notNull(),
    nome: text("nome").notNull(),
    descrizione: text("descrizione").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("checklist_req_set_key_uq").on(t.setId, t.key)],
);

// 18 temi di materialità con guida consulenziale completa.
export const materialityTopic = pgTable(
  "materiality_topic",
  {
    id: text("id").primaryKey(), // es. 'v1:T01'
    setId: text("set_id").notNull().references(() => contentSet.id),
    key: text("key").notNull(), // 'T01'..'T18'
    pillar: text("pillar", { enum: ["E", "S", "G"] }).notNull(),
    nome: text("nome").notNull(),
    riferimenti: text("riferimenti").notNull(), // 'ESRS E1 · GRI 305'
    guida: jsonb("guida").notNull(), // { def, imp[], fin[], alto, ev }
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("materiality_topic_set_key_uq").on(t.setId, t.key)],
);

// Sezioni KPI (8) e definizioni KPI (~50).
export const kpiSection = pgTable(
  "kpi_section",
  {
    id: text("id").primaryKey(), // es. 'v1:ene'
    setId: text("set_id").notNull().references(() => contentSet.id),
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    riferimenti: text("riferimenti").notNull(),
    pillar: text("pillar", { enum: ["E", "S", "G"] }).notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("kpi_section_set_key_uq").on(t.setId, t.key)],
);

export const kpiDefinition = pgTable(
  "kpi_definition",
  {
    id: text("id").primaryKey(), // es. 'v1:en_ele'
    setId: text("set_id").notNull().references(() => contentSet.id),
    key: text("key").notNull(),
    sectionKey: text("section_key").notNull(),
    nome: text("nome").notNull(),
    um: text("um").notNull(),
    hint: text("hint"),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("kpi_definition_set_key_uq").on(t.setId, t.key)],
);

// Scale di valutazione (impatto, finanziaria, qualità del dato).
export const ratingScale = pgTable(
  "rating_scale",
  {
    id: text("id").primaryKey(), // es. 'v1:imp'
    setId: text("set_id").notNull().references(() => contentSet.id),
    key: text("key").notNull(), // 'imp' | 'fin' | 'dq'
    livelli: jsonb("livelli").notNull(), // [{v|id, n, d, inc?, p?}]
  },
  (t) => [uniqueIndex("rating_scale_set_key_uq").on(t.setId, t.key)],
);

// Capitoli narrativi del bilancio (7 template).
export const narrativeTemplate = pgTable(
  "narrative_template",
  {
    id: text("id").primaryKey(), // es. 'v1:lettera'
    setId: text("set_id").notNull().references(() => contentSet.id),
    key: text("key").notNull(),
    nome: text("nome").notNull(),
    hint: text("hint").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("narrative_template_set_key_uq").on(t.setId, t.key)],
);

// Suggerimenti di materialità per macro-settore ATECO (rule-based, niente AI).
export const atecoSuggestion = pgTable(
  "ateco_suggestion",
  {
    id: text("id").primaryKey(),
    setId: text("set_id").notNull().references(() => contentSet.id),
    macroSettore: text("macro_settore").notNull(), // es. 'C' manifatturiero
    descrizione: text("descrizione").notNull(),
    punteggi: jsonb("punteggi").notNull(), // { T01: {imp,fin}, ... } valori indicativi di partenza
  },
  (t) => [uniqueIndex("ateco_suggestion_set_macro_uq").on(t.setId, t.macroSettore)],
);

// ============================================================================
// MODULO ENERGETICO (UNI CEI EN 16247 · ISO 50001) — cataloghi versionati
// ============================================================================

// 12 vettori energetici con i tre fattori di conversione. A differenza del GHG,
// dove il fattore si congela sulla riga di attività, qui il vettore È il fattore:
// esiste un solo valore per bilancio, sovrascrivibile per azienda (energy_company_factor).
export const energyVector = pgTable(
  "energy_vector",
  {
    id: text("id").primaryKey(), // es. 'energy-v1:ele'
    setId: text("set_id").notNull().references(() => contentSet.id),
    key: text("key").notNull(), // 'ele','ele_go','fv','gas','gasolio','gpl','olio','biomassa','tlr','vapore','gasolio_t','benzina'
    nome: text("nome").notNull(),
    um: text("um").notNull(), // kWh | Smc | l | kg | t
    categoria: text("categoria", { enum: ["E", "T", "M"] }).notNull(), // elettrico | termico | autotrazione
    rinnovabile: boolean("rinnovabile").default(false).notNull(),
    // 'ele_go' (quota coperta da garanzie d'origine) è un DETTAGLIO di 'ele':
    // va escluso da tutti i totali, altrimenti l'energia si conta due volte.
    sub: boolean("sub").default(false).notNull(),
    colore: text("colore"),
    kwhUnita: numeric("kwh_unita").notNull(), // potere calorifico inferiore
    tepUnita: numeric("tep_unita").notNull(), // energia primaria (convenzione diagnosi)
    feUnita: numeric("fe_unita").notNull(), // kgCO2e/unità
    feMarket: numeric("fe_market"), // solo 'ele': residual mix nazionale
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("energy_vector_set_key_uq").on(t.setId, t.key)],
);

// 4 aree funzionali della diagnosi energetica.
export const energyArea = pgTable(
  "energy_area",
  {
    id: text("id").primaryKey(), // es. 'energy-v1:P'
    setId: text("set_id").notNull().references(() => contentSet.id),
    key: text("key", { enum: ["P", "A", "G", "T"] }).notNull(),
    nome: text("nome").notNull(),
    descrizione: text("descrizione").notNull(),
    colore: text("colore").notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("energy_area_set_key_uq").on(t.setId, t.key)],
);

// 20 usi finali, ciascuno con la guida operativa per determinarlo.
export const energyEndUse = pgTable(
  "energy_end_use",
  {
    id: text("id").primaryKey(), // es. 'energy-v1:U01'
    setId: text("set_id").notNull().references(() => contentSet.id),
    key: text("key").notNull(), // 'U01'..'U20'
    areaKey: text("area_key").notNull(),
    nome: text("nome").notNull(),
    // { def, come[], stima, flag, ev } — definizione, modi di determinazione in
    // ordine di affidabilità, formula di stima, errore ricorrente, evidenze.
    guida: jsonb("guida").notNull(),
    // Gli 11 usi accesi di default su un nuovo bilancio.
    predefinito: boolean("predefinito").default(false).notNull(),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("energy_end_use_set_key_uq").on(t.setId, t.key)],
);

// 8 variabili di riferimento: i denominatori degli indicatori.
export const energyDriverDefinition = pgTable(
  "energy_driver_definition",
  {
    id: text("id").primaryKey(), // es. 'energy-v1:prod'
    setId: text("set_id").notNull().references(() => contentSet.id),
    key: text("key").notNull(), // 'prod','sup','suptot','vol','add','ore','gg','fatt'
    nome: text("nome").notNull(),
    um: text("um").notNull(),
    hint: text("hint"),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("energy_driver_def_set_key_uq").on(t.setId, t.key)],
);

// 10 indicatori di prestazione: qui vivono SOLO le etichette. Le formule sono
// funzioni e stanno in src/lib/calc/energy/indicators.ts, chiavate sulla stessa
// `key`; un test verifica che catalogo e registro delle formule coincidano.
export const energyIndicator = pgTable(
  "energy_indicator",
  {
    id: text("id").primaryKey(), // es. 'energy-v1:cs'
    setId: text("set_id").notNull().references(() => contentSet.id),
    key: text("key").notNull(), // 'cs','csp','cse','csm2','term','csad','csor','cco2','ceur','cinc'
    nome: text("nome").notNull(),
    um: text("um").notNull(),
    decimali: integer("decimali").notNull(),
    hint: text("hint"),
    ordine: integer("ordine").notNull(),
  },
  (t) => [uniqueIndex("energy_indicator_set_key_uq").on(t.setId, t.key)],
);
