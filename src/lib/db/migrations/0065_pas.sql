-- Il percorso Sistema di gestione sociale (PAS 24000:2022): cataloghi del content set `pas-v1`
-- e tabelle tenant.
--
-- ⚠️ SCRITTA DALLO SCHEMA, non a mano: `drizzle-kit export` sul solo `schema/pas.ts`, come la
-- 0062. `drizzle-kit generate` non si puo' usare: dalla 0055 in poi le migrazioni sono scritte a
-- mano e senza snapshot, e il generatore rifarebbe un diff con tabelle gia' esistenti.
--
-- RLS, CHECK dei domini e trigger `azienda_scrivibile` stanno nella 0066: vanno nello stesso
-- rilascio, perche' RLS forzata senza policy e' un deny-all che in sviluppo non si vede.

CREATE TABLE "pas_attivita" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"mese" integer NOT NULL,
	"attivita" text DEFAULT '' NOT NULL,
	"riferimento" text,
	"responsabile" text,
	"stato" text DEFAULT 'Da fare' NOT NULL,
	"tipo_key" text,
	"ordine" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_attivita_tipo" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"mese" integer NOT NULL,
	"riferimento" text NOT NULL,
	"attivita" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"data" date,
	"ambito" text,
	"auditor" text,
	"stato" text DEFAULT 'Pianificato' NOT NULL,
	"rilievi" integer,
	"sintesi" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_comunicazione" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"data" date,
	"tipo" text DEFAULT 'Interna' NOT NULL,
	"destinatari" text,
	"canale" text,
	"contenuto" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_consultazione" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"data" date,
	"forma" text DEFAULT 'Riunione con i lavoratori' NOT NULL,
	"partecipanti" integer,
	"condotta_da" text,
	"argomenti" text,
	"esiti" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_contenuto_politica" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"testo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_emergenza" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"data" date,
	"tipo" text DEFAULT 'Prova di evacuazione' NOT NULL,
	"sito" text,
	"responsabile" text,
	"esito" text,
	"azioni" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_fattore" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"tipo" text DEFAULT 'Esterno' NOT NULL,
	"descrizione" text DEFAULT '' NOT NULL,
	"effetto" text DEFAULT 'Rischio' NOT NULL,
	"ordine" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_formazione" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"data" date,
	"tema" text,
	"destinatari" text,
	"docente" text,
	"partecipanti" integer,
	"ore" numeric,
	"efficacia" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_fornitore" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"nome" text DEFAULT '' NOT NULL,
	"categoria" text DEFAULT 'Materie prime' NOT NULL,
	"paese" text DEFAULT 'Italia' NOT NULL,
	"rischio" text,
	"clausola" boolean DEFAULT false NOT NULL,
	"questionario" boolean DEFAULT false NOT NULL,
	"verificato_il" date,
	"esito" text,
	"ordine" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_gruppo" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"natura" text NOT NULL,
	"nome" text NOT NULL,
	"riferimento" text NOT NULL,
	"definizione" text NOT NULL,
	"verifiche" text[] NOT NULL,
	"evidenze" text NOT NULL,
	"attenzione" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_indicatore" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"sezione_key" text NOT NULL,
	"nome" text NOT NULL,
	"unita" text NOT NULL,
	"aiuto" text
);
--> statement-breakpoint
CREATE TABLE "pas_misura" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"anno" integer NOT NULL,
	"indicatore_key" text NOT NULL,
	"valore" numeric NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_non_conformita" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"data" date,
	"origine" text,
	"requisito" text,
	"responsabile" text,
	"descrizione" text,
	"cause" text,
	"azione" text,
	"scadenza" date,
	"chiusa_il" date,
	"efficacia" text DEFAULT 'Da verificare' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_obiettivo" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"obiettivo" text DEFAULT '' NOT NULL,
	"area" text DEFAULT 'A6' NOT NULL,
	"indicatore" text,
	"traguardo" text,
	"scadenza" date,
	"responsabile" text,
	"risorse" text,
	"stato" text DEFAULT 'In corso' NOT NULL,
	"ordine" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_parte" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"nome" text DEFAULT '' NOT NULL,
	"esigenze" text DEFAULT '' NOT NULL,
	"obbligo" boolean DEFAULT false NOT NULL,
	"gestita" boolean DEFAULT true NOT NULL,
	"coinvolgimento" text DEFAULT '' NOT NULL,
	"tipo_key" text,
	"ordine" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_parte_tipo" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"nome" text NOT NULL,
	"esigenze" text NOT NULL,
	"obbligo" boolean NOT NULL,
	"coinvolgimento" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_reclamo" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"data" date,
	"canale" text,
	"provenienza" text,
	"area" text,
	"oggetto" text,
	"istruttoria" text,
	"responsabile" text,
	"chiuso_il" date,
	"esito" text DEFAULT 'In istruttoria' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_requisito" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"gruppo_key" text NOT NULL,
	"riferimento" text NOT NULL,
	"testo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_requisito_stato" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"requisito_key" text NOT NULL,
	"stato" text,
	"evidenza" text,
	"azione" text,
	"responsabile" text,
	"scadenza" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_riesame" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"data" date,
	"partecipanti" text,
	"comunicato_il" date,
	"risorse" text,
	"idoneita" text,
	"miglioramento" text,
	"modifiche" text,
	"azioni" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_rischio" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"area" text DEFAULT 'A1' NOT NULL,
	"ambito" text DEFAULT 'O' NOT NULL,
	"testo" text DEFAULT '' NOT NULL,
	"probabilita" integer,
	"gravita" integer,
	"misure" text,
	"responsabile" text,
	"tipo_key" text,
	"ordine" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_rischio_tipo" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"area" text NOT NULL,
	"ambito" text NOT NULL,
	"testo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_scala" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"asse" text NOT NULL,
	"valore" integer NOT NULL,
	"nome" text NOT NULL,
	"descrizione" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_sezione" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"nome" text NOT NULL,
	"riferimento" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_system" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"content_set_id" text NOT NULL,
	"forma" text,
	"piva" text,
	"sede" text,
	"settore" text,
	"ateco" text,
	"ccnl" text,
	"siti" text,
	"campo" text,
	"direzione" text,
	"responsabile" text,
	"rappresentanti" text,
	"contatto" text,
	"param_ore_ordinarie" integer DEFAULT 48 NOT NULL,
	"param_ore_totali" integer DEFAULT 60 NOT NULL,
	"param_settimane" integer DEFAULT 46 NOT NULL,
	"param_alto" integer DEFAULT 15 NOT NULL,
	"param_medio" integer DEFAULT 8 NOT NULL,
	"param_giorni_reclamo" integer DEFAULT 30 NOT NULL,
	"politica_testo" text,
	"politica_contenuti" text[] DEFAULT '{}' NOT NULL,
	"politica_approvata_il" date,
	"politica_firma" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pas_testo" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"testo" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pas_attivita" ADD CONSTRAINT "pas_attivita_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_attivita" ADD CONSTRAINT "pas_attivita_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_attivita_tipo" ADD CONSTRAINT "pas_attivita_tipo_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_audit" ADD CONSTRAINT "pas_audit_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_audit" ADD CONSTRAINT "pas_audit_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_comunicazione" ADD CONSTRAINT "pas_comunicazione_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_comunicazione" ADD CONSTRAINT "pas_comunicazione_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_consultazione" ADD CONSTRAINT "pas_consultazione_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_consultazione" ADD CONSTRAINT "pas_consultazione_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_contenuto_politica" ADD CONSTRAINT "pas_contenuto_politica_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_emergenza" ADD CONSTRAINT "pas_emergenza_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_emergenza" ADD CONSTRAINT "pas_emergenza_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_fattore" ADD CONSTRAINT "pas_fattore_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_fattore" ADD CONSTRAINT "pas_fattore_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_formazione" ADD CONSTRAINT "pas_formazione_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_formazione" ADD CONSTRAINT "pas_formazione_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_fornitore" ADD CONSTRAINT "pas_fornitore_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_fornitore" ADD CONSTRAINT "pas_fornitore_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_gruppo" ADD CONSTRAINT "pas_gruppo_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_indicatore" ADD CONSTRAINT "pas_indicatore_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_misura" ADD CONSTRAINT "pas_misura_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_misura" ADD CONSTRAINT "pas_misura_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_non_conformita" ADD CONSTRAINT "pas_non_conformita_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_non_conformita" ADD CONSTRAINT "pas_non_conformita_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_obiettivo" ADD CONSTRAINT "pas_obiettivo_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_obiettivo" ADD CONSTRAINT "pas_obiettivo_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_parte" ADD CONSTRAINT "pas_parte_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_parte" ADD CONSTRAINT "pas_parte_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_parte_tipo" ADD CONSTRAINT "pas_parte_tipo_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_reclamo" ADD CONSTRAINT "pas_reclamo_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_reclamo" ADD CONSTRAINT "pas_reclamo_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_requisito" ADD CONSTRAINT "pas_requisito_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_requisito_stato" ADD CONSTRAINT "pas_requisito_stato_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_requisito_stato" ADD CONSTRAINT "pas_requisito_stato_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_riesame" ADD CONSTRAINT "pas_riesame_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_riesame" ADD CONSTRAINT "pas_riesame_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_rischio" ADD CONSTRAINT "pas_rischio_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_rischio" ADD CONSTRAINT "pas_rischio_system_id_pas_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."pas_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_rischio_tipo" ADD CONSTRAINT "pas_rischio_tipo_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_scala" ADD CONSTRAINT "pas_scala_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_sezione" ADD CONSTRAINT "pas_sezione_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_system" ADD CONSTRAINT "pas_system_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_system" ADD CONSTRAINT "pas_system_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_system" ADD CONSTRAINT "pas_system_content_set_id_content_set_id_fk" FOREIGN KEY ("content_set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pas_testo" ADD CONSTRAINT "pas_testo_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "pas_attivita_system_idx" ON "pas_attivita" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "pas_attivita_org_idx" ON "pas_attivita" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_attivita_tipo_uq" ON "pas_attivita" USING btree ("system_id","tipo_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_attivita_tipo_set_key_uq" ON "pas_attivita_tipo" USING btree ("set_id","key");
