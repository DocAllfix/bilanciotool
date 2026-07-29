import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { organization } from "./auth";

// Config di piattaforma modificabile senza deploy (limiti anti-abuso, feature flag).
// NON-tenant: passthrough RLS scoped ad app_rls, scrivibile solo dallo staff.
export const platformConfig = pgTable("platform_config", {
  key: text("key").primaryKey(), // es. 'limits'
  value: jsonb("value").notNull(), // es. { maxActiveCompanies:10, warnAtCompanies:8, maxMembers:5 }
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Stato di entitlement per organizzazione. Fonte di verità del paywall.
// Fino alla Fase 9 muta solo manualmente/da test; poi lo muove il provisioning Stripe.
export const orgEntitlement = pgTable("org_entitlement", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["demo", "active", "past_due", "expired"] })
    .default("demo")
    .notNull(),
  demoStartedAt: timestamp("demo_started_at").defaultNow().notNull(),
  activatedAt: timestamp("activated_at"),
  currentPeriodEnd: timestamp("current_period_end"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
