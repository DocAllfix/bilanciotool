CREATE TABLE "soa_control" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"framework_key" text NOT NULL,
	"section_key" text NOT NULL,
	"controllo_id" text NOT NULL,
	"titolo" text NOT NULL,
	"evidenza_attesa" text NOT NULL,
	"cardine" boolean DEFAULT false NOT NULL,
	"rimandi" text,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soa_framework" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"abbreviazione" text NOT NULL,
	"descrizione" text NOT NULL,
	"sempre_in_ambito" boolean DEFAULT false NOT NULL,
	"colore" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soa_section" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"framework_key" text NOT NULL,
	"nome" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soa_control_decision" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"declaration_id" text NOT NULL,
	"framework_key" text NOT NULL,
	"controllo_id" text NOT NULL,
	"applicabile" boolean DEFAULT true NOT NULL,
	"giustificazione" text,
	"motivazioni" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"stato" text,
	"riferimento_doc" text,
	"responsabile" text,
	"scadenza" text,
	"stato_azione" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soa_declaration" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"content_set_id" text NOT NULL,
	"soglia_obiettivo" integer DEFAULT 80 NOT NULL,
	"ruolo_privacy" text DEFAULT 'titolare' NOT NULL,
	"ruolo_cloud" text DEFAULT 'cliente' NOT NULL,
	"profilo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soa_module" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"declaration_id" text NOT NULL,
	"framework_key" text NOT NULL,
	"attivo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "soa_control" ADD CONSTRAINT "soa_control_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_framework" ADD CONSTRAINT "soa_framework_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_section" ADD CONSTRAINT "soa_section_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_control_decision" ADD CONSTRAINT "soa_control_decision_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_control_decision" ADD CONSTRAINT "soa_control_decision_declaration_id_soa_declaration_id_fk" FOREIGN KEY ("declaration_id") REFERENCES "public"."soa_declaration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_declaration" ADD CONSTRAINT "soa_declaration_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_declaration" ADD CONSTRAINT "soa_declaration_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_module" ADD CONSTRAINT "soa_module_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_module" ADD CONSTRAINT "soa_module_declaration_id_soa_declaration_id_fk" FOREIGN KEY ("declaration_id") REFERENCES "public"."soa_declaration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "soa_control_set_fw_ctl_uq" ON "soa_control" USING btree ("set_id","framework_key","controllo_id");--> statement-breakpoint
CREATE INDEX "soa_control_set_fw_idx" ON "soa_control" USING btree ("set_id","framework_key");--> statement-breakpoint
CREATE UNIQUE INDEX "soa_framework_set_key_uq" ON "soa_framework" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "soa_section_set_key_uq" ON "soa_section" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "soa_decision_decl_fw_ctl_uq" ON "soa_control_decision" USING btree ("declaration_id","framework_key","controllo_id");--> statement-breakpoint
CREATE INDEX "soa_decision_org_idx" ON "soa_control_decision" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "soa_decision_decl_fw_idx" ON "soa_control_decision" USING btree ("declaration_id","framework_key");--> statement-breakpoint
CREATE UNIQUE INDEX "soa_declaration_company_uq" ON "soa_declaration" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "soa_declaration_org_idx" ON "soa_declaration" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "soa_module_decl_fw_uq" ON "soa_module" USING btree ("declaration_id","framework_key");--> statement-breakpoint
CREATE INDEX "soa_module_org_idx" ON "soa_module" USING btree ("organization_id");