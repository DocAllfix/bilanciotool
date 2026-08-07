import { pgTable, text, timestamp, boolean, integer, bigint, index, uniqueIndex } from "drizzle-orm/pg-core";

// Tabelle Better Auth (core + organization plugin). I nomi delle proprietà devono
// combaciare con i model di better-auth; le colonne sono snake_case.
// organization = il tenant (lo studio). Le aziende clienti stanno in tenancy.ts.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  // Ruolo di PIATTAFORMA (noi, il vendor): null = utente normale, 'admin' = staff.
  // additionalFields con input:false → non auto-assegnabile dal client.
  platformRole: text("platform_role"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activeOrganizationId: text("active_organization_id"),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logo: text("logo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: text("metadata"),
});

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // owner | admin | member (ruoli per-org dello studio)
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("member_org_user_uq").on(t.organizationId, t.userId),
    index("member_user_id_idx").on(t.userId),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    // Better Auth la pretende su ogni sua tabella: senza, l'adattatore Drizzle rifiuta
    // l'inserimento e **nessun invito parte**. Era l'unica delle sette tabelle di auth a
    // non averla, e il guasto non si vedeva perché nessun test passava dalle API di invito.
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("invitation_email_idx").on(t.email), index("invitation_org_idx").on(t.organizationId)],
);

/**
 * Contatore del rate limiting di Better Auth.
 *
 * Su database e non in memoria: su Vercel ogni funzione ha la propria memoria, e un
 * contatore per istanza si azzera a ogni avvio a freddo. Chi prova mille password non
 * incontrerebbe mai il limite — basta che le richieste cadano su istanze diverse.
 *
 * Non è una tabella tenant: non ha `organization_id` e la chiave è l'indirizzo di rete,
 * che precede qualunque sessione. Sta col passthrough delle altre tabelle di Better Auth.
 */
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  /** Better Auth compone qui indirizzo e rotta. */
  key: text("key").notNull(),
  count: integer("count").notNull(),
  /** Millisecondi epoch: lo scrive Better Auth, non è un timestamp Postgres. */
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
