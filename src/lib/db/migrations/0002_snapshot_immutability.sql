-- Immutabilità degli snapshot pubblicati (garanzia d'audit):
-- l'UNICA colonna aggiornabile è pdf_storage_key (scritta dopo la generazione
-- del PDF). Dati, tipo, anno e versione sono congelati per SEMPRE, per chiunque
-- (trigger a livello DB: vale anche per la connessione privilegiata).
-- Ripubblicare = INSERT di una nuova versione. Al ruolo app è revocata la DELETE.

CREATE OR REPLACE FUNCTION document_snapshot_immutabile() RETURNS trigger AS $$
BEGIN
  IF NEW.dati IS DISTINCT FROM OLD.dati
     OR NEW.tipo IS DISTINCT FROM OLD.tipo
     OR NEW.anno IS DISTINCT FROM OLD.anno
     OR NEW.versione IS DISTINCT FROM OLD.versione
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.published_by IS DISTINCT FROM OLD.published_by
     OR NEW.published_at IS DISTINCT FROM OLD.published_at THEN
    RAISE EXCEPTION 'document_snapshot è immutabile: ripubblica per creare una nuova versione';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_document_snapshot_immutabile ON document_snapshot;
--> statement-breakpoint
CREATE TRIGGER trg_document_snapshot_immutabile
  BEFORE UPDATE ON document_snapshot
  FOR EACH ROW EXECUTE FUNCTION document_snapshot_immutabile();
--> statement-breakpoint

REVOKE DELETE ON document_snapshot FROM app_rls;
