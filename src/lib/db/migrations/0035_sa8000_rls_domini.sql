-- SA8000/2026: isolamento fra studi e domini chiusi.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sa_section','sa_group','sa_criterion'] LOOP
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
  FOREACH t IN ARRAY ARRAY['sa_system','sa_criterion_state'] LOOP
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

-- ⚠️ I quattro stati di un criterio, e «parziale» NON e' un mezzo «ok».
--
-- Nel Sistema integrato QAS «parzialmente conforme» vale 50; qui «parziale» vale ZERO, e
-- la divergenza e' voluta: sono due prototipi dello stesso autore che trattano la stessa
-- idea in modi opposti, e la fedelta' a ciascuno e' la regola di questo progetto.
-- La ragione metodologica regge da sola — un criterio sociale attuato a meta' non
-- protegge a meta' un lavoratore. Il peso sta in `src/lib/calc/sa8000/punteggio.ts`.
ALTER TABLE "sa_criterion_state" ADD CONSTRAINT "sa_crit_state_stato_ck"
  CHECK ("stato" IS NULL OR "stato" IN ('ok','parziale','no','na'));
--> statement-breakpoint

-- Le tre sezioni dello Standard, e nient'altro.
ALTER TABLE "sa_section" ADD CONSTRAINT "sa_section_key_ck"
  CHECK ("key" IN ('F','M','D'));
--> statement-breakpoint
ALTER TABLE "sa_group" ADD CONSTRAINT "sa_group_sezione_ck"
  CHECK ("section_key" IN ('F','M','D'));
--> statement-breakpoint
ALTER TABLE "sa_criterion" ADD CONSTRAINT "sa_criterion_sezione_ck"
  CHECK ("section_key" IN ('F','M','D'));
--> statement-breakpoint

-- ⚠️ Ogni criterio rimanda ad almeno una procedura: dei 112, dieci ne hanno DUE. Con una
-- colonna singola il secondo rimando sarebbe sparito in silenzio, e la domanda «quali
-- criteri copre questa procedura» sarebbe stata sbagliata proprio su quei dieci.
ALTER TABLE "sa_criterion" ADD CONSTRAINT "sa_criterion_procedure_ck"
  CHECK (cardinality("procedure") >= 1);
--> statement-breakpoint

CREATE INDEX "sa_criterion_procedure_gin" ON "sa_criterion" USING gin ("procedure");
