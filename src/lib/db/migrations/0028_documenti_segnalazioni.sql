-- I due documenti delle segnalazioni entrano nei vincoli del documento pubblicato.
--
-- Come per ISO 37001 e il 231: il tipo e la regola sull'anno, che Drizzle non genera.
--
-- ⚠️ La Relazione periodica NON usa l'anno, malgrado il nome. Non è la relazione
-- «dell'esercizio 2026»: è la revisione N di una serie unica, resa quando l'organo di
-- controllo la chiede — che può essere due volte in un anno e nessuna in quello dopo.
-- Con l'anno vero, l'unicità (azienda, tipo, anno, versione) spezzerebbe la numerazione
-- al cambio di calendario e farebbe ripartire le revisioni da uno.
--
-- ⚠️ E il FASCICOLO della singola segnalazione non e' qui, per una ragione di chiave.
-- L'unicita' di un documento pubblicato e' (azienda, tipo, anno, versione), e per il
-- fascicolo manca un asse: QUALE fascicolo. Con `anno = 0` il fascicolo 3 e il fascicolo
-- 7 della stessa azienda diventerebbero la versione 1 e la versione 2 dello stesso
-- documento, con lo stesso nome di file. Piegare `anno` a significare «numero del caso»
-- farebbe mentire una colonna, e questo progetto l'ha gia' pagata una volta.
-- La scelta fra le due strade — un quarto asse nella chiave, oppure il fascicolo che
-- resta una stampa e non un documento congelato — e' del committente, ed e' annotata
-- come quesito aperto: e' l'artefatto piu' delicato dei sei moduli.

ALTER TABLE document_snapshot DROP CONSTRAINT document_snapshot_tipo_ck;
--> statement-breakpoint
ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_tipo_ck
  CHECK (tipo IN ('ghg', 'bilancio', 'energetico', 'attestato', 'soa',
                  'relazione_pc', 'matrice_pc', 'matrice_231', 'relazione_odv',
                  'relazione_wb'));
--> statement-breakpoint
ALTER TABLE document_snapshot DROP CONSTRAINT document_snapshot_anno_ck;
--> statement-breakpoint
ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_anno_ck
  CHECK (
       (tipo IN ('ghg', 'bilancio', 'energetico') AND anno BETWEEN 1990 AND 2100)
    OR (tipo IN ('attestato', 'soa', 'relazione_pc', 'matrice_pc', 'matrice_231',
                 'relazione_odv', 'relazione_wb') AND anno = 0)
  );
