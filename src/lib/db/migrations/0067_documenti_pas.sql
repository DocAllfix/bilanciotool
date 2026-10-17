-- I quattro documenti del sistema di gestione sociale (PAS 24000) nei due vincoli di
-- `document_snapshot`.
--
-- ⚠️ I CHECK si riscrivono INTERI, non si estendono: un ALTER che elenca solo i valori nuovi
-- cancellerebbe gli altri ventotto. Si parte dal testo della 0064, l'ultima che li ha scritti.
--
-- ⚠️ E i quattro vanno nel ramo SENZA esercizio, verbale di riesame compreso: l'esercizio sta
-- nello snapshot, la chiave resta `(azienda, tipo, versione)`. Nel ramo annuale il secondo
-- verbale non sarebbe la revisione 2 del primo. Stessa scelta del GDPR.
ALTER TABLE "document_snapshot" DROP CONSTRAINT IF EXISTS "document_snapshot_tipo_ck";
--> statement-breakpoint
ALTER TABLE "document_snapshot" ADD CONSTRAINT "document_snapshot_tipo_ck"
  CHECK ("tipo" = ANY (ARRAY['ghg','bilancio','energetico','attestato','soa',
                             'relazione_pc','matrice_pc','matrice_231','relazione_odv',
                             'relazione_wb','riesame_qas','manuale_sa8000',
                             'dichiarazione_filiera','analisi_ambientale','valutazione_ssl',
                             'offerta_esg','verbale_avvio','diagnosi_esg','dossier_finale',
                             'conformita_nis2','relazione_nis2','controlli_nis2',
                             'registro_trattamenti','modello_privacy','politica_privacy',
                             'dpia','conformita_gdpr','relazione_privacy',
                             'manuale_pas','politica_pas','conformita_pas','riesame_pas']));
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
                         'conformita_nis2','relazione_nis2','controlli_nis2',
                         'registro_trattamenti','modello_privacy','politica_privacy',
                         'dpia','conformita_gdpr','relazione_privacy',
                         'manuale_pas','politica_pas','conformita_pas','riesame_pas'])
      AND "anno" = 0)
  );
