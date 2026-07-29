import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { organization } from "./auth";

// Billing Stripe (Fase 9). Il customer appartiene all'ORGANIZZAZIONE, mai all'utente.

export const stripeCustomer = pgTable("stripe_customer", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stripeSubscription = pgTable(
  "stripe_subscription",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    stripeScheduleId: text("stripe_schedule_id"), // Subscription Schedule a 2 fasi
    status: text("status").notNull(), // stato Stripe re-letto, mai dal payload webhook
    fase: text("fase", { enum: ["anno1", "rinnovo"] }),
    currentPeriodEnd: timestamp("current_period_end"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("stripe_sub_org_idx").on(t.organizationId)],
);

// Claim di idempotenza del webhook: insert onConflictDoNothing = replay già processato;
// il claim si rilascia (delete) su failure così Stripe ritenta.
export const stripeProcessedEvent = pgTable("stripe_processed_event", {
  eventId: text("event_id").primaryKey(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});
