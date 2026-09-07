-- Isolamento multi-tenant e domini chiusi dei due percorsi NIS2 (D.Lgs. 138/2024).
--
-- Va nello stesso commit dello schema: RLS attiva senza policy significa deny-all, e in
-- sviluppo la connessione e' privilegiata (bypassrls), quindi l'assenza di policy non si
-- vede. Il modulo funzionerebbe in locale e restituirebbe zero righe in produzione, in
-- silenzio — e' esattamente cio' che e' successo per undici mesi prima del 14 agosto.

-- ⚠️ UN TIPO DI COLONNA NUOVO: la data CON L'ORA.
--
-- Cinque colonne del registro incidenti NIS2 sono istanti, non giorni: dall'istante in
-- cui l'ente ha avuto conoscenza decorrono le 24 ore della pre-notifica e le 72 della
-- notifica (art. 25). Con una data secca l'ora si perde, e un termine perentorio
-- calcolato sulla mezzanotte e' sbagliato di mezza giornata.
ALTER TABLE "corpus_register_column" DROP CONSTRAINT IF EXISTS "corpus_register_column_tipo_ck";
--> statement-breakpoint
ALTER TABLE "corpus_register_column" ADD CONSTRAINT "corpus_register_column_tipo_ck"
  CHECK ("tipo" IN ('text', 'ta', 'sel', 'date', 'dt', 'num', 'crit', 'partner'));
--> statement-breakpoint

-- ⚠️ UN GENERE DI BLOCCO NUOVO: l'elenco puntato.
--
-- Il corpus ne aveva quattro (paragrafo, tabella, banda di sezione, riquadro firma); NIS2
-- e' il primo dei sette domini a portare un elenco — quattro blocchi in tutto. Nel suo
-- prototipo rendevano VUOTI, insieme ai cinquanta riquadri firma: il renderer non li
-- gestisce e cadono nel ramo del paragrafo, che legge un campo che questi blocchi non
-- hanno. Si vede solo contando i blocchi per genere, mai aprendo un documento.
ALTER TABLE "corpus_block" DROP CONSTRAINT IF EXISTS "corpus_block_tipo_ck";
--> statement-breakpoint
ALTER TABLE "corpus_block" ADD CONSTRAINT "corpus_block_tipo_ck"
  CHECK ("tipo" IN ('p', 't', 'h', 'sig', 'l'));
--> statement-breakpoint

-- ⚠️ IL DOMINIO DI UN CONTENT SET E' UN ELENCO CHIUSO, e va esteso qui.
--
-- Nessuno lo ricorda finche' il seme non si ferma con «violates check constraint»: e'
-- successo a ISO 37001, a SGI QAS e al metodo ESG prima di NIS2. Si riscrive per intero
-- invece di aggiungere in coda, perche' un ALTER che elenca solo il nuovo valore
-- cancellerebbe gli altri.
ALTER TABLE "content_set" DROP CONSTRAINT IF EXISTS "content_set_dominio_ck";
--> statement-breakpoint
ALTER TABLE "content_set" ADD CONSTRAINT "content_set_dominio_ck"
  CHECK ("dominio" = ANY (ARRAY['ghg','report','energy','supplier','soa','mog231',
                               'iso37001','sgiqas','sa8000','filiera','wb','sgesg','nis2']));
--> statement-breakpoint

-- ======================= TABELLE TENANT (match su org) ======================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'nis2_profile','nis2_assessment','nis2_system',
    'nis2_requirement_state','nis2_control_state','nis2_phase_state',
    'nis2_indicator','nis2_indicator_reading'
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
    'nis2_chapter','nis2_level','nis2_requirement','nis2_control','nis2_phase','nis2_indicator_def',
    'nis2_sector','nis2_criterion'
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

-- ======================== DOMINI CHIUSI (CHECK a mano) ======================
--
-- ⚠️ Drizzle NON genera i CHECK per `text({ enum: [...] })`: il tipo vive solo in
-- TypeScript, e il database accetterebbe qualunque stringa. Vale dalla migrazione 0003, e
-- ogni modulo di conformita' da allora li scrive a mano.

