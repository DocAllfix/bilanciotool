-- I tre documenti NIS2 nei due vincoli di `document_snapshot`.
--
-- ⚠️ I CHECK si riscrivono INTERI, non si estendono: un ALTER che elenca solo i valori
-- nuovi cancellerebbe gli altri diciannove.
--
-- ⚠️ E i tre vanno nel ramo SENZA esercizio. Finendo in quello annuale, la loro unicita'
-- diventerebbe `(azienda, tipo, anno, versione)` con anni diversi invece di una serie
-- unica di revisioni; nel ramo giusto e' `(azienda, tipo, versione)`, cioe' la seconda
-- relazione e' la revisione 2 della prima — che e' cio' che una relazione di conformita'
-- e'. E' lo stesso errore che nella fase 8 avrebbe fatto della seconda offerta la
-- versione 2 della prima, con lo stesso nome di file.
ALTER TABLE "document_snapshot" DROP CONSTRAINT IF EXISTS "document_snapshot_tipo_ck";
--> statement-breakpoint
ALTER TABLE "document_snapshot" ADD CONSTRAINT "document_snapshot_tipo_ck"
  CHECK ("tipo" = ANY (ARRAY['ghg','bilancio','energetico','attestato','soa',
                             'relazione_pc','matrice_pc','matrice_231','relazione_odv',
                             'relazione_wb','riesame_qas','manuale_sa8000',
                             'dichiarazione_filiera','analisi_ambientale','valutazione_ssl',
                             'offerta_esg','verbale_avvio','diagnosi_esg','dossier_finale',
                             'conformita_nis2','relazione_nis2','controlli_nis2']));
--> statement-breakpoint
ALTER TABLE "document_snapshot" DROP CONSTRAINT IF EXISTS "document_snapshot_anno_ck";
--> statement-breakpoint
ALTER TABLE "document_snapshot" ADD CONSTRAINT "document_snapshot_anno_ck"
  CHECK (
    ("tipo" = ANY (ARRAY['ghg','bilancio','energetico',
                         'offerta_esg','verbale_avvio','diagnosi_esg','dossier_finale'])
      AND "anno" BETWEEN 1990 AND 2100)
    OR
    ("tipo" = ANY (ARRAY['attestato','soa','relazione_pc','matrice_pc','matrice_231',
                         'relazione_odv','relazione_wb','riesame_qas','manuale_sa8000',
                         'dichiarazione_filiera','analisi_ambientale','valutazione_ssl',
                         'conformita_nis2','relazione_nis2','controlli_nis2'])
      AND "anno" = 0)
  );
