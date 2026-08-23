import { pgTable, text, timestamp, integer, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { company } from "./tenancy";

// Documenti pubblicati. UNICO punto del sistema dove i valori derivati vengono scritti:
// dentro lo snapshot JSONB immutabile (niente UPDATE: ri-pubblicare = nuova versione).
export const documentSnapshot = pgTable(
  "document_snapshot",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    tipo: text("tipo", { enum: ["ghg", "bilancio", "energetico", "attestato", "soa", "relazione_pc", "matrice_pc", "matrice_231", "relazione_odv"] }).notNull(),
    anno: integer("anno").notNull(),
    versione: integer("versione").notNull(),
    dati: jsonb("dati").notNull(), // tutti i dati risolti + derivati calcolati alla pubblicazione
    pdfStorageKey: text("pdf_storage_key"),
    publishedBy: text("published_by").notNull(),
    publishedAt: timestamp("published_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("document_snapshot_uq").on(t.companyId, t.tipo, t.anno, t.versione),
    index("document_snapshot_org_idx").on(t.organizationId),
  ],
);
