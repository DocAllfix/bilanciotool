CREATE TABLE "energy_area" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"descrizione" text NOT NULL,
	"colore" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_driver_definition" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"um" text NOT NULL,
	"hint" text,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_end_use" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"area_key" text NOT NULL,
	"nome" text NOT NULL,
	"guida" jsonb NOT NULL,
	"predefinito" boolean DEFAULT false NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_indicator" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"um" text NOT NULL,
	"decimali" integer NOT NULL,
	"hint" text,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_vector" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"um" text NOT NULL,
	"categoria" text NOT NULL,
	"rinnovabile" boolean DEFAULT false NOT NULL,
	"sub" boolean DEFAULT false NOT NULL,
	"colore" text,
	"kwh_unita" numeric NOT NULL,
	"tep_unita" numeric NOT NULL,
	"fe_unita" numeric NOT NULL,
	"fe_market" numeric,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_allocation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"balance_id" text NOT NULL,
	"uso_key" text NOT NULL,
	"vettore_key" text NOT NULL,
	"quantita" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_balance" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"anno" integer NOT NULL,
	"anno_base" integer NOT NULL,
	"content_set_id" text NOT NULL,
	"standard" text DEFAULT 'UNI CEI EN 16247-1 — diagnosi energetica' NOT NULL,
	"profilo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_company_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"key" text NOT NULL,
	"kwh_unita" numeric,
	"tep_unita" numeric,
	"fe_unita" numeric,
	"fe_market" numeric,
	"fonte" text,
	"note" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_driver_value" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"anno" integer NOT NULL,
	"driver_key" text NOT NULL,
	"valore" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_end_use_state" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"balance_id" text NOT NULL,
	"uso_key" text NOT NULL,
	"attivo" boolean DEFAULT true NOT NULL,
	"metodo" text,
	"stima_vettore_key" text,
	"stima_kw" numeric,
	"stima_ore" numeric,
	"stima_fattore_carico" numeric,
	"nota" text
);
--> statement-breakpoint
CREATE TABLE "energy_measure" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"balance_id" text NOT NULL,
	"descrizione" text DEFAULT '' NOT NULL,
	"vettore_key" text NOT NULL,
	"quantita" numeric,
	"investimento" numeric,
	"incentivo" numeric,
	"uso_key" text,
	"stato" text DEFAULT 'proposto' NOT NULL,
	"anno_previsto" integer,
	"note" text,
	"posizione" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_media" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"narrative_id" text NOT NULL,
	"tipo" text NOT NULL,
	"storage_key" text,
	"chart_key" text,
	"didascalia" text,
	"credito" text,
	"larghezza" text DEFAULT 'piena' NOT NULL,
	"posizione" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_narrative" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"balance_id" text NOT NULL,
	"template_key" text NOT NULL,
	"contenuto" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_vector_input" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"balance_id" text NOT NULL,
	"vettore_key" text NOT NULL,
	"quantita" numeric,
	"costo" numeric,
	"mensili" jsonb DEFAULT '["","","","","","","","","","","",""]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "energy_area" ADD CONSTRAINT "energy_area_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_driver_definition" ADD CONSTRAINT "energy_driver_definition_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_end_use" ADD CONSTRAINT "energy_end_use_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_indicator" ADD CONSTRAINT "energy_indicator_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_vector" ADD CONSTRAINT "energy_vector_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_allocation" ADD CONSTRAINT "energy_allocation_balance_id_energy_balance_id_fk" FOREIGN KEY ("balance_id") REFERENCES "public"."energy_balance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_balance" ADD CONSTRAINT "energy_balance_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_balance" ADD CONSTRAINT "energy_balance_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_company_factor" ADD CONSTRAINT "energy_company_factor_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_driver_value" ADD CONSTRAINT "energy_driver_value_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_end_use_state" ADD CONSTRAINT "energy_end_use_state_balance_id_energy_balance_id_fk" FOREIGN KEY ("balance_id") REFERENCES "public"."energy_balance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_measure" ADD CONSTRAINT "energy_measure_balance_id_energy_balance_id_fk" FOREIGN KEY ("balance_id") REFERENCES "public"."energy_balance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_media" ADD CONSTRAINT "energy_media_narrative_id_energy_narrative_id_fk" FOREIGN KEY ("narrative_id") REFERENCES "public"."energy_narrative"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_narrative" ADD CONSTRAINT "energy_narrative_balance_id_energy_balance_id_fk" FOREIGN KEY ("balance_id") REFERENCES "public"."energy_balance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_vector_input" ADD CONSTRAINT "energy_vector_input_balance_id_energy_balance_id_fk" FOREIGN KEY ("balance_id") REFERENCES "public"."energy_balance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "energy_area_set_key_uq" ON "energy_area" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "energy_driver_def_set_key_uq" ON "energy_driver_definition" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "energy_end_use_set_key_uq" ON "energy_end_use" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "energy_indicator_set_key_uq" ON "energy_indicator" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "energy_vector_set_key_uq" ON "energy_vector" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "energy_allocation_uq" ON "energy_allocation" USING btree ("balance_id","uso_key","vettore_key");--> statement-breakpoint
CREATE INDEX "energy_allocation_balance_idx" ON "energy_allocation" USING btree ("balance_id");--> statement-breakpoint
CREATE INDEX "energy_allocation_org_idx" ON "energy_allocation" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "energy_balance_company_anno_uq" ON "energy_balance" USING btree ("company_id","anno");--> statement-breakpoint
CREATE INDEX "energy_balance_org_idx" ON "energy_balance" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "energy_company_factor_uq" ON "energy_company_factor" USING btree ("company_id","key");--> statement-breakpoint
CREATE INDEX "energy_company_factor_org_idx" ON "energy_company_factor" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "energy_driver_value_uq" ON "energy_driver_value" USING btree ("company_id","anno","driver_key");--> statement-breakpoint
CREATE INDEX "energy_driver_value_org_idx" ON "energy_driver_value" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "energy_end_use_state_uq" ON "energy_end_use_state" USING btree ("balance_id","uso_key");--> statement-breakpoint
CREATE INDEX "energy_end_use_state_org_idx" ON "energy_end_use_state" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "energy_measure_balance_idx" ON "energy_measure" USING btree ("balance_id");--> statement-breakpoint
CREATE INDEX "energy_measure_org_idx" ON "energy_measure" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "energy_media_narrative_idx" ON "energy_media" USING btree ("narrative_id");--> statement-breakpoint
CREATE INDEX "energy_media_org_idx" ON "energy_media" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "energy_narrative_uq" ON "energy_narrative" USING btree ("balance_id","template_key");--> statement-breakpoint
CREATE INDEX "energy_narrative_org_idx" ON "energy_narrative" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "energy_vector_input_uq" ON "energy_vector_input" USING btree ("balance_id","vettore_key");--> statement-breakpoint
CREATE INDEX "energy_vector_input_org_idx" ON "energy_vector_input" USING btree ("organization_id");