-- Isolamento multi-tenant del modulo DICHIARAZIONE DI APPLICABILITÀ.
--
-- Va nello stesso commit dello schema: RLS attiva senza policy significa
-- deny-all, e in sviluppo la connessione è privilegiata (bypassrls), quindi
-- l'assenza di policy non si vede. Il modulo funzionerebbe in locale e
-- restituirebbe zero righe in produzione, in silenzio.

-- ======================= TABELLE TENANT (match su org) ======================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['soa_declaration','soa_module','soa_control_decision'] LOOP
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
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['soa_framework','soa_section','soa_control'] LOOP
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

-- ============================ DOMINI CHIUSI ================================
-- Drizzle non genera CHECK per text(enum): l'unione vive nei tipi TypeScript e
-- non protegge il database. Uno stato fuori dominio non farebbe errore, si
-- limiterebbe a pesare zero sull'indice — cioè a mentire in silenzio.
ALTER TABLE soa_control_decision
  ADD CONSTRAINT soa_decision_stato_ck
  CHECK (stato IS NULL OR stato IN ('nd', 'pl', 'pa', 'at', 'av'));
--> statement-breakpoint

ALTER TABLE soa_control_decision
  ADD CONSTRAINT soa_decision_stato_azione_ck
  CHECK (stato_azione IS NULL OR stato_azione IN ('da_avviare', 'in_corso', 'completata'));
--> statement-breakpoint

-- Le motivazioni di inclusione sono un insieme chiuso di cinque sigle.
ALTER TABLE soa_control_decision
  ADD CONSTRAINT soa_decision_motivazioni_ck
  CHECK (motivazioni <@ ARRAY['rv', 'ol', 'oc', 'rb', 'bp']::text[]);
--> statement-breakpoint

ALTER TABLE soa_declaration
  ADD CONSTRAINT soa_declaration_ruolo_privacy_ck
  CHECK (ruolo_privacy IN ('titolare', 'responsabile', 'entrambi', 'nessuno'));
--> statement-breakpoint

ALTER TABLE soa_declaration
  ADD CONSTRAINT soa_declaration_ruolo_cloud_ck
  CHECK (ruolo_cloud IN ('cliente', 'fornitore', 'entrambi', 'nessuno'));
--> statement-breakpoint

ALTER TABLE soa_declaration
  ADD CONSTRAINT soa_declaration_soglia_ck
  CHECK (soglia_obiettivo BETWEEN 0 AND 100);
