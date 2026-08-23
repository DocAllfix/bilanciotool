-- I due documenti del Modello 231 entrano nei vincoli del documento pubblicato.
--
-- Come per ISO 37001: il tipo e la regola sull'anno. Drizzle non genera nessuno dei due.
--
-- ⚠️ Entrambi usano `anno = 0`. Il Modello e' una fotografia che si revisiona, non un
-- esercizio che si ricomincia ogni gennaio, e la Relazione dell'OdV — che pure e'
-- periodica — e' la revisione N di una serie unica: con l'anno vero l'unicita'
-- (azienda, tipo, anno, versione) spezzerebbe la numerazione al cambio di calendario.

ALTER TABLE document_snapshot DROP CONSTRAINT document_snapshot_tipo_ck;
--> statement-breakpoint
ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_tipo_ck
  CHECK (tipo IN ('ghg', 'bilancio', 'energetico', 'attestato', 'soa',
                  'relazione_pc', 'matrice_pc', 'matrice_231', 'relazione_odv'));
--> statement-breakpoint
ALTER TABLE document_snapshot DROP CONSTRAINT document_snapshot_anno_ck;
--> statement-breakpoint
ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_anno_ck
  CHECK (
       (tipo IN ('ghg', 'bilancio', 'energetico') AND anno BETWEEN 1990 AND 2100)
    OR (tipo IN ('attestato', 'soa', 'relazione_pc', 'matrice_pc', 'matrice_231', 'relazione_odv') AND anno = 0)
  );
