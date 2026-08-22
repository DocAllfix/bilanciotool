-- ISO 37001: isolamento fra studi e domini chiusi.
--
-- Drizzle non genera nessuna delle due cose. Le policy vanno chiamate
-- `<tabella>_tenant_rls`, altrimenti `rls-matrix.db.test.ts` fallisce da solo: e' il
-- controllo che impedisce di aggiungere una tabella tenant e dimenticare di proteggerla.
--
-- I CHECK ci sono perche' Drizzle non li emette per `text(enum)`: senza, il database
-- accetterebbe uno stato inventato e il difetto si vedrebbe solo a schermo, mesi dopo,
-- su un documento gia' consegnato.

-- ─── Cataloghi: leggibili da tutti, scrivibili solo dallo staff ──────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bribery_chapter','bribery_requirement','bribery_dimension','bribery_flag'] LOOP
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

-- ─── Tenant: ciascuno vede e scrive solo i propri ────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bribery_system','bribery_partner','bribery_requirement_state'] LOOP
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

-- ─── Domini chiusi ───────────────────────────────────────────────────────────

-- Le quattro dimensioni: 1 ÷ 4, oppure NULL.
-- ⚠️ NULL non e' 1. «Non valutata» esce dalla media (vedi `calc/anticorruzione/rischio.ts`),
-- mentre 1 ci entra e la abbassa: confonderle cambia il livello di rischio di un socio.
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_dim_paese_ck"
  CHECK ("dim_paese" IS NULL OR "dim_paese" BETWEEN 1 AND 4);
--> statement-breakpoint
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_dim_pu_ck"
  CHECK ("dim_pubblici_ufficiali" IS NULL OR "dim_pubblici_ufficiali" BETWEEN 1 AND 4);
--> statement-breakpoint
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_dim_natura_ck"
  CHECK ("dim_natura" IS NULL OR "dim_natura" BETWEEN 1 AND 4);
--> statement-breakpoint
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_dim_valore_ck"
  CHECK ("dim_valore" IS NULL OR "dim_valore" BETWEEN 1 AND 4);
--> statement-breakpoint

-- Lo stato del rapporto decide chi entra negli indicatori: i cessati ne escono.
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_stato_ck"
  CHECK ("stato" IN ('Attivo','Sospeso','Cessato'));
--> statement-breakpoint

-- Gli adempimenti sono risposte a scelta chiusa, e due di esse — «Non fattibile,
-- motivato» e «Non fattibile, valutato nel rischio» — ASSOLVONO l'obbligo. Non sono
-- scappatoie: la norma chiede che la non fattibilita' sia registrata e valutata nel
-- rischio, non presunta. Se il testo divergesse, l'obbligo resterebbe aperto per sempre
-- senza che nessuno capisca perche'.
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_impegni_ck"
  CHECK ("impegni" IS NULL OR "impegni" IN ('No','Sì','Non fattibile, motivato'));
--> statement-breakpoint
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_clausole_ck"
  CHECK ("clausole" IS NULL OR "clausole" IN ('No','Sì','Non applicabile'));
--> statement-breakpoint
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_controlli_ck"
  CHECK ("controlli" IS NULL OR "controlli" IN ('Da verificare','Adeguati','Richiesti e attuati','Richiesti e non attuati','Non fattibile, valutato nel rischio'));
--> statement-breakpoint
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_politica_ck"
  CHECK ("politica_comunicata" IS NULL OR "politica_comunicata" IN ('No','Sì'));
--> statement-breakpoint
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_verifica_ck"
  CHECK ("verifica_corrispettivo" IS NULL OR "verifica_corrispettivo" IN ('No','Sì','Non applicabile'));
--> statement-breakpoint
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_remunerazione_ck"
  CHECK ("remunerazione" IS NULL OR "remunerazione" IN ('Corrispettivo fisso','A consumo o a misura','A provvigione','A successo','Mista'));
--> statement-breakpoint
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_controllata_ck"
  CHECK ("controllata" IS NULL OR "controllata" IN ('No','Sì'));
--> statement-breakpoint
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_adeguamento_ck"
  CHECK ("adeguamento" IS NULL OR "adeguamento" IN ('Applica il nostro sistema','Applica controlli propri','Da definire'));
--> statement-breakpoint
ALTER TABLE "bribery_partner" ADD CONSTRAINT "bribery_partner_dd_esito_ck"
  CHECK ("due_diligence_esito" IS NULL OR "due_diligence_esito" IN ('Favorevole','Favorevole con condizioni','Sfavorevole'));
--> statement-breakpoint

-- I quattro stati di un requisito. «Non applicabile» e' una valutazione, non un vuoto:
-- esce dal punteggio ma conta come deciso.
ALTER TABLE "bribery_requirement_state" ADD CONSTRAINT "bribery_req_state_stato_ck"
  CHECK ("stato" IS NULL OR "stato" IN ('Conforme','Parzialmente conforme','Non conforme','Non applicabile'));
--> statement-breakpoint

ALTER TABLE "bribery_system" ADD CONSTRAINT "bribery_system_organo_gov_ck"
  CHECK ("organo_gov" IS NULL OR "organo_gov" IN ('No','Sì'));
--> statement-breakpoint
ALTER TABLE "bribery_system" ADD CONSTRAINT "bribery_system_funzione_impegno_ck"
  CHECK ("funzione_pc_impegno" IS NULL OR "funzione_pc_impegno" IN ('Tempo pieno','Tempo parziale','Esternalizzata'));
