-- Isolamento multi-tenant, domini chiusi e trigger del percorso Protezione dei dati (GDPR).
--
-- ⚠️ GENERATA da scripts/genera-0063-gdpr.mjs, che legge le etichette dai domini estratti
-- dal prototipo: le liste dei CHECK sono le stesse da cui l'interfaccia prende le opzioni.
-- Va nello stesso rilascio della 0062: RLS forzata senza policy e' un deny-all, e in
-- sviluppo la connessione privilegiata non lo mostra.

-- Il dominio di un content set e' un elenco chiuso: si riscrive INTERO, perche' un ALTER
-- che elencasse solo il valore nuovo cancellerebbe gli altri.
ALTER TABLE "content_set" DROP CONSTRAINT IF EXISTS "content_set_dominio_ck";
--> statement-breakpoint
ALTER TABLE "content_set" ADD CONSTRAINT "content_set_dominio_ck"
  CHECK ("dominio" = ANY (ARRAY['ghg','report','energy','supplier','soa','mog231',
                               'iso37001','sgiqas','sa8000','filiera','wb','sgesg','nis2','gdpr']));
--> statement-breakpoint

-- ======================= TABELLE TENANT (match su org) ======================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gdpr_system', 'gdpr_trattamento', 'gdpr_requisito_stato', 'gdpr_fornitore', 'gdpr_documento', 'gdpr_attivita', 'gdpr_misura', 'gdpr_richiesta', 'gdpr_violazione', 'gdpr_formazione', 'gdpr_verifica', 'gdpr_verifica_ads', 'gdpr_riesame'
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

-- ==================== CATALOGHI (non-tenant, sola lettura) ==================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gdpr_gruppo', 'gdpr_requisito', 'gdpr_criterio', 'gdpr_trattamento_tipo', 'gdpr_scala', 'gdpr_sezione', 'gdpr_indicatore', 'gdpr_documento_tipo', 'gdpr_attivita_tipo', 'gdpr_contenuto_politica', 'gdpr_testo'
  ] LOOP
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

-- ⚠️ IL TRIGGER `azienda_scrivibile` NON SI AGGIUNGE DA SOLO. La 0061 l'ha creato con un
-- ciclo sulle tabelle che esistevano allora: una tabella con `company_id` creata dopo ne
-- resta senza, e nessun test lo notava. Qui lo si mette sulla radice — l'unica tabella del
-- percorso che porta `company_id` — e `azienda-scrivibile-copertura.db` lo pretende da ora
-- in poi su ogni tabella con una chiave verso `company`.
CREATE TRIGGER azienda_scrivibile BEFORE INSERT OR UPDATE OF company_id, organization_id ON gdpr_system
  FOR EACH ROW EXECUTE FUNCTION azienda_scrivibile('lavoro');
--> statement-breakpoint

