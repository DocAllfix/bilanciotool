-- I due documenti di ISO 37001 entrano nei vincoli del documento pubblicato.
--
-- Sono TRE vincoli e non uno, ed e' il motivo per cui questo file esiste: il tipo, la
-- regola sull'anno, e il dominio del content set. Drizzle non ne genera nessuno —
-- `text("tipo", { enum: [...] })` produce soltanto `tipo text NOT NULL`, e l'unione
-- vive nei tipi TypeScript, che a runtime non esistono.
--
-- Il CHECK sul dominio era gia' stato allargato a undici valori dalla migrazione 0018
-- (corpus): qui non si tocca.

ALTER TABLE document_snapshot DROP CONSTRAINT document_snapshot_tipo_ck;
--> statement-breakpoint
ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_tipo_ck
  CHECK (tipo IN ('ghg', 'bilancio', 'energetico', 'attestato', 'soa', 'relazione_pc', 'matrice_pc'));
--> statement-breakpoint

-- ⚠️ La Relazione ANNUALE non e' un documento annuale.
--
-- Sembra una contraddizione e non lo e': il modulo ISO 37001 e' un sistema di gestione,
-- cioe' una fotografia corrente che si revisiona, non un esercizio che si ricomincia da
-- capo ogni gennaio. Le sue revisioni formano una serie unica, come per l'attestato ESG
-- e la Dichiarazione di Applicabilita'. L'anno di riferimento lo scrive chi redige, nel
-- corpo del documento.
--
-- Se qui si mettesse l'anno vero, l'unicita' (company_id, tipo, anno, versione)
-- spezzerebbe la numerazione delle revisioni al cambio di calendario: la revisione 4 del
-- 2026 e la revisione 1 del 2027 sarebbero due serie che nessuno sa piu' ordinare.
ALTER TABLE document_snapshot DROP CONSTRAINT document_snapshot_anno_ck;
--> statement-breakpoint
ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_anno_ck
  CHECK (
       (tipo IN ('ghg', 'bilancio', 'energetico') AND anno BETWEEN 1990 AND 2100)
    OR (tipo IN ('attestato', 'soa', 'relazione_pc', 'matrice_pc') AND anno = 0)
  );
