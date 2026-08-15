import { pgTable, text, timestamp, index, bigserial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
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
    /** ⚠️ MAI SCRITTA da nessuna parte: e' sempre `null`. Non si toglie perche' un
     *  `DROP COLUMN` su un database di produzione per sola pulizia non vale il rischio,
     *  ma non ci si puo' fare affidamento. La fase in cui si trova un abbonamento si
     *  chiede a Stripe (`subscription.schedule`), oppure si legge dal registro delle
     *  capacita', che ora conserva la storia. */
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
export const stripeProcessedEvent = pgTable(
  "stripe_processed_event",
  {
    eventId: text("event_id").primaryKey(),
    /** `in_corso` finche' il lavoro non e' finito. Distingue «fatto» da «cominciato e
     *  mai finito»: senza, un processo morto a meta' lasciava l'evento marcato come
     *  fatto, Stripe smetteva di ritentare e un cliente pagante restava bloccato. */
    stato: text("stato", { enum: ["in_corso", "completato"] }).default("completato").notNull(),
    /** Quando il claim e' stato preso: e' l'eta' che permette di riconoscerlo morto. */
    presoIl: timestamp("preso_il").defaultNow().notNull(),
    processedAt: timestamp("processed_at").defaultNow().notNull(),
  },
  (t) => [index("stripe_evento_in_corso_idx").on(t.stato, t.presoIl)],
);

/**
 * Il registro append-only delle CAPACITÀ.
 *
 * `org_entitlement` è una riga sola, sovrascritta dall'ultimo evento arrivato: dice che
 * cosa può fare uno studio adesso, non perché. Dopo un anno di rinnovi nessuno può più
 * dire quando è stato attivato la prima volta, quale evento gli ha dato il white label,
 * o perché è finito in sola lettura.
 *
 * Qui ogni cambiamento è una riga nuova. Le due scritture avvengono nella stessa
 * transazione, dallo stesso posto: la riga è la cache, il registro è la storia.
 *
 * NON è una copia del registro monetario di Stripe, e la differenza è deliberata: il
 * nostro database non contiene un solo importo, e il denaro vive in Stripe, che è già
 * immutabile e autorevole. Vedi la migrazione `0017` per il ragionamento completo.
 */
export const entitlementEvent = pgTable(
  "entitlement_event",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** Nessuna FK, come `audit_log`: il registro sopravvive alla cancellazione dello studio. */
    organizationId: text("organization_id").notNull(),
    origine: text("origine", { enum: ["stripe", "manuale", "sistema"] }).notNull(),
    /** Il filo che mancava: quale evento Stripe ha causato questo stato. */
    stripeEventId: text("stripe_event_id"),
    stripeEventType: text("stripe_event_type"),
    subscriptionId: text("subscription_id"),
    /** Quando Stripe l'ha emesso, non quando l'abbiamo scritto. */
    occurredAt: timestamp("occurred_at"),
    /** Oggi viene letto per decidere se mandare un'email, e poi buttato via. */
    statoPrima: text("stato_prima"),
    statoDopo: text("stato_dopo", { enum: ["demo", "active", "past_due", "expired"] }).notNull(),
    piano: text("piano"),
    aziendeExtra: integer("aziende_extra").default(0).notNull(),
    accessiExtra: integer("accessi_extra").default(0).notNull(),
    whiteLabel: boolean("white_label").default(false).notNull(),
    currentPeriodEnd: timestamp("current_period_end"),
    dettagli: jsonb("dettagli").$type<Record<string, unknown>>(),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  },
  (t) => [
    index("entitlement_event_org_idx").on(t.organizationId, t.id),
    index("entitlement_event_stato_idx").on(t.organizationId, t.statoDopo, t.id),
  ],
);
