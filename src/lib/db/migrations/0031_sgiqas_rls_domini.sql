-- Sistema integrato QAS: isolamento fra studi e domini chiusi.
--
-- Le policy tenant vanno chiamate `<tabella>_tenant_rls`, altrimenti
-- `rls-matrix.db.test.ts` fallisce da solo. I CHECK ci sono perche' Drizzle non li emette
-- per `text(enum)` ne' per gli array.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['qas_norm','qas_chapter','qas_requirement','qas_indicator_default'] LOOP
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
  FOREACH t IN ARRAY ARRAY['qas_system','qas_requirement_state','qas_indicator','qas_measurement'] LOOP
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

-- ⚠️ Le norme sono tre lettere, e l'array non puo' contenerne altre.
--
-- Senza questo vincolo una lettera inventata entrerebbe nell'array e i requisiti di
-- quella «norma» sarebbero zero: la mappa di conformita' direbbe 0% su un perimetro che
-- non esiste, e nessuno saprebbe perche'. L'indice GIN qui sotto e' la ragione per cui
-- l'array esiste: con la stringa concatenata del prototipo la domanda «quali requisiti
-- valgono per la 14001» sarebbe un `LIKE '%A%'`.
ALTER TABLE "qas_requirement" ADD CONSTRAINT "qas_requirement_norme_ck"
  CHECK (cardinality("norme") BETWEEN 1 AND 3 AND "norme" <@ ARRAY['Q','A','S']);
--> statement-breakpoint

ALTER TABLE "qas_system" ADD CONSTRAINT "qas_system_norme_ck"
  CHECK (cardinality("norme") BETWEEN 1 AND 3 AND "norme" <@ ARRAY['Q','A','S']);
--> statement-breakpoint

CREATE INDEX "qas_requirement_norme_gin" ON "qas_requirement" USING gin ("norme");
--> statement-breakpoint

-- Lo stato di un requisito, col vocabolario della conformita' a una norma.
ALTER TABLE "qas_requirement_state" ADD CONSTRAINT "qas_req_state_stato_ck"
  CHECK ("stato" IS NULL OR "stato" IN (
    'Conforme','Parzialmente conforme','Non conforme','Non applicabile'));
--> statement-breakpoint

-- ⚠️ Target e soglia: NUMERICI o assenti, mai la stringa vuota.
--
-- E' il difetto del prototipo reso irrappresentabile. Li' erano stringhe vuote lette con
-- `Number("")`, cioe' ZERO: un indicatore senza target risultava «a target» per uno «piu'
-- e' meglio» e «fuori» per uno «meno e' meglio» — due verdetti opposti da un dato che
-- nessuno aveva inserito. Qui la stringa vuota non entra, e `null` significa «nessuno
-- l'ha fissato».
DO $$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY ARRAY['target','soglia'] LOOP
    EXECUTE format(
      'ALTER TABLE qas_indicator ADD CONSTRAINT %I CHECK (%I IS NULL OR %I ~ ''^-?[0-9]+(\.[0-9]+)?$'')',
      'qas_indicator_' || c || '_ck', c, c);
  END LOOP;
END $$;
--> statement-breakpoint

ALTER TABLE "qas_measurement" ADD CONSTRAINT "qas_measurement_valore_ck"
  CHECK ("valore" IS NULL OR "valore" ~ '^-?[0-9]+(\.[0-9]+)?$');
