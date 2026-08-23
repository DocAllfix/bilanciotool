CREATE TABLE "mog_crime" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"family_key" text NOT NULL,
	"titolo" text NOT NULL,
	"descrizione" text,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mog_crime_applicability" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"model_id" text NOT NULL,
	"crime_key" text NOT NULL,
	"applicabile" text,
	"motivazione" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mog_family" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mog_model" (
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
	"organo_amministrativo" text,
	"odv_composizione" text,
	"odv_nomina" text,
	"data_adozione" text,
	"data_delibera" text,
	"scopo" text,
	"esclusioni" text,
	"canale_segnalazione" text,
	"revisione" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mog_pillar" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"descrizione" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mog_process" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"model_id" text NOT NULL,
	"nome" text NOT NULL,
	"area" text,
	"responsabile" text,
	"descrizione" text,
	"presidi" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mog_requirement" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"pillar_key" text NOT NULL,
	"riferimento" text NOT NULL,
	"procedura" text,
	"testo" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mog_requirement_state" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"model_id" text NOT NULL,
	"requirement_key" text NOT NULL,
	"stato" text,
	"note" text,
	"evidenza" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mog_scenario" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"process_id" text NOT NULL,
	"crime_key" text NOT NULL,
	"probabilita" smallint,
	"impatto" smallint,
	"adeguatezza" text,
	"modalita" text,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mog_crime" ADD CONSTRAINT "mog_crime_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mog_crime_applicability" ADD CONSTRAINT "mog_crime_applicability_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mog_crime_applicability" ADD CONSTRAINT "mog_crime_applicability_model_id_mog_model_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."mog_model"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mog_family" ADD CONSTRAINT "mog_family_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mog_model" ADD CONSTRAINT "mog_model_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mog_model" ADD CONSTRAINT "mog_model_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mog_model" ADD CONSTRAINT "mog_model_content_set_id_content_set_id_fk" FOREIGN KEY ("content_set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mog_pillar" ADD CONSTRAINT "mog_pillar_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mog_process" ADD CONSTRAINT "mog_process_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mog_process" ADD CONSTRAINT "mog_process_model_id_mog_model_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."mog_model"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mog_requirement" ADD CONSTRAINT "mog_requirement_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mog_requirement_state" ADD CONSTRAINT "mog_requirement_state_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mog_requirement_state" ADD CONSTRAINT "mog_requirement_state_model_id_mog_model_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."mog_model"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mog_scenario" ADD CONSTRAINT "mog_scenario_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mog_scenario" ADD CONSTRAINT "mog_scenario_process_id_mog_process_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."mog_process"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mog_crime_set_key_uq" ON "mog_crime" USING btree ("set_id","key");--> statement-breakpoint
CREATE INDEX "mog_crime_set_fam_idx" ON "mog_crime" USING btree ("set_id","family_key");--> statement-breakpoint
CREATE UNIQUE INDEX "mog_crime_app_uq" ON "mog_crime_applicability" USING btree ("model_id","crime_key");--> statement-breakpoint
CREATE INDEX "mog_crime_app_org_idx" ON "mog_crime_applicability" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mog_family_set_key_uq" ON "mog_family" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "mog_model_company_uq" ON "mog_model" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "mog_model_org_idx" ON "mog_model" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mog_pillar_set_key_uq" ON "mog_pillar" USING btree ("set_id","key");--> statement-breakpoint
CREATE INDEX "mog_process_model_idx" ON "mog_process" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "mog_process_org_idx" ON "mog_process" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mog_requirement_set_key_uq" ON "mog_requirement" USING btree ("set_id","key");--> statement-breakpoint
CREATE INDEX "mog_requirement_set_pil_idx" ON "mog_requirement" USING btree ("set_id","pillar_key");--> statement-breakpoint
CREATE UNIQUE INDEX "mog_req_state_uq" ON "mog_requirement_state" USING btree ("model_id","requirement_key");--> statement-breakpoint
CREATE INDEX "mog_req_state_org_idx" ON "mog_requirement_state" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mog_scenario_uq" ON "mog_scenario" USING btree ("process_id","crime_key");--> statement-breakpoint
CREATE INDEX "mog_scenario_org_idx" ON "mog_scenario" USING btree ("organization_id");