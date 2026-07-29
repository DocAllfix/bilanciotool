import { pgTable, text, timestamp, jsonb, bigserial, index, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

// Audit log append-only: INSERT sempre permesso al ruolo app, UPDATE/DELETE revocati
// a livello di grant nella migrazione RLS. Mai toccare "di striscio".
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    organizationId: text("organization_id"),
    userId: text("user_id"),
    azione: text("azione").notNull(), // es. 'company.create', 'ghg.entry.update'
    entita: text("entita"),
    entitaId: text("entita_id"),
    dettagli: jsonb("dettagli"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("audit_log_org_idx").on(t.organizationId), index("audit_log_created_idx").on(t.createdAt)],
);

// Onboarding utente (Fase 9): persona derivata dai dati, non da flag.
export const userOnboarding = pgTable(
  "user_onboarding",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["pending", "completed", "skipped"] }).default("pending").notNull(),
    currentStep: text("current_step"),
    completedSteps: jsonb("completed_steps").default([]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex("user_onboarding_user_uq").on(t.userId)],
);
