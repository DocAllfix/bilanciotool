-- Le voci che si trovano da sole (decisione del committente del 17 ottobre 2026).
--
-- Il catalogo delle proposte per codice ATECO è un content set come gli altri (`ateco-v1`):
-- versionato, seminato, letto e mai scritto dall'applicazione. Una tabella SOLA per tutti
-- i percorsi, perché la proposta ha la stessa forma ovunque: un profilo ATECO, un percorso,
-- una chiave del catalogo di quel percorso, i valori e il MOTIVO.

ALTER TABLE "content_set" DROP CONSTRAINT IF EXISTS "content_set_dominio_ck";
--> statement-breakpoint
ALTER TABLE "content_set" ADD CONSTRAINT "content_set_dominio_ck"
  CHECK ("dominio" = ANY (ARRAY['ghg','report','energy','supplier','soa','mog231',
                               'iso37001','sgiqas','sa8000','filiera','wb','sgesg','nis2','gdpr','pas','ateco']));
--> statement-breakpoint

CREATE TABLE "ateco_proposta" (
  "id" text PRIMARY KEY NOT NULL,
  "set_id" text NOT NULL,
  "profilo" text NOT NULL,
  "modulo" text NOT NULL,
  "tipo" text NOT NULL,
  "chiave" text NOT NULL,
  "ordine" integer NOT NULL,
  "valore" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "motivo" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ateco_proposta_uq" ON "ateco_proposta" ("set_id","profilo","modulo","tipo","chiave");
--> statement-breakpoint
ALTER TABLE "ateco_proposta" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "ateco_proposta" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "ateco_proposta_read" ON "ateco_proposta" FOR SELECT TO app_rls USING (true);
--> statement-breakpoint
CREATE POLICY "ateco_proposta_staff" ON "ateco_proposta" FOR ALL TO app_rls
  USING (current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.platform_admin', true) = 'on');
--> statement-breakpoint

-- Le voci GHG proposte. `tipo_key` rende idempotente l'inserimento (una proposta non entra
-- due volte); `proposta_motivo` è la MARCA: piena finché nessuno ha toccato la voce, vuota
-- dopo la prima modifica o la conferma. Le voci scritte a mano le hanno entrambe vuote.
ALTER TABLE "ghg_activity_row" ADD COLUMN "tipo_key" text;
--> statement-breakpoint
ALTER TABLE "ghg_activity_row" ADD COLUMN "proposta_motivo" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "ghg_activity_row_tipo_uq" ON "ghg_activity_row" ("inventory_id","tipo_key") WHERE "tipo_key" IS NOT NULL;
--> statement-breakpoint

-- La materialità proposta dal codice ATECO: stessa marca delle voci GHG. Piena finché nessuno
-- tocca il tema, vuota dopo la prima modifica.
ALTER TABLE "materiality_assessment" ADD COLUMN "proposta_motivo" text;
