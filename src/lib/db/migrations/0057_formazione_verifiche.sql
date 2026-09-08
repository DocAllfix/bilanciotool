-- L'avanzamento nelle verifiche dei corsi.
--
-- ⚠️ NON porta `organization_id`, ed e' deliberato: il corso lo fa una PERSONA, e chi
-- cambia studio si porta dietro cio' che ha imparato. Per questo la tabella non compare
-- fra quelle tenant e `rls-matrix.db.test.ts` non la guarda: non ha la colonna che quel
-- test cerca.
--
-- ⚠️ Ma RLS ci va lo stesso, con una policy sull'UTENTE invece che sull'organizzazione:
-- senza, in produzione — dove la connessione gira come `app_rls` — chiunque leggerebbe gli
-- esiti di chiunque. Il GUC `app.user_id` c'e' gia', lo imposta `withTenant`.
CREATE TABLE IF NOT EXISTS "formazione_verifica" (
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "corso" text NOT NULL,
  "sezione" text NOT NULL,
  "corrette" integer NOT NULL,
  "domande" integer NOT NULL,
  "superata" boolean NOT NULL,
  "tentativi" integer DEFAULT 1 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "formazione_verifica_pk" PRIMARY KEY ("user_id", "corso", "sezione")
);
--> statement-breakpoint

-- Un esito non puo' avere piu' risposte giuste che domande, ne' meno di zero: sono i due
-- modi in cui un conteggio sbagliato produrrebbe una percentuale impossibile su una
-- schermata che qualcuno legge come un risultato.
ALTER TABLE "formazione_verifica"
  ADD CONSTRAINT "formazione_verifica_conteggi_ck"
  CHECK ("domande" > 0 AND "corrette" BETWEEN 0 AND "domande" AND "tentativi" > 0);
--> statement-breakpoint

ALTER TABLE "formazione_verifica" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "formazione_verifica" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "formazione_verifica_utente_rls" ON "formazione_verifica"
  FOR ALL TO app_rls
  USING (user_id = current_setting('app.user_id', true)
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (user_id = current_setting('app.user_id', true)
         OR current_setting('app.platform_admin', true) = 'on');
