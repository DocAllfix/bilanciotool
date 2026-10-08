-- Le righe legate a un'azienda: stesso studio, e niente lavoro nuovo su un'azienda archiviata
-- (audit di sicurezza, ottobre 2026).
--
-- ⚠️ DUE regole, in un trigger solo, su ogni tabella con una chiave esterna verso
-- `company(id)` — trovate nel catalogo e non elencate a mano, come fa la 0001 con le
-- policy: una tabella nuova con `company_id` è coperta senza che nessuno se ne ricordi.
--
-- 1. SEMPRE (inserimento, e aggiornamento di `company_id` o `organization_id`): l'azienda
--    deve esistere e appartenere allo STESSO studio della riga.
--    Le policy RLS guardano solo `organization_id`, e la chiave esterna su `company_id`
--    non passa dalle policy: uno studio poteva scrivere una riga SUA che puntava
--    all'azienda di un ALTRO. Era la forma di due reperti — le impostazioni del bilancio
--    e i fattori energetici — e dove l'indice unico è su `(company_id, …)` la riga
--    occupava il posto dello studio vero, che non poteva più salvare il proprio. Il
--    codice applicativo ora verifica l'azienda; questo è il terzo strato, e vale anche
--    in sviluppo, dove la connessione è privilegiata e le policy non scattano.
--
-- 2. SOLO ALL'INSERIMENTO, e non sulle tabelle d'amministrazione: un'azienda archiviata
--    non accetta lavoro nuovo — nuovi esercizi o percorsi, pubblicazioni, collegamenti
--    per il cliente. Decisione del committente (8 ottobre 2026).
--    Il perché: le archiviate escono dal tetto del piano per poter «mettere da parte» un
--    cliente chiuso, ma la sola lettura era solo nell'interfaccia; dal server si poteva
--    archiviare per liberare posti e continuare a lavorarci.
--    Restano scrivibili contatti, referenti, agenda e compensi (argomento 'amministrazione'):
--    un cliente archiviato può ancora pagare in ritardo, e la rubrica non è lavoro.
--
-- ⚠️ Nessun trigger su DELETE: la cancellazione di uno studio scende a cascata su queste
-- tabelle, e un controllo lì la farebbe fallire. E gli UPDATE che non toccano le due
-- colonne restano liberi: revocare un collegamento, archiviare il PDF di un documento,
-- contare una verifica.
--
-- ⚠️ SECURITY DEFINER con `search_path` fissato: la funzione deve vedere l'azienda anche
-- quando le policy la nasconderebbero, altrimenti con `app_rls` l'azienda di un altro
-- studio risulterebbe «inesistente» e in sviluppo «di un altro studio» — due messaggi per lo
-- stesso fatto. Legge una riga di `company` e nient'altro. Una funzione `RETURNS trigger`
-- non si può chiamare direttamente.
--
-- Gli errori portano un codice in HINT: `daErrore` lo riconosce e mostra una frase
-- leggibile, senza frammenti di SQL.

CREATE OR REPLACE FUNCTION azienda_scrivibile() RETURNS trigger AS $$
DECLARE
  az record;
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT organization_id, stato INTO az FROM company WHERE id = NEW.company_id;
  IF NOT FOUND OR az.organization_id IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'azienda inesistente o di un altro studio'
      USING ERRCODE = 'P0001', HINT = 'azienda_altro_studio';
  END IF;
  IF TG_OP = 'INSERT' AND TG_ARGV[0] = 'lavoro' AND az.stato <> 'active' THEN
    RAISE EXCEPTION 'azienda archiviata: niente lavoro nuovo finché non si ripristina'
      USING ERRCODE = 'P0001', HINT = 'azienda_archiviata';
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
--> statement-breakpoint

DO $$
DECLARE
  t record;
  amministrazione text[] := ARRAY['company_contact', 'company_referent', 'agenda_voce', 'compenso'];
BEGIN
  FOR t IN
    SELECT DISTINCT rel.relname AS tabella
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.company'::regclass
      AND n.nspname = 'public'
      AND a.attname = 'company_id'
  LOOP
    -- Solo le tabelle che portano anche l'organizzazione: la prima regola ne ha bisogno.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t.tabella AND column_name = 'organization_id'
    ) THEN
      RAISE NOTICE 'azienda_scrivibile: % non ha organization_id, saltata', t.tabella;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS azienda_scrivibile ON %I', t.tabella);
    EXECUTE format(
      'CREATE TRIGGER azienda_scrivibile BEFORE INSERT OR UPDATE OF company_id, organization_id ON %I '
      'FOR EACH ROW EXECUTE FUNCTION azienda_scrivibile(%L)',
      t.tabella,
      CASE WHEN t.tabella = ANY (amministrazione) THEN 'amministrazione' ELSE 'lavoro' END
    );
  END LOOP;
END
$$;
