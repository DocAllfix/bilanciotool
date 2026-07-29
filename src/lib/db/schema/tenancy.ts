import { pgTable, text, timestamp, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

// Aziende clienti del tenant (portafoglio dello studio). Tabella TENANT: RLS su organization_id.
export const company = pgTable(
  "company",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    piva: text("piva"),
    settore: text("settore"),
    ateco: text("ateco"),
    sede: text("sede"),
    // active conta nei limiti anti-abuso; archived = sola lettura, non conta, mai cancellata.
    stato: text("stato", { enum: ["active", "archived"] }).default("active").notNull(),
    // Immagini del documento (chiavi Storage, mai dataURL in colonna).
    logoStorageKey: text("logo_storage_key"),
    coverStorageKey: text("cover_storage_key"),
    // Flag per l'azienda demo pre-compilata: esclusa dai limiti e dalle statistiche.
    isDemo: boolean("is_demo").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    archivedAt: timestamp("archived_at"),
  },
  (t) => [index("company_org_idx").on(t.organizationId)],
);

// Fase 2 di prodotto (disattivata in V1): accesso del referente aziendale a UNA company.
export const companyReferent = pgTable(
  "company_referent",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["editor", "viewer"] }).default("editor").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("company_referent_uq").on(t.companyId, t.userId)],
);