-- Il perimetro non puo' essere vuoto, e i suoi valori sono due.
--
-- ⚠️ Un array vuoto passerebbe `<@` senza fatica: un requisito con `perimetri = '{}'` non
-- comparirebbe in NESSUNO dei due percorsi, e nessuna schermata lo direbbe — sarebbe un
-- requisito seminato e invisibile, che nei conteggi c'e' e nella verifica no.
ALTER TABLE nis2_requirement
  ADD CONSTRAINT nis2_requirement_perimetri_ck
  CHECK (cardinality(perimetri) > 0 AND perimetri <@ ARRAY['autovalutazione', 'sistema']::text[]);
--> statement-breakpoint

-- Le fasi della roadmap coprono capi, e un array vuoto renderebbe la fase
-- perennemente a zero senza che si capisca perche'.
ALTER TABLE nis2_phase
  ADD CONSTRAINT nis2_phase_capitoli_ck
  CHECK (cardinality(capitoli) > 0);
--> statement-breakpoint

ALTER TABLE nis2_level
  ADD CONSTRAINT nis2_level_scala_ck
  CHECK (valore BETWEEN 0 AND 4 AND percentuale BETWEEN 0 AND 100);
--> statement-breakpoint

ALTER TABLE nis2_indicator_def
  ADD CONSTRAINT nis2_indicator_def_tipo_ck
  CHECK (tipo IN ('attuazione', 'efficacia'));
--> statement-breakpoint

ALTER TABLE nis2_indicator_def
  ADD CONSTRAINT nis2_indicator_def_verso_ck
  CHECK (verso IN ('crescente', 'decrescente'));
--> statement-breakpoint

ALTER TABLE nis2_indicator_def
  ADD CONSTRAINT nis2_indicator_def_frequenza_ck
  CHECK (frequenza IN ('mensile', 'trimestrale', 'semestrale', 'annuale'));
--> statement-breakpoint

-- ── Profilo: ambito soggettivo ─────────────────────────────────────────────
ALTER TABLE nis2_profile
  ADD CONSTRAINT nis2_profile_dimensione_ck
  CHECK (dimensione IS NULL OR dimensione IN ('micro', 'media', 'grande'));
--> statement-breakpoint

-- Gli otto criteri specifici dell'art. 3. Un criterio fuori elenco scivolerebbe nel ramo
-- dimensionale del motore e una microimpresa designata dall'Autorita' risulterebbe fuori
-- ambito: e' il difetto piu' caro che questo modulo possa avere.
ALTER TABLE nis2_profile
  ADD CONSTRAINT nis2_profile_criteri_ck
  CHECK (criteri <@ ARRAY['c1','c2','c3','c4','c5','c6','c7','c8']::text[]);
--> statement-breakpoint

ALTER TABLE nis2_profile
  ADD CONSTRAINT nis2_profile_obiettivo_ck
  CHECK (obiettivo BETWEEN 0 AND 4);
--> statement-breakpoint

-- La data della comunicazione ACN e' il presupposto dei termini della roadmap: se non e'
-- una data, i nove e i diciotto mesi diventano una scadenza che nessuno ha scritto.
-- ⚠️ NON BASTA IL FORMATO: `2026-02-31` lo rispetta ed e' un giorno che non esiste. Si
-- RICOMPONE e si confronta: `to_date` non solleva su una data impossibile, la fa
-- scivolare al 3 marzo, e il confronto col testo originale la coglie. E' la stessa regola
-- di `dataIsoSchema` in `features/campi.ts`, qui applicata alle quattro colonne da cui
-- discende un termine.
ALTER TABLE nis2_profile
  ADD CONSTRAINT nis2_profile_comunicazione_ck
  CHECK (
    comunicazione_il IS NULL OR (
      comunicazione_il ~ '^\d{4}-\d{2}-\d{2}$'
      AND to_char(to_date(comunicazione_il, 'YYYY-MM-DD'), 'YYYY-MM-DD') = comunicazione_il
    )
  );
--> statement-breakpoint

ALTER TABLE nis2_profile
  ADD CONSTRAINT nis2_profile_registrazione_ck
  CHECK (
    registrazione_il IS NULL OR (
      registrazione_il ~ '^\d{4}-\d{2}-\d{2}$'
      AND to_char(to_date(registrazione_il, 'YYYY-MM-DD'), 'YYYY-MM-DD') = registrazione_il
    )
  );
--> statement-breakpoint

