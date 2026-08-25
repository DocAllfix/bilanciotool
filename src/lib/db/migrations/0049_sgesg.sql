-- IMPLEMENTAZIONE DEL SISTEMA DI GESTIONE ESG — il dodicesimo percorso.
--
-- Schema, domini chiusi e policy RLS nello stesso file: RLS attiva senza policy
-- significa deny-all, e in sviluppo la connessione e' privilegiata (bypassrls),
-- quindi l'assenza di policy non si vedrebbe. Il modulo funzionerebbe qui e
-- restituirebbe zero righe in produzione, in silenzio.

-- Il dominio dei contenuti passa da undici a dodici valori.
ALTER TABLE "content_set" DROP CONSTRAINT IF EXISTS "content_set_dominio_ck";--> statement-breakpoint
ALTER TABLE "content_set" ADD CONSTRAINT "content_set_dominio_ck"
  CHECK ("dominio" = ANY (ARRAY['ghg','report','energy','supplier','soa','mog231',
                               'iso37001','sgiqas','sa8000','filiera','wb','sgesg']));--> statement-breakpoint

-- ─────────────────────────── catalogo delle otto fasi ───────────────────────
CREATE TABLE IF NOT EXISTS "sgesg_fase_def" (
  "id" text PRIMARY KEY NOT NULL,
  "set_id" text NOT NULL REFERENCES "content_set"("id") ON DELETE restrict,
  "key" text NOT NULL,
  "codice" text NOT NULL,
  "nome" text NOT NULL,
  "scopo" text NOT NULL,
  "ordine" integer NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sgesg_fase_def_set_key_uq" ON "sgesg_fase_def" ("set_id", "key");--> statement-breakpoint

-- ─────────────────────────────── il programma ───────────────────────────────
CREATE TABLE IF NOT EXISTS "sgesg_programma" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "company_id" text NOT NULL REFERENCES "company"("id") ON DELETE cascade,
  "content_set_id" text NOT NULL REFERENCES "content_set"("id") ON DELETE restrict,
  "anno" integer NOT NULL,
  "standard" text DEFAULT 'ESRS' NOT NULL,
  "stato" text DEFAULT 'avvio' NOT NULL,
  "responsabile" text,
  "data_inizio" text,
  "data_fine" text,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sgesg_programma_company_anno_uq" ON "sgesg_programma" ("company_id", "anno");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sgesg_programma_org_idx" ON "sgesg_programma" ("organization_id");--> statement-breakpoint

-- I domini chiusi, che Drizzle NON genera per `text(enum)`: senza, l'enum vive solo
-- in TypeScript e una scrittura fuori dall'applicazione — uno script, una query a
-- mano, un import — infilerebbe un valore che nessun ramo del codice sa leggere.
ALTER TABLE "sgesg_programma" ADD CONSTRAINT "sgesg_programma_standard_ck"
  CHECK ("standard" IN ('GRI','ESRS','ENTRAMBI'));--> statement-breakpoint
ALTER TABLE "sgesg_programma" ADD CONSTRAINT "sgesg_programma_stato_ck"
  CHECK ("stato" IN ('avvio','in_corso','sospeso','concluso'));--> statement-breakpoint

-- L'anno di esercizio, entro limiti che sono una prova di sanita' e non una regola
-- di dominio: un 202 o un 20255 sono refusi, e un refuso nell'anno rende il
-- programma irraggiungibile perche' nessuno lo cerchera' mai li'.
ALTER TABLE "sgesg_programma" ADD CONSTRAINT "sgesg_programma_anno_ck"
  CHECK ("anno" BETWEEN 2000 AND 2100);--> statement-breakpoint

-- ⚠️ Le date in ISO, e il CHECK serve. `new Date("2026-02-31")` non solleva: scivola
-- al 3 marzo. Su un programma con date contrattuali un giorno inventato non e'
-- un dettaglio, ed e' gia' costato una correzione nel modulo segnalazioni.
ALTER TABLE "sgesg_programma" ADD CONSTRAINT "sgesg_programma_date_iso_ck"
  CHECK (("data_inizio" IS NULL OR "data_inizio" ~ '^\d{4}-\d{2}-\d{2}$')
     AND ("data_fine"   IS NULL OR "data_fine"   ~ '^\d{4}-\d{2}-\d{2}$'));--> statement-breakpoint

-- ─────────────────────────── lo stato di una fase ───────────────────────────
CREATE TABLE IF NOT EXISTS "sgesg_fase" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "program_id" text NOT NULL REFERENCES "sgesg_programma"("id") ON DELETE cascade,
  "fase_key" text NOT NULL,
  "stato" text DEFAULT 'da_avviare' NOT NULL,
  "note" text,
  "conclusa_il" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sgesg_fase_program_key_uq" ON "sgesg_fase" ("program_id", "fase_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sgesg_fase_org_idx" ON "sgesg_fase" ("organization_id");--> statement-breakpoint
ALTER TABLE "sgesg_fase" ADD CONSTRAINT "sgesg_fase_stato_ck"
  CHECK ("stato" IN ('da_avviare','in_corso','conclusa'));--> statement-breakpoint

-- Una fase conclusa ha una data, una non conclusa non ce l'ha. Senza questo, il
-- «quando e' finita» sopravviverebbe a una riapertura, e il documento della fase 7
-- riporterebbe una data di chiusura per un lavoro riaperto.
ALTER TABLE "sgesg_fase" ADD CONSTRAINT "sgesg_fase_conclusa_coerente_ck"
  CHECK (("stato" = 'conclusa') = ("conclusa_il" IS NOT NULL));--> statement-breakpoint

-- ══════════════════════ isolamento multi-tenant ═════════════════════════════
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sgesg_programma','sgesg_fase'] LOOP
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
END $$;--> statement-breakpoint

-- Il catalogo non e' tenant: si legge da tutti, si scrive solo dallo staff.
ALTER TABLE "sgesg_fase_def" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sgesg_fase_def" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "sgesg_fase_def_read" ON "sgesg_fase_def" FOR SELECT TO app_rls USING (true);--> statement-breakpoint
CREATE POLICY "sgesg_fase_def_staff" ON "sgesg_fase_def" FOR ALL TO app_rls
  USING (current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "sgesg_fase_def" TO app_rls;
