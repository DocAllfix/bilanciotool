CREATE TABLE "chain_area" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chain_dimension" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"descrizione" text NOT NULL,
	"scala" text[] NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chain_flag_def" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chain_partner" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"program_id" text NOT NULL,
	"nome" text NOT NULL,
	"codice_interno" text,
	"livello" text,
	"categoria" text,
	"paese" text,
	"sito" text,
	"attivita" text,
	"addetti" integer,
	"somministrati" integer,
	"migranti" text,
	"agenzie" text,
	"subappalto" text,
	"spesa" numeric(16, 2),
	"quota_fatturato" numeric(6, 2),
	"sostituibilita" text,
	"rapporto_dal" text,
	"qualifica" text,
	"qualifica_valida_al" text,
	"codice_condotta" text,
	"clausole" text,
	"cascading" text,
	"canale_affisso" text,
	"stato" text DEFAULT 'Attivo' NOT NULL,
	"flag" text[] DEFAULT '{}' NOT NULL,
	"note" text,
	"ordine" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chain_partner_score" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"partner_id" text NOT NULL,
	"genere" text NOT NULL,
	"chiave" text NOT NULL,
	"valore" integer NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chain_phase" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"descrizione" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chain_program" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"content_set_id" text NOT NULL,
	"ragione" text,
	"forma" text,
	"piva" text,
	"sede" text,
	"settore" text,
	"addetti" text,
	"responsabile" text,
	"organo" text,
	"reclami_canale" text,
	"politica" text,
	"perimetro" text,
	"esclusioni" text,
	"riesame_data" text,
	"riesame_esito" text,
	"data_adozione" text,
	"revisione" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chain_area" ADD CONSTRAINT "chain_area_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_dimension" ADD CONSTRAINT "chain_dimension_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_flag_def" ADD CONSTRAINT "chain_flag_def_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_partner" ADD CONSTRAINT "chain_partner_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_partner" ADD CONSTRAINT "chain_partner_program_id_chain_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."chain_program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_partner_score" ADD CONSTRAINT "chain_partner_score_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_partner_score" ADD CONSTRAINT "chain_partner_score_partner_id_chain_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."chain_partner"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_phase" ADD CONSTRAINT "chain_phase_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_program" ADD CONSTRAINT "chain_program_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_program" ADD CONSTRAINT "chain_program_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_program" ADD CONSTRAINT "chain_program_content_set_id_content_set_id_fk" FOREIGN KEY ("content_set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chain_area_set_key_uq" ON "chain_area" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "chain_dim_set_key_uq" ON "chain_dimension" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "chain_flag_set_key_uq" ON "chain_flag_def" USING btree ("set_id","key");--> statement-breakpoint
CREATE INDEX "chain_partner_prog_idx" ON "chain_partner" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "chain_partner_org_idx" ON "chain_partner" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chain_score_uq" ON "chain_partner_score" USING btree ("partner_id","genere","chiave");--> statement-breakpoint
CREATE INDEX "chain_score_org_idx" ON "chain_partner_score" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chain_phase_set_key_uq" ON "chain_phase" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "chain_program_company_uq" ON "chain_program" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "chain_program_org_idx" ON "chain_program" USING btree ("organization_id");