-- Il Riesame di direzione entra nei vincoli del documento pubblicato.
--
-- ⚠️ Non usa l'anno, malgrado sia annuale nella pratica: e' la revisione N di una serie
-- unica, e l'anno nel titolo lo mette chi lo redige. Con l'anno vero, l'unicita'
-- (azienda, tipo, anno, versione) farebbe ripartire le revisioni da uno a ogni gennaio.

ALTER TABLE document_snapshot DROP CONSTRAINT document_snapshot_tipo_ck;
--> statement-breakpoint
ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_tipo_ck
  CHECK (tipo IN ('ghg', 'bilancio', 'energetico', 'attestato', 'soa',
                  'relazione_pc', 'matrice_pc', 'matrice_231', 'relazione_odv',
                  'relazione_wb', 'riesame_qas'));
--> statement-breakpoint
ALTER TABLE document_snapshot DROP CONSTRAINT document_snapshot_anno_ck;
--> statement-breakpoint
ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_anno_ck
  CHECK (
       (tipo IN ('ghg', 'bilancio', 'energetico') AND anno BETWEEN 1990 AND 2100)
    OR (tipo IN ('attestato', 'soa', 'relazione_pc', 'matrice_pc', 'matrice_231',
                 'relazione_odv', 'relazione_wb', 'riesame_qas') AND anno = 0)
  );
