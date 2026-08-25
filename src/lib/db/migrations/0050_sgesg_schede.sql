-- LE 63 SCHEDE DEL METODO: catalogo e compilato.
--
-- Il catalogo non e' tenant (si legge da tutti, si scrive dallo staff); il
-- compilato lo e', e porta `organization_id` con la sua policy. RLS attiva senza
-- policy significa deny-all, e in sviluppo non si vedrebbe: la connessione locale
-- e' privilegiata, quindi il modulo funzionerebbe qui e restituirebbe zero righe
-- in produzione, in silenzio.

CREATE TABLE IF NOT EXISTS "sgesg_scheda_def" (
  "id" text PRIMARY KEY NOT NULL,
  "set_id" text NOT NULL REFERENCES "content_set"("id") ON DELETE restrict,
  "key" text NOT NULL,
  "fase_key" text NOT NULL,
  "codice" text,
  "titolo" text NOT NULL,
  "sottotitolo" text,
  "istruzione" text,
  "sezioni" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "ha_logica" boolean DEFAULT false NOT NULL,
  "ordine" integer NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sgesg_scheda_def_set_key_uq" ON "sgesg_scheda_def" ("set_id", "key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sgesg_scheda_def_fase_idx" ON "sgesg_scheda_def" ("set_id", "fase_key");--> statement-breakpoint

-- `sezioni` e' un ARRAY di sezioni, non un oggetto: il vincolo lo dice, perche' un
-- oggetto ci starebbe senza protestare e il renderer troverebbe `.map` non definito
-- a pagina aperta, davanti all'utente, invece che al momento del seme.
ALTER TABLE "sgesg_scheda_def" ADD CONSTRAINT "sgesg_scheda_def_sezioni_array_ck"
  CHECK (jsonb_typeof("sezioni") = 'array');--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "sgesg_scheda_dato" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "program_id" text NOT NULL REFERENCES "sgesg_programma"("id") ON DELETE cascade,
  "scheda_key" text NOT NULL,
  "dati" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "stato" text DEFAULT 'bozza' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sgesg_scheda_dato_program_key_uq" ON "sgesg_scheda_dato" ("program_id", "scheda_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sgesg_scheda_dato_org_idx" ON "sgesg_scheda_dato" ("organization_id");--> statement-breakpoint

ALTER TABLE "sgesg_scheda_dato" ADD CONSTRAINT "sgesg_scheda_dato_stato_ck"
  CHECK ("stato" IN ('bozza','completata'));--> statement-breakpoint

-- `dati` e' un OGGETTO chiave-valore. Un array qui passerebbe il tipo e romperebbe
-- ogni lettura per chiave.
ALTER TABLE "sgesg_scheda_dato" ADD CONSTRAINT "sgesg_scheda_dato_oggetto_ck"
  CHECK (jsonb_typeof("dati") = 'object');--> statement-breakpoint

-- ══════════════════════ isolamento multi-tenant ═════════════════════════════
ALTER TABLE "sgesg_scheda_dato" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sgesg_scheda_dato" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "sgesg_scheda_dato_tenant_rls" ON "sgesg_scheda_dato" FOR ALL TO app_rls
  USING (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "sgesg_scheda_dato" TO app_rls;--> statement-breakpoint

-- Il catalogo: sola lettura per tutti, scrittura allo staff.
ALTER TABLE "sgesg_scheda_def" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sgesg_scheda_def" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "sgesg_scheda_def_read" ON "sgesg_scheda_def" FOR SELECT TO app_rls USING (true);--> statement-breakpoint
CREATE POLICY "sgesg_scheda_def_staff" ON "sgesg_scheda_def" FOR ALL TO app_rls
  USING (current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "sgesg_scheda_def" TO app_rls;
