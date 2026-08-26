-- I QUATTRO DOCUMENTI DEL METODO ESG.
--
-- Due CHECK da riscrivere, e il secondo e' quello che conta: `document_snapshot_anno_ck`
-- divide i tipi ANNUALI da quelli senza esercizio, e i quattro nuovi sono annuali —
-- un'offerta del 2025 e una del 2026 sono due documenti, non due revisioni dello stesso.
-- Dimenticarli qui li avrebbe fatti finire nel ramo `SENZA_ESERCIZIO`, dove l'unicita'
-- e' (azienda, tipo, versione): la seconda offerta sarebbe diventata la versione 2 della
-- prima, con lo stesso nome di file.

ALTER TABLE "document_snapshot" DROP CONSTRAINT IF EXISTS "document_snapshot_tipo_ck";--> statement-breakpoint
ALTER TABLE "document_snapshot" ADD CONSTRAINT "document_snapshot_tipo_ck"
  CHECK ("tipo" = ANY (ARRAY['ghg','bilancio','energetico','attestato','soa','relazione_pc',
                            'matrice_pc','matrice_231','relazione_odv','relazione_wb',
                            'riesame_qas','manuale_sa8000','dichiarazione_filiera',
                            'analisi_ambientale','valutazione_ssl',
                            'offerta_esg','verbale_avvio','diagnosi_esg','dossier_finale']));--> statement-breakpoint

ALTER TABLE "document_snapshot" DROP CONSTRAINT IF EXISTS "document_snapshot_anno_ck";--> statement-breakpoint
ALTER TABLE "document_snapshot" ADD CONSTRAINT "document_snapshot_anno_ck"
  CHECK (
    ("tipo" = ANY (ARRAY['ghg','bilancio','energetico',
                         'offerta_esg','verbale_avvio','diagnosi_esg','dossier_finale'])
      AND "anno" BETWEEN 1990 AND 2100)
    OR
    ("tipo" = ANY (ARRAY['attestato','soa','relazione_pc','matrice_pc','matrice_231',
                         'relazione_odv','relazione_wb','riesame_qas','manuale_sa8000',
                         'dichiarazione_filiera','analisi_ambientale','valutazione_ssl'])
      AND "anno" = 0)
  );
