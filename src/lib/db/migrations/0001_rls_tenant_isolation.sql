-- ============================================================================
-- RLS multi-tenant — default-deny sul ruolo applicativo `app_rls`.
--
-- Modello: in produzione l'app si connette come `app_rls` (NOLOGIN qui; LOGIN e
-- password sono un passo ops fuori git, vedi PRE-LAUNCH Fase 11). In dev la
-- connessione resta `postgres` (bypassrls): il seam RLS_FORCE_ROLE nei test
-- esercita davvero le policy con SET LOCAL ROLE app_rls.
--
-- Le GUC arrivano SOLO da withTenant (src/lib/db/tenant.ts):
--   app.org_id         → tenant corrente (organization dello studio)
--   app.user_id        → utente corrente
--   app.platform_admin → 'on' per lo staff piattaforma (valvola cross-tenant)
--
-- Lezioni incorporate (docs/riferimenti/pattern-notes.md §2):
--   1. niente policy che si referenziano a vicenda (recursion 42P17): i figli
--      portano organization_id denormalizzato e matchano diretto; l'unica EXISTS
--      è company_referent→company, unidirezionale.
--   2. le tabelle non-tenant hanno passthrough ESPLICITO scoped ad app_rls
--      (RLS attiva senza policy = deny-all anche per l'app).
--   3. ogni NUOVA tabella tenant va aggiunta qui con la sua policy: il test
--      rls-matrix.db.test.ts enumera le tabelle con organization_id e fallisce
--      se una non ha RLS+policy.
-- ============================================================================

-- Ruolo applicativo (idempotente).
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_rls') THEN
    CREATE ROLE app_rls NOLOGIN NOBYPASSRLS;
  END IF;
END $$;
--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO app_rls;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rls;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rls;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rls;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_rls;
--> statement-breakpoint
-- Permette ai test (connessi come postgres) di fare SET ROLE app_rls.
GRANT app_rls TO postgres;
--> statement-breakpoint

-- Audit log append-only: al ruolo app niente UPDATE/DELETE, mai.
REVOKE UPDATE, DELETE ON audit_log FROM app_rls;
--> statement-breakpoint

-- ======================= TABELLE TENANT (match su org) ======================
-- current_setting(..., true) → NULL se la GUC non è impostata → confronto NULL
-- → deny. Stringa vuota (ctx senza org) non matcha mai un id reale.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'company','org_entitlement',
    'ghg_inventory','ghg_source_selection','ghg_activity_row','ghg_org_factor','ghg_target','ghg_checklist_status',
    'report_project','materiality_assessment','kpi_value','topic_management','narrative_section','media_asset',
    'document_snapshot','stripe_customer','stripe_subscription'
  ] LOOP
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
--> statement-breakpoint

-- company_referent: tenant via appartenenza della company (EXISTS unidirezionale).
ALTER TABLE company_referent ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE company_referent FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY company_referent_tenant_rls ON company_referent FOR ALL TO app_rls
  USING (
    current_setting('app.platform_admin', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM company c
      WHERE c.id = company_referent.company_id
        AND c.organization_id = current_setting('app.org_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.platform_admin', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM company c
      WHERE c.id = company_referent.company_id
        AND c.organization_id = current_setting('app.org_id', true)
    )
  );
--> statement-breakpoint

-- user_onboarding: per-utente, non per-org.
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE user_onboarding FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY user_onboarding_self_rls ON user_onboarding FOR ALL TO app_rls
  USING (user_id = current_setting('app.user_id', true)
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (user_id = current_setting('app.user_id', true)
         OR current_setting('app.platform_admin', true) = 'on');
--> statement-breakpoint

-- audit_log: INSERT libero dal contesto app (best-effort, non deve bloccare login),
-- SELECT solo della propria org o staff. UPDATE/DELETE già revocati a livello grant.
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY audit_log_insert_rls ON audit_log FOR INSERT TO app_rls WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY audit_log_select_rls ON audit_log FOR SELECT TO app_rls
  USING (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on');
--> statement-breakpoint

-- ==================== TABELLE NON-TENANT (passthrough) ======================
-- Better Auth opera FUORI da withTenant (nessuna GUC): queste tabelle restano
-- protette dal layer applicativo. RLS attiva + passthrough scoped ad app_rls
-- documenta l'intenzione e nega tutto agli altri ruoli non privilegiati.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user','session','account','verification','organization','member','invitation',
    'stripe_processed_event'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO app_rls USING (true) WITH CHECK (true)', t || '_passthrough', t);
  END LOOP;
END $$;
--> statement-breakpoint

-- Cataloghi contenuti e config piattaforma: sola lettura per l'app,
-- scrittura solo staff (GUC platform_admin) o connessione privilegiata (seed).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'content_set','ghg_category','ghg_source_type','emission_factor','gwp_set',
    'checklist_requirement','materiality_topic','kpi_section','kpi_definition',
    'rating_scale','narrative_template','ateco_suggestion','platform_config'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO app_rls USING (true)', t || '_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO app_rls WITH CHECK (current_setting(''app.platform_admin'', true) = ''on'')', t || '_staff_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO app_rls
         USING (current_setting(''app.platform_admin'', true) = ''on'')
         WITH CHECK (current_setting(''app.platform_admin'', true) = ''on'')', t || '_staff_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE TO app_rls USING (current_setting(''app.platform_admin'', true) = ''on'')', t || '_staff_delete', t);
  END LOOP;
END $$;
