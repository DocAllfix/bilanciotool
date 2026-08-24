CREATE TABLE "sa_criterion" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"section_key" text NOT NULL,
	"group_key" text NOT NULL,
	"testo" text NOT NULL,
	"procedure" text[] DEFAULT '{}' NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sa_criterion_state" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"criterion_key" text NOT NULL,
	"stato" text,
	"note" text,
	"evidenza" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sa_group" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"section_key" text NOT NULL,
	"nome" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sa_section" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sa_system" (
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
	"ccnl" text,
	"resp_sa" text,
	"direzione" text,
	"reclami_email" text,
	"scopo" text,
	"siti" text,
	"data_adozione" text,
	"revisione" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sa_criterion" ADD CONSTRAINT "sa_criterion_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sa_criterion_state" ADD CONSTRAINT "sa_criterion_state_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sa_criterion_state" ADD CONSTRAINT "sa_criterion_state_system_id_sa_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."sa_system"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sa_group" ADD CONSTRAINT "sa_group_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sa_section" ADD CONSTRAINT "sa_section_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sa_system" ADD CONSTRAINT "sa_system_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sa_system" ADD CONSTRAINT "sa_system_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sa_system" ADD CONSTRAINT "sa_system_content_set_id_content_set_id_fk" FOREIGN KEY ("content_set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sa_criterion_set_key_uq" ON "sa_criterion" USING btree ("set_id","key");--> statement-breakpoint
CREATE INDEX "sa_criterion_set_grp_idx" ON "sa_criterion" USING btree ("set_id","group_key");--> statement-breakpoint
CREATE UNIQUE INDEX "sa_crit_state_uq" ON "sa_criterion_state" USING btree ("system_id","criterion_key");--> statement-breakpoint
CREATE INDEX "sa_crit_state_org_idx" ON "sa_criterion_state" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sa_group_set_key_uq" ON "sa_group" USING btree ("set_id","key");--> statement-breakpoint
CREATE INDEX "sa_group_set_sez_idx" ON "sa_group" USING btree ("set_id","section_key");--> statement-breakpoint
CREATE UNIQUE INDEX "sa_section_set_key_uq" ON "sa_section" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "sa_system_company_uq" ON "sa_system" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "sa_system_org_idx" ON "sa_system" USING btree ("organization_id");