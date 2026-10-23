-- I partner e le loro attribuzioni (23 ottobre 2026). Il perché sta nello schema
-- (`src/lib/db/schema/partner.ts`).
CREATE TABLE "partner" (
	"codice" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"attivo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	-- Il codice si confronta in maiuscolo e senza spazi: lo si pretende anche qui, così due
	-- righe «NGR» e «ngr» non possono esistere insieme.
	CONSTRAINT "partner_codice_ck" CHECK ("codice" ~ '^[A-Z0-9]{2,20}$')
);
--> statement-breakpoint
CREATE TABLE "attribuzione_partner" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"partner_codice" text NOT NULL,
	"origine" text NOT NULL,
	"attribuita_il" timestamp with time zone DEFAULT now() NOT NULL,
	"attribuita_da" text,
	"nota" text,
	CONSTRAINT "attribuzione_partner_origine_ck" CHECK ("origine" IN ('registrazione', 'staff')),
	CONSTRAINT "attribuzione_partner_nota_ck" CHECK ("nota" IS NULL OR char_length("nota") <= 500)
);
--> statement-breakpoint
ALTER TABLE "attribuzione_partner" ADD CONSTRAINT "attribuzione_partner_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribuzione_partner" ADD CONSTRAINT "attribuzione_partner_partner_codice_partner_codice_fk" FOREIGN KEY ("partner_codice") REFERENCES "public"."partner"("codice") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribuzione_partner" ADD CONSTRAINT "attribuzione_partner_attribuita_da_user_id_fk" FOREIGN KEY ("attribuita_da") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attribuzione_partner_partner_idx" ON "attribuzione_partner" USING btree ("partner_codice");--> statement-breakpoint

-- Il primo partner, deciso dal committente.
INSERT INTO "partner" ("codice", "nome") VALUES ('NGR', 'NGR') ON CONFLICT ("codice") DO NOTHING;--> statement-breakpoint

-- RLS. Il registro dei codici non ha studio: lo legge l'iscrizione, che non ha ancora
-- nessun contesto, quindi la lettura è aperta; lo scrive solo lo staff.
ALTER TABLE "partner" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "partner" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "partner_lettura" ON "partner" FOR SELECT TO app_rls USING (true);--> statement-breakpoint
CREATE POLICY "partner_staff" ON "partner" FOR ALL TO app_rls
  USING (current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint

-- L'attribuzione ha uno studio, ma NON la policy di tutti: lo studio la legge e la crea una
-- volta (all'iscrizione, nel proprio contesto), e non può cambiarla né toglierla. Su questa
-- riga si paga una provvigione, e chi la potesse spostare deciderebbe chi viene pagato.
-- Cambio e rimozione sono dello staff. Sta fra le eccezioni scritte di `rls-matrix`.
ALTER TABLE "attribuzione_partner" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attribuzione_partner" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "attribuzione_partner_tenant_rls" ON "attribuzione_partner" FOR SELECT TO app_rls
  USING (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint
CREATE POLICY "attribuzione_partner_crea" ON "attribuzione_partner" FOR INSERT TO app_rls
  WITH CHECK (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint
CREATE POLICY "attribuzione_partner_staff_modifica" ON "attribuzione_partner" FOR UPDATE TO app_rls
  USING (current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint
CREATE POLICY "attribuzione_partner_staff_rimuove" ON "attribuzione_partner" FOR DELETE TO app_rls
  USING (current_setting('app.platform_admin', true) = 'on');
