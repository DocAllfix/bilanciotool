-- Domini chiusi delle colonne del modulo fornitori.
--
-- Perché a mano: `text("risposta", { enum: [...] })` di Drizzle genera soltanto
-- `risposta text`, senza alcun CHECK. L'unione vive nei tipi TypeScript e non
-- protegge il database: uno script di import, una migrazione dati o una query
-- diretta possono scrivere un valore fuori dominio, e il punteggio lo
-- ignorerebbe in silenzio facendo sparire la domanda dal conteggio.

ALTER TABLE supplier_answer
  ADD CONSTRAINT supplier_answer_risposta_ck
  CHECK (risposta IS NULL OR risposta IN ('si', 'parziale', 'no', 'na'));
--> statement-breakpoint

ALTER TABLE supplier_answer
  ADD CONSTRAINT supplier_answer_stato_documento_ck
  CHECK (stato_documento IS NULL OR stato_documento IN ('assente', 'da_aggiornare', 'disponibile'));
--> statement-breakpoint

ALTER TABLE supplier_answer
  ADD CONSTRAINT supplier_answer_stato_azione_ck
  CHECK (stato_azione IS NULL OR stato_azione IN ('da_avviare', 'in_corso', 'completata'));
--> statement-breakpoint

-- La soglia è una percentuale: fuori da 0-100 il confronto con l'indice non ha
-- significato e il documento dichiarerebbe un requisito impossibile.
ALTER TABLE supplier_assessment
  ADD CONSTRAINT supplier_assessment_soglia_ck
  CHECK (soglia_richiesta BETWEEN 0 AND 100);