-- ── Stato dei requisiti ────────────────────────────────────────────────────
--
-- ⚠️ Il livello e' 0÷4 oppure NULL, e NULL non e' zero: significa «nessuno l'ha ancora
-- guardato». La differenza e' tutto il motore della conformita' — un requisito non
-- valutato pesa zero nella percentuale ma non e' «attuazione assente dichiarata».
ALTER TABLE nis2_requirement_state
  ADD CONSTRAINT nis2_requirement_state_livello_ck
  CHECK (livello IS NULL OR livello BETWEEN 0 AND 4);
--> statement-breakpoint

-- Non applicabile ED valutato non ha senso: «non applicabile» esce dal denominatore,
-- quindi un livello accanto sarebbe un numero che nessuno usa e che confonde chi legge
-- la riga.
ALTER TABLE nis2_requirement_state
  ADD CONSTRAINT nis2_requirement_state_na_ck
  CHECK (NOT non_applicabile OR livello IS NULL);
--> statement-breakpoint

-- ── Stato dei controlli ────────────────────────────────────────────────────
--
-- ⚠️ Quattro stati, e «da verificare» NON e' fra questi: e' cio' che il tempo fa a un
-- «attuato» lasciato oltre la sua frequenza, e si calcola. Se fosse dichiarabile qualcuno
-- lo sceglierebbe a mano e il meccanismo smetterebbe di significare qualcosa.
ALTER TABLE nis2_control_state
  ADD CONSTRAINT nis2_control_state_stato_ck
  CHECK (stato IS NULL OR stato IN ('non_attuato', 'in_attuazione', 'attuato', 'non_applicabile'));
--> statement-breakpoint

ALTER TABLE nis2_control_state
  ADD CONSTRAINT nis2_control_state_verifica_ck
  CHECK (
    ultima_verifica IS NULL OR (
      ultima_verifica ~ '^\d{4}-\d{2}-\d{2}$'
      AND to_char(to_date(ultima_verifica, 'YYYY-MM-DD'), 'YYYY-MM-DD') = ultima_verifica
    )
  );
--> statement-breakpoint

-- ── Fasi della roadmap ─────────────────────────────────────────────────────
ALTER TABLE nis2_phase_state
  ADD CONSTRAINT nis2_phase_state_stato_ck
  CHECK (stato IN ('non_avviata', 'in_corso', 'completata'));
--> statement-breakpoint

ALTER TABLE nis2_phase_state
  ADD CONSTRAINT nis2_phase_state_scadenza_ck
  CHECK (
    scadenza IS NULL OR (
      scadenza ~ '^\d{4}-\d{2}-\d{2}$'
      AND to_char(to_date(scadenza, 'YYYY-MM-DD'), 'YYYY-MM-DD') = scadenza
    )
  );
--> statement-breakpoint

-- ── Indicatori ─────────────────────────────────────────────────────────────
ALTER TABLE nis2_indicator
  ADD CONSTRAINT nis2_indicator_tipo_ck
  CHECK (tipo IS NULL OR tipo IN ('attuazione', 'efficacia'));
--> statement-breakpoint

ALTER TABLE nis2_indicator
  ADD CONSTRAINT nis2_indicator_verso_ck
  CHECK (verso IN ('crescente', 'decrescente'));
--> statement-breakpoint

ALTER TABLE nis2_indicator
  ADD CONSTRAINT nis2_indicator_frequenza_ck
  CHECK (frequenza IN ('mensile', 'trimestrale', 'semestrale', 'annuale'));
--> statement-breakpoint

-- I valori numerici arrivano come testo (la regola del progetto: mai float), ma devono
-- essere numeri: un target «circa 90» renderebbe muto l'indicatore senza dirlo.
ALTER TABLE nis2_indicator
  ADD CONSTRAINT nis2_indicator_numeri_ck
  CHECK (
    (target IS NULL OR target ~ '^-?\d+([.,]\d+)?$')
    AND (soglia IS NULL OR soglia ~ '^-?\d+([.,]\d+)?$')
  );
--> statement-breakpoint

ALTER TABLE nis2_indicator_reading
  ADD CONSTRAINT nis2_indicator_reading_valore_ck
  CHECK (valore IS NULL OR valore ~ '^-?\d+([.,]\d+)?$');
