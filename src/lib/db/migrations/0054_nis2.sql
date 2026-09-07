-- I DUE PERCORSI NIS2 — D.Lgs. 138/2024, di recepimento della Direttiva (UE) 2022/2555.
--
-- Otto tabelle di catalogo (contenuto di piattaforma, nessun `organization_id`) e otto
-- tabelle tenant, piu' una colonna nuova sul corpus.
--
-- ⚠️ RITAGLIATA A MANO dal generato, e la ragione va scritta. `drizzle-kit generate`
-- diffa dall'ultimo SNAPSHOT disponibile, e in questo repository l'ultimo e' lo 0047: le
-- migrazioni 0048÷0053 sono scritte a mano e non ne hanno lasciato uno. Il generatore
-- credeva quindi che `company_contact`, `agenda_voce`, `compenso` e le tabelle del
-- metodo ESG fossero da creare, e la migrazione si fermava alla prima riga con
-- «relation already exists».
--
-- Non e' un difetto del generatore: e' la conseguenza di una convenzione del progetto
-- che il generatore non conosce. Qui si tiene cio' che riguarda NIS2 e si butta il resto.

CREATE TABLE "nis2_assessment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"content_set_id" text NOT NULL,
	"revisione" text DEFAULT '01' NOT NULL,
	"data_adozione" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);;
--> statement-breakpoint
CREATE TABLE "nis2_chapter" (
	"content_set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"ordine" integer NOT NULL,
	CONSTRAINT "nis2_chapter_content_set_id_key_pk" PRIMARY KEY("content_set_id","key")
);;
--> statement-breakpoint
CREATE TABLE "nis2_control" (
	"content_set_id" text NOT NULL,
	"key" text NOT NULL,
	"chapter_key" text NOT NULL,
	"nome" text NOT NULL,
	"descrizione" text NOT NULL,
	"frequenza_giorni" integer NOT NULL,
	"critico" boolean NOT NULL,
	"soa_control_key" text,
	"ordine" integer NOT NULL,
	CONSTRAINT "nis2_control_content_set_id_key_pk" PRIMARY KEY("content_set_id","key")
);;
--> statement-breakpoint
CREATE TABLE "nis2_control_state" (
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"control_key" text NOT NULL,
	"stato" text,
	"responsabile" text,
	"evidenza" text,
	"ultima_verifica" text,
	"note" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nis2_control_state_company_id_control_key_pk" PRIMARY KEY("company_id","control_key")
);;
--> statement-breakpoint
CREATE TABLE "nis2_criterion" (
	"content_set_id" text NOT NULL,
	"key" text NOT NULL,
	"testo" text NOT NULL,
	"classe" text NOT NULL,
	"ordine" integer NOT NULL,
	CONSTRAINT "nis2_criterion_content_set_id_key_pk" PRIMARY KEY("content_set_id","key")
);;
--> statement-breakpoint
CREATE TABLE "nis2_indicator" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"codice" text NOT NULL,
	"nome" text NOT NULL,
	"ambito" text,
	"tipo" text,
	"misura_collegata" text,
	"formula" text,
	"unita" text,
	"fonte" text,
	"frequenza" text DEFAULT 'trimestrale' NOT NULL,
	"responsabile" text,
	"valore_iniziale" text,
	"target" text,
	"soglia" text,
	"verso" text DEFAULT 'crescente' NOT NULL,
	"note" text,
	"ordine" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);;
--> statement-breakpoint
CREATE TABLE "nis2_indicator_def" (
	"content_set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"ambito" text NOT NULL,
	"tipo" text NOT NULL,
	"formula" text NOT NULL,
	"unita" text NOT NULL,
	"frequenza" text NOT NULL,
	"target" integer,
	"verso" text NOT NULL,
	"soglia" integer,
	"ordine" integer NOT NULL,
	CONSTRAINT "nis2_indicator_def_content_set_id_key_pk" PRIMARY KEY("content_set_id","key")
);;
--> statement-breakpoint
CREATE TABLE "nis2_indicator_reading" (
	"organization_id" text NOT NULL,
	"indicator_id" text NOT NULL,
	"periodo" text NOT NULL,
	"valore" text,
	"note" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nis2_indicator_reading_indicator_id_periodo_pk" PRIMARY KEY("indicator_id","periodo")
);;
--> statement-breakpoint
CREATE TABLE "nis2_level" (
	"content_set_id" text NOT NULL,
	"valore" integer NOT NULL,
	"nome" text NOT NULL,
	"descrizione" text NOT NULL,
	"percentuale" integer NOT NULL,
	CONSTRAINT "nis2_level_content_set_id_valore_pk" PRIMARY KEY("content_set_id","valore")
);;
--> statement-breakpoint
CREATE TABLE "nis2_phase" (
	"content_set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"descrizione" text NOT NULL,
	"capitoli" text[] NOT NULL,
	"ordine" integer NOT NULL,
	CONSTRAINT "nis2_phase_content_set_id_key_pk" PRIMARY KEY("content_set_id","key")
);;
--> statement-breakpoint
CREATE TABLE "nis2_phase_state" (
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"phase_key" text NOT NULL,
	"stato" text DEFAULT 'non_avviata' NOT NULL,
	"responsabile" text,
	"scadenza" text,
	"note" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nis2_phase_state_company_id_phase_key_pk" PRIMARY KEY("company_id","phase_key")
);;
--> statement-breakpoint
CREATE TABLE "nis2_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"content_set_id" text NOT NULL,
	"settore" text,
	"dimensione" text,
	"criteri" text[] DEFAULT '{}' NOT NULL,
	"organo" text,
	"responsabile" text,
	"sostituto" text,
	"punto_contatto" text,
	"contatto_recapito" text,
	"comunicazione_il" text,
	"registrazione_il" text,
	"classe_acn" text,
	"obiettivo" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);;
