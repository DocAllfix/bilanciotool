-- Fascia «Azienda» (decisione del committente del 17 ottobre 2026).
--
-- ⚠️ VA IN PRODUZIONE PRIMA DEL CODICE. Col vincolo vecchio il webhook di chi compra la
-- fascia fallirebbe nella transazione del provisioning, risponderebbe 500, Stripe
-- ritenterebbe, e un cliente che ha pagato resterebbe senza servizio (stesso motivo della 0059).

ALTER TABLE "org_entitlement" DROP CONSTRAINT IF EXISTS "org_entitlement_piano_ck";
--> statement-breakpoint
ALTER TABLE "org_entitlement" ADD CONSTRAINT "org_entitlement_piano_ck"
  CHECK ("piano" IS NULL OR "piano" IN ('singola','azienda','professional','studio','studio_plus','enterprise'));
--> statement-breakpoint

-- I percorsi assegnati alle persone. Negli studi resta vuota.
CREATE TABLE "assegnazione_percorso" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "company_id" text NOT NULL REFERENCES "company"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "modulo" text NOT NULL,
  "created_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "assegnazione_percorso_modulo_ck" CHECK ("modulo" IN (
    'ghg','energetico','bilancio','sgesg','fornitore','mog231','anticorruzione','segnalazioni',
    'filiera','nis2','sgnis2','gdpr','sgiqas','sa8000','pas24000','soa'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "assegnazione_percorso_uq" ON "assegnazione_percorso" ("company_id","user_id","modulo");
--> statement-breakpoint
CREATE INDEX "assegnazione_percorso_utente_idx" ON "assegnazione_percorso" ("organization_id","user_id");
--> statement-breakpoint

ALTER TABLE "assegnazione_percorso" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "assegnazione_percorso" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "assegnazione_percorso_tenant_rls" ON "assegnazione_percorso" FOR ALL TO app_rls
  USING (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (organization_id = current_setting('app.org_id', true)
         OR current_setting('app.platform_admin', true) = 'on');
--> statement-breakpoint

-- L'azienda deve essere dello stesso studio. Assegnare non è lavoro nuovo: si può anche su
-- un'azienda archiviata, come i contatti e l'agenda.
CREATE TRIGGER azienda_scrivibile BEFORE INSERT OR UPDATE OF company_id, organization_id ON assegnazione_percorso
  FOR EACH ROW EXECUTE FUNCTION azienda_scrivibile('amministrazione');
--> statement-breakpoint

-- Uscire dallo studio cancella le assegnazioni: chi venisse reinvitato non deve ritrovarsi i
-- permessi di allora senza che nessuno li dia di nuovo.
CREATE OR REPLACE FUNCTION assegnazioni_via_col_membro() RETURNS trigger AS $$
BEGIN
  DELETE FROM assegnazione_percorso
   WHERE organization_id = OLD.organization_id AND user_id = OLD.user_id;
  RETURN OLD;
END
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
--> statement-breakpoint
CREATE TRIGGER assegnazioni_via_col_membro AFTER DELETE ON "member"
  FOR EACH ROW EXECUTE FUNCTION assegnazioni_via_col_membro();
