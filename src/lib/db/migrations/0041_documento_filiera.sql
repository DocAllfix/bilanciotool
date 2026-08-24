-- La Dichiarazione annuale sulla due diligence di filiera entra nei vincoli.
--
-- ⚠️ Si chiama «annuale» e NON usa l'anno del prodotto. L'esercizio a cui si riferisce lo
-- dichiara il corpo del documento, come per il Riesame di direzione: qui resta la
-- revisione N di una serie unica, e l'unicita' e' (azienda, tipo, versione). Legarla
-- all'anno significherebbe non poter emettere una revisione correttiva dello stesso
-- periodo, che e' esattamente cio' che succede quando un partner viene rivalutato.

ALTER TABLE document_snapshot DROP CONSTRAINT document_snapshot_tipo_ck;
--> statement-breakpoint
ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_tipo_ck
  CHECK (tipo IN ('ghg', 'bilancio', 'energetico', 'attestato', 'soa',
                  'relazione_pc', 'matrice_pc', 'matrice_231', 'relazione_odv',
                  'relazione_wb', 'riesame_qas', 'manuale_sa8000',
                  'dichiarazione_filiera'));
--> statement-breakpoint
ALTER TABLE document_snapshot DROP CONSTRAINT document_snapshot_anno_ck;
--> statement-breakpoint
ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_anno_ck
  CHECK (
       (tipo IN ('ghg', 'bilancio', 'energetico') AND anno BETWEEN 1990 AND 2100)
    OR (tipo IN ('attestato', 'soa', 'relazione_pc', 'matrice_pc', 'matrice_231',
                 'relazione_odv', 'relazione_wb', 'riesame_qas', 'manuale_sa8000',
                 'dichiarazione_filiera') AND anno = 0)
  );
