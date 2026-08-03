-- Vincoli sui domini dei contenuti e sui tipi di documento.
--
-- Perché a mano: `text("tipo", { enum: [...] })` di Drizzle genera soltanto
-- `tipo text NOT NULL`, senza alcun CHECK. L'unione vive nei tipi TypeScript e
-- non protegge il database: uno script di import o una query diretta possono
-- scrivere un valore fuori dominio senza che nulla se ne accorga.
--
-- I valori dei tre moduli in arrivo (energetico, supplier, SoA) sono già ammessi
-- qui, così l'aggiunta di ciascun modulo non richiede una nuova migrazione di
-- vincolo: basterà estendere l'enum Drizzle e il registro dei tipi.

ALTER TABLE content_set
  ADD CONSTRAINT content_set_dominio_ck
  CHECK (dominio IN ('ghg', 'report', 'energy', 'supplier', 'soa'));
--> statement-breakpoint

ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_tipo_ck
  CHECK (tipo IN ('ghg', 'bilancio', 'energetico', 'attestato', 'soa'));
--> statement-breakpoint

-- I documenti che si riferiscono a un esercizio portano l'anno vero; quelli che
-- non ne hanno uno (attestato ESG, dichiarazione di applicabilità) usano lo zero
-- convenzionale: l'unicità (company_id, tipo, anno, versione) degenera così in
-- (company_id, tipo, versione), cioè una sola serie monotona di revisioni.
-- Il vincolo rende l'intenzione verificabile dal database invece che affidata
-- alla disciplina del codice applicativo.
ALTER TABLE document_snapshot
  ADD CONSTRAINT document_snapshot_anno_ck
  CHECK (
       (tipo IN ('ghg', 'bilancio', 'energetico') AND anno BETWEEN 1990 AND 2100)
    OR (tipo IN ('attestato', 'soa') AND anno = 0)
  );
