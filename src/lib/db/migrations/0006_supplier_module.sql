CREATE TABLE "supplier_area" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"peso" integer NOT NULL,
	"colore" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_question" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"area_key" text NOT NULL,
	"peso" integer NOT NULL,
	"testo" text NOT NULL,
	"riferimento" text NOT NULL,
	"evidenza_attesa" text NOT NULL,
	"giorni_stimati" integer NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_answer" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"assessment_id" text NOT NULL,
	"question_key" text NOT NULL,
	"risposta" text,
	"nota" text,
	"stato_documento" text,
	"responsabile" text,
	"scadenza" text,
	"stato_azione" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_assessment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"content_set_id" text NOT NULL,
	"soglia_richiesta" integer DEFAULT 60 NOT NULL,
	"profilo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supplier_area" ADD CONSTRAINT "supplier_area_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_question" ADD CONSTRAINT "supplier_question_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_answer" ADD CONSTRAINT "supplier_answer_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_answer" ADD CONSTRAINT "supplier_answer_assessment_id_supplier_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."supplier_assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_assessment" ADD CONSTRAINT "supplier_assessment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_assessment" ADD CONSTRAINT "supplier_assessment_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_area_set_key_uq" ON "supplier_area" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_question_set_key_uq" ON "supplier_question" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_answer_assessment_question_uq" ON "supplier_answer" USING btree ("assessment_id","question_key");--> statement-breakpoint
CREATE INDEX "supplier_answer_org_idx" ON "supplier_answer" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_assessment_company_uq" ON "supplier_assessment" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "supplier_assessment_org_idx" ON "supplier_assessment" USING btree ("organization_id");