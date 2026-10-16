-- Isolamento multi-tenant, domini chiusi e trigger del percorso Sistema di gestione sociale
-- (PAS 24000:2022).
--
-- ⚠️ GENERATA da scripts/genera-0066-pas.mjs, che legge le etichette dai domini estratti
-- dal prototipo: le liste dei CHECK sono le stesse da cui l'interfaccia prende le opzioni.
-- Va nello stesso rilascio della 0065: RLS forzata senza policy e' un deny-all, e in
-- sviluppo la connessione privilegiata non lo mostra.

-- Il dominio di un content set e' un elenco chiuso: si riscrive INTERO, perche' un ALTER
-- che elencasse solo il valore nuovo cancellerebbe gli altri.
ALTER TABLE "content_set" DROP CONSTRAINT IF EXISTS "content_set_dominio_ck";
--> statement-breakpoint
ALTER TABLE "content_set" ADD CONSTRAINT "content_set_dominio_ck"
  CHECK ("dominio" = ANY (ARRAY['ghg','report','energy','supplier','soa','mog231',
                               'iso37001','sgiqas','sa8000','filiera','wb','sgesg','nis2','gdpr','pas']));
--> statement-breakpoint

-- ======================= TABELLE TENANT (match su org) ======================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'pas_system', 'pas_fattore', 'pas_parte', 'pas_requisito_stato', 'pas_rischio', 'pas_fornitore', 'pas_obiettivo', 'pas_attivita', 'pas_misura', 'pas_reclamo', 'pas_non_conformita', 'pas_formazione', 'pas_emergenza', 'pas_comunicazione', 'pas_consultazione', 'pas_audit', 'pas_riesame'
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
    'pas_gruppo', 'pas_requisito', 'pas_parte_tipo', 'pas_rischio_tipo', 'pas_scala', 'pas_sezione', 'pas_indicatore', 'pas_attivita_tipo', 'pas_contenuto_politica', 'pas_testo'
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

-- ⚠️ Il trigger `azienda_scrivibile` non si aggiunge da solo: la 0061 l'ha creato con un ciclo
-- sulle tabelle che esistevano allora. Va sulla radice — l'unica tabella del percorso che porta
-- `company_id` — e `azienda-scrivibile-copertura.db` lo pretende su ogni tabella con una
-- chiave verso `company`. Le figlie si fermano in `pretendiSistema`.
CREATE TRIGGER azienda_scrivibile BEFORE INSERT OR UPDATE OF company_id, organization_id ON pas_system
  FOR EACH ROW EXECUTE FUNCTION azienda_scrivibile('lavoro');
--> statement-breakpoint

