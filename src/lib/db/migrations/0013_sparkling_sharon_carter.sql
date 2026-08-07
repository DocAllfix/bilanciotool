CREATE TABLE "company_share_link" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"nota" text,
	"creato_da" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"aperture" integer DEFAULT 0 NOT NULL,
	"last_opened_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "company_share_link" ADD CONSTRAINT "company_share_link_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_link" ADD CONSTRAINT "company_share_link_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_share_link" ADD CONSTRAINT "company_share_link_creato_da_user_id_fk" FOREIGN KEY ("creato_da") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_share_link_hash_uq" ON "company_share_link" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "company_share_link_company_idx" ON "company_share_link" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_share_link_org_idx" ON "company_share_link" USING btree ("organization_id");--> statement-breakpoint
-- Isolamento multi-tenant dei collegamenti condivisi.
--
-- Va nello stesso commit dello schema: RLS attiva senza policy e' deny-all, e in sviluppo
-- la connessione e' privilegiata, quindi l'assenza di policy non si vedrebbe. La tabella
-- funzionerebbe in locale e tornerebbe zero righe in produzione, in silenzio.
--
-- NOTA sulla rotta pubblica: chi apre un collegamento non ha ne' sessione ne' organizzazione,
-- quindi quella lettura passa dalla valvola `platform_admin` (che il codice concede solo a
-- quel percorso, dopo aver verificato l'impronta del token). E' il motivo per cui la policy
-- ammette quel caso: senza, il portale cliente non potrebbe funzionare affatto.
ALTER TABLE "company_share_link" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "company_share_link" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "company_share_link_tenant_rls" ON "company_share_link" FOR ALL TO app_rls
  USING (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on');
--> statement-breakpoint
-- Una scadenza deve stare dopo la creazione: un collegamento nato gia' scaduto e' il
-- sintomo di un calcolo sbagliato, e senza vincolo passerebbe inosservato.
ALTER TABLE "company_share_link" ADD CONSTRAINT "company_share_link_scadenza_ck"
  CHECK ("expires_at" > "created_at");
