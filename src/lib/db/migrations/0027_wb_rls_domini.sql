-- Gestione delle segnalazioni: isolamento fra studi e domini chiusi.
--
-- Le policy tenant vanno chiamate `<tabella>_tenant_rls`, altrimenti
-- `rls-matrix.db.test.ts` fallisce da solo. I CHECK ci sono perché Drizzle non li emette
-- per `text(enum)`.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['wb_chapter','wb_requirement'] LOOP
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
  FOREACH t IN ARRAY ARRAY['wb_system','wb_channel','wb_report','wb_requirement_state'] LOOP
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

-- ─── Il canale ───────────────────────────────────────────────────────────────
--
-- Le tre forme dell'art. 4 c. 1, e nient'altro. È il vincolo che rende possibile la
-- verifica di completezza: se la forma fosse testo libero, «Orale» e «orale telefonico»
-- sarebbero due cose diverse per il database e il controllo direbbe che manca la forma
-- orale a chi ce l'ha.
ALTER TABLE "wb_channel" ADD CONSTRAINT "wb_channel_forma_ck"
  CHECK ("forma" IN ('Scritta','Orale','Incontro diretto'));
--> statement-breakpoint

-- ─── L'assetto ───────────────────────────────────────────────────────────────

-- Il titolo dell'obbligo: cinque, e il 231 è uno solo.
ALTER TABLE "wb_system" ADD CONSTRAINT "wb_system_obbligo_ck"
  CHECK ("obbligo" IS NULL OR "obbligo" IN (
    'Almeno 50 lavoratori subordinati',
    'Settore indicato dalla legge, indipendentemente dal numero',
    'Adozione del modello 231, indipendentemente dal numero',
    'Adesione volontaria',
    'Non obbligato'));
--> statement-breakpoint

ALTER TABLE "wb_system" ADD CONSTRAINT "wb_system_gestore_tipo_ck"
  CHECK ("gestore_tipo" IS NULL OR "gestore_tipo" IN (
    'Persona interna dedicata',
    'Ufficio interno autonomo',
    'Organismo di vigilanza',
    'Soggetto esterno autonomo'));
--> statement-breakpoint

-- ─── Il fascicolo ────────────────────────────────────────────────────────────

-- Il canale da cui la segnalazione è arrivata. Comprende quello esterno ad ANAC, che
-- non è un canale nostro ma è un fatto da registrare: l'ente ne viene a conoscenza e
-- deve poterlo annotare.
ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_canale_ck"
  CHECK ("canale" IS NULL OR "canale" IN (
    'Scritto informatico','Scritto analogico','Orale telefonico',
    'Incontro diretto','Canale esterno ANAC','Altro'));
--> statement-breakpoint

-- La qualità del segnalante. L'elenco è largo di proposito: l'art. 3 protegge anche chi
-- non è dipendente — candidati, ex dipendenti, volontari, lavoratori di appaltatori.
ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_qualita_ck"
  CHECK ("qualita" IS NULL OR "qualita" IN (
    'Dipendente','Dirigente','Collaboratore o consulente','Lavoratore autonomo',
    'Volontario o tirocinante','Socio o amministratore','Fornitore o appaltatore',
    'Lavoratore di appaltatore','Candidato','Ex dipendente','Non dichiarata'));
--> statement-breakpoint

ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_ambito_ck"
  CHECK ("ambito" IS NULL OR "ambito" IN (
    'Illecito rilevante ai sensi del D.Lgs. 231/2001',
    'Violazione del modello o del codice etico',
    'Appalti pubblici','Servizi e mercati finanziari',
    'Riciclaggio e finanziamento del terrorismo',
    'Sicurezza dei prodotti','Sicurezza dei trasporti',
    'Tutela dell''ambiente','Sicurezza alimentare','Salute pubblica',
    'Tutela dei consumatori',
    'Protezione dei dati personali e sicurezza delle reti',
    'Interessi finanziari dell''Unione','Concorrenza e aiuti di Stato',
    'Salute e sicurezza sul lavoro','Altro'));
--> statement-breakpoint

ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_stato_ck"
  CHECK ("stato" IN (
    'Ricevuta','In valutazione','In istruttoria','In attesa di integrazione',
    'Riscontrata','Chiusa','Archiviata'));
--> statement-breakpoint

ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_esito_ck"
  CHECK ("esito" IS NULL OR "esito" IN (
    'Fondata','Parzialmente fondata','Non fondata','Manifestamente infondata'));
--> statement-breakpoint

ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_altrove_ck"
  CHECK ("altrove" IS NULL OR "altrove" IN (
    'No','Sì, internamente','Sì, ad ANAC','Sì, ad altra autorità'));
--> statement-breakpoint

ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_incontro_ck"
  CHECK ("incontro_richiesto" IS NULL OR "incontro_richiesto" IN (
    'No','Sì, fissato','Sì, da fissare'));
--> statement-breakpoint

ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_cons_registr_ck"
  CHECK ("consenso_registrazione" IS NULL OR "consenso_registrazione" IN (
    'Non applicabile','Prestato','Negato'));
--> statement-breakpoint

ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_verbale_ck"
  CHECK ("verbale_confermato" IS NULL OR "verbale_confermato" IN (
    'Non applicabile','Sì','No'));
