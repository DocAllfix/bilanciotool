import { pgTable, text, timestamp, integer, numeric, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { company } from "./tenancy";

// Modulo GHG (ISO 14064-1). Tutte tabelle TENANT (RLS su organization_id).
// REGOLA: nessuna colonna per valori derivati — i calcoli vivono in src/lib/calc
// e si eseguono in lettura; si scrivono solo dentro gli snapshot immutabili.

export const ghgInventory = pgTable(
  "ghg_inventory",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    anno: integer("anno").notNull(),
    annoBase: integer("anno_base").notNull(),
    gwpSetKey: text("gwp_set_key").default("AR6").notNull(),
    contentSetId: text("content_set_id").notNull(), // versione dei contenuti metodologici usata
    // Confini e perimetro (passo 1): campi testuali della norma, validati da zod lato action.
    // { forma, piva, sede, settore, ateco, siti, dipendenti, responsabile, consolidamento,
    //   perimetroOrg, perimetroOp, periodo, significativita, metodologia, verifica,
    //   motivoBase, regolaRicalcolo }
    boundaries: jsonb("boundaries").default({}).notNull(),
    // Dati del periodo per le intensità (input, non derivati).
    ricavi: numeric("ricavi"),
    fte: numeric("fte"),
    produzione: numeric("produzione"),
    umProduzione: text("um_produzione"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("ghg_inventory_company_anno_uq").on(t.companyId, t.anno),
    index("ghg_inventory_org_idx").on(t.organizationId),
  ],
);

// Registro sorgenti (passo 2): stato per ciascuna delle 26 sorgenti.
export const ghgSourceSelection = pgTable(
  "ghg_source_selection",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    inventoryId: text("inventory_id")
      .notNull()
      .references(() => ghgInventory.id, { onDelete: "cascade" }),
    sourceTypeKey: text("source_type_key").notNull(), // '1a'..'6c'
    stato: text("stato", { enum: ["in", "out", "na"] }).notNull(),
    // Obbligatoria per out/na: enforce-ata dalla server action (rilievo d'audit più frequente).
    motivazione: text("motivazione"),
  },
  (t) => [
    uniqueIndex("ghg_source_sel_uq").on(t.inventoryId, t.sourceTypeKey),
    index("ghg_source_sel_org_idx").on(t.organizationId),
  ],
);

// Dati di attività (passi 3-5): una riga per sorgente/sito.
export const ghgActivityRow = pgTable(
  "ghg_activity_row",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    inventoryId: text("inventory_id")
      .notNull()
      .references(() => ghgInventory.id, { onDelete: "cascade" }),
    sourceTypeKey: text("source_type_key").notNull(),
    categoryKey: text("category_key").notNull(), // '1'..'6'
    sede: text("sede"),
    descrizione: text("descrizione"),
    // Riferimento al fattore (libreria piattaforma o override org); i valori applicati
    // si congelano sulla riga per stabilità storica, come nel prototipo.
    factorKey: text("factor_key"), // null = fattore interamente manuale
    um: text("um").notNull(),
    quantita: numeric("quantita").notNull(),
    fe: numeric("fe").notNull(), // kgCO2e/unità applicato
    feMarket: numeric("fe_market"), // solo cat 2 (null = usa fe)
    quotaGo: numeric("quota_go"), // solo cat 2: quota coperta da GO/PPA
    feBiogenic: numeric("fe_biogenic"), // non-cat-2: CO2 biogenica kg/unità
    dq: text("dq", { enum: ["M", "F", "C", "E", "S"] }).default("F").notNull(),
    incertezza: numeric("incertezza"), // % override (null = default del livello dq)
    evidenza: text("evidenza"),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("ghg_activity_inventory_idx").on(t.inventoryId),
    index("ghg_activity_org_idx").on(t.organizationId),
  ],
);

// Libreria fattori per-organizzazione: override e fattori custom (audit in audit_log).
export const ghgOrgFactor = pgTable(
  "ghg_org_factor",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    baseFactorKey: text("base_factor_key"), // null = custom puro
    gruppo: text("gruppo").notNull(),
    nome: text("nome").notNull(),
    um: text("um").notNull(),
    fe: numeric("fe").notNull(),
    feMarket: numeric("fe_market"),
    feBiogenic: numeric("fe_biogenic"),
    categoryKey: text("category_key").notNull(),
    sourceTypeKey: text("source_type_key").notNull(),
    fonte: text("fonte"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex("ghg_org_factor_uq").on(t.organizationId, t.key)],
);

// Obiettivi di riduzione (passo 7).
export const ghgTarget = pgTable(
  "ghg_target",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    ambito: text("ambito", { enum: ["1", "2", "12", "3", "tot"] }).notNull(),
    riduzionePct: numeric("riduzione_pct").notNull(),
    annoTarget: integer("anno_target").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("ghg_target_company_idx").on(t.companyId), index("ghg_target_org_idx").on(t.organizationId)],
);

// Stato checklist di conformità (passo 7 della norma / passo "verifica").
export const ghgChecklistStatus = pgTable(
  "ghg_checklist_status",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    inventoryId: text("inventory_id")
      .notNull()
      .references(() => ghgInventory.id, { onDelete: "cascade" }),
    requirementKey: text("requirement_key").notNull(), // 'v1'..'v15'
    stato: text("stato", { enum: ["ok", "par", "no"] }).notNull(),
    nota: text("nota"),
  },
  (t) => [
    uniqueIndex("ghg_checklist_uq").on(t.inventoryId, t.requirementKey),
    index("ghg_checklist_org_idx").on(t.organizationId),
  ],
);