-- ======================== DOMINI CHIUSI (CHECK a mano) ======================
--
-- Drizzle non genera i CHECK per `text({ enum })`: senza, il database accetterebbe
-- qualunque stringa.
ALTER TABLE pas_system ADD CONSTRAINT pas_system_parametri_ck CHECK (param_ore_ordinarie BETWEEN 1 AND 168 AND param_ore_totali BETWEEN param_ore_ordinarie AND 168 AND param_settimane BETWEEN 1 AND 53 AND param_medio >= 1 AND param_alto > param_medio AND param_alto <= 25 AND param_giorni_reclamo >= 1);
--> statement-breakpoint
ALTER TABLE pas_system ADD CONSTRAINT pas_system_politica_contenuti_ck CHECK (politica_contenuti <@ ARRAY['du', 'cl', 'et', 'ssl', 'leg', 'mig', 'app', 'int', 'ext']::text[]);
--> statement-breakpoint
ALTER TABLE pas_fattore ADD CONSTRAINT pas_fattore_tipo_ck CHECK ((tipo = ANY (ARRAY['Esterno', 'Interno']::text[])));
--> statement-breakpoint
ALTER TABLE pas_fattore ADD CONSTRAINT pas_fattore_effetto_ck CHECK ((effetto = ANY (ARRAY['Rischio', 'Opportunità']::text[])));
--> statement-breakpoint
ALTER TABLE pas_requisito_stato ADD CONSTRAINT pas_requisito_stato_stato_ck CHECK ((stato IS NULL OR stato = ANY (ARRAY['c', 'p', 'n', 'na']::text[])));
--> statement-breakpoint
ALTER TABLE pas_rischio ADD CONSTRAINT pas_rischio_area_ck CHECK ((area = ANY (ARRAY['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'C5']::text[])));
--> statement-breakpoint
ALTER TABLE pas_rischio ADD CONSTRAINT pas_rischio_ambito_ck CHECK ((ambito = ANY (ARRAY['O', 'F']::text[])));
--> statement-breakpoint
ALTER TABLE pas_rischio ADD CONSTRAINT pas_rischio_punteggi_ck CHECK ((probabilita IS NULL OR probabilita BETWEEN 1 AND 5) AND (gravita IS NULL OR gravita BETWEEN 1 AND 5));
--> statement-breakpoint
ALTER TABLE pas_fornitore ADD CONSTRAINT pas_fornitore_categoria_ck CHECK ((categoria = ANY (ARRAY['Materie prime', 'Imballaggi e materiali', 'Agenzia per il lavoro', 'Appalto in sito', 'Cooperativa di servizi', 'Trasporti e logistica', 'Servizi', 'Lavorazioni esterne']::text[])));
--> statement-breakpoint
ALTER TABLE pas_fornitore ADD CONSTRAINT pas_fornitore_rischio_ck CHECK ((rischio IS NULL OR rischio = ANY (ARRAY['Basso', 'Medio', 'Alto']::text[])));
--> statement-breakpoint
ALTER TABLE pas_fornitore ADD CONSTRAINT pas_fornitore_esito_ck CHECK ((esito IS NULL OR esito = ANY (ARRAY['Adeguato', 'Azioni richieste', 'Critico']::text[])));
--> statement-breakpoint
ALTER TABLE pas_obiettivo ADD CONSTRAINT pas_obiettivo_area_ck CHECK ((area = ANY (ARRAY['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'C5']::text[])));
--> statement-breakpoint
ALTER TABLE pas_obiettivo ADD CONSTRAINT pas_obiettivo_stato_ck CHECK ((stato = ANY (ARRAY['In corso', 'Raggiunto', 'In ritardo', 'Abbandonato']::text[])));
--> statement-breakpoint
ALTER TABLE pas_attivita ADD CONSTRAINT pas_attivita_mese_ck CHECK (mese BETWEEN 1 AND 12);
--> statement-breakpoint
ALTER TABLE pas_attivita ADD CONSTRAINT pas_attivita_stato_ck CHECK ((stato = ANY (ARRAY['Da fare', 'In corso', 'Fatto']::text[])));
--> statement-breakpoint
ALTER TABLE pas_misura ADD CONSTRAINT pas_misura_valore_ck CHECK (valore >= 0);
--> statement-breakpoint
ALTER TABLE pas_reclamo ADD CONSTRAINT pas_reclamo_canale_ck CHECK ((canale IS NULL OR canale = ANY (ARRAY['Cassetta o modulo', 'Indirizzo dedicato', 'Rappresentante dei lavoratori', 'Colloquio diretto', 'Piattaforma di segnalazione']::text[])));
--> statement-breakpoint
ALTER TABLE pas_reclamo ADD CONSTRAINT pas_reclamo_provenienza_ck CHECK ((provenienza IS NULL OR provenienza = ANY (ARRAY['Lavoratore', 'Lavoratore di un fornitore', 'Parte esterna', 'Anonimo']::text[])));
--> statement-breakpoint
ALTER TABLE pas_reclamo ADD CONSTRAINT pas_reclamo_area_ck CHECK ((area IS NULL OR area = ANY (ARRAY['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11']::text[])));
--> statement-breakpoint
ALTER TABLE pas_reclamo ADD CONSTRAINT pas_reclamo_esito_ck CHECK ((esito = ANY (ARRAY['In istruttoria', 'Fondato, risolto', 'Fondato, azioni in corso', 'Non fondato']::text[])));
--> statement-breakpoint
ALTER TABLE pas_non_conformita ADD CONSTRAINT pas_non_conformita_origine_ck CHECK ((origine IS NULL OR origine = ANY (ARRAY['Audit interno', 'Audit esterno', 'Reclamo', 'Incidente', 'Monitoraggio', 'Segnalazione']::text[])));
--> statement-breakpoint
ALTER TABLE pas_non_conformita ADD CONSTRAINT pas_non_conformita_efficacia_ck CHECK ((efficacia = ANY (ARRAY['Da verificare', 'Efficace', 'Non efficace']::text[])));
--> statement-breakpoint
ALTER TABLE pas_formazione ADD CONSTRAINT pas_formazione_numeri_ck CHECK ((partecipanti IS NULL OR partecipanti >= 0) AND (ore IS NULL OR ore >= 0));
--> statement-breakpoint
ALTER TABLE pas_emergenza ADD CONSTRAINT pas_emergenza_tipo_ck CHECK ((tipo = ANY (ARRAY['Prova di evacuazione', 'Prova antincendio', 'Esercitazione di primo soccorso', 'Verifica di presidi e vie di fuga', 'Emergenza reale']::text[])));
--> statement-breakpoint
ALTER TABLE pas_comunicazione ADD CONSTRAINT pas_comunicazione_tipo_ck CHECK ((tipo = ANY (ARRAY['Interna', 'Esterna']::text[])));
--> statement-breakpoint
ALTER TABLE pas_consultazione ADD CONSTRAINT pas_consultazione_forma_ck CHECK ((forma = ANY (ARRAY['Riunione con i lavoratori', 'Incontro con i rappresentanti', 'Questionario', 'Raccolta di proposte']::text[])));
--> statement-breakpoint
ALTER TABLE pas_consultazione ADD CONSTRAINT pas_consultazione_partecipanti_ck CHECK ((partecipanti IS NULL OR partecipanti >= 0));
--> statement-breakpoint
ALTER TABLE pas_audit ADD CONSTRAINT pas_audit_stato_ck CHECK ((stato = ANY (ARRAY['Pianificato', 'Svolto', 'Chiuso']::text[])));
--> statement-breakpoint
ALTER TABLE pas_audit ADD CONSTRAINT pas_audit_rilievi_ck CHECK ((rilievi IS NULL OR rilievi >= 0));
--> statement-breakpoint
ALTER TABLE pas_gruppo ADD CONSTRAINT pas_gruppo_natura_ck CHECK ((natura = ANY (ARRAY['sistema', 'allegato']::text[])));
--> statement-breakpoint
ALTER TABLE pas_rischio_tipo ADD CONSTRAINT pas_rischio_tipo_ambito_ck CHECK ((ambito = ANY (ARRAY['O', 'F']::text[])));
--> statement-breakpoint
ALTER TABLE pas_scala ADD CONSTRAINT pas_scala_asse_ck CHECK ((asse = ANY (ARRAY['probabilita', 'gravita']::text[])) AND valore BETWEEN 1 AND 5);
--> statement-breakpoint
ALTER TABLE pas_attivita_tipo ADD CONSTRAINT pas_attivita_tipo_mese_ck CHECK (mese BETWEEN 1 AND 12);