-- ======================== DOMINI CHIUSI (CHECK a mano) ======================
--
-- Drizzle non genera i CHECK per `text({ enum })`: senza, il database accetterebbe
-- qualunque stringa.
ALTER TABLE gdpr_system ADD CONSTRAINT gdpr_system_amministratori_ck CHECK ((amministratori IS NULL OR amministratori = ANY (ARRAY['Sì', 'No']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_system ADD CONSTRAINT gdpr_system_dpo_ck CHECK ((dpo_a IS NULL OR dpo_a = ANY (ARRAY['Sì', 'No']::text[])) AND (dpo_b IS NULL OR dpo_b = ANY (ARRAY['Sì', 'No']::text[])) AND (dpo_c IS NULL OR dpo_c = ANY (ARRAY['Sì', 'No']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_system ADD CONSTRAINT gdpr_system_ruolo_ck CHECK ((ruolo IS NULL OR ruolo = ANY (ARRAY['Titolare del trattamento', 'Titolare e responsabile per conto di clienti', 'Contitolare con altri soggetti']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_system ADD CONSTRAINT gdpr_system_parametri_ck CHECK (param_medio >= 1 AND param_alto > param_medio AND param_alto <= 25 AND param_soglia_dpia BETWEEN 1 AND 9);
--> statement-breakpoint
ALTER TABLE gdpr_system ADD CONSTRAINT gdpr_system_politica_contenuti_ck CHECK (politica_contenuti <@ ARRAY['pri', 'ruo', 'dir', 'sic', 'for', 'frm', 'app', 'com', 'rie']::text[]);
--> statement-breakpoint
ALTER TABLE gdpr_trattamento ADD CONSTRAINT gdpr_trattamento_ruolo_ck CHECK ((ruolo = ANY (ARRAY['Titolare', 'Contitolare', 'Responsabile']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_trattamento ADD CONSTRAINT gdpr_trattamento_base_ck CHECK ((base IS NULL OR base = ANY (ARRAY['Consenso (6.1.a)', 'Contratto o misure precontrattuali (6.1.b)', 'Obbligo legale (6.1.c)', 'Interessi vitali (6.1.d)', 'Interesse pubblico (6.1.e)', 'Legittimo interesse (6.1.f)']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_trattamento ADD CONSTRAINT gdpr_trattamento_bilanciamento_ck CHECK ((bilanciamento IS NULL OR bilanciamento = ANY (ARRAY['Sì', 'No']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_trattamento ADD CONSTRAINT gdpr_trattamento_condizione9_ck CHECK ((condizione9 IS NULL OR condizione9 = ANY (ARRAY['a) Consenso esplicito', 'b) Lavoro e sicurezza sociale', 'c) Interessi vitali', 'd) Enti senza scopo di lucro', 'e) Dati resi pubblici dall''interessato', 'f) Difesa in giudizio', 'g) Interesse pubblico rilevante', 'h) Medicina preventiva e del lavoro, assistenza sanitaria', 'i) Sanità pubblica', 'j) Archiviazione, ricerca, statistica']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_trattamento ADD CONSTRAINT gdpr_trattamento_criteri_ck CHECK (criteri <@ ARRAY['score', 'auto', 'monit', 'sens', 'scala', 'comb', 'vuln', 'innov', 'blocco']::text[]);
--> statement-breakpoint
ALTER TABLE gdpr_trattamento ADD CONSTRAINT gdpr_trattamento_punteggi_ck CHECK ((probabilita IS NULL OR probabilita BETWEEN 1 AND 5) AND (gravita IS NULL OR gravita BETWEEN 1 AND 5));
--> statement-breakpoint
ALTER TABLE gdpr_trattamento ADD CONSTRAINT gdpr_trattamento_dpia_stato_ck CHECK ((dpia_stato = ANY (ARRAY['Da avviare', 'In corso', 'Conclusa']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_trattamento ADD CONSTRAINT gdpr_trattamento_dpia_esito_ck CHECK ((dpia_esito IS NULL OR dpia_esito = ANY (ARRAY['Rischio residuo accettabile', 'Consultazione preventiva del Garante']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_requisito_stato ADD CONSTRAINT gdpr_requisito_stato_stato_ck CHECK ((stato IS NULL OR stato = ANY (ARRAY['c', 'p', 'n', 'na']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_fornitore ADD CONSTRAINT gdpr_fornitore_qualifica_ck CHECK ((qualifica = ANY (ARRAY['Responsabile (art. 28)', 'Sub-responsabile', 'Contitolare (art. 26)', 'Titolare autonomo']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_fornitore ADD CONSTRAINT gdpr_fornitore_contratto_ck CHECK ((contratto IS NULL OR contratto = ANY (ARRAY['Sì', 'No', 'Non dovuto']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_fornitore ADD CONSTRAINT gdpr_fornitore_garanzia_ck CHECK ((garanzia IS NULL OR garanzia = ANY (ARRAY['Nessun trasferimento', 'Decisione di adeguatezza', 'Clausole contrattuali tipo', 'Norme vincolanti d''impresa', 'Deroga art. 49', 'Da definire']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_fornitore ADD CONSTRAINT gdpr_fornitore_esito_ck CHECK ((esito IS NULL OR esito = ANY (ARRAY['Adeguato', 'Azioni richieste', 'Critico']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_fornitore ADD CONSTRAINT gdpr_fornitore_non_dovuto_ck CHECK (contratto IS DISTINCT FROM 'Non dovuto' OR qualifica = 'Titolare autonomo');
--> statement-breakpoint
ALTER TABLE gdpr_documento ADD CONSTRAINT gdpr_documento_tipo_ck CHECK ((tipo = ANY (ARRAY['Informativa (art. 13)', 'Informativa (art. 14)', 'Modulo di consenso', 'Autorizzazione e istruzioni (art. 29)', 'Nomina amministratore di sistema', 'Designazione del responsabile della protezione dei dati', 'Contratto con responsabile (art. 28)', 'Accordo di contitolarità (art. 26)', 'Procedura', 'Regolamento interno', 'Valutazione o parere']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_documento ADD CONSTRAINT gdpr_documento_stato_ck CHECK ((stato = ANY (ARRAY['Da redigere', 'In bozza', 'Adottato', 'Da aggiornare']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_attivita ADD CONSTRAINT gdpr_attivita_mese_ck CHECK (mese BETWEEN 1 AND 12);
--> statement-breakpoint
ALTER TABLE gdpr_attivita ADD CONSTRAINT gdpr_attivita_stato_ck CHECK ((stato = ANY (ARRAY['Da fare', 'In corso', 'Fatto']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_misura ADD CONSTRAINT gdpr_misura_valore_ck CHECK (valore >= 0);
--> statement-breakpoint
ALTER TABLE gdpr_richiesta ADD CONSTRAINT gdpr_richiesta_diritto_ck CHECK ((diritto = ANY (ARRAY['Accesso (art. 15)', 'Rettifica (art. 16)', 'Cancellazione (art. 17)', 'Limitazione (art. 18)', 'Portabilità (art. 20)', 'Opposizione (art. 21)', 'Decisioni automatizzate (art. 22)', 'Revoca del consenso']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_richiesta ADD CONSTRAINT gdpr_richiesta_canale_ck CHECK ((canale IS NULL OR canale = ANY (ARRAY['Posta elettronica', 'PEC', 'Modulo del sito', 'Raccomandata', 'Di persona', 'Tramite il Garante']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_richiesta ADD CONSTRAINT gdpr_richiesta_esito_ck CHECK ((esito = ANY (ARRAY['In lavorazione', 'Accolta', 'Accolta in parte', 'Respinta con motivazione']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_violazione ADD CONSTRAINT gdpr_violazione_natura_ck CHECK ((natura = ANY (ARRAY['Riservatezza', 'Integrità', 'Disponibilità', 'Più profili']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_violazione ADD CONSTRAINT gdpr_violazione_rischio_ck CHECK ((rischio IS NULL OR rischio = ANY (ARRAY['Improbabile', 'Rischio', 'Rischio elevato']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_violazione ADD CONSTRAINT gdpr_violazione_interessati_ck CHECK (interessati IS NULL OR interessati >= 0);
--> statement-breakpoint
ALTER TABLE gdpr_formazione ADD CONSTRAINT gdpr_formazione_numeri_ck CHECK ((partecipanti IS NULL OR partecipanti >= 0) AND (ore IS NULL OR ore >= 0));
--> statement-breakpoint
ALTER TABLE gdpr_verifica ADD CONSTRAINT gdpr_verifica_tipo_ck CHECK ((tipo = ANY (ARRAY['Audit interno', 'Verifica su un responsabile', 'Verifica tecnica di sicurezza', 'Prova di ripristino', 'Verifica del responsabile della protezione dei dati']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_verifica ADD CONSTRAINT gdpr_verifica_stato_ck CHECK ((stato = ANY (ARRAY['Pianificato', 'Svolto', 'Chiuso']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_verifica ADD CONSTRAINT gdpr_verifica_rilievi_ck CHECK (rilievi IS NULL OR rilievi >= 0);
--> statement-breakpoint
ALTER TABLE gdpr_verifica_ads ADD CONSTRAINT gdpr_verifica_ads_registrazioni_ck CHECK ((registrazioni_conservate IS NULL OR registrazioni_conservate = ANY (ARRAY['Sì', 'No']::text[])));
--> statement-breakpoint
ALTER TABLE gdpr_scala ADD CONSTRAINT gdpr_scala_asse_ck CHECK ((asse = ANY (ARRAY['probabilita', 'gravita']::text[])) AND valore BETWEEN 1 AND 5);
--> statement-breakpoint
ALTER TABLE gdpr_attivita_tipo ADD CONSTRAINT gdpr_attivita_tipo_mese_ck CHECK (mese BETWEEN 1 AND 12);
