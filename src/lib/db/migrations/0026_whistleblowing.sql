CREATE TABLE "wb_channel" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"forma" text NOT NULL,
	"attiva" boolean DEFAULT false NOT NULL,
	"descrizione" text,
	"fornitore" text,
	"riservatezza" text,
	"attivato_il" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wb_chapter" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"key" text NOT NULL,
	"nome" text NOT NULL,
	"descrizione" text NOT NULL,
	"ordine" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wb_report" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"system_id" text NOT NULL,
	"numero" integer NOT NULL,
	"data_ricezione" text,
	"canale" text,
	"anonima" boolean DEFAULT false NOT NULL,
	"qualita" text,
	"ambito" text,
	"oggetto" text,
	"fatti" text,
	"quando" text,
	"dove" text,
	"coinvolti" text,
	"elementi" text,
	"altrove" text,
	"incontro_richiesto" text,
	"codice" text,
	"recapito" text,
	"consenso_registrazione" text,
	"verbale_confermato" text,
	"avviso_reso" text,
	"riscontro_reso" text,
	"comunicazione_stato" text,
	"stato" text DEFAULT 'Ricevuta' NOT NULL,
	"amm_oggetto" text,
	"amm_legittimato" text,
	"amm_contesto" text,
	"amm_elementi" text,
	"amm_non_personale" text,
	"amm_motivazione" text,
	"amm_alternativi" text,
	"integrazione_chiesta" text,
	"integrazione_ricevuta" text,
	"conflitto" text,
	"subentrante" text,
	"conflitto_motivo" text,
	"piano" text,
	"rischi_riconoscibilita" text,
	"avvio" text,
	"conclusione" text,
	"attivita" text,
	"persona_sentita" text,
	"audizioni" integer,
	"evidenze" text,
	"esito" text,
	"rilevanza_penale" text,
	"motivazione" text,
	"fatti_non_accertati" text,
	"proposte_disciplinari" text,
	"proposte_correttive" text,
	"destinatari_relazione" text,
	"contenuto_riscontro" text,
	"rit_identita_conoscibile" text,
	"rit_sovraordinato" text,
	"rit_contesto_ristretto" text,
	"rit_precedenti" text,
	"rit_rapporto_precario" text,
	"rit_gia_esposto" text,
	"monitoraggio_aperto" text,
	"monitoraggio_fino" text,
	"monitoraggio_periodicita" text,
	"soggetti_tutelati" text,
	"misure_preventive" text,
	"rilevazioni_monitoraggio" text,
	"identita_rivelata" text,
	"consenso_rivelazione" text,
	"rivelazione_ragioni" text,
	"rivelazione_effetti" text,
	"data_chiusura" text,
	"cancellata" text,
	"data_cancellazione" text,
	"proroga_motivo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wb_requirement" (
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
CREATE TABLE "wb_requirement_state" (
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
CREATE TABLE "wb_system" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"content_set_id" text NOT NULL,
	"ragione" text,
	"forma_giuridica" text,
	"piva" text,
	"sede" text,
	"settore" text,
	"addetti" text,
	"obbligo" text,
	"mog_adottato" text,
	"canale_condiviso" text,
	"gestore_tipo" text,
	"gestore" text,
	"sostituto" text,
	"nomina" text,
	"organo_indirizzo" text,
	"organo_controllo" text,
	"dpo" text,
	"consultazione_sindacale" text,
	"data_adozione" text,
	"revisione" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wb_channel" ADD CONSTRAINT "wb_channel_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wb_channel" ADD CONSTRAINT "wb_channel_system_id_wb_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."wb_system"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wb_chapter" ADD CONSTRAINT "wb_chapter_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_system_id_wb_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."wb_system"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wb_requirement" ADD CONSTRAINT "wb_requirement_set_id_content_set_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wb_requirement_state" ADD CONSTRAINT "wb_requirement_state_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wb_requirement_state" ADD CONSTRAINT "wb_requirement_state_system_id_wb_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."wb_system"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wb_system" ADD CONSTRAINT "wb_system_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wb_system" ADD CONSTRAINT "wb_system_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wb_system" ADD CONSTRAINT "wb_system_content_set_id_content_set_id_fk" FOREIGN KEY ("content_set_id") REFERENCES "public"."content_set"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wb_channel_system_idx" ON "wb_channel" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "wb_channel_org_idx" ON "wb_channel" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wb_chapter_set_key_uq" ON "wb_chapter" USING btree ("set_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "wb_report_numero_uq" ON "wb_report" USING btree ("system_id","numero");--> statement-breakpoint
CREATE INDEX "wb_report_org_idx" ON "wb_report" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "wb_report_stato_idx" ON "wb_report" USING btree ("system_id","stato");--> statement-breakpoint
CREATE UNIQUE INDEX "wb_requirement_set_key_uq" ON "wb_requirement" USING btree ("set_id","key");--> statement-breakpoint
CREATE INDEX "wb_requirement_set_cap_idx" ON "wb_requirement" USING btree ("set_id","chapter_key");--> statement-breakpoint
CREATE UNIQUE INDEX "wb_req_state_uq" ON "wb_requirement_state" USING btree ("system_id","requirement_key");--> statement-breakpoint
CREATE INDEX "wb_req_state_org_idx" ON "wb_requirement_state" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wb_system_company_uq" ON "wb_system" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "wb_system_org_idx" ON "wb_system" USING btree ("organization_id");