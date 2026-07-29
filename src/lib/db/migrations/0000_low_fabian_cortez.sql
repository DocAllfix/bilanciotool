CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"platform_role" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"nome" text NOT NULL,
	"piva" text,
	"settore" text,
	"ateco" text,
	"sede" text,
	"stato" text DEFAULT 'active' NOT NULL,
	"logo_storage_key" text,
	"cover_storage_key" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "company_referent" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_entitlement" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'demo' NOT NULL,
	"demo_started_at" timestamp DEFAULT now() NOT NULL,
	"activated_at" timestamp,
	"current_period_end" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ateco_suggestion" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"macro_settore" text NOT NULL,
	"descrizione" text NOT NULL,
	"punteggi" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_requirement" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"clausola" text NOT NULL,
	"nome" text NOT NULL,
	"descrizione" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_set" (
	"id" text PRIMARY KEY NOT NULL,
	"dominio" text NOT NULL,
	"versione" integer NOT NULL,
	"note" text,
	"published_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emission_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"gruppo" text NOT NULL,
	"nome" text NOT NULL,
	"um" text NOT NULL,
	"fe" numeric NOT NULL,
	"fe_market" numeric,
	"fe_biogenic" numeric,
	"category_key" text NOT NULL,
	"source_type_key" text NOT NULL,
	"fonte" text
);
--> statement-breakpoint
CREATE TABLE "ghg_category" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"scope" integer NOT NULL,
	"descrizione" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ghg_source_type" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"category_key" text NOT NULL,
	"nome" text NOT NULL,
	"descrizione" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gwp_set" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"valori" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_definition" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"section_key" text NOT NULL,
	"nome" text NOT NULL,
	"um" text NOT NULL,
	"hint" text,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_section" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"riferimenti" text NOT NULL,
	"pillar" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materiality_topic" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"pillar" text NOT NULL,
	"nome" text NOT NULL,
	"riferimenti" text NOT NULL,
	"guida" jsonb NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "narrative_template" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"hint" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating_scale" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"livelli" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ghg_activity_row" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"inventory_id" text NOT NULL,
	"source_type_key" text NOT NULL,
	"category_key" text NOT NULL,
	"sede" text,
	"descrizione" text,
	"factor_key" text,
	"um" text NOT NULL,
	"quantita" numeric NOT NULL,
	"fe" numeric NOT NULL,
	"fe_market" numeric,
	"quota_go" numeric,
	"fe_biogenic" numeric,
	"dq" text DEFAULT 'F' NOT NULL,
	"incertezza" numeric,
	"evidenza" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ghg_checklist_status" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"inventory_id" text NOT NULL,
	"requirement_key" text NOT NULL,
	"stato" text NOT NULL,
	"nota" text
);
--> statement-breakpoint
CREATE TABLE "ghg_inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"anno" integer NOT NULL,
	"anno_base" integer NOT NULL,
	"gwp_set_key" text DEFAULT 'AR6' NOT NULL,
	"content_set_id" text NOT NULL,
	"boundaries" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ricavi" numeric,
	"fte" numeric,
	"produzione" numeric,
	"um_produzione" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ghg_org_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"key" text NOT NULL,
	"base_factor_key" text,
	"gruppo" text NOT NULL,
	"nome" text NOT NULL,
	"um" text NOT NULL,
	"fe" numeric NOT NULL,
	"fe_market" numeric,
	"fe_biogenic" numeric,
	"category_key" text NOT NULL,
	"source_type_key" text NOT NULL,
	"fonte" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ghg_source_selection" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"inventory_id" text NOT NULL,
	"source_type_key" text NOT NULL,
	"stato" text NOT NULL,
	"motivazione" text
);
--> statement-breakpoint
CREATE TABLE "ghg_target" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"nome" text NOT NULL,
	"ambito" text NOT NULL,
	"riduzione_pct" numeric NOT NULL,
	"anno_target" integer NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_value" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"anno" integer NOT NULL,
	"kpi_key" text NOT NULL,
	"valore" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materiality_assessment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"topic_key" text NOT NULL,
	"score_impact" integer,
	"score_financial" integer,
	"nota" text
);
--> statement-breakpoint
CREATE TABLE "media_asset" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"section_id" text NOT NULL,
	"tipo" text NOT NULL,
	"storage_key" text,
	"chart_key" text,
	"didascalia" text,
	"credito" text,
	"larghezza" text DEFAULT 'full' NOT NULL,
	"posizione" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "narrative_section" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"template_key" text NOT NULL,
	"contenuto" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_project" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"anno" integer NOT NULL,
	"content_set_id" text NOT NULL,
	"standard" text DEFAULT 'GRI 2021 — opzione con riferimento' NOT NULL,
	"perimetro" text,
	"profilo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"soglia_materialita" numeric DEFAULT '3' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_management" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"topic_key" text NOT NULL,
	"politica" text,
	"azioni" text,
	"target" text,
	"anno_base" text,
	"anno_target" text,
	"responsabile" text
);
--> statement-breakpoint
CREATE TABLE "document_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"tipo" text NOT NULL,
	"anno" integer NOT NULL,
	"versione" integer NOT NULL,
	"dati" jsonb NOT NULL,
	"pdf_storage_key" text,
	"published_by" text NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_customer" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_customer_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "stripe_processed_event" (
	"event_id" text PRIMARY KEY NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"stripe_schedule_id" text,
	"status" text NOT NULL,
	"fase" text,
	"current_period_end" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_subscription_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" text,
	"user_id" text,
	"azione" text NOT NULL,
	"entita" text,
	"entita_id" text,
	"dettagli" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_onboarding" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"current_step" text,
	"completed_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_referent" ADD CONSTRAINT "company_referent_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_referent" ADD CONSTRAINT "company_referent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_entitlement" ADD CONSTRAINT "org_entitlement_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ateco_suggestion" ADD CONSTRAINT "ateco_suggestion_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_requirement" ADD CONSTRAINT "checklist_requirement_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emission_factor" ADD CONSTRAINT "emission_factor_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghg_category" ADD CONSTRAINT "ghg_category_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghg_source_type" ADD CONSTRAINT "ghg_source_type_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gwp_set" ADD CONSTRAINT "gwp_set_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_definition" ADD CONSTRAINT "kpi_definition_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_section" ADD CONSTRAINT "kpi_section_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materiality_topic" ADD CONSTRAINT "materiality_topic_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "narrative_template" ADD CONSTRAINT "narrative_template_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_scale" ADD CONSTRAINT "rating_scale_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghg_activity_row" ADD CONSTRAINT "ghg_activity_row_inventory_id_ghg_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."ghg_inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghg_checklist_status" ADD CONSTRAINT "ghg_checklist_status_inventory_id_ghg_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."ghg_inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghg_inventory" ADD CONSTRAINT "ghg_inventory_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghg_inventory" ADD CONSTRAINT "ghg_inventory_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghg_org_factor" ADD CONSTRAINT "ghg_org_factor_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghg_source_selection" ADD CONSTRAINT "ghg_source_selection_inventory_id_ghg_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."ghg_inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghg_target" ADD CONSTRAINT "ghg_target_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_value" ADD CONSTRAINT "kpi_value_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materiality_assessment" ADD CONSTRAINT "materiality_assessment_project_id_report_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_section_id_narrative_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."narrative_section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "narrative_section" ADD CONSTRAINT "narrative_section_project_id_report_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_project" ADD CONSTRAINT "report_project_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_project" ADD CONSTRAINT "report_project_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_management" ADD CONSTRAINT "topic_management_project_id_report_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."report_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_snapshot" ADD CONSTRAINT "document_snapshot_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_snapshot" ADD CONSTRAINT "document_snapshot_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_customer" ADD CONSTRAINT "stripe_customer_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_subscription" ADD CONSTRAINT "stripe_subscription_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitation_org_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_org_user_uq" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "member_user_id_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "company_org_idx" ON "company" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_referent_uq" ON "company_referent" USING btree ("company_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ateco_suggestion_set_macro_uq" ON "ateco_suggestion" USING btree ("set_id","macro_settore");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_req_set_key_uq" ON "checklist_requirement" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "content_set_dom_ver_uq" ON "content_set" USING btree ("dominio","versione");--> statement-breakpoint