--> statement-breakpoint

ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_com_stato_ck"
  CHECK ("comunicazione_stato" IS NULL OR "comunicazione_stato" IN (
    'Non necessaria','Resa','Dovuta e non resa'));
--> statement-breakpoint

ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_sentita_ck"
  CHECK ("persona_sentita" IS NULL OR "persona_sentita" IN ('No','Sì','Non applicabile'));
--> statement-breakpoint

ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_penale_ck"
  CHECK ("rilevanza_penale" IS NULL OR "rilevanza_penale" IN (
    'No','Sì, valutata la denuncia','Sì, denuncia effettuata'));
--> statement-breakpoint

-- Se i fatti riguardano l'organo di indirizzo, la relazione va all'organo di controllo:
-- l'ultima voce esiste perché i due destinatari possono coesistere.
ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_dest_ck"
  CHECK ("destinatari_relazione" IS NULL OR "destinatari_relazione" IN (
    'Organo di indirizzo','Organo di controllo','Organismo di vigilanza',
    'Organo di controllo e OdV'));
--> statement-breakpoint

ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_mon_per_ck"
  CHECK ("monitoraggio_periodicita" IS NULL OR "monitoraggio_periodicita" IN (
    'Mensile','Trimestrale','Semestrale'));
--> statement-breakpoint

-- Il consenso alla rivelazione dell'identità (art. 12 c. 5). «Non necessario» è il caso
-- in cui la rivelazione non è mai stata in questione; «Negato» comporta
-- l'inutilizzabilità della segnalazione ai fini disciplinari, non l'archiviazione degli
-- accertamenti condotti per altra via. Sono tre esiti giuridici distinti, non una scala.
ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_cons_riv_ck"
  CHECK ("consenso_rivelazione" IS NULL OR "consenso_rivelazione" IN (
    'Non necessario','Sì','Negato'));
--> statement-breakpoint

ALTER TABLE "wb_report" ADD CONSTRAINT "wb_report_audizioni_ck"
  CHECK ("audizioni" IS NULL OR "audizioni" >= 0);
--> statement-breakpoint

-- I diciassette campi a due valori, in un ciclo solo perché scriverli uno per uno
-- sarebbe diciassette occasioni di dimenticarne uno.
--
-- ⚠️ NULL è ammesso ovunque, ed è un terzo stato vero: nei cinque elementi
-- dell'ammissibilità e nei sei fattori di ritorsione, «non ancora valutato» produce un
-- esito NULL e non un esito negativo. È lo scostamento dal prototipo che
-- `valutazione.ts` documenta: rispondere «no» a una domanda su sei non basta a
-- dichiarare basso un rischio che nessuno ha misurato.
DO $$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY ARRAY[
    'amm_oggetto','amm_legittimato','amm_contesto','amm_elementi','amm_non_personale',
    'rit_identita_conoscibile','rit_sovraordinato','rit_contesto_ristretto',
    'rit_precedenti','rit_rapporto_precario','rit_gia_esposto',
    'recapito','conflitto','monitoraggio_aperto','identita_rivelata','cancellata'] LOOP
    EXECUTE format(
      'ALTER TABLE wb_report ADD CONSTRAINT %I CHECK (%I IS NULL OR %I IN (''Sì'',''No''))',
      'wb_report_' || c || '_ck', c, c);
  END LOOP;
END $$;
--> statement-breakpoint

ALTER TABLE "wb_system" ADD CONSTRAINT "wb_system_mog_ck"
  CHECK ("mog_adottato" IS NULL OR "mog_adottato" IN ('Sì','No'));
--> statement-breakpoint
ALTER TABLE "wb_system" ADD CONSTRAINT "wb_system_condiviso_ck"
  CHECK ("canale_condiviso" IS NULL OR "canale_condiviso" IN ('Sì','No'));
--> statement-breakpoint

-- Le quattro date da cui discende un termine PERENTORIO.
--
-- ⚠️ Questo vincolo controlla la FORMA, non il calendario: accetta il 31 febbraio e lo
-- dice apertamente. La data impossibile la ferma `dataIsoSchema` in
-- `src/features/campi.ts`, che ricompone la data e la confronta — perché
-- `new Date('2026-02-31')` non solleva, scivola al 3 marzo, e da un termine perentorio
-- non deve uscire una data che nessuno ha scritto. Qui si ferma ciò che il validatore
-- non vedrebbe mai perché non passa da lui: una data in formato italiano finita in
-- colonna per una scrittura diretta o una migrazione futura.
DO $$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY ARRAY['data_ricezione','avviso_reso','riscontro_reso','data_chiusura'] LOOP
    EXECUTE format(
      'ALTER TABLE wb_report ADD CONSTRAINT %I CHECK (%I IS NULL OR %I ~ ''^\d{4}-\d{2}-\d{2}$'')',
      'wb_report_' || c || '_fmt_ck', c, c);
  END LOOP;
END $$;
--> statement-breakpoint

-- Lo stato di un requisito, col vocabolario della conformità a una norma.
ALTER TABLE "wb_requirement_state" ADD CONSTRAINT "wb_req_state_stato_ck"
  CHECK ("stato" IS NULL OR "stato" IN (
    'Conforme','Parzialmente conforme','Non conforme','Non applicabile'));
