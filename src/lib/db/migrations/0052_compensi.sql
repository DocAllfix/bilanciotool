-- I COMPENSI DELLO STUDIO: quanto e' stato concordato, quanto e' arrivato.
--
-- ⚠️ Il vincolo piu' importante non e' in questo file e non e' una colonna: e' che
-- queste due tabelle non compaiano in nessuna query del PORTALE CLIENTE, che serve
-- i documenti di un'azienda senza sessione a chi ha il collegamento. Un importo che
-- ci finisse sarebbe il prezzo di uno studio visibile al cliente che lo paga.
-- La difesa e' che il compenso vive dove quella rotta non guarda, non un filtro che
-- deve restare giusto per sempre.

CREATE TABLE IF NOT EXISTS "compenso" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "company_id" text NOT NULL REFERENCES "company"("id") ON DELETE cascade,
  "descrizione" text NOT NULL,
  "importo" integer NOT NULL,
  "stato" text DEFAULT 'concordato' NOT NULL,
  "scadenza" text,
  "note" text,
  "creato_da" text REFERENCES "user"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compenso_org_idx" ON "compenso" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compenso_company_idx" ON "compenso" ("company_id");--> statement-breakpoint

ALTER TABLE "compenso" ADD CONSTRAINT "compenso_stato_ck"
  CHECK ("stato" IN ('previsto','concordato','fatturato','incassato'));--> statement-breakpoint

-- ⚠️ NON NEGATIVO, e in centesimi. Un compenso negativo non e' una nota di credito:
-- e' un meno digitato per sbaglio che poi entra in una somma e fa sparire il
-- fatturato di un altro lavoro.
ALTER TABLE "compenso" ADD CONSTRAINT "compenso_importo_ck" CHECK ("importo" >= 0);--> statement-breakpoint

ALTER TABLE "compenso" ADD CONSTRAINT "compenso_descrizione_ck"
  CHECK (length(btrim("descrizione")) > 0);--> statement-breakpoint

ALTER TABLE "compenso" ADD CONSTRAINT "compenso_scadenza_iso_ck"
  CHECK ("scadenza" IS NULL OR ("scadenza" ~ '^\d{4}-\d{2}-\d{2}$' AND ("scadenza")::date IS NOT NULL));--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "compenso_incasso" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "compenso_id" text NOT NULL REFERENCES "compenso"("id") ON DELETE cascade,
  "importo" integer NOT NULL,
  "data" text NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compenso_incasso_compenso_idx" ON "compenso_incasso" ("compenso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compenso_incasso_org_idx" ON "compenso_incasso" ("organization_id");--> statement-breakpoint

-- Un acconto di zero non e' un acconto: e' una riga che sporca la storia senza
-- spostare un centesimo.
ALTER TABLE "compenso_incasso" ADD CONSTRAINT "compenso_incasso_importo_ck"
  CHECK ("importo" > 0);--> statement-breakpoint
ALTER TABLE "compenso_incasso" ADD CONSTRAINT "compenso_incasso_data_iso_ck"
  CHECK ("data" ~ '^\d{4}-\d{2}-\d{2}$' AND ("data")::date IS NOT NULL);--> statement-breakpoint

-- ══════════════════════ isolamento multi-tenant ═════════════════════════════
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['compenso','compenso_incasso'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO app_rls
         USING (organization_id = current_setting(''app.org_id'', true)
                OR current_setting(''app.platform_admin'', true) = ''on'')
         WITH CHECK (organization_id = current_setting(''app.org_id'', true)
                OR current_setting(''app.platform_admin'', true) = ''on'')',
      t || '_tenant_rls', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO app_rls', t);
  END LOOP;
END $$;
