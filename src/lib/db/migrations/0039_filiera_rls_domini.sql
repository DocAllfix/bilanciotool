-- Due diligence di filiera: isolamento fra studi e domini chiusi.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['chain_dimension','chain_area','chain_flag_def','chain_phase'] LOOP
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
  FOREACH t IN ARRAY ARRAY['chain_program','chain_partner','chain_partner_score'] LOOP
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

-- ⚠️ I punteggi sono 1÷4, e una riga ASSENTE significa «non valutata».
--
-- E' la distinzione su cui poggia tutto il motore: la media si fa sulle sole dimensioni
-- compilate, e «non valutata» non e' «valutata 1». Ammettere lo zero in questa colonna
-- creerebbe un terzo stato che il motore non conosce, e che passerebbe nei conti come
-- un uno mancato.
ALTER TABLE "chain_partner_score" ADD CONSTRAINT "chain_score_valore_ck"
  CHECK ("valore" BETWEEN 1 AND 4);
--> statement-breakpoint

-- Due generi soltanto: il rischio inerente e la maturita'. Sono i due assi ortogonali
-- del modello, e un terzo valore qui vorrebbe dire che qualcuno ha inventato un asse.
ALTER TABLE "chain_partner_score" ADD CONSTRAINT "chain_score_genere_ck"
  CHECK ("genere" IN ('dim','area'));
--> statement-breakpoint

-- ⚠️ Lo stato del rapporto e' chiuso, e conta piu' di quanto sembri: i CESSATI escono
-- dai conteggi per numerosita'. Nel prototipo la spesa totale li includeva mentre tutti
-- gli altri conteggi no, e un cessato grosso schiacciava ogni percentuale di copertura.
-- Con l'insieme chiuso il filtro e' lo stesso ovunque, e l'esaustivita' la controlla il
-- compilatore.
ALTER TABLE "chain_partner" ADD CONSTRAINT "chain_partner_stato_ck"
  CHECK ("stato" IN ('Attivo','In uscita graduale','Sospeso','Cessato'));
--> statement-breakpoint

-- Il livello nella filiera, e la qualifica. Testo libero qui vorrebbe dire che «Livello 1»
-- e «livello 1» diventano due gruppi distinti nel conteggio della copertura.
ALTER TABLE "chain_partner" ADD CONSTRAINT "chain_partner_livello_ck"
  CHECK ("livello" IS NULL OR "livello" IN ('Livello 1','Livello 2','Livello 3 o oltre'));
--> statement-breakpoint
ALTER TABLE "chain_partner" ADD CONSTRAINT "chain_partner_qualifica_ck"
  CHECK ("qualifica" IS NULL OR "qualifica" IN ('In istruttoria','Piena','Condizionata','Sospesa','Negata'));
--> statement-breakpoint
ALTER TABLE "chain_partner" ADD CONSTRAINT "chain_partner_sostit_ck"
  CHECK ("sostituibilita" IS NULL OR "sostituibilita" IN ('Immediata','Con tempi contenuti','Difficile','Non sostituibile nel breve'));
--> statement-breakpoint

-- I tre campi a sì/no, e il cascading che ne ha tre perche' «non richiesto» non e' «no»:
-- un partner di ultimo livello non ha nessuno a cui trasmettere le clausole, e dirgli
-- «no» lo conterebbe come una lacuna che non esiste.
ALTER TABLE "chain_partner" ADD CONSTRAINT "chain_partner_si_no_ck"
  CHECK (
    ("migranti" IS NULL OR "migranti" IN ('No','Sì'))
    AND ("subappalto" IS NULL OR "subappalto" IN ('No','Sì'))
    AND ("codice_condotta" IS NULL OR "codice_condotta" IN ('No','Sì'))
    AND ("clausole" IS NULL OR "clausole" IN ('No','Sì'))
    AND ("canale_affisso" IS NULL OR "canale_affisso" IN ('No','Sì'))
    AND ("cascading" IS NULL OR "cascading" IN ('Non richiesto','No','Sì'))
  );
--> statement-breakpoint

-- Le quantita' non sono negative. Nel prototipo erano stringhe, e «-3 addetti» passava.
ALTER TABLE "chain_partner" ADD CONSTRAINT "chain_partner_conti_ck"
  CHECK (
    ("addetti" IS NULL OR "addetti" >= 0)
    AND ("somministrati" IS NULL OR "somministrati" >= 0)
    AND ("spesa" IS NULL OR "spesa" >= 0)
    AND ("quota_fatturato" IS NULL OR ("quota_fatturato" >= 0 AND "quota_fatturato" <= 100))
  );
