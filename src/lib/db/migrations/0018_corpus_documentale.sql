-- IL CORPUS DOCUMENTALE: il motore comune dei sei moduli di conformità.
--
-- 447 documenti e 6.489 blocchi di prosa normativa, condivisi da tutti gli studi.
--
-- ⚠️ QUESTA MIGRAZIONE È STATA RISCRITTA A MANO DOPO LA GENERAZIONE.
--
-- `drizzle-kit generate` ha prodotto anche `CREATE TABLE entitlement_event`, le due
-- colonne di `stripe_processed_event` e i loro indici — tutta roba che ESISTE GIÀ, creata
-- dalle migrazioni 0016 e 0017, che erano SQL scritto a mano e quindi non erano finite
-- nell'istantanea che Drizzle usa per il confronto. Applicata come generata, questa
-- migrazione sarebbe fallita alla prima istruzione.
--
-- È il primo guasto che il database di sviluppo ha intercettato, il giorno stesso in cui
-- è stato creato.

-- ============================================================ CATALOGO (piattaforma)

CREATE TABLE "corpus_document" (
	"content_set_id" text NOT NULL,
	"code" text NOT NULL,
	"tipo" text NOT NULL,
	"titolo" text NOT NULL,
	"fase" text,
	"rif" text,
	"pro_code" text,
	"ordine" integer NOT NULL,
	CONSTRAINT "corpus_document_content_set_id_code_pk" PRIMARY KEY("content_set_id","code")
);
--> statement-breakpoint

CREATE TABLE "corpus_block" (
	"content_set_id" text NOT NULL,
	"doc_code" text NOT NULL,
	"block_id" text NOT NULL,
	"ordine" integer NOT NULL,
	"tipo" text NOT NULL,
	"contenuto" jsonb NOT NULL,
	CONSTRAINT "corpus_block_content_set_id_doc_code_block_id_pk" PRIMARY KEY("content_set_id","doc_code","block_id")
);
--> statement-breakpoint

CREATE TABLE "corpus_placeholder" (
	"content_set_id" text NOT NULL,
	"forma" text NOT NULL,
	"genere" text NOT NULL,
	"fonte" text,
	"campo" text,
	CONSTRAINT "corpus_placeholder_content_set_id_forma_pk" PRIMARY KEY("content_set_id","forma")
);
--> statement-breakpoint

-- ============================================================ TENANT

CREATE TABLE "corpus_doc_state" (
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"content_set_id" text NOT NULL,
	"doc_code" text NOT NULL,
	"stato" text DEFAULT 'da_personalizzare' NOT NULL,
	"revisione" text DEFAULT '01' NOT NULL,
	"data_emissione" text,
	"note" text,
	"integrazioni" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "corpus_doc_state_company_id_content_set_id_doc_code_pk" PRIMARY KEY("company_id","content_set_id","doc_code")
);
--> statement-breakpoint

CREATE TABLE "corpus_block_override" (
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"content_set_id" text NOT NULL,
	"doc_code" text NOT NULL,
	"block_id" text NOT NULL,
	"testo" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "corpus_block_override_company_id_content_set_id_doc_code_block_id_pk" PRIMARY KEY("company_id","content_set_id","doc_code","block_id")
);
--> statement-breakpoint

-- ============================================================ CHIAVI ESTERNE
--
-- La più importante è `corpus_block_override_block_fk`: è la ragione per cui i blocchi
-- sono righe e non un jsonb. Rende IMPOSSIBILE scrivere un testo su misura che punta a un
-- blocco inesistente, e rifiuta la cancellazione di una versione del corpus che qualcuno
-- sta usando. Nei prototipi le personalizzazioni erano indicizzate per posizione, e bastava
-- che un blocco si spostasse perché il testo di ogni cliente scivolasse su quello sbagliato.

ALTER TABLE "corpus_block" ADD CONSTRAINT "corpus_block_doc_fk"
  FOREIGN KEY ("content_set_id","doc_code") REFERENCES "public"."corpus_document"("content_set_id","code") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "corpus_doc_state" ADD CONSTRAINT "corpus_doc_state_organization_id_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "corpus_doc_state" ADD CONSTRAINT "corpus_doc_state_company_id_company_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "corpus_doc_state" ADD CONSTRAINT "corpus_doc_state_doc_fk"
  FOREIGN KEY ("content_set_id","doc_code") REFERENCES "public"."corpus_document"("content_set_id","code");
