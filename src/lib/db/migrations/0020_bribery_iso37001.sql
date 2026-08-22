CREATE TABLE "bribery_chapter" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"descrizione" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bribery_dimension" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"etichetta" text NOT NULL,
	"descrizione" text NOT NULL,
	"scala" jsonb NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bribery_flag" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"etichetta" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bribery_partner" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"nome" text NOT NULL,
	"categoria" text,
	"paese_operativita" text,
	"sede" text,
	"oggetto" text,
	"titolari_effettivi" text,
	"valore_annuo" numeric(18, 2),
	"remunerazione" text,
	"attivo_dal" text,
	"controllata" text,
	"adeguamento" text,
	"dim_paese" smallint,
	"dim_pubblici_ufficiali" smallint,
	"dim_natura" smallint,
	"dim_valore" smallint,
	"flag_successo" boolean DEFAULT false NOT NULL,
	"flag_cliente" boolean DEFAULT false NOT NULL,
	"flag_titolarita" boolean DEFAULT false NOT NULL,
	"flag_precedenti" boolean DEFAULT false NOT NULL,
	"flag_legami" boolean DEFAULT false NOT NULL,
	"flag_pagamenti" boolean DEFAULT false NOT NULL,
	"due_diligence_il" text,
	"due_diligence_esito" text,
	"due_diligence_note" text,
	"politica_comunicata" text,
	"impegni" text,
	"impegni_note" text,
	"clausole" text,
	"controlli" text,
	"formazione_il" text,
	"verifica_corrispettivo" text,
	"stato" text DEFAULT 'Attivo' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bribery_requirement" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"chapter_key" text NOT NULL,
	"riferimento" text NOT NULL,
	"procedura" text,
	"testo" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bribery_requirement_state" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"requirement_key" text NOT NULL,
	"stato" text,
	"note" text,
	"evidenza" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bribery_system" (
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
	"paesi" text,
	"direzione" text,
	"organo_gov" text,
	"organo_comp" text,
	"funzione_pc" text,
	"funzione_pc_impegno" text,
	"funzione_pc_dirigente" text,
	"odv" text,
	"pubblici_ufficiali" text,
	"canale_email" text,
	"canale_url" text,
	"canale_telefono" text,
	"canale_terzo" text,
	"canale_lingue" text,
	"scopo" text,
	"esclusioni" text,
	"data_adozione" text,
	"revisione" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bribery_chapter" ADD CONSTRAINT "bribery_chapter_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bribery_dimension" ADD CONSTRAINT "bribery_dimension_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bribery_flag" ADD CONSTRAINT "bribery_flag_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_system_id_bribery_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."bribery_system"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bribery_requirement" ADD CONSTRAINT "bribery_requirement_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bribery_requirement_state" ADD CONSTRAINT "bribery_requirement_state_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bribery_requirement_state" ADD CONSTRAINT "bribery_requirement_state_system_id_bribery_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."bribery_system"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bribery_system" ADD CONSTRAINT "bribery_system_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bribery_system" ADD CONSTRAINT "bribery_system_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bribery_system" ADD CONSTRAINT "bribery_system_content_set_id_content_set_id_fk" FOREIGN KEY ("content_set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bribery_chapter_set_key_uq" ON "bribery_chapter" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "bribery_dimension_set_key_uq" ON "bribery_dimension" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "bribery_flag_set_key_uq" ON "bribery_flag" USING btree ("set_id","key");--> statement-breakpoint
CREATE INDEX "bribery_partner_system_idx" ON "bribery_partner" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "bribery_partner_org_idx" ON "bribery_partner" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bribery_requirement_set_key_uq" ON "bribery_requirement" USING btree ("set_id","key");--> statement-breakpoint
CREATE INDEX "bribery_requirement_set_cap_idx" ON "bribery_requirement" USING btree ("set_id","chapter_key");--> statement-breakpoint
CREATE UNIQUE INDEX "bribery_req_state_uq" ON "bribery_requirement_state" USING btree ("system_id","requirement_key");--> statement-breakpoint
CREATE INDEX "bribery_req_state_org_idx" ON "bribery_requirement_state" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bribery_system_company_uq" ON "bribery_system" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "bribery_system_org_idx" ON "bribery_system" USING btree ("organization_id");