-- Isolamento multi-tenant del modulo BILANCIO ENERGETICO.
--
-- Va nello stesso commit dello schema: RLS attiva senza policy significa
-- deny-all, e in sviluppo la connessione è privilegiata (bypassrls), quindi
-- l'assenza di policy non si vede. Il modulo funzionerebbe in locale e
-- restituirebbe zero righe in produzione, in silenzio.
--
-- L'ALTER DEFAULT PRIVILEGES della migrazione 0001 ha già concesso ad app_rls
-- SELECT/INSERT/UPDATE/DELETE sulle tabelle create dopo: qui servono le policy.

-- ======================= TABELLE TENANT (match su org) ======================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'energy_balance','energy_vector_input','energy_allocation','energy_end_use_state',
    'energy_driver_value','energy_measure','energy_narrative','energy_media',
    'energy_company_factor'
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

-- ================= CATALOGHI (lettura a tutti, scrittura staff) =============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'energy_vector','energy_area','energy_end_use','energy_driver_definition','energy_indicator'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO app_rls USING (true)', t || '_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO app_rls WITH CHECK (current_setting(''app.platform_admin'', true) = ''on'')',
      t || '_staff_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO app_rls
         USING (current_setting(''app.platform_admin'', true) = ''on'')
         WITH CHECK (current_setting(''app.platform_admin'', true) = ''on'')',
      t || '_staff_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE TO app_rls USING (current_setting(''app.platform_admin'', true) = ''on'')',
      t || '_staff_delete', t);
  END LOOP;
END $$;
