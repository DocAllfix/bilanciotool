-- Il percorso Protezione dei dati (GDPR): cataloghi del content set `gdpr-v1` e tabelle tenant.
--
-- ⚠️ SCRITTA DALLO SCHEMA, non a mano: `drizzle-kit export` sul solo `schema/gdpr.ts`.
-- `drizzle-kit generate` non si puo' usare: dalla 0055 in poi le migrazioni sono scritte a
-- mano e senza snapshot, e il generatore rifarebbe un diff con tabelle gia' esistenti.
--
-- RLS, CHECK dei domini e trigger `azienda_scrivibile` stanno nella 0063: vanno nello
-- stesso rilascio, perche' RLS forzata senza policy e' un deny-all che in sviluppo non si vede.

CREATE TABLE "gdpr_attivita" (
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
CREATE TABLE "gdpr_attivita_tipo" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"mese" integer NOT NULL,
	"riferimento" text NOT NULL,
	"attivita" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_contenuto_politica" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"testo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_criterio" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"testo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_documento" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"tipo" text NOT NULL,
	"oggetto" text DEFAULT '' NOT NULL,
	"versione" text DEFAULT '1.0' NOT NULL,
	"adottato_il" date,
	"revisione_il" date,
	"stato" text DEFAULT 'Da redigere' NOT NULL,
	"tipo_key" text,
	"ordine" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_documento_tipo" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"tipo" text NOT NULL,
	"oggetto" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_formazione" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"data" date,
	"tema" text,
	"destinatari" text,
	"docente" text,
	"partecipanti" integer,
	"ore" numeric,
	"apprendimento" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_fornitore" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"nome" text DEFAULT '' NOT NULL,
	"servizio" text,
	"qualifica" text DEFAULT 'Responsabile (art. 28)' NOT NULL,
	"paese" text,
	"contratto" text,
	"garanzia" text,
	"verificato_il" date,
	"esito" text,
	"ordine" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_gruppo" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"nome" text NOT NULL,
	"riferimento" text NOT NULL,
	"definizione" text NOT NULL,
	"verifiche" text[] NOT NULL,
	"evidenze" text NOT NULL,
	"attenzione" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_indicatore" (
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
CREATE TABLE "gdpr_misura" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"anno" integer NOT NULL,
	"indicatore_key" text NOT NULL,
	"valore" numeric NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_requisito" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"gruppo_key" text NOT NULL,
	"riferimento" text NOT NULL,
	"testo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_requisito_stato" (
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
CREATE TABLE "gdpr_richiesta" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"ricevuta_il" date,
	"diritto" text DEFAULT 'Accesso (art. 15)' NOT NULL,
	"riferimento" text,
	"canale" text,
	"trattamento" text,
	"proroga" boolean DEFAULT false NOT NULL,
	"riscontro_il" date,
	"esito" text DEFAULT 'In lavorazione' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_riesame" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"data" date,
	"partecipanti" text,
	"relazione" text,
	"adeguatezza" text,
	"miglioramento" text,
	"azioni" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_scala" (
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
CREATE TABLE "gdpr_sezione" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"nome" text NOT NULL,
	"riferimento" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_system" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"content_set_id" text NOT NULL,
	"forma" text,
	"piva" text,
	"sede" text,
	"settore" text,
	"ateco" text,
	"dipendenti" text,
	"siti" text,
	"ruolo" text,
	"legale" text,
	"referente" text,
	"contatto" text,
	"amministratori" text,
	"dpo_a" text,
	"dpo_b" text,
	"dpo_c" text,
	"dpo_nome" text,
	"dpo_contatti" text,
	"dpo_comunicato_il" date,
	"param_alto" integer DEFAULT 15 NOT NULL,
	"param_medio" integer DEFAULT 8 NOT NULL,
	"param_soglia_dpia" integer DEFAULT 2 NOT NULL,
	"politica_testo" text,
	"politica_contenuti" text[] DEFAULT '{}' NOT NULL,
	"politica_approvata_il" date,
	"politica_firma" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_testo" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"testo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_trattamento" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"nome" text DEFAULT '' NOT NULL,
	"ruolo" text DEFAULT 'Titolare' NOT NULL,
	"funzione" text,
	"finalita" text,
	"base" text,
	"bilanciamento" text,
	"interessati" text,
	"destinatari" text,
	"dati" text,
	"particolari" boolean DEFAULT false NOT NULL,
	"condizione9" text,
	"giudiziari" boolean DEFAULT false NOT NULL,
	"trasferimento" boolean DEFAULT false NOT NULL,
	"trasferimento_dettaglio" text,
	"conservazione" text,
	"sistemi" text,
	"misure" text,
	"criteri" text[] DEFAULT '{}' NOT NULL,
	"probabilita" integer,
	"gravita" integer,
	"mitigazione" text,
	"dpia_stato" text DEFAULT 'Da avviare' NOT NULL,
	"dpia_data" date,
	"dpia_necessita" text,
	"dpia_parere" text,
	"dpia_esito" text,
	"tipo_key" text,
	"ordine" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_trattamento_tipo" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"ordine" integer NOT NULL,
	"nome" text NOT NULL,
	"finalita" text NOT NULL,
	"base" text NOT NULL,
	"interessati" text NOT NULL,
	"dati" text NOT NULL,
	"particolari" boolean NOT NULL,
	"condizione9" text NOT NULL,
	"destinatari" text NOT NULL,
	"conservazione" text NOT NULL,
	"criteri" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_verifica" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"data" date,
	"tipo" text DEFAULT 'Audit interno' NOT NULL,
	"ambito" text,
	"svolta_da" text,
	"stato" text DEFAULT 'Pianificato' NOT NULL,
	"rilievi" integer,
	"sintesi" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_verifica_ads" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"data" date,
	"amministratore" text,
	"ambito" text,
	"registrazioni_conservate" text,
	"esito" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_violazione" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"conoscenza_il" timestamp with time zone,
	"natura" text DEFAULT 'Riservatezza' NOT NULL,
	"interessati" integer,
	"rischio" text,
	"descrizione" text,
	"categorie" text,
	"notificata_il" timestamp with time zone,
	"comunicata_il" date,
	"chiusa_il" date,
	"valutazione" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gdpr_attivita" ADD CONSTRAINT "gdpr_attivita_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_attivita" ADD CONSTRAINT "gdpr_attivita_system_id_gdpr_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."gdpr_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_attivita_tipo" ADD CONSTRAINT "gdpr_attivita_tipo_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_contenuto_politica" ADD CONSTRAINT "gdpr_contenuto_politica_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_criterio" ADD CONSTRAINT "gdpr_criterio_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_documento" ADD CONSTRAINT "gdpr_documento_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_documento" ADD CONSTRAINT "gdpr_documento_system_id_gdpr_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."gdpr_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_documento_tipo" ADD CONSTRAINT "gdpr_documento_tipo_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_formazione" ADD CONSTRAINT "gdpr_formazione_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_formazione" ADD CONSTRAINT "gdpr_formazione_system_id_gdpr_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."gdpr_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_fornitore" ADD CONSTRAINT "gdpr_fornitore_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_fornitore" ADD CONSTRAINT "gdpr_fornitore_system_id_gdpr_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."gdpr_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_gruppo" ADD CONSTRAINT "gdpr_gruppo_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_indicatore" ADD CONSTRAINT "gdpr_indicatore_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_misura" ADD CONSTRAINT "gdpr_misura_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_misura" ADD CONSTRAINT "gdpr_misura_system_id_gdpr_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."gdpr_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_requisito" ADD CONSTRAINT "gdpr_requisito_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_requisito_stato" ADD CONSTRAINT "gdpr_requisito_stato_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_requisito_stato" ADD CONSTRAINT "gdpr_requisito_stato_system_id_gdpr_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."gdpr_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_richiesta" ADD CONSTRAINT "gdpr_richiesta_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_richiesta" ADD CONSTRAINT "gdpr_richiesta_system_id_gdpr_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."gdpr_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_riesame" ADD CONSTRAINT "gdpr_riesame_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_riesame" ADD CONSTRAINT "gdpr_riesame_system_id_gdpr_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."gdpr_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_scala" ADD CONSTRAINT "gdpr_scala_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_sezione" ADD CONSTRAINT "gdpr_sezione_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_system" ADD CONSTRAINT "gdpr_system_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_system" ADD CONSTRAINT "gdpr_system_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_system" ADD CONSTRAINT "gdpr_system_content_set_id_content_set_id_fk" FOREIGN KEY ("content_set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_testo" ADD CONSTRAINT "gdpr_testo_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_trattamento" ADD CONSTRAINT "gdpr_trattamento_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_trattamento" ADD CONSTRAINT "gdpr_trattamento_system_id_gdpr_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."gdpr_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_trattamento_tipo" ADD CONSTRAINT "gdpr_trattamento_tipo_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_verifica" ADD CONSTRAINT "gdpr_verifica_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_verifica" ADD CONSTRAINT "gdpr_verifica_system_id_gdpr_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."gdpr_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_verifica_ads" ADD CONSTRAINT "gdpr_verifica_ads_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_verifica_ads" ADD CONSTRAINT "gdpr_verifica_ads_system_id_gdpr_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."gdpr_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_violazione" ADD CONSTRAINT "gdpr_violazione_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gdpr_violazione" ADD CONSTRAINT "gdpr_violazione_system_id_gdpr_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."gdpr_system"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "gdpr_attivita_system_idx" ON "gdpr_attivita" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "gdpr_attivita_org_idx" ON "gdpr_attivita" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_attivita_tipo_uq" ON "gdpr_attivita" USING btree ("system_id","tipo_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_attivita_tipo_set_key_uq" ON "gdpr_attivita_tipo" USING btree ("set_id","key");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_contenuto_politica_set_key_uq" ON "gdpr_contenuto_politica" USING btree ("set_id","key");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_criterio_set_key_uq" ON "gdpr_criterio" USING btree ("set_id","key");
--> statement-breakpoint
CREATE INDEX "gdpr_documento_system_idx" ON "gdpr_documento" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "gdpr_documento_org_idx" ON "gdpr_documento" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_documento_tipo_uq" ON "gdpr_documento" USING btree ("system_id","tipo_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_documento_tipo_set_key_uq" ON "gdpr_documento_tipo" USING btree ("set_id","key");
--> statement-breakpoint
CREATE INDEX "gdpr_formazione_system_idx" ON "gdpr_formazione" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "gdpr_formazione_org_idx" ON "gdpr_formazione" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "gdpr_fornitore_system_idx" ON "gdpr_fornitore" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "gdpr_fornitore_org_idx" ON "gdpr_fornitore" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_gruppo_set_key_uq" ON "gdpr_gruppo" USING btree ("set_id","key");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_indicatore_set_key_uq" ON "gdpr_indicatore" USING btree ("set_id","key");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_misura_uq" ON "gdpr_misura" USING btree ("system_id","anno","indicatore_key");
--> statement-breakpoint
CREATE INDEX "gdpr_misura_org_idx" ON "gdpr_misura" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_requisito_set_key_uq" ON "gdpr_requisito" USING btree ("set_id","key");
--> statement-breakpoint
CREATE INDEX "gdpr_requisito_gruppo_idx" ON "gdpr_requisito" USING btree ("set_id","gruppo_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_requisito_stato_uq" ON "gdpr_requisito_stato" USING btree ("system_id","requisito_key");
--> statement-breakpoint
CREATE INDEX "gdpr_requisito_stato_org_idx" ON "gdpr_requisito_stato" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "gdpr_richiesta_system_idx" ON "gdpr_richiesta" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "gdpr_richiesta_org_idx" ON "gdpr_richiesta" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "gdpr_riesame_system_idx" ON "gdpr_riesame" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "gdpr_riesame_org_idx" ON "gdpr_riesame" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_scala_set_key_uq" ON "gdpr_scala" USING btree ("set_id","key");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_sezione_set_key_uq" ON "gdpr_sezione" USING btree ("set_id","key");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_system_company_uq" ON "gdpr_system" USING btree ("company_id");
--> statement-breakpoint
CREATE INDEX "gdpr_system_org_idx" ON "gdpr_system" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_testo_set_key_uq" ON "gdpr_testo" USING btree ("set_id","key");
--> statement-breakpoint
CREATE INDEX "gdpr_trattamento_system_idx" ON "gdpr_trattamento" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "gdpr_trattamento_org_idx" ON "gdpr_trattamento" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_trattamento_tipo_uq" ON "gdpr_trattamento" USING btree ("system_id","tipo_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "gdpr_trattamento_tipo_set_key_uq" ON "gdpr_trattamento_tipo" USING btree ("set_id","key");
--> statement-breakpoint
CREATE INDEX "gdpr_verifica_system_idx" ON "gdpr_verifica" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "gdpr_verifica_org_idx" ON "gdpr_verifica" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "gdpr_verifica_ads_system_idx" ON "gdpr_verifica_ads" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "gdpr_verifica_ads_org_idx" ON "gdpr_verifica_ads" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "gdpr_violazione_system_idx" ON "gdpr_violazione" USING btree ("system_id");
--> statement-breakpoint
CREATE INDEX "gdpr_violazione_org_idx" ON "gdpr_violazione" USING btree ("organization_id");