--> statement-breakpoint
CREATE TABLE "nis2_requirement" (
	"content_set_id" text NOT NULL,
	"key" text NOT NULL,
	"chapter_key" text NOT NULL,
	"rif" text NOT NULL,
	"critico" boolean NOT NULL,
	"pro_code" text,
	"testo" text NOT NULL,
	"perimetri" text[] NOT NULL,
	"ordine" integer NOT NULL,
	CONSTRAINT "nis2_requirement_content_set_id_key_pk" PRIMARY KEY("content_set_id","key")
);;
--> statement-breakpoint
CREATE TABLE "nis2_requirement_state" (
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"requirement_key" text NOT NULL,
	"livello" integer,
	"non_applicabile" boolean DEFAULT false NOT NULL,
	"evidenza" text,
	"note" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nis2_requirement_state_company_id_requirement_key_pk" PRIMARY KEY("company_id","requirement_key")
);;
--> statement-breakpoint
CREATE TABLE "nis2_sector" (
	"content_set_id" text NOT NULL,
	"key" text NOT NULL,
	"allegato" integer NOT NULL,
	"ordine" integer NOT NULL,
	CONSTRAINT "nis2_sector_content_set_id_key_pk" PRIMARY KEY("content_set_id","key")
);;
--> statement-breakpoint
CREATE TABLE "nis2_system" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"content_set_id" text NOT NULL,
	"mesi_notifica" integer DEFAULT 9 NOT NULL,
	"mesi_misure" integer DEFAULT 18 NOT NULL,
	"revisione" text DEFAULT '01' NOT NULL,
	"data_adozione" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);;
--> statement-breakpoint
ALTER TABLE "corpus_document" ADD COLUMN "perimetri" text[];;
--> statement-breakpoint
ALTER TABLE "nis2_assessment" ADD CONSTRAINT "nis2_assessment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
ALTER TABLE "nis2_assessment" ADD CONSTRAINT "nis2_assessment_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
ALTER TABLE "nis2_control_state" ADD CONSTRAINT "nis2_control_state_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
ALTER TABLE "nis2_control_state" ADD CONSTRAINT "nis2_control_state_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
ALTER TABLE "nis2_indicator" ADD CONSTRAINT "nis2_indicator_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
ALTER TABLE "nis2_indicator" ADD CONSTRAINT "nis2_indicator_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
ALTER TABLE "nis2_indicator_reading" ADD CONSTRAINT "nis2_indicator_reading_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
ALTER TABLE "nis2_indicator_reading" ADD CONSTRAINT "nis2_indicator_reading_indicator_id_nis2_indicator_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."nis2_indicator"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
ALTER TABLE "nis2_phase_state" ADD CONSTRAINT "nis2_phase_state_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
ALTER TABLE "nis2_phase_state" ADD CONSTRAINT "nis2_phase_state_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
ALTER TABLE "nis2_profile" ADD CONSTRAINT "nis2_profile_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
ALTER TABLE "nis2_profile" ADD CONSTRAINT "nis2_profile_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
ALTER TABLE "nis2_requirement_state" ADD CONSTRAINT "nis2_requirement_state_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
ALTER TABLE "nis2_requirement_state" ADD CONSTRAINT "nis2_requirement_state_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
ALTER TABLE "nis2_system" ADD CONSTRAINT "nis2_system_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
ALTER TABLE "nis2_system" ADD CONSTRAINT "nis2_system_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;;
--> statement-breakpoint
CREATE UNIQUE INDEX "nis2_assessment_company_uq" ON "nis2_assessment" USING btree ("company_id");;
--> statement-breakpoint
CREATE INDEX "nis2_assessment_org_idx" ON "nis2_assessment" USING btree ("organization_id");;
--> statement-breakpoint
CREATE INDEX "nis2_control_set_idx" ON "nis2_control" USING btree ("content_set_id","chapter_key","ordine");;
--> statement-breakpoint
CREATE INDEX "nis2_control_state_org_idx" ON "nis2_control_state" USING btree ("organization_id");;
--> statement-breakpoint
CREATE UNIQUE INDEX "nis2_indicator_company_codice_uq" ON "nis2_indicator" USING btree ("company_id","codice");;
--> statement-breakpoint
CREATE INDEX "nis2_indicator_org_idx" ON "nis2_indicator" USING btree ("organization_id");;
--> statement-breakpoint
CREATE INDEX "nis2_indicator_reading_org_idx" ON "nis2_indicator_reading" USING btree ("organization_id");;
--> statement-breakpoint
CREATE INDEX "nis2_phase_state_org_idx" ON "nis2_phase_state" USING btree ("organization_id");;
--> statement-breakpoint
CREATE UNIQUE INDEX "nis2_profile_company_uq" ON "nis2_profile" USING btree ("company_id");;
--> statement-breakpoint
CREATE INDEX "nis2_profile_org_idx" ON "nis2_profile" USING btree ("organization_id");;
--> statement-breakpoint
CREATE INDEX "nis2_requirement_set_idx" ON "nis2_requirement" USING btree ("content_set_id","chapter_key","ordine");;
--> statement-breakpoint
CREATE INDEX "nis2_requirement_state_org_idx" ON "nis2_requirement_state" USING btree ("organization_id");;
--> statement-breakpoint
CREATE UNIQUE INDEX "nis2_system_company_uq" ON "nis2_system" USING btree ("company_id");;
--> statement-breakpoint
CREATE INDEX "nis2_system_org_idx" ON "nis2_system" USING btree ("organization_id");;
