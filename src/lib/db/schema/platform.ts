import { pgTable, text, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
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

// Stato di entitlement per organizzazione. Fonte di verità del paywall E della capacità.
// Lo muove il provisioning Stripe; prima del pagamento resta 'demo'.
export const orgEntitlement = pgTable("org_entitlement", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["demo", "active", "past_due", "expired"] })
    .default("demo")
    .notNull(),
  // Quale piano è stato comprato. `null` finché non si paga: la capacità resta quella di
  // riserva della piattaforma. I CHECK sui valori ammessi stanno nella migrazione, perché
  // Drizzle per `text(enum)` genera solo `text` e nessun vincolo.
  piano: text("piano", { enum: ["professional", "studio", "studio_plus", "enterprise"] }),
  // Capacità comprata OLTRE il piano. Conta AZIENDE e ACCESSI, non blocchi di vendita:
  // due blocchi da cinque scrivono 10 qui. Vedi `src/lib/prezzi.ts`.
  aziendeExtra: integer("aziende_extra").default(0).notNull(),
  accessiExtra: integer("accessi_extra").default(0).notNull(),
  // Estensione a pagamento: i documenti escono col marchio dello studio.
  whiteLabel: boolean("white_label").default(false).notNull(),
  demoStartedAt: timestamp("demo_started_at").defaultNow().notNull(),
  activatedAt: timestamp("activated_at"),
  currentPeriodEnd: timestamp("current_period_end"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
