-- Isolamento multi-tenant del modulo ESG SUPPLIER READY.
--
-- Va nello stesso commit dello schema: RLS attiva senza policy significa
-- deny-all, e in sviluppo la connessione è privilegiata (bypassrls), quindi
-- l'assenza di policy non si vede. Il modulo funzionerebbe in locale e
-- restituirebbe zero righe in produzione, in silenzio.

-- ======================= TABELLE TENANT (match su org) ======================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['supplier_assessment','supplier_answer'] LOOP
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

-- ==================== CATALOGHI (non-tenant, sola lettura) ==================
-- Sono contenuti metodologici versionati, uguali per tutti gli studi: si
-- leggono senza GUC, si scrivono solo dal seed con la connessione diretta.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['supplier_area','supplier_question'] LOOP
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