--> statement-breakpoint
ALTER TABLE "corpus_block_override" ADD CONSTRAINT "corpus_block_override_organization_id_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "corpus_block_override" ADD CONSTRAINT "corpus_block_override_company_id_company_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "corpus_block_override" ADD CONSTRAINT "corpus_block_override_block_fk"
  FOREIGN KEY ("content_set_id","doc_code","block_id") REFERENCES "public"."corpus_block"("content_set_id","doc_code","block_id");
--> statement-breakpoint

CREATE INDEX "corpus_document_set_idx" ON "corpus_document" USING btree ("content_set_id","tipo","ordine");
--> statement-breakpoint
CREATE INDEX "corpus_block_doc_idx" ON "corpus_block" USING btree ("content_set_id","doc_code","ordine");
--> statement-breakpoint
CREATE INDEX "corpus_doc_state_org_idx" ON "corpus_doc_state" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "corpus_block_override_org_idx" ON "corpus_block_override" USING btree ("organization_id");
--> statement-breakpoint

-- ============================================================ DOMINI CHIUSI
--
-- Drizzle per `text(enum)` genera soltanto `text`: l'unione vive nei tipi TypeScript e non
-- protegge il database. Uno script di import o una query diretta scriverebbero un valore
-- fuori dominio senza che nulla se ne accorga.

ALTER TABLE "corpus_document" ADD CONSTRAINT "corpus_document_tipo_ck"
  CHECK ("tipo" IN ('procedura', 'modulo'));
--> statement-breakpoint
ALTER TABLE "corpus_block" ADD CONSTRAINT "corpus_block_tipo_ck"
  CHECK ("tipo" IN ('p', 't', 'h', 'sig'));
--> statement-breakpoint
ALTER TABLE "corpus_placeholder" ADD CONSTRAINT "corpus_placeholder_genere_ck"
  CHECK ("genere" IN ('token', 'campo'));
--> statement-breakpoint
ALTER TABLE "corpus_placeholder" ADD CONSTRAINT "corpus_placeholder_fonte_ck"
  CHECK ("fonte" IS NULL OR "fonte" IN ('studio', 'azienda', 'data', 'revisione', 'manuale'));
--> statement-breakpoint
-- Un token deve sapere da dove pescare; un campo da compilare non deve avere una fonte.
ALTER TABLE "corpus_placeholder" ADD CONSTRAINT "corpus_placeholder_coerenza_ck"
  CHECK (("genere" = 'token' AND "fonte" IS NOT NULL) OR ("genere" = 'campo' AND "fonte" IS NULL));
--> statement-breakpoint
ALTER TABLE "corpus_doc_state" ADD CONSTRAINT "corpus_doc_state_stato_ck"
  CHECK ("stato" IN ('da_personalizzare', 'in_redazione', 'approvato', 'non_applicabile'));
--> statement-breakpoint

-- I sei domini nuovi: un content set per modulo, così la versione del corpus di ciascuno
-- si congela indipendentemente dagli altri.
ALTER TABLE "content_set" DROP CONSTRAINT "content_set_dominio_ck";
--> statement-breakpoint
ALTER TABLE "content_set" ADD CONSTRAINT "content_set_dominio_ck"
  CHECK ("dominio" IN ('ghg', 'report', 'energy', 'supplier', 'soa',
                       'mog231', 'iso37001', 'sgiqas', 'sa8000', 'filiera', 'wb'));
--> statement-breakpoint

-- ============================================================ ISOLAMENTO MULTI-TENANT
--
-- Va nello stesso file dello schema: RLS attiva senza policy significa deny-all, e la
-- connessione delle migrazioni è privilegiata, quindi l'assenza di policy non si vede.
-- Il modulo funzionerebbe in locale e restituirebbe zero righe in produzione, in silenzio.

-- Cataloghi: lettura a tutti gli studi, scrittura al solo staff.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['corpus_document','corpus_block','corpus_placeholder'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO app_rls USING (true)', t || '_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO app_rls
         USING (current_setting(''app.platform_admin'', true) = ''on'')
         WITH CHECK (current_setting(''app.platform_admin'', true) = ''on'')',
      t || '_staff', t);
  END LOOP;
END $$;
--> statement-breakpoint

-- Tenant: ciascuno vede e scrive solo il proprio.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['corpus_doc_state','corpus_block_override'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO app_rls
         USING (organization_id = current_setting(''app.org_id'', true)
                OR current_setting(''app.platform_admin'', true) = ''on'')
         WITH CHECK (organization_id = current_setting(''app.org_id'', true)
                OR current_setting(''app.platform_admin'', true) = ''on'')',
      t || '_tenant_rls', t);
  END LOOP;
END $$;
