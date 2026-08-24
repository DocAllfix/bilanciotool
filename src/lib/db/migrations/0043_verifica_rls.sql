-- Il codice di verifica: chi puo' leggerlo, e perche' la lettura e' aperta.

ALTER TABLE "document_codice" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "document_codice" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- ⚠️ SELECT aperta, e la ragione va letta prima di «correggerla».
--
-- La pagina `/verifica` risponde a CHIUNQUE, senza sessione: e' il punto della funzione.
-- Chi riceve un PDF non ha un account da noi, e chiedergli di crearlo per confermare
-- che il documento e' autentico significherebbe non avere la funzione.
--
-- Cio' che questa apertura espone e' esattamente cio' che la pagina e' progettata per
-- mostrare a chi ha il codice: emittente, azienda, tipo, revisione, data. La tabella e'
-- DENORMALIZZATA apposta -- nessun join verso `company`, `organization` o lo snapshot --
-- quindi un errore nella query pubblica non puo' allargare la vista oltre queste sei
-- colonne, e nessun dato di contenuto e' raggiungibile da qui.
--
-- Il rischio residuo, dichiarato invece che taciuto: chi avesse accesso diretto al
-- database potrebbe elencare i clienti degli studi. Non e' aggravato da questa policy --
-- chi ha quell'accesso legge gia' `company` -- e attraverso l'applicazione l'elenco non
-- e' raggiungibile: la rotta accetta UN codice e restituisce UNA riga, e i codici sono
-- otto caratteri su un alfabeto di venticinque (circa 1,5 x 10^11 combinazioni) dietro
-- un limite di frequenza.
CREATE POLICY "document_codice_read" ON "document_codice"
  FOR SELECT TO app_rls USING (true);
--> statement-breakpoint

-- La scrittura resta legata all'organizzazione, come ogni riga tenant.
CREATE POLICY "document_codice_write" ON "document_codice"
  FOR INSERT TO app_rls
  WITH CHECK (organization_id = current_setting('app.org_id', true)
              OR current_setting('app.platform_admin', true) = 'on');
--> statement-breakpoint

-- ⚠️ L'UPDATE serve al SOLO contatore delle verifiche, e lo consente a chiunque:
-- e' la pagina pubblica a incrementarlo, e li' non c'e' nessuna organizzazione nel
-- contesto. Le colonne che descrivono il documento restano intoccabili per costruzione,
-- perche' il trigger qui sotto rifiuta ogni modifica che non sia il contatore: un codice
-- che potesse cambiare emittente o azienda dopo l'emissione non varrebbe niente.
CREATE POLICY "document_codice_touch" ON "document_codice"
  FOR UPDATE TO app_rls USING (true) WITH CHECK (true);
--> statement-breakpoint

CREATE OR REPLACE FUNCTION document_codice_immutabile() RETURNS trigger AS $$
BEGIN
  IF NEW.codice IS DISTINCT FROM OLD.codice
     OR NEW.snapshot_id IS DISTINCT FROM OLD.snapshot_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.emittente IS DISTINCT FROM OLD.emittente
     OR NEW.azienda IS DISTINCT FROM OLD.azienda
     OR NEW.tipo IS DISTINCT FROM OLD.tipo
     OR NEW.anno IS DISTINCT FROM OLD.anno
     OR NEW.versione IS DISTINCT FROM OLD.versione
     OR NEW.pubblicato_il IS DISTINCT FROM OLD.pubblicato_il THEN
    RAISE EXCEPTION 'document_codice: di un codice emesso si puo'' aggiornare solo il contatore delle verifiche';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER document_codice_immutabile_trg
  BEFORE UPDATE ON "document_codice"
  FOR EACH ROW EXECUTE FUNCTION document_codice_immutabile();
--> statement-breakpoint

-- Cancellare un codice emesso non e' previsto: il documento resta verificabile finche'
-- esiste, e sparisce con lui (la chiave esterna e' ON DELETE CASCADE).
REVOKE DELETE ON "document_codice" FROM app_rls;
