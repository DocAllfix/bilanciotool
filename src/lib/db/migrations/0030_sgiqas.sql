CREATE TABLE "qas_chapter" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qas_indicator" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"codice" text,
	"nome" text NOT NULL,
	"ambito" text,
	"tipo" text,
	"processo" text,
	"finalita" text,
	"formula" text,
	"um" text,
	"fonte" text,
	"frequenza" text,
	"responsabile" text,
	"riferimento_iniziale" text,
	"target" text,
	"soglia" text,
	"verso_positivo" boolean DEFAULT true NOT NULL,
	"obiettivo" text,
	"note" text,
	"ordine" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qas_indicator_default" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"ambito" text,
	"tipo" text,
	"formula" text,
	"um" text,
	"frequenza" text,
	"verso_positivo" boolean DEFAULT true NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qas_measurement" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"indicator_id" text NOT NULL,
	"periodo" text NOT NULL,
	"valore" text,
	"note" text,
	"ordine" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qas_norm" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"norma" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qas_requirement" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"chapter_key" text NOT NULL,
	"riferimento" text NOT NULL,
	"norme" text[] NOT NULL,
	"procedura" text,
	"testo" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qas_requirement_state" (
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
CREATE TABLE "qas_system" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"content_set_id" text NOT NULL,
	"norme" text[] DEFAULT '{"Q","A","S"}' NOT NULL,
	"ragione" text,
	"forma" text,
	"piva" text,
	"sede" text,
	"settore" text,
	"addetti" text,
	"direzione" text,
	"rspp" text,
	"rls" text,
	"medico" text,
	"responsabile_sistema" text,
	"scopo" text,
	"esclusioni" text,
	"siti" text,
	"data_adozione" text,
	"revisione" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- ⚠️ Qui drizzle-kit aveva riemesso `ALTER TABLE wb_system ADD COLUMN ultimo_numero`,
-- che la 0029 aveva gia' aggiunto a mano. Rimossa: su un database vergine la colonna
-- sarebbe stata creata due volte e l'INTERA migrazione sarebbe fallita — come e'
-- successo qui, in silenzio: `drizzle-kit migrate` si e' fermato senza scrivere niente
-- e senza dire perche', e otto tabelle non sono nate.
--
-- La causa: una migrazione scritta A MANO che cambia lo SCHEMA (non solo policy o CHECK)
-- va accompagnata dal suo snapshot in `meta/`, altrimenti il diff successivo la ripete.
-- La convenzione «i companion non hanno snapshot» vale per RLS e domini, non per le
-- colonne.
ALTER TABLE "qas_chapter" ADD CONSTRAINT "qas_chapter_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qas_indicator" ADD CONSTRAINT "qas_indicator_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qas_indicator" ADD CONSTRAINT "qas_indicator_system_id_qas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."qas_system"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qas_indicator_default" ADD CONSTRAINT "qas_indicator_default_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qas_measurement" ADD CONSTRAINT "qas_measurement_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qas_measurement" ADD CONSTRAINT "qas_measurement_indicator_id_qas_indicator_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."qas_indicator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qas_norm" ADD CONSTRAINT "qas_norm_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qas_requirement" ADD CONSTRAINT "qas_requirement_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qas_requirement_state" ADD CONSTRAINT "qas_requirement_state_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qas_requirement_state" ADD CONSTRAINT "qas_requirement_state_system_id_qas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."qas_system"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qas_system" ADD CONSTRAINT "qas_system_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qas_system" ADD CONSTRAINT "qas_system_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qas_system" ADD CONSTRAINT "qas_system_content_set_id_content_set_id_fk" FOREIGN KEY ("content_set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "qas_chapter_set_key_uq" ON "qas_chapter" USING btree ("set_id","key");--> statement-breakpoint
CREATE INDEX "qas_indicator_system_idx" ON "qas_indicator" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "qas_indicator_org_idx" ON "qas_indicator" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qas_indicator_default_set_key_uq" ON "qas_indicator_default" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "qas_measurement_uq" ON "qas_measurement" USING btree ("indicator_id","periodo");--> statement-breakpoint
CREATE INDEX "qas_measurement_org_idx" ON "qas_measurement" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qas_norm_set_key_uq" ON "qas_norm" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "qas_requirement_set_key_uq" ON "qas_requirement" USING btree ("set_id","key");--> statement-breakpoint
CREATE INDEX "qas_requirement_set_cap_idx" ON "qas_requirement" USING btree ("set_id","chapter_key");--> statement-breakpoint
CREATE UNIQUE INDEX "qas_req_state_uq" ON "qas_requirement_state" USING btree ("system_id","requirement_key");--> statement-breakpoint
CREATE INDEX "qas_req_state_org_idx" ON "qas_requirement_state" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qas_system_company_uq" ON "qas_system" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "qas_system_org_idx" ON "qas_system" USING btree ("organization_id");