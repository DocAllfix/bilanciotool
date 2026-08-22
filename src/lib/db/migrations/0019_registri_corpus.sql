-- I REGISTRI dei sei moduli: 70 registri, 779 colonne, stesso schema per tutti.
--
-- Le righe registrate vivono in jsonb, e qui e' la scelta giusta al contrario dei blocchi:
-- le colonne cambiano da registro a registro e non esiste una forma tabellare comune. Il
-- dominio lo definisce il catalogo.

CREATE TABLE "corpus_register" (
	"content_set_id" text NOT NULL,
	"register_id" text NOT NULL,
	"nome" text NOT NULL,
	"descrizione" text,
	"mod_code" text,
	"pro_code" text,
	"capitolo" text,
	"ordine" integer NOT NULL,
	CONSTRAINT "corpus_register_content_set_id_register_id_pk" PRIMARY KEY("content_set_id","register_id")
);
--> statement-breakpoint
CREATE TABLE "corpus_register_column" (
	"content_set_id" text NOT NULL,
	"register_id" text NOT NULL,
	"chiave" text NOT NULL,
	"etichetta" text NOT NULL,
	"tipo" text NOT NULL,
	"in_tabella" boolean DEFAULT false NOT NULL,
	"larghezza" text,
	"opzioni" jsonb,
	"prefisso_auto" text,
	"hint" text,
	"ordine" integer NOT NULL,
	CONSTRAINT "corpus_register_column_content_set_id_register_id_chiave_pk" PRIMARY KEY("content_set_id","register_id","chiave")
);
--> statement-breakpoint
CREATE TABLE "corpus_register_row" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"company_id" text NOT NULL,
	"content_set_id" text NOT NULL,
	"register_id" text NOT NULL,
	"numero" integer NOT NULL,
	"riferimento" text,
	"dati" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "corpus_register_column" ADD CONSTRAINT "corpus_register_column_reg_fk" FOREIGN KEY ("content_set_id","register_id") REFERENCES "public"."corpus_register"("content_set_id","register_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpus_register_row" ADD CONSTRAINT "corpus_register_row_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpus_register_row" ADD CONSTRAINT "corpus_register_row_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpus_register_row" ADD CONSTRAINT "corpus_register_row_reg_fk" FOREIGN KEY ("content_set_id","register_id") REFERENCES "public"."corpus_register"("content_set_id","register_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "corpus_register_set_idx" ON "corpus_register" USING btree ("content_set_id","ordine");--> statement-breakpoint
CREATE INDEX "corpus_register_column_reg_idx" ON "corpus_register_column" USING btree ("content_set_id","register_id","ordine");--> statement-breakpoint
CREATE UNIQUE INDEX "corpus_register_row_numero_uq" ON "corpus_register_row" USING btree ("company_id","content_set_id","register_id","numero");--> statement-breakpoint
CREATE INDEX "corpus_register_row_org_idx" ON "corpus_register_row" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "corpus_register_row_reg_idx" ON "corpus_register_row" USING btree ("company_id","content_set_id","register_id","numero");
--> statement-breakpoint

-- ============================================================ DOMINI CHIUSI
-- Drizzle per `text(enum)` genera solo `text`: l'unione vive nei tipi e non nel database.
ALTER TABLE "corpus_register_column" ADD CONSTRAINT "corpus_register_column_tipo_ck"
  CHECK ("tipo" IN ('text', 'ta', 'sel', 'date', 'num', 'crit', 'partner'));
--> statement-breakpoint
-- Il progressivo parte da uno: uno zero o un negativo sarebbero un errore di calcolo.
ALTER TABLE "corpus_register_row" ADD CONSTRAINT "corpus_register_row_numero_ck"
  CHECK ("numero" >= 1);
--> statement-breakpoint

-- ============================================================ ISOLAMENTO
-- Cataloghi: lettura a tutti, scrittura al solo staff.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['corpus_register','corpus_register_column'] LOOP
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

-- Le righe registrate sono dati dell'azienda: ciascuno vede e scrive solo i propri.
ALTER TABLE "corpus_register_row" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "corpus_register_row" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "corpus_register_row_tenant_rls" ON "corpus_register_row" FOR ALL TO app_rls
  USING (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on');
