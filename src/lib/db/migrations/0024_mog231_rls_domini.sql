-- Modello 231: isolamento fra studi e domini chiusi.
--
-- Le policy tenant vanno chiamate `<tabella>_tenant_rls`, altrimenti
-- `rls-matrix.db.test.ts` fallisce da solo. I CHECK ci sono perché Drizzle non li emette
-- per `text(enum)`.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['mog_family','mog_crime','mog_pillar','mog_requirement'] LOOP
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

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['mog_model','mog_process','mog_scenario','mog_crime_applicability','mog_requirement_state'] LOOP
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

-- ⚠️ Probabilità e impatto: 1 ÷ 4, oppure NULL.
--
-- NULL non è 1 e non è 0. Con una delle due mancante il rischio inerente non esiste, e
-- lo scenario risulta NON accettabile: un rischio non misurato non è un rischio assente.
-- Se il vuoto valesse 1, ogni scenario appena creato risulterebbe «Basso» e accettabile,
-- cioè il contrario.
ALTER TABLE "mog_scenario" ADD CONSTRAINT "mog_scenario_prob_ck"
  CHECK ("probabilita" IS NULL OR "probabilita" BETWEEN 1 AND 4);
--> statement-breakpoint
ALTER TABLE "mog_scenario" ADD CONSTRAINT "mog_scenario_imp_ck"
  CHECK ("impatto" IS NULL OR "impatto" BETWEEN 1 AND 4);
--> statement-breakpoint

-- L'adeguatezza dei presidi. NULL è ammesso e il motore lo tratta come «Assenti»: in
-- materia 231 l'onere è dell'ente, e presidi che nessuno ha dichiarato non risultano.
-- Il NULL resta distinto da «Assenti» nel database perché sono due fatti diversi da
-- raccontare in un documento — «non l'ho valutato» e «ho valutato che non ci sono».
ALTER TABLE "mog_scenario" ADD CONSTRAINT "mog_scenario_adeg_ck"
  CHECK ("adeguatezza" IS NULL OR "adeguatezza" IN ('Assenti','Parziali','Adeguati'));
--> statement-breakpoint

-- I tre stati di un presidio, col vocabolario del 231: qui non si parla di conformità a
-- una norma ma di presidi che ci sono, ci sono a metà, o non ci sono.
ALTER TABLE "mog_requirement_state" ADD CONSTRAINT "mog_req_state_stato_ck"
  CHECK ("stato" IS NULL OR "stato" IN ('Presente ed efficace','Presente ma da rafforzare','Assente','Non applicabile'));
--> statement-breakpoint

-- L'applicabilità di un reato: il default è «non determinata», e dichiarare che un reato
-- non riguarda l'ente è una decisione da motivare, non un silenzio.
ALTER TABLE "mog_crime_applicability" ADD CONSTRAINT "mog_crime_app_ck"
  CHECK ("applicabile" IS NULL OR "applicabile" IN ('Sì','No'));
