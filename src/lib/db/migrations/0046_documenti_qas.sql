-- I due documenti firmati del sistema integrato entrano nei vincoli.
--
-- ⚠️ L'Analisi ambientale e la Valutazione dei rischi non sono allegati del Riesame: sono
-- documenti FIRMATI — dal datore di lavoro, dall'RSPP — che hanno valore proprio davanti
-- a un ente di certificazione e a un organo di vigilanza. Il piano li aveva scelti
-- (quesito A6, opzione B) e il modulo ne produceva uno su tre.
--
-- Nessuno dei due usa l'anno: sono fotografie che si revisionano, come il Riesame.

ALTER TABLE document_snapshot DROP CONSTRAINT document_snapshot_tipo_ck;
--> statement-breakpoint
ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_tipo_ck
  CHECK (tipo IN ('ghg', 'bilancio', 'energetico', 'attestato', 'soa',
                  'relazione_pc', 'matrice_pc', 'matrice_231', 'relazione_odv',
                  'relazione_wb', 'riesame_qas', 'manuale_sa8000',
                  'dichiarazione_filiera', 'analisi_ambientale', 'valutazione_ssl'));
--> statement-breakpoint
ALTER TABLE document_snapshot DROP CONSTRAINT document_snapshot_anno_ck;
--> statement-breakpoint
ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_anno_ck
  CHECK (
       (tipo IN ('ghg', 'bilancio', 'energetico') AND anno BETWEEN 1990 AND 2100)
    OR (tipo IN ('attestato', 'soa', 'relazione_pc', 'matrice_pc', 'matrice_231',
                 'relazione_odv', 'relazione_wb', 'riesame_qas', 'manuale_sa8000',
                 'dichiarazione_filiera', 'analisi_ambientale', 'valutazione_ssl') AND anno = 0)
  );
