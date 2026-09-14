-- L'assistenza: ticket e messaggi.
--
-- ⚠️ La policy è sull'UTENTE, non sull'organizzazione: un ticket lo vede chi l'ha aperto,
-- e lo staff di piattaforma. Un collega dello stesso studio NO (decisione del committente,
-- come in Evalis Academy). Per questo le due tabelle hanno `organization_id` ma non una
-- policy `*_tenant_rls`, e stanno fra le eccezioni scritte di `rls-matrix.db.test.ts`.
--
-- ⚠️ Il ramo `platform_admin` è la coda staff. Lo impostano solo le funzioni della coda,
-- dietro `requirePlatformAdmin`, che rilegge il ruolo dal database a ogni richiesta.
CREATE TABLE IF NOT EXISTS "assistenza_ticket" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "oggetto" text NOT NULL,
  "stato" text DEFAULT 'aperto' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "assistenza_ticket_stato_ck" CHECK ("stato" IN ('aperto', 'in_attesa', 'chiuso')),
  CONSTRAINT "assistenza_ticket_oggetto_ck" CHECK (length(btrim("oggetto")) BETWEEN 1 AND 200)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assistenza_messaggio" (
  "id" text PRIMARY KEY NOT NULL,
  "ticket_id" text NOT NULL REFERENCES "assistenza_ticket"("id") ON DELETE CASCADE,
  "autore_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "staff" boolean DEFAULT false NOT NULL,
  "testo" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "assistenza_messaggio_testo_ck" CHECK (length(btrim("testo")) BETWEEN 1 AND 8000)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistenza_ticket_user_idx" ON "assistenza_ticket" ("user_id", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistenza_ticket_stato_idx" ON "assistenza_ticket" ("stato", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistenza_messaggio_ticket_idx" ON "assistenza_messaggio" ("ticket_id", "created_at");
--> statement-breakpoint
ALTER TABLE "assistenza_ticket" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "assistenza_ticket" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "assistenza_ticket_utente_rls" ON "assistenza_ticket"
  FOR ALL TO app_rls
  USING (user_id = current_setting('app.user_id', true)
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (user_id = current_setting('app.user_id', true)
         OR current_setting('app.platform_admin', true) = 'on');
--> statement-breakpoint
ALTER TABLE "assistenza_messaggio" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "assistenza_messaggio" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- I messaggi seguono il loro ticket. Nessuna ricorsione: il ticket non guarda i messaggi.
CREATE POLICY "assistenza_messaggio_utente_rls" ON "assistenza_messaggio"
  FOR ALL TO app_rls
  USING (EXISTS (SELECT 1 FROM "assistenza_ticket" t WHERE t.id = ticket_id
                 AND (t.user_id = current_setting('app.user_id', true)
                      OR current_setting('app.platform_admin', true) = 'on')))
  WITH CHECK (EXISTS (SELECT 1 FROM "assistenza_ticket" t WHERE t.id = ticket_id
                 AND (t.user_id = current_setting('app.user_id', true)
                      OR current_setting('app.platform_admin', true) = 'on')));