--> statement-breakpoint
CREATE INDEX "pas_audit_system_idx" ON "pas_audit" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "pas_audit_org_idx" ON "pas_audit" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "pas_comunicazione_system_idx" ON "pas_comunicazione" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "pas_comunicazione_org_idx" ON "pas_comunicazione" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "pas_consultazione_system_idx" ON "pas_consultazione" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "pas_consultazione_org_idx" ON "pas_consultazione" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_contenuto_politica_set_key_uq" ON "pas_contenuto_politica" USING btree ("set_id","key");
--> statement-breakpoint
CREATE INDEX "pas_emergenza_system_idx" ON "pas_emergenza" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "pas_emergenza_org_idx" ON "pas_emergenza" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "pas_fattore_system_idx" ON "pas_fattore" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "pas_fattore_org_idx" ON "pas_fattore" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "pas_formazione_system_idx" ON "pas_formazione" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "pas_formazione_org_idx" ON "pas_formazione" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "pas_fornitore_system_idx" ON "pas_fornitore" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "pas_fornitore_org_idx" ON "pas_fornitore" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_gruppo_set_key_uq" ON "pas_gruppo" USING btree ("set_id","key");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_indicatore_set_key_uq" ON "pas_indicatore" USING btree ("set_id","key");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_misura_uq" ON "pas_misura" USING btree ("system_id","anno","indicatore_key");
--> statement-breakpoint
CREATE INDEX "pas_misura_org_idx" ON "pas_misura" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "pas_non_conformita_system_idx" ON "pas_non_conformita" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "pas_non_conformita_org_idx" ON "pas_non_conformita" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "pas_obiettivo_system_idx" ON "pas_obiettivo" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "pas_obiettivo_org_idx" ON "pas_obiettivo" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "pas_parte_system_idx" ON "pas_parte" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "pas_parte_org_idx" ON "pas_parte" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_parte_tipo_uq" ON "pas_parte" USING btree ("system_id","tipo_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_parte_tipo_set_key_uq" ON "pas_parte_tipo" USING btree ("set_id","key");
--> statement-breakpoint
CREATE INDEX "pas_reclamo_system_idx" ON "pas_reclamo" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "pas_reclamo_org_idx" ON "pas_reclamo" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_requisito_set_key_uq" ON "pas_requisito" USING btree ("set_id","key");
--> statement-breakpoint
CREATE INDEX "pas_requisito_gruppo_idx" ON "pas_requisito" USING btree ("set_id","gruppo_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_requisito_stato_uq" ON "pas_requisito_stato" USING btree ("system_id","requisito_key");
--> statement-breakpoint
CREATE INDEX "pas_requisito_stato_org_idx" ON "pas_requisito_stato" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "pas_riesame_system_idx" ON "pas_riesame" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "pas_riesame_org_idx" ON "pas_riesame" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "pas_rischio_system_idx" ON "pas_rischio" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "pas_rischio_org_idx" ON "pas_rischio" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_rischio_tipo_uq" ON "pas_rischio" USING btree ("system_id","tipo_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_rischio_tipo_set_key_uq" ON "pas_rischio_tipo" USING btree ("set_id","key");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_scala_set_key_uq" ON "pas_scala" USING btree ("set_id","key");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_sezione_set_key_uq" ON "pas_sezione" USING btree ("set_id","key");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_system_company_uq" ON "pas_system" USING btree ("company_id");
--> statement-breakpoint
CREATE INDEX "pas_system_org_idx" ON "pas_system" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "pas_testo_set_key_uq" ON "pas_testo" USING btree ("set_id","key");
