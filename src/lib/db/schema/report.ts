import { pgTable, text, timestamp, integer, numeric, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { company } from "./tenancy";

// Modulo Bilancio di Sostenibilità (GRI/ESRS-VSME). Tabelle TENANT.
// I ~30 KPI derivati NON si persistono: si calcolano da src/lib/calc/report in lettura.
// La sezione emissioni NON copia dati GHG: li legge via bridge (features/report/ghg-bridge).

export const reportProject = pgTable(
  "report_project",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    anno: integer("anno").notNull(),
    contentSetId: text("content_set_id").notNull(),
    standard: text("standard").default("GRI 2021 — opzione con riferimento").notNull(),
    perimetro: text("perimetro"),
    // Profilo organizzazione del passo 1 (campi testuali del prototipo): { forma, piva,
    // sede, settore, ateco, sitiop, mercati, contatto }
    profilo: jsonb("profilo").default({}).notNull(),
    sogliaMaterialita: numeric("soglia_materialita").default("3").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("report_project_company_anno_uq").on(t.companyId, t.anno),
    index("report_project_org_idx").on(t.organizationId),
  ],
);

// Doppia materialità (passo 2): punteggio 1-5 impatto + finanziario per tema.
export const materialityAssessment = pgTable(
  "materiality_assessment",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id")
      .notNull()
      .references(() => reportProject.id, { onDelete: "cascade" }),
    topicKey: text("topic_key").notNull(), // 'T01'..'T18'
    scoreImpact: integer("score_impact"), // 1..5
    scoreFinancial: integer("score_financial"), // 1..5
    nota: text("nota"),
  },
  (t) => [
    uniqueIndex("materiality_uq").on(t.projectId, t.topicKey),
    index("materiality_org_idx").on(t.organizationId),
  ],
);

// Valori KPI (passo 3): per company+anno, NON per progetto — così l'anno precedente
// è un dato autonomo e il confronto biennale è una semplice query.
export const kpiValue = pgTable(
  "kpi_value",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    anno: integer("anno").notNull(),
    kpiKey: text("kpi_key").notNull(), // 'en_ele', 'hr_tot', ...
    valore: numeric("valore").notNull(),
  },
  (t) => [
    uniqueIndex("kpi_value_uq").on(t.companyId, t.anno, t.kpiKey),
    index("kpi_value_org_idx").on(t.organizationId),
  ],
);

// Politiche/azioni/obiettivi per tema materiale (passo 4, schema GRI 3-3 / ESRS MDR).
export const topicManagement = pgTable(
  "topic_management",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id")
      .notNull()
      .references(() => reportProject.id, { onDelete: "cascade" }),
    topicKey: text("topic_key").notNull(),
    politica: text("politica"),
    azioni: text("azioni"),
    target: text("target"),
    annoBase: text("anno_base"),
    annoTarget: text("anno_target"),
    responsabile: text("responsabile"),
  },
  (t) => [
    uniqueIndex("topic_mgmt_uq").on(t.projectId, t.topicKey),
    index("topic_mgmt_org_idx").on(t.organizationId),
  ],
);

// Capitoli narrativi (passo 5): contenuto Tiptap JSON sanificato server-side.
export const narrativeSection = pgTable(
  "narrative_section",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id")
      .notNull()
      .references(() => reportProject.id, { onDelete: "cascade" }),
    templateKey: text("template_key").notNull(), // 'lettera'..'impegni'
    contenuto: jsonb("contenuto"), // doc Tiptap
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("narrative_section_uq").on(t.projectId, t.templateKey),
    index("narrative_section_org_idx").on(t.organizationId),
  ],
);

// Media dei capitoli: foto (Storage) o diagramma auto-generato dai dati.
export const mediaAsset = pgTable(
  "media_asset",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    sectionId: text("section_id")
      .notNull()
      .references(() => narrativeSection.id, { onDelete: "cascade" }),
    tipo: text("tipo", { enum: ["img", "chart"] }).notNull(),
    storageKey: text("storage_key"), // tipo=img
    chartKey: text("chart_key"), // tipo=chart: 'emissioni'|'energia'|...
    didascalia: text("didascalia"),
    credito: text("credito"),
    larghezza: text("larghezza", { enum: ["full", "half"] }).default("full").notNull(),
    posizione: integer("posizione").default(0).notNull(),
  },
  (t) => [index("media_asset_section_idx").on(t.sectionId), index("media_asset_org_idx").on(t.organizationId)],
);
