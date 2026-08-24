-- Il Manuale SA8000/2026 entra nei vincoli del documento pubblicato.
--
-- ⚠️ Non usa l'anno: e' cio' che si esibisce in audit, una fotografia che si revisiona.

ALTER TABLE document_snapshot DROP CONSTRAINT document_snapshot_tipo_ck;
--> statement-breakpoint
ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_tipo_ck
  CHECK (tipo IN ('ghg', 'bilancio', 'energetico', 'attestato', 'soa',
                  'relazione_pc', 'matrice_pc', 'matrice_231', 'relazione_odv',
                  'relazione_wb', 'riesame_qas', 'manuale_sa8000'));
--> statement-breakpoint
ALTER TABLE document_snapshot DROP CONSTRAINT document_snapshot_anno_ck;
--> statement-breakpoint
ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_anno_ck
  CHECK (
       (tipo IN ('ghg', 'bilancio', 'energetico') AND anno BETWEEN 1990 AND 2100)
    OR (tipo IN ('attestato', 'soa', 'relazione_pc', 'matrice_pc', 'matrice_231',
                 'relazione_odv', 'relazione_wb', 'riesame_qas', 'manuale_sa8000') AND anno = 0)
  );