CREATE UNIQUE INDEX "emission_factor_set_key_uq" ON "emission_factor" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "ghg_category_set_key_uq" ON "ghg_category" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "ghg_source_type_set_key_uq" ON "ghg_source_type" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "gwp_set_set_key_uq" ON "gwp_set" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "kpi_definition_set_key_uq" ON "kpi_definition" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "kpi_section_set_key_uq" ON "kpi_section" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "materiality_topic_set_key_uq" ON "materiality_topic" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "narrative_template_set_key_uq" ON "narrative_template" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "rating_scale_set_key_uq" ON "rating_scale" USING btree ("set_id","key");--> statement-breakpoint
CREATE INDEX "ghg_activity_inventory_idx" ON "ghg_activity_row" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "ghg_activity_org_idx" ON "ghg_activity_row" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ghg_checklist_uq" ON "ghg_checklist_status" USING btree ("inventory_id","requirement_key");--> statement-breakpoint
CREATE INDEX "ghg_checklist_org_idx" ON "ghg_checklist_status" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ghg_inventory_company_anno_uq" ON "ghg_inventory" USING btree ("company_id","anno");--> statement-breakpoint
CREATE INDEX "ghg_inventory_org_idx" ON "ghg_inventory" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ghg_org_factor_uq" ON "ghg_org_factor" USING btree ("organization_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "ghg_source_sel_uq" ON "ghg_source_selection" USING btree ("inventory_id","source_type_key");--> statement-breakpoint
CREATE INDEX "ghg_source_sel_org_idx" ON "ghg_source_selection" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ghg_target_company_idx" ON "ghg_target" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ghg_target_org_idx" ON "ghg_target" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kpi_value_uq" ON "kpi_value" USING btree ("company_id","anno","kpi_key");--> statement-breakpoint
CREATE INDEX "kpi_value_org_idx" ON "kpi_value" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "materiality_uq" ON "materiality_assessment" USING btree ("project_id","topic_key");--> statement-breakpoint
CREATE INDEX "materiality_org_idx" ON "materiality_assessment" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "media_asset_section_idx" ON "media_asset" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "media_asset_org_idx" ON "media_asset" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "narrative_section_uq" ON "narrative_section" USING btree ("project_id","template_key");--> statement-breakpoint
CREATE INDEX "narrative_section_org_idx" ON "narrative_section" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_project_company_anno_uq" ON "report_project" USING btree ("company_id","anno");--> statement-breakpoint
CREATE INDEX "report_project_org_idx" ON "report_project" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "topic_mgmt_uq" ON "topic_management" USING btree ("project_id","topic_key");--> statement-breakpoint
CREATE INDEX "topic_mgmt_org_idx" ON "topic_management" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_snapshot_uq" ON "document_snapshot" USING btree ("company_id","tipo","anno","versione");--> statement-breakpoint
CREATE INDEX "document_snapshot_org_idx" ON "document_snapshot" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "stripe_sub_org_idx" ON "stripe_subscription" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_log_org_idx" ON "audit_log" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_onboarding_user_uq" ON "user_onboarding" USING btree ("user_id");