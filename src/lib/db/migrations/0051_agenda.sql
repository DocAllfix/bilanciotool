-- L'AGENDA DELLO STUDIO: le date che lo studio decide.
--
-- Non e' lo scadenzario, che si calcola e dice cosa la norma impone. Questa e'
-- l'altra meta': la telefonata al referente, la riunione col consiglio, la
-- consegna promessa per il quindici. I due elenchi restano distinti.
--
-- Schema e policy nello stesso file: RLS attiva senza policy significa deny-all,
-- e in sviluppo non si vedrebbe — la connessione locale e' privilegiata.

CREATE TABLE IF NOT EXISTS "agenda_voce" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "company_id" text REFERENCES "company"("id") ON DELETE cascade,
  "tipo" text NOT NULL,
  "titolo" text NOT NULL,
  "note" text,
  "data" text NOT NULL,
  "stato" text DEFAULT 'aperta' NOT NULL,
  "chiusa_il" timestamp with time zone,
  "creata_da" text REFERENCES "user"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "agenda_voce_org_data_idx" ON "agenda_voce" ("organization_id", "data");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_voce_company_idx" ON "agenda_voce" ("company_id");--> statement-breakpoint

-- I domini chiusi, che Drizzle non genera per `text(enum)`.
ALTER TABLE "agenda_voce" ADD CONSTRAINT "agenda_voce_tipo_ck"
  CHECK ("tipo" IN ('scadenza','milestone','azione'));--> statement-breakpoint
ALTER TABLE "agenda_voce" ADD CONSTRAINT "agenda_voce_stato_ck"
  CHECK ("stato" IN ('aperta','fatta','annullata'));--> statement-breakpoint

-- ⚠️ La data si controlla RICOMPONENDOLA, non con la sola forma: `new Date("2026-02-31")`
-- non solleva, scivola al 3 marzo. Qui il CHECK ferma il formato e il cast ferma il
-- giorno che non esiste — se la stringa non e' una data vera, `::date` solleva.
ALTER TABLE "agenda_voce" ADD CONSTRAINT "agenda_voce_data_iso_ck"
  CHECK ("data" ~ '^\d{4}-\d{2}-\d{2}$' AND ("data")::date IS NOT NULL);--> statement-breakpoint

-- Un titolo vuoto non e' una voce d'agenda: e' una riga che occupa una giornata e
-- non si puo' ne' fare ne' cancellare con cognizione.
ALTER TABLE "agenda_voce" ADD CONSTRAINT "agenda_voce_titolo_non_vuoto_ck"
  CHECK (length(btrim("titolo")) > 0);--> statement-breakpoint

-- Una voce chiusa ha una data di chiusura, una aperta no. Senza questo, il «quando
-- l'ho fatta» sopravviverebbe alla riapertura.
ALTER TABLE "agenda_voce" ADD CONSTRAINT "agenda_voce_chiusa_coerente_ck"
  CHECK (("stato" = 'aperta') = ("chiusa_il" IS NULL));--> statement-breakpoint

-- ══════════════════════ isolamento multi-tenant ═════════════════════════════
ALTER TABLE "agenda_voce" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agenda_voce" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "agenda_voce_tenant_rls" ON "agenda_voce" FOR ALL TO app_rls
  USING (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "agenda_voce" TO app_rls;
